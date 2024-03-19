import Avatar from '@material-ui/core/Avatar';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import clsx from 'clsx';
import ColorHash from "color-hash";
import React from "react";

/**
 * Defines the properties for the AppBar.
 */
interface UserIconProps {
    /**
     * The username of the user.
     */
    username: string;

    /**
     * The user's avatar URL, if any.
     */
    avatarUrl?: string | null;

    /**
     * className is the custom CSS class name for this component, if any.
     */
    className?: string

    /** 
     * size is the size of the icon.
     */
    size?: "small" | "normal"
}

interface styleProps {
    userColor: string;
}

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        grow: {
            flexGrow: 1,
        },
        avatar: {
            backgroundColor: (props: styleProps) => props.userColor,
            color: (props: styleProps) => theme.palette.getContrastText(props.userColor),
            width: '1.5em',
            height: '1.5em',
        },
        userIcon: {
            maxWidth: '2em',
            maxHeight: '1.5em',
            display: 'inline-block'
        },
        smallIcon: {

        },
        smallAvatar: {
            width: '1em',
            height: '1em',
        }
    }));

/**
 * UserIcon displays an icon for the user. If the user has an avatar image, it is
 * used (and clipped to a circle). Otherwise, a color-generated Avatar is used.
 * 
 * @param props The props for the UserIcon.
 */
export default function UserIcon(props: UserIconProps) {
    let colorHash = new ColorHash({ lightness: [0.35, 0.5, 0.65] });
    const userColor = colorHash.hex(props.username ?? '');
    const classes = useStyles({ 'userColor': userColor });

    return <span className={clsx(classes.userIcon, { [classes.smallIcon]: props.size === "small" })}>
        <Avatar component='span' aria-label="user icon" src={props.avatarUrl || ''} className={clsx(classes.avatar, props.className, { [classes.smallAvatar]: props.size === "small" })}>
            {props.username ? props.username[0].toUpperCase() : ''}
        </Avatar>
    </span>;
}
