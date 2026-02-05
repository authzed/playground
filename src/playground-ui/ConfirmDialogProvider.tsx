import { useCallback, useContext, useState, createContext, type ReactNode } from "react";
import {
  ConfirmCallback,
  ConfirmDialog,
  ConfirmDialogButton,
  type ConfirmValue,
} from "./ConfirmDialog";

export interface ConfirmProps {
  /**
   * title is the title of the confirm.
   */
  title: ReactNode;

  /**
   * content is the content of the confirm.
   */
  content: ReactNode;

  /**
   * buttons are the buttons on the confirm dialog.
   */
  buttons: ConfirmDialogButton[];

  /**
   * withPrompt, if specified, indicates a prompt should be displayed with
   * the given string as the placeholder.
   */
  withPrompt?: string;

  children?: ReactNode;
}

export type ShowConfirm = (props: ConfirmProps, callback: ShowConfirmCallback) => void;
export type ShowConfirmCallback = (result: [ConfirmValue, string | undefined]) => void;

const ConfirmDialogContext = createContext<ShowConfirm | undefined>(undefined);

/**
 * ConfirmDialogProvider provides the confirm dialog UI.
 */
export function ConfirmDialogProvider(props: { children: ReactNode }) {
  // TODO: this is likely derived state and should be passed through.
  const [confirmProps, setConfirmProps] = useState<ConfirmProps>({
    title: "",
    content: "",
    buttons: [],
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // TODO: this should be a useCallback, probably
  const [confirmCallback, setConfirmCallback] = useState<{
    callback: ConfirmCallback | undefined;
  }>({ callback: undefined });

  // TODO: this should be memoized.
  const showConfirm = (props: ConfirmProps, callback: ShowConfirmCallback) => {
    setConfirmProps(props);
    setConfirmCallback({
      callback: (value: ConfirmValue, promptValue?: string) => {
        callback([value, promptValue]);
      },
    });
    setIsConfirmOpen(true);
  };

  const handleCompleted = (value: ConfirmValue, promptValue?: string) => {
    if (confirmCallback.callback !== undefined) {
      confirmCallback.callback(value, promptValue);
    }
    setIsConfirmOpen(false);
  };

  return (
    <>
      <ConfirmDialog isOpen={isConfirmOpen} handleComplete={handleCompleted} {...confirmProps} />
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
    (props: ConfirmProps) => {
      const promise = new Promise<[ConfirmValue, string?]>(
        (
          resolve: (value: [ConfirmValue, string?] | PromiseLike<[ConfirmValue, string?]>) => void,
        ) => {
          showConfirmCallback(props, resolve);
        },
      );

      return promise;
    },
    [showConfirmCallback],
  );

  return { showConfirm };
}
