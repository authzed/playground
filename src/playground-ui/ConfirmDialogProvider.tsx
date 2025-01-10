import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  ConfirmCallback,
  ConfirmDialog,
  ConfirmDialogButton,
} from "./ConfirmDialog";

export interface ConfirmProps<B extends string> {
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
  buttons: ConfirmDialogButton<B>[];

  /**
   * withPrompt, if specified, indicates a prompt should be displayed with
   * the given string as the placeholder.
   */
  withPrompt?: string;
}

export type ShowConfirm = <B extends string>(
  props: ConfirmProps<B>,
  callback: ShowConfirmCallback<B>
) => any;
export type ShowConfirmCallback<B extends string> = (
  result: [B, string | undefined]
) => void;

const ConfirmDialogContext = React.createContext<ShowConfirm | undefined>(
  undefined
);

/**
 * ConfirmDialogProvider provides the confirm dialog UI.
 */
export function ConfirmDialogProvider(props: PropsWithChildren<any>) {
  const [confirmProps, setConfirmProps] = useState<ConfirmProps<string>>({
    title: "",
    content: "",
    buttons: [],
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<{
    callback: ConfirmCallback<string> | undefined;
  }>({ callback: undefined });

  const showConfirm = <B extends string>(
    props: ConfirmProps<B>,
    callback: ShowConfirmCallback<B>
  ) => {
    setConfirmProps(props);
    setConfirmCallback({
      callback: (value: string, promptValue?: string) => {
        callback([value as B, promptValue]);
      },
    });
    setIsConfirmOpen(true);
  };

  const handleCompleted = (value: string, promptValue?: string) => {
    if (confirmCallback.callback !== undefined) {
      confirmCallback.callback(value, promptValue);
    }
    setIsConfirmOpen(false);
  };

  return (
    <>
      <ConfirmDialog<string>
        isOpen={isConfirmOpen}
        handleComplete={handleCompleted}
        {...confirmProps}
      />
      <ConfirmDialogContext.Provider value={showConfirm}>
        {props.children}
      </ConfirmDialogContext.Provider>
    </>
  );
}

/**
 * useConfirmDialog provides a hook for displaying a confirm dialog. Requires the ConfirmProvider
 * to be installed in the parent DOM tree.
 * @example
 *      const {showConfirm} = useConfirmDialog();
 *      const [result] = await showConfirm({
 *          'title': 'Title',
 *          'content': 'Content',
 *          'buttons': [....]
 *      })
 */
export function useConfirmDialog() {
  const showConfirmCallback = useContext(ConfirmDialogContext);
  if (showConfirmCallback === undefined) {
    throw Error("Missing ConfirmDialogProvider");
  }

  const showConfirm = useCallback(
    <B extends string>(props: ConfirmProps<B>) => {
      const promise = new Promise<[B, string?]>(
        (
          resolve: (value: [B, string?] | PromiseLike<[B, string?]>) => void
        ) => {
          showConfirmCallback(props, resolve);
        }
      );

      return promise;
    },
    [showConfirmCallback]
  );

  return { showConfirm };
}
