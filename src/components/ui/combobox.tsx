import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label?: string;
}

export interface ComboboxProps {
  /** Allow free-form input (not just selection from options). Default true (matches Material lab Autocomplete freeSolo). */
  freeSolo?: boolean;
  /** Available options. */
  options: ComboboxOption[];
  /** Current value (string when freeSolo, ComboboxOption['value'] otherwise). */
  value: string;
  /** Called when the value changes (selection or free-form input). */
  onValueChange: (value: string) => void;
  /** Optional render override for an option's display row. */
  renderOption?: (option: ComboboxOption) => React.ReactNode;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

/**
 * Combobox: input + dropdown of options.
 *
 * Implementation: a plain `<input>` plus a body-portal'd popup positioned via
 * `getBoundingClientRect()` (same pattern as CompletionPopup). We deliberately
 * avoid Radix Popover here — its outside-click / focus management interacted
 * badly with this freeSolo input usage and produced a visible close/open
 * flicker on focus.
 */
export function Combobox({
  freeSolo = true,
  options,
  value,
  onValueChange,
  renderOption,
  placeholder,
  emptyMessage = "No matches",
  className,
  inputClassName,
  disabled,
}: ComboboxProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter options against the current input value.
  const filtered = React.useMemo(() => {
    if (!inputValue) return options;
    const lower = inputValue.toLowerCase();
    return options.filter((o) => (o.label ?? o.value).toLowerCase().includes(lower));
  }, [inputValue, options]);

  // Keep activeIndex within bounds when options change.
  React.useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(0);
    }
  }, [filtered.length, activeIndex]);

  // Track the input's bounding rect for portal positioning while open.
  React.useEffect(() => {
    if (!open) return;
    const update = () => {
      if (containerRef.current) {
        setAnchorRect(containerRef.current.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, inputValue, filtered.length]);

  // Close on outside pointer down. Excludes both the input container and the
  // portal popup so internal clicks don't dismiss.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target) || popupRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setInputValue(next);
    setActiveIndex(0);
    setOpen(true);
    if (freeSolo) {
      onValueChange(next);
    }
  };

  const handleSelect = (option: ComboboxOption) => {
    onValueChange(option.value);
    setInputValue(option.value);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open && filtered[activeIndex]) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const popup =
    open && anchorRect
      ? createPortal(
          <div
            ref={popupRef}
            className="fixed z-50 max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              left: anchorRect.left,
              top: anchorRect.bottom + 4,
              minWidth: anchorRect.width,
            }}
            role="listbox"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              filtered.map((option, i) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    // Prevent the input from blurring before this click is
                    // processed; without preventDefault the input loses focus
                    // and its blur handler can race with this selection.
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer",
                    i === activeIndex && "bg-accent text-accent-foreground",
                  )}
                >
                  <span className="flex-1">
                    {renderOption ? renderOption(option) : (option.label ?? option.value)}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </div>
              ))
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        className={cn(
          "flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
          inputClassName,
        )}
        value={inputValue}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
      <ChevronDown
        className="size-4 cursor-pointer opacity-50"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((prev) => !prev);
          inputRef.current?.focus();
        }}
      />
      {popup}
    </div>
  );
}
