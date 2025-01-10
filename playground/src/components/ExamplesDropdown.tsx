import { Example, LoadExamples } from '../spicedb-common/examples';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CircularProgress, MenuItem } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import { Theme, createStyles, makeStyles } from '@material-ui/core/styles';
import React, { useEffect, useState } from 'react';

const ITEM_HEIGHT = 68;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    loading: {
      margin: theme.spacing(2),
      display: 'flex',
      alignItems: 'center',
    },
  })
);

export function ExamplesDropdown(props: {
  className?: string;
  disabled?: boolean;
  exampleSelected: (example: Example) => void;
}) {
  const classes = useStyles();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const [examples, setExamples] = useState<Example[] | undefined>(undefined);

  useEffect(() => {
    const fetchExamples = async () => {
      if (examples === undefined) {
        setExamples(await LoadExamples());
      }
    };
    fetchExamples();
  }, [examples]);

  const exampleSelected = (ex: Example) => {
    props.exampleSelected(ex);
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        size="small"
        disabled={props.disabled}
        className={props.className}
        onClick={handleClick}
      >
        Select Example Schema&nbsp;
        <FontAwesomeIcon icon={faCaretDown} />
      </Button>
      <Menu
        anchorEl={anchorEl}
        getContentAnchorEl={null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: ITEM_HEIGHT * 4.5,
            width: '50vw',
            maxWidth: '500px',
          },
        }}
      >
        {examples === undefined && (
          <div className={classes.loading}>
            <CircularProgress />
          </div>
        )}
        {examples !== undefined &&
          examples.map((example) => {
            return (
              <MenuItem onClick={() => exampleSelected(example)} key={example.id}>
                <ListItemText
                  primary={example.title}
                  secondary={example.subtitle}
                  secondaryTypographyProps={{
                    style: {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              </MenuItem>
            );
          })}
      </Menu>
    </>
  );
}
