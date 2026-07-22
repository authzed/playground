import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { TooltipProvider } from "@/components/ui/tooltip";

import {
  AskAssistantDebugButton,
  AskAssistantFixAction,
} from "../../components/panels/AskAssistantActions";
import { useRightDockStore } from "../../components/rightdock/state";
import { useAssistantStore } from "../../services/assistant/store";
import { LiveCheckItemStatus } from "../../services/check";
import {
  DeveloperError,
  DeveloperError_Source,
} from "../../spicedb-common/protodefs/developer/v1/developer_pb";

const schemaError = {
  message: "expected type",
  line: 4,
  column: 1,
  source: DeveloperError_Source.SCHEMA,
  context: "viewer",
} as unknown as DeveloperError;

describe("AskAssistantFixAction", () => {
  beforeEach(() => {
    useAssistantStore.getState().reset();
    useRightDockStore.setState({ open: false, activePanel: null });
  });

  it("opens the assistant with a schema-fix prompt on click", async () => {
    const screen = await render(
      <TooltipProvider>
        <AskAssistantFixAction error={schemaError} />
      </TooltipProvider>,
    );
    await screen.getByRole("button", { name: /Ask assistant to fix/ }).click();
    expect(useAssistantStore.getState().pendingPrompt).toContain("schema");
    expect(useRightDockStore.getState().activePanel).toBe("assistant");
    expect(useRightDockStore.getState().open).toBe(true);
  });
});

describe("AskAssistantDebugButton", () => {
  beforeEach(() => {
    useAssistantStore.getState().reset();
    useRightDockStore.setState({ open: false, activePanel: null });
  });

  it("opens the assistant with a check-watch prompt on click", async () => {
    const item = {
      id: "1",
      object: "document:budget",
      action: "view",
      subject: "user:tim",
      context: "",
      status: LiveCheckItemStatus.NOT_FOUND,
      errorMessage: undefined,
    };
    const screen = await render(
      <TooltipProvider>
        <AskAssistantDebugButton item={item} />
      </TooltipProvider>,
    );
    await screen.getByRole("button", { name: "Ask assistant to debug" }).click();
    expect(useAssistantStore.getState().pendingPrompt).toContain("document:budget#view@user:tim");
    expect(useRightDockStore.getState().activePanel).toBe("assistant");
    expect(useRightDockStore.getState().open).toBe(true);
  });
});
