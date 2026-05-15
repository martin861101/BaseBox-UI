import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Play, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  content: string;
  onRun?: (cmd: string, lang?: string) => void;
}

export function MarkdownMessage({ content, onRun }: Props) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const txt = String(children).replace(/\n$/, "");
            const isBlock = (props.node?.position?.start?.line ?? 0) !== (props.node?.position?.end?.line ?? 0)
              || /\n/.test(txt);
            if (!isBlock) {
              return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
            }
            const langMatch = /language-(\w+)/.exec(className || "");
            const lang = langMatch?.[1];
            const runnable = onRun && (lang === "bash" || lang === "sh" || lang === "shell" || lang === "tavily" || lang === "playwright" || !lang);
            return <CodeBlock code={txt} lang={lang} onRun={runnable ? onRun : undefined} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ code, lang, onRun }: { code: string; lang?: string; onRun?: (cmd: string, lang?: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <div className="my-2 overflow-hidden rounded-md border bg-black/40">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-1.5 text-xs">
        <span className="font-mono text-muted-foreground">{lang || "shell"}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs" onClick={copy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {onRun && (
            <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs text-primary" onClick={() => onRun(code, lang)}>
              <Play className="h-3 w-3" />Run
            </Button>
          )}
        </div>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-emerald-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
