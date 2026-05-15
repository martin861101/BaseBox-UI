// Resume Clone Engine — LLM orchestrator
// Uses the existing backend /api/ai/chat SSE endpoint to generate tailored resumes.

import { streamSSE } from "./agent-client";
import {
  loadAgents, getActiveAgentId, loadProviderConfigs,
  type ProviderId,
} from "./ai-providers";

const RESUME_SYSTEM_PROMPT = `You are an elite resume alignment specialist. Your sole function is to transform a user's Base Resume into a precision-targeted version that aligns with a specific Job Specification — without fabricating a single fact.

═══════════════════════════════════════════
ABSOLUTE RULES  (violations = failed output)
═══════════════════════════════════════════

▸ VERBATIM JOB TITLE
  Extract the exact job title from the Job Specification and place it verbatim in the
  resume header — character for character. Never paraphrase, abbreviate, or reword it.
  "Senior Platform Engineer" must appear as "Senior Platform Engineer". No exceptions.

▸ ZERO FABRICATION
  Never invent companies, dates, metrics, technologies, degrees, or achievements.
  Every fact in the output must exist in the Base Resume. Rephrasing is permitted;
  invention is not.

▸ STRUCTURE LOCK
  Preserve the exact Markdown structure of the Base Resume:
  - Header as a single-row pipe table
  - Section headings as \`**BOLD HEADING**\` on their own line
  - Experience entries as bullet points under each role
  - Technical Skills as a pipe table at the bottom
  Do not add, remove, or reorder sections.

▸ FORMAT COMPLIANCE (for clean .docx / PDF export)
  - Bullet points: use only \`-\` or \`*\`. No unicode symbols, arrows, or special characters.
  - Tables: strict pipe syntax only. No merged cells or colspan hacks.
  - No manual line breaks (\`\\n\`) for spacing — use blank lines between paragraphs.
  - Section headings must be \`**HEADING**\` on their own line, never inline.

▸ RAW MARKDOWN ONLY
  Output ONLY the final resume in clean Markdown. No preamble, no explanation,
  no code fences, no meta-commentary. The first character of your response must be
  the start of the resume itself.

═══════════════════════════════════════════
OPTIMISATION DIRECTIVES  (apply with precision)
═══════════════════════════════════════════

1. TITLE ALIGNMENT
   Mirror the seniority and domain framing of the job title throughout the resume.
   A "Lead" role should feel senior; an "Engineer" role should feel hands-on.

2. KEYWORD & ATS ALIGNMENT
   Identify the top 8–12 technical and domain keywords in the Job Specification.
   Naturally incorporate them into existing bullet points and the Professional Profile
   where truthful and contextually appropriate. Prioritise exact-match phrasing for
   ATS parsing.

3. BULLET POINT REORDERING
   Within each role, reorder bullet points so the most relevant duties to the target
   job appear first. Do not add new bullets — reorder and rephrase existing ones only.

4. PROFESSIONAL PROFILE REWRITE
   Rewrite the Professional Profile paragraph (2–4 sentences) to lead with the skills
   and experience most relevant to the Job Specification. Keep it factual and grounded
   in the Base Resume content.

5. SKILLS TABLE PRIORITISATION
   Reorder rows and individual items within the Technical Skills table so the most
   relevant technologies appear first. Do not add technologies not present in the
   Base Resume.

6. TONE & TERMINOLOGY MIRRORING
   Adopt the vocabulary and tone of the Job Specification where it improves alignment.
   If the spec says "observability pipelines", prefer that over "monitoring systems"
   if both are accurate descriptions of existing experience.`;

export interface ResumeCloneResult {
  content: string;
  error?: string;
}

/**
 * Execute the resume clone via the active agent's LLM provider.
 * Streams the result incrementally via the onChunk callback.
 * Returns an abort function.
 */
export function executeResumeClone(
  baseResume: string,
  jobSpecification: string,
  onChunk: (text: string) => void,
  onDone: (err?: Error) => void,
): () => void {
  const agents = loadAgents();
  const activeId = getActiveAgentId();
  const agent = agents.find((a) => a.id === activeId) || agents[0];

  if (!agent) {
    onDone(new Error("No AI agent configured. Go to AI Settings → Agents to create one."));
    return () => {};
  }

  const configs = loadProviderConfigs();
  const pId = agent.providerId as ProviderId;
  const cfg = configs[pId];

  if (!cfg) {
    onDone(new Error(`Provider "${pId}" not configured. Check AI Settings → Providers.`));
    return () => {};
  }

  const userContent = `### BASE RESUME TEMPLATE ###
${baseResume}

### TARGET JOB SPECIFICATION ###
${jobSpecification}`;

  const messages = [
    { role: "system" as const, content: RESUME_SYSTEM_PROMPT },
    { role: "user" as const, content: userContent },
  ];

  return streamSSE(
    "/api/ai/chat",
    {
      provider: pId,
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model: agent.modelId,
      messages,
      temperature: 0.2, // Low temperature for strict alignment
      maxTokens: agent.maxTokens || 8192,
    },
    (chunk) => {
      try {
        const j = JSON.parse(chunk);
        if (j.error) throw new Error(j.error);

        const delta =
          j.message?.content ??
          j.choices?.[0]?.delta?.content ??
          j.delta?.text ??
          j.candidates?.[0]?.content?.parts?.[0]?.text ??
          "";
        if (delta) onChunk(delta);
      } catch (e: any) {
        if (e.message) onDone(e);
      }
    },
    onDone,
  );
}

export const DEFAULT_RESUME_TEMPLATE = `| Martin Schoeman AI & Software Engineer  |  Automation Architect Johannesburg, South Africa | +27829274009 | https://preview.hookitupservices.com  |
| :---- |

**PROFESSIONAL PROFILE**

Technical lead with over a decade of experience across full-stack IT infrastructure and software engineering. Expert in Agentic AI and RAG implementations, specialising in bridging legacy business processes with autonomous agentic workflows. Proven track record of building production-grade automations, custom computer vision models, and original AI research frameworks to solve complex operational challenges.

**PROFESSIONAL EXPERIENCE**

**IT and Digital Expert**  |  JCDecaux Africa *April 2023 – Present*

* Lead architect for extensive Business Process Automations, transforming manual corporate workflows into streamlined digital operations using Power Platform, and custom Python pipelines (Azure Graph)
* Management Position (Managed digital team).
* Deploy and manage applications for real-time display on billboard environments supporting internal digital tools and client-facing platforms.
* Implement AI-driven solutions, including LLM-powered document analysis and computer vision, to enhance data accuracy and operational efficiency across the regional division.
* Design and maintain infrastructure for local AI workloads and internal tooling.

**IT Helpdesk & Network Coordinator**  |  JCDecaux Africa *August 2019 – April 2023*

* Managed enterprise network infrastructure and coordinated technical support operations across a multi-site environment.
* Implemented automated monitoring and reporting systems to maintain 99.9% uptime for mission-critical services.
* Transitioned manual IT processes to automated workflows, reducing resolution times and improving support throughput.

**Senior IT Technician**  |  Align IT / Wingate Computers *2016 – 2019*

* Managed server deployments and AWS cloud infrastructure for a diverse client portfolio spanning SME to enterprise.
* Specialised in high-level systems diagnostics, hardware/software integration, and client-side network configuration.

**KEY PERSONAL PROJECTS**

**DELTA — Decision-ELicited Trace Architecture**

* An original AI research framework that inverts the RAG retrieval paradigm — retrieving documents by counterfactual decision impact rather than semantic similarity.
* Built a proxy reranker (fine-tuned BAAI/bge-reranker-base) trained on a synthetic three-category taxonomy: confirming, irrelevant, and counterfactual documents.
* Components include a baseline competition mechanism (DELTA-R), a contradiction synthesis engine, and a State Change Classifier. Stack: ChromaDB, LiteLLM, Gemini, Streamlit.

**Agentic RAG & LangGraph Systems**

* Developed sophisticated multi-step reasoning pipelines using LangGraph for stateful agentic interactions across document corpora.
* Integrated LLM reasoning loops with structured retrieval, tool use, and memory management for production-grade AI workflows.

**CODING AGENTS (Memory, Agentic, LangGraph)**

* Built a full agentic coding platform for the terminal and VSCode plugin code editor.

**Custom Computer Vision (YOLO)**

* Built and trained custom object detection models from scratch using the YOLO architecture for specialised visual recognition tasks in operational contexts.

**Real-Time Legal Flaw Detection System**

* Engineered an AI-powered system to analyse legal documents in real-time, identifying inconsistencies and structural flaws using advanced LLM reasoning chains.

**Automated medical report & medical system plugin (in production)**

  - Custom-built platform for practices to automate patient reports with a built-in connector to Cliniko, Jane and PracticeHub

**TECHNICAL SKILLS**

| AI / ML | LangGraph, RAG Systems, YOLO, Ollama, Whisper, LiteLLM, ChromaDB, Gemini, Coding Platforms: (Claude Code, Gemini CLI, Codex, Opencode, Antigravity), TensorFlow  |
| :---- | :---- |
| **Automation** | n8n (Expert), Microsoft Power Automate, Power BI, Power Apps, Python Automation, BPA |
| **Infrastructure** | Linux (Ubuntu), AWS, Docker, Nginx, Apache, Nginx Proxy Manager, PM2, Networking |
| **Full-Stack** | React, Next.js, TypeScript, Tailwind CSS, Framer Motion, GSAP, Prisma, PostgreSQL, SQLite, Python. |
| **Dev Tools AI Architecture Cloud**  | node-pty, xterm.js, WebSocket, ChromaDB, LiteLLM, Bash, Python, REST API Design Architecting production-grade agentic ecosystems that merge multi-agent orchestration, GraphRAG, and multimodal integration with a focus on local-first inference optimisation and rigorous LLMOps evaluation. Azure, AWS, Google Cloud Platform, DigitalOcean, Vercel, Cloudflare. |`;