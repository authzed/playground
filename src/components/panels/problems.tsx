import { ChevronDown, ChevronRight, CircleX, Eye, Play, TriangleAlert } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { assertionStringToCheckWatch, LiveCheckService } from "../../services/check";
import { Services } from "../../services/services";
import {
  DeveloperError,
  DeveloperError_Source,
  DeveloperWarning,
} from "../../spicedb-common/protodefs/developer/v1/developer_pb";
import { DocumentLink } from "../document-link";
import { useDrawerStore } from "../drawer/state";

import { DeveloperSourceDisplay, DeveloperWarningSourceDisplay } from "./errordisplays";

interface ProblemsPanelProps {
  services: Services;
}

export function ProblemsPanel({ services }: ProblemsPanelProps) {
  const requestErrors = services.problemService.requestErrors;
  const warnings = services.problemService.warnings;
  const invalidRels = services.problemService.invalidRelationships;
  const allValidationErrors = services.problemService.validationErrors;

  const schemaErrors = requestErrors.filter((e) => e.source === DeveloperError_Source.SCHEMA);
  const relationshipRequestErrors = requestErrors.filter(
    (e) => e.source === DeveloperError_Source.RELATIONSHIP,
  );
  // Assertion-source errors land in `validationErrors` (the validation runner
  // is what executes the assertions block), not `requestErrors`. Pull them out
  // so they show up under "Assertions" instead of "Validation".
  const assertionErrors = [
    ...requestErrors.filter((e) => e.source === DeveloperError_Source.ASSERTION),
    ...allValidationErrors.filter((e) => e.source === DeveloperError_Source.ASSERTION),
  ];
  const validationErrors = allValidationErrors.filter(
    (e) => e.source !== DeveloperError_Source.ASSERTION,
  );

  return (
    <div className="p-2 space-y-1">
      <Group title="Schema" errorCount={schemaErrors.length} warningCount={warnings.length}>
        {schemaErrors.map((de, i) => (
          <ErrorRow key={`s${i}`} error={de} />
        ))}
        {warnings.map((dw, i) => (
          <WarningRow key={`w${i}`} warning={dw} />
        ))}
      </Group>

      <Group
        title="Relationships"
        errorCount={invalidRels.length + relationshipRequestErrors.length}
      >
        {invalidRels.map((invalid, i) => {
          if (!("errorMessage" in invalid.parsed)) return null;
          return (
            <InvalidRelationshipRow
              key={`r${i}`}
              text={invalid.text}
              lineNumber={invalid.lineNumber}
              errorMessage={invalid.parsed.errorMessage}
            />
          );
        })}
        {relationshipRequestErrors.map((de, i) => (
          <ErrorRow key={`re${i}`} error={de} />
        ))}
      </Group>

      <Group title="Assertions" errorCount={assertionErrors.length}>
        {assertionErrors.map((de, i) => (
          <ErrorRow
            key={`a${i}`}
            error={de}
            action={<AddCheckWatchAction error={de} liveCheckService={services.liveCheckService} />}
          />
        ))}
      </Group>

      <Group
        title="Validation"
        errorCount={validationErrors.length}
        action={
          <Button
            size="xs"
            variant="ghost"
            onClick={() => services.validationService.conductValidation(() => false)}
          >
            <Play /> Re-run
          </Button>
        }
      >
        {validationErrors.map((ve, i) => (
          <ErrorRow key={`v${i}`} error={ve} />
        ))}
      </Group>
    </div>
  );
}

function Group({
  title,
  errorCount,
  warningCount = 0,
  action,
  children,
}: {
  title: string;
  errorCount: number;
  warningCount?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const total = errorCount + warningCount;
  const [expanded, setExpanded] = React.useState(total > 0);

  // Re-expand when count transitions from 0 to >0 so newly-introduced problems
  // are not hidden inside a previously-empty collapsed group.
  const prevTotalRef = React.useRef(total);
  React.useEffect(() => {
    if (prevTotalRef.current === 0 && total > 0) {
      setExpanded(true);
    }
    prevTotalRef.current = total;
  }, [total]);

  return (
    <div>
      <div className="flex items-center gap-2 px-1 py-1 text-xs">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          <span className="uppercase tracking-wide">{title}</span>
          {errorCount > 0 && <CountBadge value={errorCount} variant="error" />}
          {warningCount > 0 && <CountBadge value={warningCount} variant="warning" />}
          {total === 0 && <CountBadge value={0} variant="empty" />}
        </button>
        <div className="ml-auto">{action}</div>
      </div>
      {expanded && <div className="pl-4 space-y-1">{children}</div>}
    </div>
  );
}

function CountBadge({ value, variant }: { value: number; variant: "error" | "warning" | "empty" }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold",
        variant === "error" && "bg-destructive text-white",
        variant === "warning" && "bg-yellow-600 text-white",
        variant === "empty" && "bg-muted text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}

/** Splits the error message into a short summary (first sentence) and remainder. */
function splitMessage(message: string): { summary: string; rest: string } {
  // Prefer the first ; or . boundary if it appears within a reasonable length.
  const trimmed = message.trim();
  const semi = trimmed.indexOf(";");
  const dot = trimmed.search(/\.\s/);
  const candidates = [semi, dot].filter((i) => i > 0 && i < 120);
  if (candidates.length > 0) {
    const cut = Math.min(...candidates);
    return {
      summary: trimmed.slice(0, cut).trim(),
      rest: trimmed.slice(cut + 1).trim(),
    };
  }
  if (trimmed.length > 100) {
    return { summary: trimmed.slice(0, 100).trim() + "…", rest: trimmed };
  }
  return { summary: trimmed, rest: "" };
}

function ErrorRow({ error, action }: { error: DeveloperError; action?: React.ReactNode }) {
  const { summary, rest } = splitMessage(error.message);
  return (
    <div className="flex items-start gap-3 border-l-2 border-l-destructive bg-card px-3 py-2">
      <CircleX className="size-4 shrink-0 text-destructive mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm leading-snug">{summary}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-snug">
          <DeveloperSourceDisplay error={error} />
          {(error.line > 0 || error.column > 0) && (
            <span className="font-mono">
              :{error.line}:{error.column}
            </span>
          )}
          {(rest || error.context) && <span className="mx-1">·</span>}
          {rest && <span>{rest}</span>}
          {error.context && (
            <>
              {rest && " "}
              <code className="font-mono">{error.context}</code>
            </>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function AddCheckWatchAction({
  error,
  liveCheckService,
}: {
  error: DeveloperError;
  liveCheckService: LiveCheckService;
}) {
  const watch = React.useMemo(() => assertionStringToCheckWatch(error.context), [error.context]);
  if (!watch) return null;
  const onClick = () => {
    useDrawerStore.getState().openPanel("watches");
    liveCheckService.addWatch(watch);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="xs" variant="ghost" onClick={onClick}>
          <Eye />
          Add check watch
        </Button>
      </TooltipTrigger>
      <TooltipContent>Add check watch for this assertion</TooltipContent>
    </Tooltip>
  );
}

function WarningRow({ warning }: { warning: DeveloperWarning }) {
  const { summary, rest } = splitMessage(warning.message);
  return (
    <div className="flex items-start gap-3 border-l-2 border-l-yellow-600 bg-card px-3 py-2">
      <TriangleAlert className="size-4 shrink-0 text-yellow-500 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm leading-snug">{summary}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-snug">
          <DeveloperWarningSourceDisplay warning={warning} />
          {(warning.line > 0 || warning.column > 0) && (
            <span className="font-mono">
              :{warning.line}:{warning.column}
            </span>
          )}
          {(rest || warning.sourceCode) && <span className="mx-1">·</span>}
          {rest && <span>{rest}</span>}
          {warning.sourceCode && (
            <>
              {rest && " "}
              <code className="font-mono">{warning.sourceCode}</code>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InvalidRelationshipRow({
  text,
  lineNumber,
  errorMessage,
}: {
  text: string;
  lineNumber: number;
  errorMessage: string;
}) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-l-destructive bg-card px-3 py-2">
      <CircleX className="size-4 shrink-0 text-destructive mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm leading-snug">{errorMessage}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-snug">
          <DocumentLink to="relationships">Test Relationships</DocumentLink>
          <span className="font-mono ml-1">:{lineNumber + 1}</span>
          <span className="mx-1">·</span>
          <code className="font-mono">{text}</code>
        </div>
      </div>
    </div>
  );
}
