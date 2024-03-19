import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import clsx from 'clsx';
import React from 'react';

// Based on: https://material-ui.com/components/drawers/#mini-variant-drawer
const useStyles = (drawerWidth: number) => makeStyles((theme: Theme) =>
    createStyles({
        drawer: {
            width: drawerWidth,
            flexShrink: 0,
            whiteSpace: 'nowrap',
        },
        drawerOpen: {
            width: drawerWidth,
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
            overflowY: 'auto'
        },
        drawerClose: {
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
            overflowX: 'hidden',
            width: theme.spacing(8) + 1,
            [theme.breakpoints.up('sm')]: {
                width: theme.spacing(8) + 1,
            },
            overflowY: 'hidden'
        },
        toolbar: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: theme.spacing(0, 1),
            // necessary for content to be below app bar
            ...theme.mixins.toolbar,
        },
    }));

/**
 * Defines the properties for the SideDrawer.
 */
interface SideDrawerProps {
    /**
     * The content of the SideDrawer. Typically, this is a `<List>` component
     * representing the sections of the application.
     */
    content: React.ComponentType<any> | React.ReactElement;

    /**
     * The width of the drawer, in pixels, when open.
     */
    drawerWidth: number;

    /**
     * Whether the SideDrawer is currently fully open and displayed. If `false`,
     * the drawer will be displayed in a collapsed state.
     */
    isSideBarOpen: boolean;

    /**
     * Callback function to close the drawer.
     */
    closeDrawer: () => boolean;
}

export const SideDrawerOpenContext = React.createContext(false)

/**
 * SideDrawer defines a collapsable Drawer component which is locked to the side
 * of the application and provides sectioning and navigation support. Typically,
 * the SideDrawer will consist of a full set of navigation sections,
 * via `<ListItemNavLink>` elements, as well as extra information.
 * 
 * @param props The properties for the SideDrawer.
 * @example <SideDrawer drawerWidth={drawerWidth} closeDrawer={toggleDrawer} isSideBarOpen={isSideBarOpen} content={drawerContent} />
 */
export default function SideDrawer(props: SideDrawerProps) {
    const classes = useStyles(props.drawerWidth)();
    const theme = useTheme();

    return <Drawer
        variant="permanent"
        className={clsx(classes.drawer, {
            [classes.drawerOpen]: props.isSideBarOpen,
            [classes.drawerClose]: !props.isSideBarOpen,
        })}
        classes={{
            paper: clsx({
                [classes.drawerOpen]: props.isSideBarOpen,
                [classes.drawerClose]: !props.isSideBarOpen,
            }),
        }}>
        <div className={classes.toolbar}>
            <IconButton onClick={props.closeDrawer}>
                {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
        </div>
        <Divider />
        <SideDrawerOpenContext.Provider value={props.isSideBarOpen}>
            {props.content}
        </SideDrawerOpenContext.Provider>
    </Drawer>;
}