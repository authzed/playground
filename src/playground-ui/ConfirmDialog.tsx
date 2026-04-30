import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type ConfirmValue = "undefined" | "load" | "replace" | "nevermind";

/**
 * ConfirmDialogButton is a button in the confirm dialog.
 */
export interface ConfirmDialogButton {
  /**
   * title is the title of the button.
   */
  title: React.ReactNode;

  /**
   * value is the value to given to the callback if the button is clicked.
   */
  value?: ConfirmValue;

  /**
   * color is the color of the button. Default is `default`.
   */
  color?: "default" | "primary" | "secondary";

  /**
   * variant is the variant of the button. Default is `text`.
   */
  variant?: "text" | "outlined" | "contained";

  /**
   * isEnabled, if specified, is the function to run to check if the button should be enabled.
   */
  isEnabled?: (promptValue?: string) => boolean;
}

export type ConfirmCallback = (value: ConfirmValue, promptValue?: string) => void;

/**
 * ConfirmDialogProps are the props for the confirm dialog.
 */
export interface ConfirmDialogProps {
  /**
   * isOpen indicates whether the ConfirmDialog is currently open.
   */
  isOpen: boolean;

  /**
   * handleComplete sets the state that is bound to `isOpen` to false and
   * returns the value clicked. If the [X] is clicked, the `value` will be
   * undefined.
   */
  handleComplete: ConfirmCallback;

  /**
   * title is the title of the confirm.
   */
  title: React.ReactNode;

  /**
   * content is the content of the confirm.
   */
  content: React.ReactNode;

  /**
   * buttons are the buttons on the confirm dialog.
   */
  buttons: ConfirmDialogButton[];

  /**
   * withPrompt, if specified, indicates a prompt should be displayed with
   * the given string as the placeholder.
   */
  withPrompt?: string;
}

/**
 * Map the legacy Material UI button (color, variant) combination to a shadcn
 * Button variant, preserving the visual intent of the existing API.
 */
function mapButtonVariant(
  color: ConfirmDialogButton["color"],
  variant: ConfirmDialogButton["variant"],
): React.ComponentProps<typeof Button>["variant"] {
  if (variant === "outlined") {
    return "outline";
  }
  if (variant === "contained") {
    if (color === "secondary") return "secondary";
    if (color === "primary" || color === undefined || color === "default") return "default";
  }
  // Default Material variant is "text"
  if (color === "primary") return "default";
  if (color === "secondary") return "secondary";
  return "ghost";
}

/**
 * ConfigDialog provides a simple confirm-style dialog.
 * @param props The props for the confirm dialog.
 * @example <ConfirmDialog<SomeEnum> isOpen={showConfirm}
 *                         handleComplete={(value: SomeEnum) => setShowConfirm(false)}
 *                         title="My confirm" content="Hi there!"
 *                         buttons={[{"title": "Close", "value": undefined}]}/>
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const [promptValue, setPromptValue] = useState("");

  const handleComplete = (value: ConfirmValue | undefined) => {
    if (value) {
      props.handleComplete(value, promptValue);
      setPromptValue("");
    }
  };

  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleComplete(undefined);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          {props.content}
          {props.withPrompt !== undefined && (
            <Input
              placeholder={props.withPrompt}
              className="mt-2 w-full"
              value={promptValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setPromptValue(event.target.value)
              }
            />
          )}
        </div>
        <DialogFooter>
          {props.buttons.map((button: ConfirmDialogButton, index: number) => {
            const disabled =
              !!props.withPrompt &&
              (!promptValue.length || (button.isEnabled && !button.isEnabled(promptValue))) &&
              !!button.value;
            return (
              <Button
                key={index}
                variant={mapButtonVariant(button.color, button.variant)}
                onClick={() => handleComplete(button.value)}
                disabled={disabled}
                autoFocus={button.color === "primary"}
              >
                {button.title}
              </Button>
            );
          })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
