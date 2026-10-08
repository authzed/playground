import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDiscordDestination } from "@/services/assistant/communityHelp";
import AppConfig from "@/services/configservice";

export function CommunityHelpDialog({
  initialDraft,
  createLink,
  summarize,
  onClose,
}: {
  initialDraft: string;
  createLink?: () => Promise<string>;
  summarize?: (signal: AbortSignal) => Promise<string>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [shareUrl, setShareUrl] = useState<string>();
  const [sharing, setSharing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const draftId = useId();
  const active = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const config = AppConfig().discord;
  const destination = getDiscordDestination(config);
  const invite = config.inviteUrl || "https://authzed.com/discord";
  const message = draft;
  const tooLong = message.length > 2000;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      abort.current?.abort();
    };
  }, []);

  const generateLink = async () => {
    if (!createLink || sharing) return;
    setSharing(true);
    setShareError("");
    setCopyStatus("");
    try {
      const url = await createLink();
      if (active.current) {
        setShareUrl(url);
        setDraft((current) => `${current}\n\nPlayground: ${url}`);
      }
    } catch {
      if (active.current)
        setShareError(
          "Couldn't create a playground link. Try again, or copy your message without one.",
        );
    } finally {
      if (active.current) setSharing(false);
    }
  };

  const generateSummary = async () => {
    if (!summarize || summarizing) return;
    const controller = new AbortController();
    abort.current = controller;
    setSummarizing(true);
    setSummaryError("");
    setCopyStatus("");
    try {
      const summary = await summarize(controller.signal);
      if (active.current && !controller.signal.aborted)
        setDraft(
          shareUrl && draft.includes(shareUrl) ? `${summary}\n\nPlayground: ${shareUrl}` : summary,
        );
    } catch {
      if (active.current && !controller.signal.aborted)
        setSummaryError("Couldn't summarize the conversation. You can edit the draft yourself.");
    } finally {
      if (active.current && abort.current === controller) setSummarizing(false);
      controller.abort();
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      if (active.current)
        setCopyStatus("Copied. Open Discord and paste your message in the help channel.");
    } catch {
      if (active.current)
        setCopyStatus("Couldn't copy automatically. Select the message and copy it manually.");
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ask the community in Discord</DialogTitle>
          <DialogDescription>
            Review your message, then copy and paste it into Discord. You choose when to post.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor={draftId} className="text-sm font-medium">
            Message for Discord
          </label>
          <textarea
            id={draftId}
            className="min-h-56 w-full rounded-md border bg-background p-3 text-sm"
            value={message}
            readOnly={summarizing}
            onChange={(event) => {
              // Once edited, the full text (including any link) belongs to the user.
              setDraft(event.target.value);
              setCopyStatus("");
            }}
          />
          <p className={`text-xs ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
            {message.length}/2000 characters
            {tooLong ? " — shorten the message before copying to Discord." : ""}
          </p>
          {summarize && (
            <Button
              variant="outline"
              size="sm"
              disabled={summarizing || sharing}
              onClick={generateSummary}
            >
              {summarizing ? "Summarizing…" : "Summarize conversation"}
            </Button>
          )}
          {summarizing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                abort.current?.abort();
                abort.current = null;
                setSummarizing(false);
              }}
            >
              Cancel summary
            </Button>
          )}
          {summarize && (
            <p className="text-xs text-muted-foreground">
              Summarizing replaces the draft. Review the result before posting.
            </p>
          )}
          {summaryError && (
            <p role="alert" className="text-sm text-destructive">
              {summaryError}
            </p>
          )}
        </div>
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p>
            Anyone with the link can view the shared schema, relationships, assertions, expected
            relations, and check watches (including context). Remove sensitive data from the
            playground before creating a link. Your chat is not included.
          </p>
          {createLink ? (
            <Button
              variant="outline"
              disabled={sharing || summarizing || !!shareUrl}
              onClick={generateLink}
            >
              {sharing
                ? "Creating link…"
                : shareUrl
                  ? "Playground link added"
                  : "Create playground link"}
            </Button>
          ) : (
            <p className="text-muted-foreground">
              Playground sharing is unavailable here. You can still copy your question.
            </p>
          )}
          {shareUrl && (
            <p className="text-xs text-muted-foreground">
              The link captures the playground when you create it; later edits are not included.
            </p>
          )}
          {shareError && (
            <p role="alert" className="text-destructive">
              {shareError}
            </p>
          )}
        </div>
        {copyStatus && (
          <p role="status" className="text-sm">
            {copyStatus}
          </p>
        )}
        <DialogFooter>
          <Button
            onClick={copyMessage}
            disabled={sharing || summarizing || tooLong || !message.trim()}
          >
            Copy message
          </Button>
          <Button variant="outline" asChild>
            <a href={destination} target="_blank" rel="noreferrer">
              Open Discord
            </a>
          </Button>
        </DialogFooter>
        {destination !== invite && (
          <a className="text-sm underline" href={invite} target="_blank" rel="noreferrer">
            New to the community? Join Discord
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
