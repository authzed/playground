import UserCard from '@code/playground-ui/src/UserCard';
import { UserProps } from '@code/spicedb-common/src/authn/user';
import Avatar from '@material-ui/core/Avatar';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import { Theme, createStyles, makeStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import ExitToApp from '@material-ui/icons/ExitToApp';
import React from 'react';
import { DataStore } from '../services/datastore';
import { ProblemService } from '../services/problem';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    userAvatar: {
      width: theme.spacing(3),
      height: theme.spacing(3),
    },
  })
);

/**
 * UserDisplayAndDeploy is the UI for displaying the currently logged in user and the deploy
 * button.
 */
export function UserDisplayAndDeploy(props: {
  problemService: ProblemService;
  datastore: DataStore;
  user: UserProps;
  handleLogout: () => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto',
        columnGap: '10px',
      }}
    >
      <UserMenuAndIcon {...props} />
    </div>
  );
}

function UserMenuAndIcon(props: { user: UserProps; handleLogout: () => void }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const classes = useStyles({ prefersDarkMode: prefersDarkMode });

  const user = props.user;

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isProfileMenuOpen = Boolean(anchorEl);
  const renderProfileMenu = (
    <Menu
      elevation={0}
      anchorEl={anchorEl}
      getContentAnchorEl={null}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      open={isProfileMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleMenuClose}>
        <UserCard user={user!} />
      </MenuItem>
      <Divider />
      <MenuItem onClick={props.handleLogout}>
        <ListItemIcon>
          <ExitToApp fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">Sign Out</Typography>
      </MenuItem>
    </Menu>
  );

  return (
    <>
      <IconButton size="small" onClick={handleProfileMenuOpen}>
        <Avatar className={classes.userAvatar} src={user.avatarUrl ?? ''} />
      </IconButton>
      {renderProfileMenu}
    </>
  );
}
