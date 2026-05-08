import { useCallback, useRef } from "react";
import { toast } from "sonner";

type Options = {
  successMessage?: string;
  onCopy?: (text: string) => void;
};

// useCopyToClipboard returns a copy function that uses a toast
// to notify on success or failure. Optionally takes an options
// object that includes onCopy behavior.
export default function useCopyToClipboard(options?: Options) {
  const onCopyRef = useRef(options?.onCopy);
  onCopyRef.current = options?.onCopy;
  return useCallback(
    async (text: string) => {
      if (!navigator.clipboard) {
        toast.error("Could not copy to clipboard");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        toast.success(options?.successMessage ?? "Copied to clipboard");
        onCopyRef.current?.(text);
        return;
      } catch {
        toast.error("Could not copy to clipboard");
        return;
      }
    },
    [options?.successMessage],
  );
}
