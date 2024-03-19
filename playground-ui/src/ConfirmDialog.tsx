import { createStyles, makeStyles, Theme } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import React, { useState } from "react";

/**
 * ConfirmDialogButton is a button in the confirm dialog.
 */
export interface ConfirmDialogButton<B extends string> {
    /**
     * title is the title of the button.
     */
    title: React.ReactNode

    /**
     * value is the value to given to the callback if the button is clicked.
     */
    value: B

    /**
     * color is the color of the button. Default is `default`.
     */
    color?: "default" | "primary" | "secondary"

    /**
     * variant is the variant of the button. Default is `text`.
     */
    variant?: "text" | "outlined" | "contained"

    /**
     * isEnabled, if specified, is the function to run to check if the button should be enabled.
     */
    isEnabled?: (promptValue?: string) => boolean
}

export type ConfirmCallback<B extends string> = (value: B, promptValue?: string) => void;

/**
 * ConfirmDialogProps are the props for the confirm dialog.
 */
export interface ConfirmDialogProps<B extends string> {
    /**
     * isOpen indicates whether the ConfirmDialog is currently open.
     */
    isOpen: boolean

    /**
     * handleComplete sets the state that is bound to `isOpen` to false and
     * returns the value clicked. If the [X] is clicked, the `value` will be
     * undefined.
     */
    handleComplete: ConfirmCallback<B>

    /**
     * title is the title of the confirm.
     */
    title: React.ReactNode

    /**
     * content is the content of the confirm.
     */
    content: React.ReactNode

    /**
     * buttons are the buttons on the confirm dialog.
     */
    buttons: ConfirmDialogButton<B>[]


    /**
     * withPrompt, if specified, indicates a prompt should be displayed with
     * the given string as the placeholder.
     */
    withPrompt?: string;
}


const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        prompt: {
            marginTop: theme.spacing(1),
            width: '100%',
        },
    }));


/**
 * ConfigDialog provides a simple confirm-style dialog.
 * @param props The props for the confirm dialog.
 * @example <ConfirmDialog<SomeEnum> isOpen={showConfirm}
 *                         handleComplete={(value: SomeEnum) => setShowConfirm(false)}
 *                         title="My confirm" content="Hi there!"
 *                         buttons={[{"title": "Close", "value": undefined}]}/>
 */
export function ConfirmDialog<B extends string>(props: ConfirmDialogProps<B>) {
    const [promptValue, setPromptValue] = useState('');
    const classes = useStyles();

    const handleComplete = (value: any) => {
        props.handleComplete(value as B, promptValue);
        setPromptValue('');
    };

    return <Dialog
        open={props.isOpen}
        onClose={() => handleComplete(undefined)}
    >
        <DialogTitle>{props.title}</DialogTitle>
        <DialogContent>
            <DialogContentText>
                {props.content}
                {props.withPrompt !== undefined &&
                    <TextField placeholder={props.withPrompt}
                        className={classes.prompt}
                        variant="outlined"
                        value={promptValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPromptValue(event.target.value)} />
                }
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            {props.buttons.map((button: ConfirmDialogButton<B>, index: number) => {
                return <Button key={index} variant={button.variant}
                    onClick={() => handleComplete(button.value)}
                    color={button.color}
                    disabled={!!props.withPrompt && (!promptValue.length || (button.isEnabled && !button.isEnabled(promptValue))) && !!button.value}
                    autoFocus={button.color === 'primary'}>
                    {button.title}
                </Button>;
            })}
        </DialogActions>
    </Dialog>;
}
