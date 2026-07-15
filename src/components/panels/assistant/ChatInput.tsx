import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ChatInput({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSubmit(text);
  };
  return (
    <div className="border-t border-chrome-divider p-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask or describe a change… (⌘/Ctrl-Enter)"
        rows={3}
        className="w-full resize-none rounded border border-chrome-divider bg-background p-2 text-sm outline-none focus:border-primary"
      />
      <div className="mt-1 flex justify-end">
        <Button size="sm" disabled={disabled} onClick={submit}>
          Send
        </Button>
      </div>
    </div>
  );
}
