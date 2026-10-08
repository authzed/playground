import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { AssistantMessage } from "../../components/panels/assistant/AssistantMessage";
import { AssistantPanel } from "../../components/panels/assistant/AssistantPanel";
import { CommunityHelpDialog } from "../../components/panels/assistant/CommunityHelpDialog";
import { useAssistantStore } from "../../services/assistant/store";
import { NOOP_HISTORY } from "../../services/assistant/types";
import type { DataStore } from "../../services/datastore";
import type { LocalParseService } from "../../services/localparse";
import type { Services } from "../../services/services";

afterEach(() => {
  vi.restoreAllMocks();
  useAssistantStore.getState().reset();
});

describe("community help", () => {
  it("cancels a stalled summary without losing edits or accepting late output", async () => {
    let finish!: (draft: string) => void;
    const screen = await render(
      <CommunityHelpDialog
        initialDraft="My edits"
        onClose={() => {}}
        summarize={() =>
          new Promise<string>((resolve) => {
            finish = resolve;
          })
        }
      />,
    );
    await screen.getByRole("button", { name: "Summarize conversation" }).click();
    await screen.getByRole("button", { name: "Cancel summary" }).click();
    await screen.getByRole("textbox").fill("Further edits");
    finish("Late summary");
    await expect.element(screen.getByRole("textbox")).toHaveValue("Further edits");
    await expect.element(screen.getByRole("button", { name: "Copy message" })).toBeEnabled();
  });

  it("does not restore a share link removed from the draft when summarizing", async () => {
    const screen = await render(
      <CommunityHelpDialog
        initialDraft="Question"
        onClose={() => {}}
        createLink={async () => "https://play.example.com/s/abc"}
        summarize={async () => "Summary without a link"}
      />,
    );
    await screen.getByRole("button", { name: "Create playground link" }).click();
    await screen.getByRole("textbox").fill("Question with the link removed");
    await screen.getByRole("button", { name: "Summarize conversation" }).click();
    await expect.element(screen.getByRole("textbox")).toHaveValue("Summary without a link");
  });
  it("closes the old draft when the conversation is reset", async () => {
    useAssistantStore.getState().reset();
    const screen = await render(
      <AssistantPanel
        services={{ localParseService: {} } as Services}
        datastore={{} as DataStore}
        history={NOOP_HISTORY}
      />,
    );
    await screen.getByRole("button", { name: "Ask the community" }).click();
    await expect.element(screen.getByRole("dialog")).toBeInTheDocument();
    useAssistantStore.getState().reset();
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
  });
  it("keeps human help available when the assistant has failed", async () => {
    useAssistantStore.getState().reset();
    useAssistantStore.getState().appendUser("Why is view denied?");
    useAssistantStore.getState().setStatus("error", { message: "AI unavailable" });
    const screen = await render(
      <AssistantPanel
        services={{ localParseService: {} } as Services}
        datastore={{} as DataStore}
        history={NOOP_HISTORY}
      />,
    );
    await screen.getByRole("button", { name: "Ask the community" }).click();
    await expect
      .element(screen.getByRole("textbox", { name: "Message for Discord" }))
      .toHaveValue(expect.stringContaining("Why is view denied?"));
  });

  it("renders the suggestion beside collapsed diffs and opens its draft", async () => {
    let opened = "";
    const screen = await render(
      <AssistantMessage
        localParseService={{} as LocalParseService}
        onCommunityHelp={(draft) => {
          opened = draft;
        }}
        message={{
          id: "a",
          role: "assistant",
          text: "",
          state: "done",
          toolActivity: [],
          artifacts: [
            { kind: "diff", target: "schema", before: "a", after: "b" },
            {
              kind: "community_help",
              reason: "The check still fails",
              draft: "How should I model view?",
            },
            { kind: "diff", target: "schema", before: "b", after: "c" },
          ],
        }}
      />,
    );
    await expect.element(screen.getByText("Changes made (2)")).toBeInTheDocument();
    await expect.element(screen.getByText("The check still fails")).toBeInTheDocument();
    await screen.getByRole("button", { name: "Ask in Discord" }).click();
    expect(opened).toBe("How should I model view?");
  });

  it("reviews before sharing, preserves edits, and copies the generated link", async () => {
    let shares = 0;
    let copied = "";
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(async (text) => {
      copied = text;
    });
    const screen = await render(
      <CommunityHelpDialog
        initialDraft="I need help with permissions."
        onClose={() => {}}
        createLink={async () => {
          shares++;
          return "https://play.example.com/s/abc";
        }}
      />,
    );
    expect(shares).toBe(0);
    await expect.element(screen.getByText(/Anyone with the link/)).toBeInTheDocument();
    await screen.getByRole("textbox", { name: "Message for Discord" }).fill("My edited question");
    await screen.getByRole("button", { name: "Create playground link" }).click();
    await expect
      .element(screen.getByRole("textbox"))
      .toHaveValue("My edited question\n\nPlayground: https://play.example.com/s/abc");
    await screen.getByRole("button", { name: "Copy message" }).click();
    expect(copied).toBe("My edited question\n\nPlayground: https://play.example.com/s/abc");
    expect(shares).toBe(1);
    await expect
      .element(screen.getByRole("link", { name: "Open Discord" }))
      .toHaveAttribute("target", "_blank");
  });

  it("keeps the draft usable after sharing and clipboard failures", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    const screen = await render(
      <CommunityHelpDialog
        initialDraft="My question"
        onClose={() => {}}
        createLink={async () => {
          throw new Error("Offline");
        }}
      />,
    );
    await screen.getByRole("button", { name: "Create playground link" }).click();
    await expect.element(screen.getByText(/Couldn't create/)).toBeInTheDocument();
    await expect.element(screen.getByRole("textbox")).toHaveValue("My question");
    await screen.getByRole("button", { name: "Copy message" }).click();
    await expect.element(screen.getByText(/Select the message/)).toBeInTheDocument();
    await expect.element(screen.getByRole("link", { name: "Open Discord" })).toBeInTheDocument();
  });

  it("keeps manual edits if summarization fails, and prevents accidental oversized copies", async () => {
    const screen = await render(
      <CommunityHelpDialog
        initialDraft="Original question"
        onClose={() => {}}
        summarize={async () => {
          throw new Error("Unavailable");
        }}
      />,
    );
    await screen.getByRole("textbox").fill("My edited question");
    await screen.getByRole("button", { name: "Summarize conversation" }).click();
    await expect.element(screen.getByText(/Couldn't summarize/)).toBeInTheDocument();
    await expect.element(screen.getByRole("textbox")).toHaveValue("My edited question");
    await screen.getByRole("textbox").fill("x".repeat(2001));
    await expect.element(screen.getByRole("button", { name: "Copy message" })).toBeDisabled();
  });

  it("retains the share link when summarizing and does not duplicate it after editing", async () => {
    const screen = await render(
      <CommunityHelpDialog
        initialDraft="Question"
        onClose={() => {}}
        createLink={async () => "https://play.example.com/s/abc"}
        summarize={async () => "Summarized question"}
      />,
    );
    await screen.getByRole("button", { name: "Create playground link" }).click();
    await screen.getByRole("button", { name: "Summarize conversation" }).click();
    await expect
      .element(screen.getByRole("textbox"))
      .toHaveValue("Summarized question\n\nPlayground: https://play.example.com/s/abc");
    await screen
      .getByRole("textbox")
      .fill("Updated question\n\nPlayground: https://play.example.com/s/abc");
    await expect
      .element(screen.getByRole("button", { name: "Playground link added" }))
      .toBeDisabled();
  });
});
