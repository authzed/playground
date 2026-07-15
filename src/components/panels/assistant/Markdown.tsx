import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Maps a fenced-code language tag to a friendly label shown above the block.
const LANG_LABELS: Record<string, string> = {
  zed: "schema",
  schema: "schema",
  spicedb: "schema",
  relationships: "relationships",
  rel: "relationships",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
};

const SCHEMA_LANGS = new Set(["zed", "schema", "spicedb"]);
const SCHEMA_KEYWORDS = new Set([
  "definition",
  "caveat",
  "relation",
  "permission",
  "use",
  "typechecking",
]);

// Lightweight, dependency-free SpiceDB schema highlighter: keywords, operators,
// and comments. Falls back to plain text for everything else. (Relationships and
// YAML render as plain monospace; a richer highlighter could be added later.)
function highlightSchema(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenRe = /(\/\/[^\n]*)|([A-Za-z_]\w*)|(->|[+&|-])|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = tokenRe.exec(code)) !== null) {
    const [tok, comment, word, op] = m;
    if (comment) {
      nodes.push(
        <span key={i} className="text-muted-foreground italic">
          {tok}
        </span>,
      );
    } else if (word && SCHEMA_KEYWORDS.has(word)) {
      nodes.push(
        <span key={i} className="font-medium text-purple-600 dark:text-purple-400">
          {tok}
        </span>,
      );
    } else if (op) {
      nodes.push(
        <span key={i} className="text-sky-600 dark:text-sky-400">
          {tok}
        </span>,
      );
    } else {
      nodes.push(tok);
    }
    i++;
    if (m.index === tokenRe.lastIndex) tokenRe.lastIndex++; // guard against zero-length matches
  }
  return nodes;
}

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const key = (lang ?? "").toLowerCase();
  const label = LANG_LABELS[key] ?? key;
  const body = code.replace(/\n$/, "");
  return (
    <div className="my-2 overflow-hidden rounded border border-chrome-divider">
      {label && (
        <div className="border-b border-chrome-divider bg-chrome-tabbar px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto bg-muted p-2 font-mono text-xs leading-snug">
        <code>{SCHEMA_LANGS.has(key) ? highlightSchema(body) : body}</code>
      </pre>
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none break-words text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-chrome-divider bg-muted px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-chrome-divider px-2 py-1">{children}</td>
          ),
          // Unwrap the default <pre> — CodeBlock provides its own container.
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            // Code children are strings (react-markdown passes raw code text);
            // extract without String()-ing a possible ReactNode.
            const text =
              typeof children === "string"
                ? children
                : Array.isArray(children)
                  ? children.filter((c): c is string => typeof c === "string").join("")
                  : "";
            const match = /language-(\w+)/.exec(className ?? "");
            const isBlock = !!match || text.includes("\n");
            if (!isBlock) {
              return (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
              );
            }
            return <CodeBlock lang={match?.[1]} code={text} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
