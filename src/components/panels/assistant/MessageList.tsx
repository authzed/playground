import { useEffect, useRef } from "react";

import type { DisplayMessage } from "../../../services/assistant/store";

import { AssistantMessage } from "./AssistantMessage";

export function MessageList({
  messages,
  onUndo,
}: {
  messages: DisplayMessage[];
  onUndo: (m: DisplayMessage) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages]);
  return (
    <div className="flex-1 space-y-3 overflow-auto p-3">
      {messages.map((m) => (
        <AssistantMessage key={m.id} message={m} onUndo={() => onUndo(m)} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
