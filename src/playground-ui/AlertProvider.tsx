import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react";
import { AlertDialog } from "./AlertDialog";

export interface AlertProps {
  /**
   * title is the title of the alert.
   */
  title: React.ReactNode;

  /**
   * content is the content of the alert.
   */
  content: React.ReactNode;

  /**
   * buttonTitle is the title of the single close button on the alert dialog.
   */
  buttonTitle: React.ReactNode;
}

export type AlertCallback = () => void;

export type ShowAlert = (props: AlertProps, callback: AlertCallback) => any;

const AlertContext = React.createContext<ShowAlert | undefined>(undefined);

/**
 * AlertProvider provides the alert dialog UI.
 */
export function AlertProvider(props: PropsWithChildren<any>) {
  const [alertProps, setAlertProps] = useState<AlertProps>({
    title: "",
    content: "",
    buttonTitle: "",
  });
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertCallback, setAlertCallback] = useState<{
    callback: AlertCallback | undefined;
  }>({ callback: undefined });

  const handleClose = () => {
    if (alertCallback.callback !== undefined) {
      alertCallback.callback();
    }

    setIsAlertOpen(false);
  };

  const showAlert = (props: AlertProps, callback: AlertCallback) => {
    setAlertProps(props);
    setAlertCallback({ callback: callback });
    setIsAlertOpen(true);
  };

  return (
    <>
      <AlertDialog
        isOpen={isAlertOpen}
        handleClose={handleClose}
        {...alertProps}
      />
      <AlertContext.Provider value={showAlert}>
        {props.children}
      </AlertContext.Provider>
    </>
  );
}

/**
 * useAlert provides a hook for displaying an alert dialog. Requires the AlertProvider
 * to be installed in the parent DOM tree.
 * @example
 *      const {showAlert} = useAlert();
 *      showAlert({
 *          'title': 'Title',
 *          'content': 'Content',
 *          'buttonTitle': 'The button',
 *      })
 */
export function useAlert() {
  const showAlertCallback = useContext(AlertContext);
  if (showAlertCallback === undefined) {
    throw Error("Missing AlertProvider");
  }

  const showAlert = useCallback(
    (props: AlertProps) => {
      const promise = new Promise<void>((resolve: () => void) => {
        showAlertCallback(props, resolve);
      });

      return promise;
    },
    [showAlertCallback]
  );

  return { showAlert };
}
