import Convert from "ansi-to-html";
import { CircleX, MessageCircleWarning } from "lucide-react";
import * as React from "react";
import useDeepCompareEffect from "use-deep-compare-effect";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import { TerminalSection } from "../../spicedb-common/services/zedterminalservice";

import { CompletionPopup } from "./CompletionPopup";
import { CommandNode, getCompletions } from "./zedCommands";

interface HtmlTerminalRendererProps {
  outputSections: TerminalSection[];
  commandHistory: string[];
  onSubmitCommand: (cmd: string) => void;
  onClear: () => void;
}

export function HtmlTerminalRenderer({
  outputSections,
  commandHistory,
  onSubmitCommand,
  onClear,
}: HtmlTerminalRendererProps) {
  const [command, setCommand] = React.useState("");
  const [historyIndex, setHistoryIndex] = React.useState(commandHistory.length);
  const [completions, setCompletions] = React.useState<CommandNode[]>([]);
  const [completionIndex, setCompletionIndex] = React.useState(0);
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const endOfContainer = React.useRef<HTMLDivElement>(null);

  // Recompute the anchor rect whenever the popup is shown, the input changes,
  // or the viewport scrolls/resizes. The popup is rendered in a portal at
  // document.body and uses `position: fixed`, so we need viewport coords.
  React.useEffect(() => {
    if (completions.length === 0) {
      setAnchorRect(null);
      return;
    }
    const update = () => {
      if (inputRef.current) {
        setAnchorRect(inputRef.current.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [completions, command]);

  useDeepCompareEffect(() => {
    endOfContainer.current?.scrollIntoView();
  }, [outputSections]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const updateCompletions = (input: string) => {
    const c = getCompletions(input);
    setCompletions(c);
    setCompletionIndex(0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(e.target.value);
    updateCompletions(e.target.value);
  };

  const acceptCompletion = (c: CommandNode) => {
    const tokens = command.trim().split(/\s+/);
    tokens[tokens.length - 1] = c.name;
    const next = tokens.join(" ") + " ";
    setCommand(next);
    setCompletions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tab completion
    if (e.key === "Tab" && completions.length > 0) {
      e.preventDefault();
      acceptCompletion(completions[completionIndex]);
      return;
    }

    // Esc dismisses completions
    if (e.key === "Escape" && completions.length > 0) {
      e.preventDefault();
      setCompletions([]);
      return;
    }

    // Ctrl+L clear
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      onClear();
      return;
    }

    // Ctrl+C cancel input
    if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setCommand("");
      setCompletions([]);
      return;
    }

    // Up/Down: navigate completions if open, else history
    if (e.key === "ArrowUp") {
      if (completions.length > 0) {
        e.preventDefault();
        setCompletionIndex((i) => Math.max(0, i - 1));
        return;
      }
      const next = historyIndex - 1;
      if (next < 0) return;
      setCommand(commandHistory[next]);
      setHistoryIndex(next);
      return;
    }
    if (e.key === "ArrowDown") {
      if (completions.length > 0) {
        e.preventDefault();
        setCompletionIndex((i) => Math.min(completions.length - 1, i + 1));
        return;
      }
      const next = historyIndex + 1;
      if (next >= commandHistory.length) {
        setCommand("");
        setHistoryIndex(commandHistory.length);
        return;
      }
      setCommand(commandHistory[next]);
      setHistoryIndex(next);
      return;
    }

    // Enter: submit
    if (e.key === "Enter" && command.trim().length > 0) {
      onSubmitCommand(command);
      setCommand("");
      setHistoryIndex(commandHistory.length + 1);
      setCompletions([]);
      return;
    }
  };

  const handleClickOutput = (e: React.MouseEvent) => {
    if (e.target instanceof Element) {
      const sel = window.getSelection();
      if (!sel || sel.toString().length === 0) {
        inputRef.current?.focus();
      }
    }
  };

  const convert = React.useMemo(() => new Convert({ escapeXML: true }), []);

  return (
    <div className="h-full overflow-auto p-2 font-mono text-sm" onClick={handleClickOutput}>
      <TerminalOutputDisplay sections={outputSections} convert={convert} />
      <div className="relative flex items-center gap-2">
        <span className="select-none text-accent">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none border-0 font-mono"
          autoFocus
          spellCheck={false}
        />
        {completions.length > 0 && (
          <CompletionPopup
            completions={completions}
            activeIndex={completionIndex}
            onSelect={acceptCompletion}
            onSetActive={setCompletionIndex}
            anchorRect={anchorRect}
          />
        )}
      </div>
      <div ref={endOfContainer} />
    </div>
  );
}

function TerminalOutputDisplay({
  sections,
  convert,
}: {
  sections: TerminalSection[];
  convert: Convert;
}) {
  const renderLine = (o: string, key: number, showLogs: boolean) => {
    if (o.startsWith("{")) {
      try {
        const parsed = JSON.parse(o);
        if (parsed["is-log"]) {
          if (!showLogs) return null;
          const isError = parsed["level"] === "error";
          return (
            <Alert key={key} variant={isError ? "destructive" : "default"}>
              {isError ? <CircleX /> : <MessageCircleWarning />}
              <AlertDescription>
                {Object.entries(parsed).map(([k, v]) => {
                  if (k === "is-log") return null;
                  return (
                    <span key={k}>
                      {k}: {JSON.stringify(v)}&nbsp;
                    </span>
                  );
                })}
              </AlertDescription>
            </Alert>
          );
        }
      } catch {
        // not a log; fall through
      }
    }
    // @ts-expect-error replaceAll comes from a string polyfill.
    const html = convert.toHtml(o.replaceAll(" ", "\xa0").replaceAll("\t", "\xa0\xa0")) || "&nbsp;";
    return <div key={key} dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="font-mono">
      {sections.map((section, idx) => {
        if ("command" in section) {
          return (
            <div key={idx}>
              <span className="text-accent">$</span> {section.command}
            </div>
          );
        }
        return (
          <div key={idx} className={cn("border border-border bg-card p-2 my-1 rounded")}>
            {section.output.split("\n").map((line, i) => renderLine(line, i, false))}
          </div>
        );
      })}
    </div>
  );
}
