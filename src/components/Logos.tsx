import useMediaQuery from '@material-ui/core/useMediaQuery';
import AUTHZED_DM_SMALL_LOGO from '../assets/favicon-dark-mode.svg?react';
import AUTHZED_SMALL_LOGO from '../assets/favicon.svg?react';

export function NormalLogo() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  // return prefersDarkMode ? <AUTHZED_DM_LOGO /> : <AUTHZED_LOGO />;
  return prefersDarkMode ? <span>SpiceDB</span> : <span>SpiceDB</span>;
}

export function SmallLogo() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  return prefersDarkMode ? <AUTHZED_DM_SMALL_LOGO /> : <AUTHZED_SMALL_LOGO />;
}
