import AppBar from '@material-ui/core/AppBar';
import Badge from '@material-ui/core/Badge';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Popover from '@material-ui/core/Popover';
import { createStyles, fade, makeStyles, Theme } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ExitToApp from '@material-ui/icons/ExitToApp';
import MenuIcon from '@material-ui/icons/Menu';
import MenuOpenIcon from '@material-ui/icons/MenuOpen';
import MoreIcon from '@material-ui/icons/MoreVert';
import NotificationsIcon from '@material-ui/icons/Notifications';
import NotificationsNoneIcon from '@material-ui/icons/NotificationsNone';
import clsx from 'clsx';
import { bindPopover, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserProps } from './User';
import UserCard from './UserCard';
import UserIcon from './UserIcon';

// Based on: https://material-ui.com/components/drawers/#mini-variant-drawer

/**
 * Defines content and state that will appear in the app bar.
 */
export interface AppBarState {
    /**
     * title defines the content to display as the Application title.
     */
    title: React.ComponentType<any> | React.ReactElement;

    /**
     * Sets the user information.
     */
    user: UserProps;

    /**
     * notificationCount is the number of notifications for the user.
     */
    notificationCount: number;

    /**
     * hasAdditionalNotifications indicates whether there are additional notifications
     * for the user, beyond those loaded.
     */
    hasAdditionalNotifications: boolean;

    /**
     * statusElement is the element to show in the status view.
     */
    statusElement?: React.ReactNode;

    /**
     * notificationElement is the element to show in the notifications view.
     */
    notificationElement?: React.ReactNode | undefined;

    /**
     * searchElement is, if specified, the element to show as the search box.
     */
    searchElement?: React.ReactNode;

    /**
     * The action to perform for signing out.
     */
    signoutAction: () => void;

    /**
     * userContext displays additional context for the user, if any, right next to the username.
     * For example, this might be the currently selected organization.
     */
    userContext?: React.ReactNode;

    /**
     * additionalUserMenuOptions holds any additional UI to place in the user menu.
     */
    additionalUserMenuOptions?: React.ReactElement;
}


/**
 * Defines the properties for the AppBar.
 */
interface AppBarProps {
    /**
     * The state and content for the app bar.
     */
    state: AppBarState;

    /**
     * shiftWithDrawer if specified and true, will shift the AppBar when the side
     * drawer is open.
     */
    shiftWithDrawer?: boolean;

    /**
     * The width of the SideDrawer, in pixels.
     */
    drawerWidth: number;

    /**
     * Whether the SideDrawer is currently open or collapsed.
     */
    isSideBarOpen: boolean;

    /**
     * Callback function to toggle the drawer.
     */
    toggleDrawer: () => boolean;

    /**
     * isDrawerEnabled indicates whether the side drawer is enabled. Defaults to true.
     */
    isDrawerEnabled?: boolean;
}

const useStyles = (drawerWidth: number) => makeStyles((theme: Theme) =>
    createStyles({
        grow: {
            flexGrow: 1,
        },
        appBar: {
            zIndex: theme.zIndex.drawer + 1,
            transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
        },
        appBarShift: {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
        },
        menuButton: {
            marginRight: theme.spacing(2),
        },
        title: {
            display: 'none',
            [theme.breakpoints.up('sm')]: {
                display: 'block',
            },
            minWidth: '130px'
        },
        titleNavLink: {
            color: theme.palette.common.white,
            textDecoration: 'none',
        },

        status: {
            position: 'relative',
            padding: 0,
            margin: 0,
            marginRight: theme.spacing(1),
            marginLeft: 0,
            display: 'flex',
            alignItems: 'center'
        },

        search: {
            position: 'relative',
            borderRadius: theme.shape.borderRadius,
            backgroundColor: fade(theme.palette.common.white, 0.15),
            '&:hover': {
                backgroundColor: fade(theme.palette.common.white, 0.25),
            },
            marginRight: theme.spacing(2),
            marginLeft: 0,
            width: '100%',
            [theme.breakpoints.up('sm')]: {
                marginLeft: theme.spacing(3),
                width: 'auto',
            },
        },
        sectionDesktop: {
            display: 'none',
            [theme.breakpoints.up('md')]: {
                display: 'flex',
            },
        },
        sectionMobile: {
            display: 'flex',
            [theme.breakpoints.up('md')]: {
                display: 'none',
            },
        },
    }),
);


/**
 * PrimarySearchAppBar is the top search and app bar displayed in the application.
 * @param props The properties for the PrimarySearchAppBar.
 * @example <PrimarySearchAppBar state={appBarState} drawerWidth={drawerWidth} toggleDrawer={toggleDrawer} isSideBarOpen={isSideBarOpen} />
 */
export default function PrimarySearchAppBar(props: AppBarProps) {
    const classes = useStyles(props.drawerWidth)();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState<null | HTMLElement>(null);

    // We define two menus:
    // - One to be displayed for the user, with its information.
    // - One to be displayed on mobile devices, containing the actions otherwise hidden.
    const isProfileMenuOpen = Boolean(anchorEl);
    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMobileMenuClose = () => {
        setMobileMoreAnchorEl(null);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        handleMobileMenuClose();
    };

    const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setMobileMoreAnchorEl(event.currentTarget);
    };

    const menuId = 'primary-search-account-menu';
    const renderProfileMenu = (
        <Menu
            elevation={0}
            anchorEl={anchorEl}
            getContentAnchorEl={null}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{
                vertical: "top", horizontal: "right"
            }}
            id={menuId}
            keepMounted
            open={isProfileMenuOpen}
            onClose={handleMenuClose}
        >
            <MenuItem onClick={handleMenuClose}>
                <UserCard user={props.state.user} />
            </MenuItem>
            {props.state.additionalUserMenuOptions}
            <Divider />
            <MenuItem onClick={props.state.signoutAction}>
                <ListItemIcon>
                    <ExitToApp fontSize="small" />
                </ListItemIcon>
                <Typography variant="inherit">Sign Out</Typography>
            </MenuItem>
        </Menu >
    );

    const notificationCountText = props.state.notificationCount ? `${props.state.notificationCount}${props.state.hasAdditionalNotifications ? '+' : ''}` : null;

    const mobileMenuId = 'primary-search-account-menu-mobile';
    const renderMobileMenu = (
        <Menu
            anchorEl={mobileMoreAnchorEl}
            getContentAnchorEl={null}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            id={mobileMenuId}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={isMobileMenuOpen}
            onClose={handleMobileMenuClose}
        >
            <MenuItem>
                <IconButton
                    aria-label="account of current user"
                    aria-controls="primary-search-account-menu"
                    aria-haspopup="true"
                    color="inherit"
                >
                    <UserIcon {...props.state.user} />
                </IconButton>
                <p>{props.state.user.username}</p>
            </MenuItem>
            <Divider />
            {props.state.additionalUserMenuOptions}
            {props.state.notificationElement !== undefined &&
                <>
                    <MenuItem>
                        <IconButton aria-label="show new notifications" color="inherit">
                            <Badge badgeContent={notificationCountText} color="secondary">
                                {props.state.notificationCount ? <NotificationsIcon /> : <NotificationsNoneIcon />}
                            </Badge>
                        </IconButton>
                        <p>Notifications</p>
                    </MenuItem>
                    <Divider />
                </>
            }
            <MenuItem onClick={props.state.signoutAction}>
                Sign Out
            </MenuItem>
        </Menu>
    );

    const NotificationsIconAndPopup = () => {
        const popupState = usePopupState({
            variant: 'popover',
            popupId: 'notificationPopover',
        })
        return (
            <div style={{ 'display': 'inherit' }}>
                {props.state.notificationElement !== undefined && <IconButton aria-label="show new notifications" color="inherit" {...bindTrigger(popupState)}>
                    <Badge badgeContent={notificationCountText} color="secondary">
                        {props.state.notificationCount ? <NotificationsIcon /> : <NotificationsNoneIcon />}
                    </Badge>
                </IconButton>}
                {
                    props.state.notificationCount > 0 && <Popover
                        {...bindPopover(popupState)}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'center',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                        }}
                    >
                        {props.state.notificationElement}
                    </Popover>
                }
            </div>
        )
    };

    const isSideBarOpen = props.isSideBarOpen && props.isDrawerEnabled !== false;
    return (
        <div>
            <AppBar position="fixed"
                className={clsx(classes.appBar, {
                    [classes.appBarShift]: props.shiftWithDrawer === true && isSideBarOpen,
                })}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        className={classes.menuButton}
                        color="inherit"
                        aria-label="open drawer"
                        onClick={props.toggleDrawer}
                        disabled={props.isDrawerEnabled === false}
                    >
                        {isSideBarOpen ? <MenuOpenIcon /> : <MenuIcon />}
                    </IconButton>
                    <Typography className={classes.title} variant="h6" noWrap>
                        <NavLink className={classes.titleNavLink} to="/">{props.state.title}</NavLink>
                    </Typography>
                    {props.state.searchElement !== undefined && <div className={classes.search}>
                        {props.state.searchElement}
                    </div>}
                    <div className={classes.grow} />
                    <div className={classes.sectionDesktop}>
                        {props.state.statusElement !== undefined && <div className={classes.status}>
                            {props.state.statusElement}
                        </div>}
                        <NotificationsIconAndPopup />
                        {props.state.userContext}
                        <IconButton
                            edge="end"
                            aria-label="account of current user"
                            aria-controls={menuId}
                            aria-haspopup="true"
                            onClick={handleProfileMenuOpen}
                            color="inherit"
                        >
                            <UserIcon {...props.state.user} />
                        </IconButton>
                    </div>
                    <div className={classes.sectionMobile}>
                        <IconButton
                            aria-label="show more"
                            aria-controls={mobileMenuId}
                            aria-haspopup="true"
                            onClick={handleMobileMenuOpen}
                            color="inherit"
                        >
                            <MoreIcon />
                        </IconButton>
                    </div>
                </Toolbar>
            </AppBar>
            {renderMobileMenu}
            {renderProfileMenu}
        </div>
    );
}
