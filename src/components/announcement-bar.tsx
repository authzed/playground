import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useDismissible } from "@/hooks/use-dismissible";
import { cn } from "@/lib/utils";

const announcementBarVariants = cva(
  "fixed inset-x-0 top-0 z-50 flex w-full items-center justify-center px-10 py-2 text-center text-sm",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background",
        brand: "bg-primary text-primary-foreground",
        info: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type AnnouncementBarProps = React.ComponentProps<"div"> &
  VariantProps<typeof announcementBarVariants> & {
    /** Identifies the content shown (not a DOM id). Bump to re-show after dismissal. */
    contentId: string;
    /** Show the close button. Defaults to true. */
    dismissible?: boolean;
    /** Reserve layout space so the fixed bar never overlaps content. Defaults to true. */
    reserveSpace?: boolean;
    onDismiss?: () => void;
  };

export function AnnouncementBar({
  contentId,
  children,
  variant = "default",
  dismissible = true,
  reserveSpace = true,
  onDismiss,
  className,
  ...props
}: AnnouncementBarProps) {
  const { dismissed, dismiss } = useDismissible(contentId);
  const barRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(0);

  // Match the spacer to the fixed bar's height (tracks responsive wrapping).
  // useLayoutEffect runs before paint, so the reserved space is set with no flash.
  React.useLayoutEffect(() => {
    const el = barRef.current;
    if (!el || dismissed || !reserveSpace) {
      setHeight(0);
      return;
    }
    setHeight(el.offsetHeight);
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [dismissed, reserveSpace]);

  if (dismissed) return null;

  const handleDismiss = () => {
    dismiss();
    onDismiss?.();
  };

  return (
    <>
      <div
        ref={barRef}
        role="region"
        aria-label="Announcement"
        data-slot="announcement-bar"
        data-variant={variant}
        className={cn(announcementBarVariants({ variant }), className)}
        {...props}
      >
        <div className="mx-auto">{children}</div>
        {dismissible && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss announcement"
            onClick={handleDismiss}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-current opacity-70 hover:bg-current/10 hover:text-current hover:opacity-100"
          >
            <X />
          </Button>
        )}
      </div>
      {reserveSpace && (
        <div data-slot="announcement-bar-spacer" aria-hidden="true" style={{ height }} />
      )}
    </>
  );
}
