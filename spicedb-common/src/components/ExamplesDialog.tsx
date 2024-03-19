import MarkdownView from '@code/playground-ui/src/MarkdownView';
import TabPanel from '@code/playground-ui/src/TabPanel';
import { Tabs } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import IconButton from '@material-ui/core/IconButton';
import Slide from '@material-ui/core/Slide';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import Tab from '@material-ui/core/Tab';
import { TransitionProps } from '@material-ui/core/transitions/transition';
import CloseIcon from '@material-ui/icons/Close';
import React, { useEffect, useState } from 'react';
import { Example, LoadExamples } from '../examples';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children?: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    appBar: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
    },
    markdown: {
      padding: theme.spacing(2),
      backgroundColor: theme.palette.background.default,
      '& img': {
        maxWidth: '75%',
        padding: theme.spacing(2),
        border: '1px solid transparent',
        borderColor: theme.palette.background.paper,
        backgroundColor: '#F6F6F6',
      },
      '& a': {
        color: theme.palette.getContrastText(theme.palette.background.default),
      },
      '& code': {
        backgroundColor: theme.palette.background.paper,
        padding: theme.spacing(0.25),
      },
      '& pre': {
        backgroundColor: theme.palette.background.paper,
        border: '1px solid transparent',
        borderColor: theme.palette.background.default,
        padding: theme.spacing(2),
        '& code': {
          padding: 0,
        },
      },
    },
    exButtonBar: {
      padding: theme.spacing(2),
      backgroundColor: theme.palette.background.default,
      float: 'right',
    },
    exampleBar: {
      backgroundColor: theme.palette.background.paper,
    },
  })
);

export default function ExamplesDialog(props: {
  offset: number;
  loadExampleData: (ex: Example) => void;
}) {
  const classes = useStyles();
  const [open, setOpen] = useState(true);
  const [examples, setExamples] = useState<Example[]>([]);
  const [currentTabIndex, setCurrentTabIndex] = useState('');

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    (async () => {
      const examples = await LoadExamples();
      setExamples(examples);
      setCurrentTabIndex(examples[0].id);
    })();
  }, []);

  const loadExampleData = (ex: Example) => {
    props.loadExampleData(ex);
    setOpen(false);
  };

  return (
    <div>
      <Dialog
        style={{ top: props.offset }}
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
      >
        <AppBar className={classes.appBar} position="sticky" color="default">
          <Tabs
            value={currentTabIndex}
            onChange={(
              event: React.ChangeEvent<{}>,
              selectedTabIndex: string
            ) => setCurrentTabIndex(selectedTabIndex)}
            aria-label="Tabs"
            indicatorColor="primary"
          >
            {examples.map((ex: Example) => {
              return <Tab key={ex.id} value={ex.id} label={ex.title} />;
            })}
          </Tabs>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </AppBar>
        {examples.map((ex: Example) => {
          return (
            <TabPanel key={ex.id} index={currentTabIndex} value={ex.id}>
              <div className={classes.exButtonBar}>
                <Button
                  onClick={() => loadExampleData(ex)}
                  size="large"
                  variant="contained"
                  color="primary"
                >
                  Load Example Data
                </Button>
              </div>
              <div className={classes.markdown}>
                <MarkdownView markdown={ex.documentation} />
              </div>
            </TabPanel>
          );
        })}
      </Dialog>
    </div>
  );
}
