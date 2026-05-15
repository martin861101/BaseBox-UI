import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { db, encrypt, decrypt } from './lib/db.js';

let client = null;
let isReady = false;

async function getAIResponse(prompt, config) {
  const { provider, baseUrl, apiKey, model, systemPrompt, temperature, maxTokens } = config;
  
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  let url = "";
  let headers = { "Content-Type": "application/json" };
  let body = {};

  const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";

  if (provider === "ollama") {
    url = `${OLLAMA}/api/chat`;
    body = { model, messages, stream: false, options: { temperature, num_predict: maxTokens } };
  } else if (provider === "anthropic") {
    url = `${(baseUrl || "").replace(/\/+$/, "")}/messages`;
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    const sys = messages.find((m) => m.role === "system")?.content || "";
    const msgs = messages.filter((m) => m.role !== "system");
    body = { model, system: sys, messages: msgs, stream: false, max_tokens: maxTokens || 4096, temperature };
  } else if (provider === "gemini") {
    url = `${(baseUrl || "").replace(/\/+$/, "")}/models/${model}:generateContent?key=${apiKey}`;
    const sys = messages.find((m) => m.role === "system")?.content;
    const contents = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    body = { contents, generationConfig: { temperature, maxOutputTokens: maxTokens } };
    if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  } else {
    url = `${(baseUrl || "").replace(/\/+$/, "")}/chat/completions`;
    headers["Authorization"] = `Bearer ${apiKey}`;
    body = { model, messages, stream: false, temperature, max_tokens: maxTokens };
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Provider error ${res.status}: ${err}`);
  }

  const j = await res.json();
  
  if (provider === "ollama") return j.message?.content || "";
  if (provider === "anthropic") return j.content?.[0]?.text || "";
  if (provider === "gemini") return j.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return j.choices?.[0]?.message?.content || "";
}

export function initWhatsApp() {
  console.log("Initializing WhatsApp Web client...");
  
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './data/whatsapp-auth' }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log("SCAN THIS QR CODE WITH YOUR WHATSAPP TO LINK THE BOT:");
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isReady = true;
  });

  // Changed to message_create to catch both incoming and "Note to Self" outgoing messages
  client.on('message_create', async (msg) => {
    const row = db.prepare("SELECT value FROM kv WHERE key = 'whatsapp_config'").get();
    if (!row) return;

    let config;
    try {
      config = JSON.parse(decrypt(Buffer.from(row.value, 'hex')));
    } catch (e) {
      console.error("WhatsApp: Failed to decrypt AI config.");
      return;
    }

    const myNumber = client.info?.me?.user || "27829274009";
    const senderNumber = msg.from.split('@')[0];
    
    // Determine if this is a "Note to Self" conversation
    const isSelfChat = senderNumber === myNumber || msg.from === `${myNumber}@c.us` || msg.to === `${myNumber}@c.us`;

    // Ignore standard outgoing messages to others so the bot doesn't reply to people you manually message
    if (msg.fromMe && !isSelfChat) return;

    // Loop breaker: Prevent bot from endlessly replying to its own AI-generated replies in Note to Self
    if (isSelfChat && msg.fromMe && msg.hasQuotedMsg) return;

    if (!config.respondToAll) {
      // Self-only mode
      if (!isSelfChat) return;
    } else {
      // Respond-to-all mode: in groups, require mention
      const chat = await msg.getChat();
      if (chat.isGroup) {
        const mentions = await msg.getMentions();
        const isMentioned = mentions.some(m => m.id._serialized === client.info.me._serialized);
        if (!isMentioned && !msg.body.toLowerCase().includes('@all')) {
          return;
        }
      }
    }

    try {
      console.log(`WhatsApp [${config.respondToAll ? 'ALL' : 'SELF'}]: Querying ${config.provider} (${config.model}) for message from ${msg.from}...`);
      const startTime = Date.now();
      const reply = await getAIResponse(msg.body, config);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log(`WhatsApp: AI responded in ${duration}s. Sending reply...`);
      await msg.reply(reply);
      console.log(`WhatsApp: Reply sent successfully.`);
    } catch (e) {
      console.error("WhatsApp AI Error:", e.message);
      // Suppress sending error texts inside self-chat to avoid error loops
      if (!isSelfChat) {
          msg.reply(`Sorry, I encountered an error: ${e.message}`);
      }
    }
  });

  client.initialize();
}