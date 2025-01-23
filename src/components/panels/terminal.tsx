import TabLabel from '../../playground-ui/TabLabel';
import { mergeRelationshipsStringAndComments } from '../../spicedb-common/parsing';
import { TerminalSection } from '../../spicedb-common/services/zedterminalservice';
import { faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import LinearProgress from '@material-ui/core/LinearProgress';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { Alert, Color } from '@material-ui/lab';
import Convert from 'ansi-to-html';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, KeyboardEvent, ChangeEvent, ReactNode } from 'react';
import 'react-reflex/styles.css';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { DataStoreItemKind } from '../../services/datastore';
import { PanelProps } from './base/common';
import { PlaygroundPanelLocation } from './panels';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    terminalOutputDisplay: {
      fontFamily: 'Roboto Mono, monospace',
      overflowY: 'auto',
    },
    terminalOutput: {
      padding: theme.spacing(1),
      margin: theme.spacing(1),
      backgroundColor: theme.palette.getContrastText(
        theme.palette.text.primary
      ),
      border: '1px solid transparent',
      borderColor: theme.palette.divider,
    },
    input: {
      width: '100%',
      fontFamily: 'Roboto Mono, monospace',
    },
    root: {
      padding: theme.spacing(1),
      position: 'absolute',
      top: '0px',
      left: '0px',
      right: '0px',
      bottom: '0px',
      overflow: 'auto',
    },
    loadBar: {
      padding: theme.spacing(1),
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      columnGap: theme.spacing(1),
      alignItems: 'center',
    },
  })
);

export function TerminalSummary() {
    return (
    <TabLabel
      icon={<FontAwesomeIcon icon={faTerminal} />}
      title="Zed Terminal"
    />
  );
}

export function TerminalPanel(props: PanelProps<PlaygroundPanelLocation>) {
  const classes = useStyles();
  const zts = props.services.zedTerminalService!;

  useEffect(() => {
    zts.start();
  }, [zts]);

  const [command, setCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(zts.commandHistory.length);

  const datastore = props.datastore;
  const endOfContainer = useRef<HTMLDivElement>(null);

  useDeepCompareEffect(() => {
    if (endOfContainer.current) {
      endOfContainer.current?.scrollIntoView();
    }
  }, [zts.outputSections]);

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'arrowup') {
      const updatedHistoryIndex = historyIndex - 1;
      if (updatedHistoryIndex < 0) {
        return;
      }

      setCommand(zts.commandHistory[updatedHistoryIndex]);
      setHistoryIndex(updatedHistoryIndex);
    }

    if (e.key.toLowerCase() === 'arrowdown') {
      const updatedHistoryIndex = historyIndex + 1;
      if (updatedHistoryIndex >= zts.commandHistory.length) {
        setCommand('');
        return;
      }

      setCommand(zts.commandHistory[updatedHistoryIndex]);
      setHistoryIndex(updatedHistoryIndex);
    }

    const cmd = command.trim();
    if (e.key.toLowerCase() === 'enter' && cmd.length > 0) {
      const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA)
        .editableContents!;
      const relationshipsString = datastore.getSingletonByKind(
        DataStoreItemKind.RELATIONSHIPS
      ).editableContents!;
      const [result, historyCount] = zts.runCommand(
        cmd,
        schema,
        relationshipsString
      );
      setCommand('');
      setHistoryIndex(historyCount);

      if (result?.updatedRelationships) {
        const relItem = datastore.getSingletonByKind(
          DataStoreItemKind.RELATIONSHIPS
        );
        const merged = mergeRelationshipsStringAndComments(
          relItem.editableContents,
          result.updatedRelationships
        );
        datastore.update(relItem, merged);
      }
    }
  };

  const handleCommandChanged = (e: ChangeEvent<HTMLInputElement>) => {
    setCommand(e.target.value);
  };

  const zedState = zts.state;
  const zedStateStatusDisplay = useMemo(() => {
    switch (zedState.status) {
      case 'initializing':
        return <div>Initializing Terminal</div>;

      case 'loading':
        return (
          <div className={classes.loadBar}>
            Loading Terminal:
            <LinearProgress
              variant="determinate"
              value={Math.floor(zedState.progress * 100)}
            />
          </div>
        );

      case 'loaderror':
        return (
          <Alert severity="error">
            Could not start the Terminal. Please make sure you have WebAssembly
            enabled.
          </Alert>
        );

      case 'unsupported':
        return (
          <Alert severity="error">
            Your browser does not support WebAssembly
          </Alert>
        );

      case 'ready':
        return undefined;
    }
  }, [zedState, classes.loadBar]);

  const inputRef = useRef<HTMLInputElement>();

  const handleRefocus = () => {
    inputRef.current?.focus();
  };

  const handleMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    const hasSelection = !!getSelectedTextWithin(event.target as Element);
    if (!hasSelection) {
      inputRef.current?.focus();
    }
  };

  // Focus the command input when the tab is shown.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={classes.root} onMouseUp={handleMouseUp}>
      {zedStateStatusDisplay}
      {zedState.status === 'ready' && (
        <>
          <TerminalOutputDisplay
            sections={zts.outputSections}
            onRefocus={handleRefocus}
          />
          <Input
            inputRef={inputRef}
            className={classes.input}
            startAdornment={<InputAdornment position="start">$</InputAdornment>}
            onKeyUp={handleKeyUp}
            value={command}
            onChange={handleCommandChanged}
            disableUnderline
          />
          <div ref={endOfContainer}></div>
        </>
      )}
    </div>
  );
}

function convertStringOutput(convert: Convert, o: string, showLogs: boolean) {
  let isLog = false;
  if (o.startsWith('{')) {
    try {
      const parsed = JSON.parse(o);
      isLog = parsed['is-log'];
      if (isLog) {
        if (!showLogs) {
          return undefined;
        }

        const severity: Record<string, Color> = {
          trace: 'info',
          debug: 'info',
          info: 'info',
          warning: 'warning',
          error: 'error',
        };
        return (
          <Alert
            variant="outlined"
            severity={severity[parsed['level']]}
            style={{ padding: 0, border: '0px' }}
          >
            {Object.keys(parsed).map((k) => {
              if (k === 'is-log') {
                return undefined;
              }

              return (
                <span>
                  {k}: {JSON.stringify(parsed[k])}&nbsp;
                </span>
              );
            })}
          </Alert>
        );
      }
    } catch (e) {
      // Do nothing.
        console.error(e)
    }
  }

  const output =
      // TODO: rewrite this to remove use of replaceAll
      // @ts-expect-error replaceAll comes from a string polyfill.
    convert.toHtml(o.replaceAll(' ', '\xa0').replaceAll('\t', '\xa0\xa0')) ||
    '&nbsp;';
  return <div dangerouslySetInnerHTML={{ __html: output }}></div>;
}

function TerminalOutputDisplay(props: {
  sections: TerminalSection[];
  showLogs?: boolean;
  onRefocus?: () => void;
}) {
  const classes = useStyles();
  const convert = new Convert({
    escapeXML: true,
  });
  const children = props.sections.flatMap(
    (section: TerminalSection): ReactNode => {
      if ('command' in section) {
        return <div>$ {section.command}</div>;
      } else {
        return (
          <div className={classes.terminalOutput}>
            {section.output
              .split('\n')
              .map((o) =>
                convertStringOutput(convert, o, props.showLogs ?? false)
              )}
          </div>
        );
      }
    }
  );
  const handleMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    const hasSelection = !!getSelectedTextWithin(event.target as Element);
    if (props.onRefocus && !hasSelection) {
      props.onRefocus();
    }
    if (hasSelection) {
      event.stopPropagation();
    }
  };

  return (
    <div className={classes.terminalOutputDisplay} onMouseUp={handleMouseUp}>
      {children}
    </div>
  );
}

// Based on: https://stackoverflow.com/a/5801903
function getSelectedTextWithin(el: Element) {
  let selectedText = '';
  if (typeof window.getSelection != 'undefined') {
    const sel = window.getSelection();
    let rangeCount: number;
    if (sel && (rangeCount = sel.rangeCount) > 0) {
      const range = document.createRange();
      for (let i = 0, selRange: Range; i < rangeCount; ++i) {
        range.selectNodeContents(el);
        selRange = sel.getRangeAt(i);
        if (
          selRange.compareBoundaryPoints(range.START_TO_END, range) === 1 &&
          selRange.compareBoundaryPoints(range.END_TO_START, range) === -1
        ) {
          if (
            selRange.compareBoundaryPoints(range.START_TO_START, range) === 1
          ) {
            range.setStart(selRange.startContainer, selRange.startOffset);
          }
          if (selRange.compareBoundaryPoints(range.END_TO_END, range) === -1) {
            range.setEnd(selRange.endContainer, selRange.endOffset);
          }
          selectedText += range.toString();
        }
      }
    }
  }
  return selectedText;
}
