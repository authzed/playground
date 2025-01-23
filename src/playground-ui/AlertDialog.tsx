import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import React from "react";

/**
 * AlertDialogProps are the props for the alert dialog.
 */
export interface AlertDialogProps {
  /**
   * isOpen indicates whether the AlertDialog is currently open.
   */
  isOpen: boolean;

  /**
   * handleClose sets the state that is bound to `isOpen` to false.
   */
  handleClose: () => void;

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

/**
 * AlertDialog provides a simple alert-style dialog.
 * @param props The props for the alert dialog.
 * @example <AlertDialog isOpen={showAlert} handleClose={() => setShowAlert(false)}
 *                       title="My alert" content="Hi there!" buttonTitle="Okay!"/>
 */
export function AlertDialog(props: AlertDialogProps) {
  return (
    <Dialog open={props.isOpen} onClose={props.handleClose}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{props.content} </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.handleClose} color="default" autoFocus>
          {props.buttonTitle}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
