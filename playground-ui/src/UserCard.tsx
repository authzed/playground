import CardHeader from '@material-ui/core/CardHeader';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import React from "react";
import { UserProps } from './User';
import UserIcon from './UserIcon';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
        },
        userIcon: {
            fontSize: '140%',
        }
    }));

/**
 * Defines the properties for the UserCard.
 */
interface UserCardProps {
    /**
     * The user to display.
     */
    user: UserProps
}

export default function UserCard(props: UserCardProps) {
    const classes = useStyles();

    return <div className={classes.root}>
        <CardHeader
            avatar={<UserIcon className={classes.userIcon} {...(props.user)} />}
            title={props.user.fullName || props.user.username}
            subheader={props.user.emailAddress || props.user.username}
        />
    </div>;
}