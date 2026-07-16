import { useMonaco } from "@monaco-editor/react";
import { useDebouncedValue } from "@tanstack/react-pacer/debouncer";
import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useResolvedTheme } from "../../../hooks/use-resolved-theme";
import { DS_LANGUAGE_NAME } from "../../../spicedb-common/lang/dslang";
import { TUPLE_LANGUAGE_NAME } from "../../relationshipeditor/tuplelang";

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

// Fenced-code tags that map onto a registered Monaco language, so the chat can
// reuse the editor's real tokenizer + theme for highlighting.
const MONACO_LANG_BY_TAG: Record<string, string> = {
  zed: DS_LANGUAGE_NAME,
  schema: DS_LANGUAGE_NAME,
  spicedb: DS_LANGUAGE_NAME,
  relationships: TUPLE_LANGUAGE_NAME,
  rel: TUPLE_LANGUAGE_NAME,
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

// Highlights code with the editor's real Monaco tokenizer + active theme via
// `colorize`, reusing the loader-resolved monaco instance the editor registered
// the DSL/tuple languages on. Falls back to `fallback` until monaco is loaded and
// the language is registered (or if colorize fails).
function MonacoHighlighted({
  code,
  monacoLang,
  fallback,
}: {
  code: string;
  monacoLang: string;
  fallback: ReactNode;
}) {
  const monaco = useMonaco();
  const theme = useResolvedTheme();
  const [html, setHtml] = useState<string | null>(null);
  // Debounce the code driving colorize: a streaming message appends a
  // character at a time, and re-running full-block colorize on every one of
  // those deltas is wasted work — settle for a beat (or until streaming
  // finishes) before re-highlighting.
  const [debouncedCode] = useDebouncedValue(code, { wait: 300 });

  useEffect(() => {
    if (!monaco || !monaco.languages.getLanguages().some((l) => l.id === monacoLang)) {
      setHtml(null);
      return;
    }
    let cancelled = false;
    monaco.editor
      .colorize(debouncedCode, monacoLang, {})
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
    // `theme` is a dependency so the block re-colorizes when the editor theme flips.
  }, [monaco, monacoLang, debouncedCode, theme]);

  return html === null ? (
    <code>{fallback}</code>
  ) : (
    <code dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const key = (lang ?? "").toLowerCase();
  const label = LANG_LABELS[key] ?? key;
  const body = code.replace(/\n$/, "");
  const monacoLang = MONACO_LANG_BY_TAG[key];
  // Fallback while Monaco loads (or for non-Monaco languages): the lightweight
  // schema highlighter for schema tags, plain text otherwise.
  const fallback: ReactNode = SCHEMA_LANGS.has(key) ? highlightSchema(body) : body;
  return (
    <div className="my-2 overflow-hidden rounded border border-chrome-divider">
      {label && (
        <div className="border-b border-chrome-divider bg-chrome-tabbar px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto bg-muted p-2 font-mono text-xs leading-snug">
        {monacoLang ? (
          <MonacoHighlighted code={body} monacoLang={monacoLang} fallback={fallback} />
        ) : (
          <code>{fallback}</code>
        )}
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
