import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { ConfirmProvider } from 'material-ui-confirm';
import React, { PropsWithChildren } from 'react';
import { CookiesProvider, useCookies } from 'react-cookie';
import { AlertProvider } from './AlertProvider';
import { ConfirmDialogProvider } from './ConfirmDialogProvider';
import PlaygroundUIThemed, {
  PlaygroundUIThemedProps,
} from './PlaygroundUIThemed';
import SideDrawer from './SideDrawer';
import PrimarySearchAppBar, { AppBarState } from './Toolbar';

/**
 * Defines the properties for the PlaygroundUI skeletion
 */
interface PlaygroundUIProps {
  /**
   * titleBarState defines the content and state for the application bar.
   */
  titleBarState: AppBarState;

  /**
   * The contents of the side drawer. If undefined, the side drawer will be closed
   * and disabled.
   */
  drawerContent?: React.ComponentType<any> | React.ReactElement;

  /**
   * themedProps are the props for the theme.
   */
  themedProps?: PlaygroundUIThemedProps;
}

const drawerWidth = 240; // pixels

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
    },
    content: {
      flexGrow: 1,
      padding: theme.spacing(3),
    },
    toolbarSpacer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: theme.spacing(0, 1),
      // necessary for content to be below app bar
      ...theme.mixins.toolbar,
    },
  })
);

// Helper component that renders the PlaygroundUI UI. We do so in its own function/component
// to ensure it is fully nested under `<ThemeProvider>` and, thus, properly themed.
function Themed(props: PropsWithChildren<PlaygroundUIProps>) {
  const classes = useStyles();

  const [cookies, setCookie] = useCookies(['sidebarState']);
  const [isSideBarOpen, setSideBarOpen] = React.useState(
    !cookies.sidebarState || cookies.sidebarState === 'open'
  );

  let toggleDrawer = function () {
    if (!props.drawerContent) {
      return true;
    }

    const newState = !isSideBarOpen;
    setSideBarOpen(newState);
    setCookie('sidebarState', newState ? 'open' : 'closed');
    return true;
  };

  return (
    <ConfirmProvider>
      <AlertProvider>
        <ConfirmDialogProvider>
          <div className={classes.root}>
            <PrimarySearchAppBar
              state={props.titleBarState}
              drawerWidth={drawerWidth}
              toggleDrawer={toggleDrawer}
              isDrawerEnabled={props.drawerContent !== undefined}
              isSideBarOpen={isSideBarOpen}
            />
            {props.drawerContent !== undefined && (
              <SideDrawer
                content={props.drawerContent}
                drawerWidth={drawerWidth}
                closeDrawer={toggleDrawer}
                isSideBarOpen={isSideBarOpen}
              />
            )}
            <main className={classes.content}>
              <div className={classes.toolbarSpacer} />
              {props.children}
            </main>
          </div>
        </ConfirmDialogProvider>
      </AlertProvider>
    </ConfirmProvider>
  );
}

/**
 * PlaygroundUI defines a skeleton for modern admin-panel-style React apps.
 *
 * @param props The properties for the PlaygroundUI skeleton.
 * @example <PlaygroundUI appBarState={appBarState} drawerContent={drawerContent}>content</PlaygroundUI>
 */
export default function PlaygroundUI(
  props: PropsWithChildren<PlaygroundUIProps>
) {
  return (
    <PlaygroundUIThemed {...props.themedProps}>
      <CookiesProvider>
        <Themed {...props} />
      </CookiesProvider>
    </PlaygroundUIThemed>
  );
}
