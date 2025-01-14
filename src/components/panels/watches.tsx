import TabLabel from '../../playground-ui/TabLabel';
import {
  ParsedPermission,
  ParsedRelation,
} from '../../spicedb-common/parsers/dsl/dsl';
import { parseRelationships } from '../../spicedb-common/parsing';
import { RelationTuple as Relationship } from '../../spicedb-common/protodefs/core/v1/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import {
  Theme,
  createStyles,
  makeStyles,
  useTheme,
} from '@material-ui/core/styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ControlPointIcon from '@material-ui/icons/ControlPoint';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import VisibilityIcon from '@material-ui/icons/Visibility';
import WarningIcon from '@material-ui/icons/Warning';
import Alert from '@material-ui/lab/Alert';
import Autocomplete from '@material-ui/lab/Autocomplete';
import clsx from 'clsx';
import {
  interpolateBlues,
  interpolateOranges,
  interpolatePurples,
} from 'd3-scale-chromatic';
import { useMemo, useState } from 'react';
import 'react-reflex/styles.css';
import {
  LiveCheckItem,
  LiveCheckItemStatus,
  LiveCheckService,
  LiveCheckStatus,
} from '../../services/check';
import { DataStore, DataStoreItemKind } from '../../services/datastore';
import { LocalParseService } from '../../services/localparse';
import { CheckDebugTraceView } from '../CheckDebugTraceView';
import { TourElementClass } from '../GuidedTour';
import { PanelProps, PanelSummaryProps, useSummaryStyles } from './base/common';
import { ReflexedPanelLocation } from './base/reflexed';
import { PlaygroundPanelLocation } from './panels';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    validationError: {
      border: 0,
    },
    foundVia: {
      marginTop: theme.spacing(1),
    },
    foundViaList: {
      margin: 0,
      fontFamily: 'Roboto Mono, monospace',
      listStyleType: 'none',
      '& li::after': {
        content: '" →"',
      },
      '& li:last-child::after': {
        content: '""',
      },
    },
    editorContainer: {
      display: 'grid',
      alignItems: 'center',
      gridTemplateColumns: 'auto 1fr',
    },
    dot: {
      display: 'inline-block',
      marginRight: theme.spacing(1),
      borderRadius: '50%',
      width: '8px',
      height: '8px',
    },
    progress: {
      color: theme.palette.text.primary,
    },
    success: {
      color: theme.palette.success.main,
    },
    caveated: {
      color: '#8787ff',
    },
    gray: {
      color: theme.palette.grey[500],
    },
    warning: {
      color: theme.palette.warning.main,
    },
    verticalCell: {
      padding: theme.spacing(1),
      border: 0,
    },
  })
);

/**
 * WatchesSummary displays the a summary of the check watches.
 */
export function WatchesSummary(
  props: PanelSummaryProps<PlaygroundPanelLocation>
) {
  const classes = useSummaryStyles();

  const liveCheckService = props.services.liveCheckService;

  const hasItems = liveCheckService.items.length > 0;
  const foundItems = liveCheckService.items.filter(
    (item: LiveCheckItem) => item.status === LiveCheckItemStatus.FOUND
  );
  const caveatedItems = liveCheckService.items.filter(
    (item: LiveCheckItem) => item.status === LiveCheckItemStatus.CAVEATED
  );
  const notFoundItems = liveCheckService.items.filter(
    (item: LiveCheckItem) => item.status === LiveCheckItemStatus.NOT_FOUND
  );
  const invalidItems = liveCheckService.items.filter(
    (item: LiveCheckItem) => item.status === LiveCheckItemStatus.INVALID
  );
  const hasServerErr = !!liveCheckService.state.serverErr;

  return (
    <div
      className={clsx(classes.checkTab, TourElementClass.checkwatch, {
        [classes.checkTabWithItems]: hasItems,
      })}
    >
      <TabLabel
        icon={
          <VisibilityIcon
            htmlColor={liveCheckService.items.length === 0 ? 'grey' : ''}
          />
        }
        title="Check Watches"
      />
      {!hasServerErr && hasItems && (
        <Tooltip title="Successful Checks">
          <span
            className={clsx(classes.badge, {
              [classes.successBadge]: foundItems.length > 0,
            })}
          >
            {foundItems.length}
          </span>
        </Tooltip>
      )}
      {!hasServerErr && hasItems && (
        <Tooltip title="Caveated Checks">
          <span
            className={clsx(classes.badge, {
              [classes.caveatedBadge]: caveatedItems.length > 0,
            })}
          >
            {caveatedItems.length}
          </span>
        </Tooltip>
      )}
      {!hasServerErr && hasItems && (
        <Tooltip title="Invalid Checks">
          <span
            className={clsx(classes.badge, {
              [classes.invalidBadge]: invalidItems.length > 0,
            })}
          >
            {invalidItems.length}
          </span>
        </Tooltip>
      )}
      {!hasServerErr && hasItems && (
        <Tooltip title="Failed Checks">
          <span
            className={clsx(classes.badge, {
              [classes.failBadge]: notFoundItems.length > 0,
            })}
          >
            {notFoundItems.length}
          </span>
        </Tooltip>
      )}
      {hasServerErr && <ErrorOutlineIcon color="error" />}
    </div>
  );
}

export function WatchesPanel(props: PanelProps<PlaygroundPanelLocation>) {
  const liveCheckService = props.services.liveCheckService;
  const localParseService = props.services.localParseService;
  const datastore = props.datastore;
  const editorUpdateIndex = -1; // FIXME

  return (
    <TableContainer component={Paper}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell></TableCell>
            {props.location === ReflexedPanelLocation.HORIZONTAL && (
              <>
                <TableCell>Resource</TableCell>
                <TableCell>Permission</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Context (optional)</TableCell>
              </>
            )}
            {props.location === ReflexedPanelLocation.VERTICAL && (
              <>
                <TableCell>Resource, Permission, Subject, Context</TableCell>
              </>
            )}
            <TableCell>
              <IconButton
                size="small"
                edge="end"
                onClick={liveCheckService.addItem}
              >
                <ControlPointIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        </TableHead>
        {liveCheckService.state.status === LiveCheckStatus.PARSE_ERROR && (
          <TableHead>
            <TableRow>
              <TableCell colSpan={7}>
                <Alert
                  severity="warning"
                  variant="outlined"
                  style={{ border: 0 }}
                >
                  Checks not run: There is an error in the schema or test
                  relationships
                </Alert>
              </TableCell>
            </TableRow>
          </TableHead>
        )}
        {liveCheckService.state.status === LiveCheckStatus.NEVER_RUN && (
          <TableHead>
            <TableRow>
              <TableCell colSpan={7}>
                <Alert severity="info" variant="outlined" style={{ border: 0 }}>
                  Developer system is currently loading
                </Alert>
              </TableCell>
            </TableRow>
          </TableHead>
        )}
        {liveCheckService.state.status === LiveCheckStatus.SERVICE_ERROR && (
          <TableHead>
            <TableRow>
              <TableCell colSpan={7}>
                <Alert severity="error">
                  {liveCheckService.state.serverErr}
                </Alert>
              </TableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {liveCheckService.items.length > 0 &&
            liveCheckService.items.map((item: LiveCheckItem, index: number) => {
              return (
                <LiveCheckRow
                  key={item.id}
                  location={props.location}
                  service={liveCheckService}
                  localParseService={localParseService}
                  editorUpdateIndex={editorUpdateIndex}
                  datastore={datastore}
                  item={item}
                />
              );
            })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const filter = (values: (string | null)[]): string[] => {
  const filtered = values.filter((v: string | null) => !!v);
  const set = new Set(filtered);
  const deduped: string[] = [];
  set.forEach((value: string | null) => {
    deduped.push(value!);
  });
  return deduped;
};

function LiveCheckRow(props: {
  location: PlaygroundPanelLocation;
  service: LiveCheckService;
  item: LiveCheckItem;
  editorUpdateIndex: number | undefined;
  datastore: DataStore;
  localParseService: LocalParseService;
}) {
  const classes = useStyles();
  const item = props.item;
  const datastore = props.datastore;
  const liveCheckService = props.service;

  const handleDeleteRow = () => {
    liveCheckService.removeItem(item);
  };

  const [object, setObject] = useState(item.object);
  const [action, setAction] = useState(item.action);
  const [subject, setSubject] = useState(item.subject);
  const [context, setContext] = useState(() => {
    // Remove the `default:` prefix we add below.
    if (item.context) {
      return item.context.substring('default:'.length);
    }

    return '';
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const [objectInputValue, setObjectInputValue] = useState(item.object);
  const [actionInputValue, setActionInputValue] = useState(item.action);
  const [subjectInputValue, setSubjectInputValue] = useState(item.subject);

  const handleChangeObjectInput = (event: any, newValue: string) => {
    setObjectInputValue(newValue);
    item.object = newValue;
    liveCheckService.itemUpdated(item);
  };

  const handleChangeObject = (event: any, newValue: string | null) => {
    setObject(newValue ?? '');
    item.object = newValue ?? '';
  };

  const handleChangeActionInput = (event: any, newValue: string) => {
    setActionInputValue(newValue);
    item.action = newValue;
    liveCheckService.itemUpdated(item);
  };

  const handleChangeAction = (event: any, newValue: string | null) => {
    setAction(newValue ?? '');
    item.action = newValue ?? '';
  };

  const handleChangeSubjectInput = (event: any, newValue: string) => {
    setSubjectInputValue(newValue);
    item.subject = newValue;
    liveCheckService.itemUpdated(item);
  };

  const handleChangeSubject = (event: any, newValue: string | null) => {
    setSubject(newValue ?? '');
    item.subject = newValue ?? '';
  };

  const handleChangeContextInput = (event: any) => {
    const newValue = event.target.value;
    setContext(newValue ?? '');
    // NOTE: adding a dummy caveat name to support only specifying the context with checks
    // while preserving the simple approach of parsing all checks as relationships
    item.context = newValue ? `default:${newValue}` : '';
    liveCheckService.itemUpdated(item);
  };

  const relationshipContents =
    props.datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS)
      .editableContents ?? '';
  const relationships = useMemo(() => {
    return parseRelationships(relationshipContents);
  }, [relationshipContents]);

  const objects = useMemo(() => {
    return filter(
      relationships.map((r: Relationship) => {
        const onr = r.resourceAndRelation;
        if (onr === undefined) {
          return null;
        }

        return `${onr.namespace}:${onr.objectId}`;
      })
    );
  }, [relationships]);

  const actions = useMemo(() => {
    const [definitionPath] = objectInputValue.split(':', 2);
    const definition = props.localParseService.lookupDefinition(definitionPath);
    if (definition !== undefined) {
      return definition
        .listRelationsAndPermissions()
        .map((r: ParsedRelation | ParsedPermission) => r.name);
    }

    return filter(
      relationships.map((r: Relationship) => {
        const onr = r.resourceAndRelation;
        if (onr === undefined) {
          return null;
        }

        return onr.relation;
      })
    );

    // NOTE: we include editorUpdateIndex to ensure this is recomputed on
    // editor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datastore, relationships, objectInputValue, props.editorUpdateIndex]);

  const subjects = useMemo(() => {
    return filter(
      relationships.map((r: Relationship) => {
        const subject = r.subject;
        if (subject === undefined) {
          return null;
        }

        if (subject.objectId === '*') {
          return null;
        }

        if (subject.relation === '...') {
          return `${subject.namespace}:${subject.objectId}`;
        }
        return `${subject.namespace}:${subject.objectId}#${subject.relation}`;
      })
    );
  }, [relationships]);

  const renderOption = (
    option: string | undefined,
    optionSet: (string | undefined)[],
    colorSet: (n: number) => string
  ) => {
    return (
      <div className={classes.editorContainer}>
        <DotDisplay
          colorSet={colorSet}
          valueSet={optionSet}
          value={option ?? ''}
        />
        {option}
      </div>
    );
  };

  const status = liveCheckService.state.status;
  const theme = useTheme();
  const wrap = (content: JSX.Element, width: string) => {
    if (props.location === ReflexedPanelLocation.VERTICAL) {
      return (
        <Table>
          <TableRow>
            <TableCell className={classes.verticalCell}>{content}</TableCell>
          </TableRow>
        </Table>
      );
    }

    return <TableCell style={{ width: width }}>{content}</TableCell>;
  };

  return (
    <>
      {item.status === LiveCheckItemStatus.INVALID && (
        <TableRow>
          <TableCell
            colSpan={7}
            style={{
              color: theme.palette.getContrastText(theme.palette.warning.dark),
              backgroundColor: theme.palette.warning.dark,
            }}
          >
            {item.errorMessage}:
          </TableCell>
        </TableRow>
      )}
      <TableRow>
        <TableCell
          style={{
            verticalAlign: 'center',
            width: '1em',
            paddingLeft: '0.5em',
            paddingRight: '0.5em',
          }}
        >
          {item.debugInformation !== undefined && (
            <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </IconButton>
          )}
        </TableCell>

        <TableCell
          style={{
            verticalAlign: 'center',
            width: '1em',
            paddingLeft: '0.5em',
            paddingRight: '0.5em',
          }}
        >
          <div style={{ display: 'flex' }}>
            {status === LiveCheckStatus.CHECKING && (
              <CircularProgress className={classes.progress} size="1.5em" />
            )}
            {status === LiveCheckStatus.PARSE_ERROR && (
              <WarningIcon className={classes.gray} />
            )}
            {status === LiveCheckStatus.SERVICE_ERROR && (
              <ErrorOutlineIcon color="error" />
            )}
            {status === LiveCheckStatus.NEVER_RUN && (
              <RadioButtonUncheckedIcon />
            )}
            {status === LiveCheckStatus.NOT_CHECKING &&
              item.status === LiveCheckItemStatus.FOUND && (
                <CheckCircleIcon className={classes.success} />
              )}
            {status === LiveCheckStatus.NOT_CHECKING &&
              item.status === LiveCheckItemStatus.NOT_FOUND && (
                <HighlightOffIcon color="error" />
              )}
            {status === LiveCheckStatus.NOT_CHECKING &&
              item.status === LiveCheckItemStatus.NOT_CHECKED && (
                <RadioButtonUncheckedIcon />
              )}
            {status === LiveCheckStatus.NOT_CHECKING &&
              item.status === LiveCheckItemStatus.NOT_VALID && (
                <RemoveCircleOutlineIcon className={classes.gray} />
              )}
            {status === LiveCheckStatus.NOT_CHECKING &&
              item.status === LiveCheckItemStatus.INVALID && (
                <ErrorOutlineIcon className={classes.warning} />
              )}
            {status === LiveCheckStatus.NOT_CHECKING &&
              item.status === LiveCheckItemStatus.CAVEATED && (
                <HelpOutlineIcon className={classes.caveated} />
              )}
          </div>
        </TableCell>
        {wrap(
          <div className={classes.editorContainer}>
            <DotDisplay
              colorSet={interpolatePurples}
              valueSet={objects}
              value={objectInputValue}
            />
            <Autocomplete
              freeSolo
              options={objects}
              getOptionLabel={(option: any) => option}
              renderOption={(option) =>
                renderOption(option, objects, interpolatePurples)
              }
              value={object}
              inputValue={objectInputValue}
              onInputChange={handleChangeObjectInput}
              onChange={handleChangeObject}
              fullWidth
              disableClearable
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  fullWidth
                  inputProps={{
                    ...params['inputProps'],
                    style: { fontFamily: 'monospace' },
                  }}
                  placeholder="tenant/namespace:objectid"
                />
              )}
            />
          </div>,
          '28%'
        )}
        {wrap(
          <div className={classes.editorContainer}>
            <DotDisplay
              colorSet={interpolateBlues}
              valueSet={actions}
              value={actionInputValue}
            />
            <Autocomplete
              freeSolo
              options={actions}
              getOptionLabel={(option: any) => option}
              renderOption={(option) =>
                renderOption(option, actions, interpolateBlues)
              }
              value={action}
              inputValue={actionInputValue}
              onInputChange={handleChangeActionInput}
              onChange={handleChangeAction}
              fullWidth
              disableClearable
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  fullWidth
                  inputProps={{
                    ...params['inputProps'],
                    style: { fontFamily: 'monospace' },
                  }}
                  placeholder="view"
                />
              )}
            />
          </div>,
          '18%'
        )}
        {wrap(
          <div className={classes.editorContainer}>
            <DotDisplay
              colorSet={interpolateOranges}
              valueSet={subjects}
              value={subjectInputValue}
            />
            <Autocomplete
              freeSolo
              options={subjects}
              getOptionLabel={(option: any) => option}
              renderOption={(option) =>
                renderOption(option, subjects, interpolateOranges)
              }
              value={subject}
              inputValue={subjectInputValue}
              onInputChange={handleChangeSubjectInput}
              onChange={handleChangeSubject}
              fullWidth
              disableClearable
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  fullWidth
                  inputProps={{
                    ...params['inputProps'],
                    style: { fontFamily: 'monospace' },
                  }}
                  placeholder="tenant/user:someuser"
                />
              )}
            />
          </div>,
          '28%'
        )}
        {wrap(
          <div className={classes.editorContainer}>
            <TextField
              size="small"
              multiline={true}
              fullWidth
              inputProps={{
                style: { fontFamily: 'monospace' },
              }}
              onChange={handleChangeContextInput}
              placeholder='{"field": value}'
              type="text"
              value={context}
            />
          </div>,
          '26%'
        )}
        <TableCell style={{ width: '1em' }}>
          <IconButton size="small" edge="end" onClick={handleDeleteRow}>
            <DeleteForeverIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      {item.debugInformation !== undefined && isExpanded && (
        <TableRow>
          <TableCell colSpan={7}>
            <CheckDebugTraceView
              trace={item.debugInformation.check!}
              localParseService={props.localParseService}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function DotDisplay(props: {
  colorSet: (n: number) => string;
  valueSet: (string | undefined)[];
  value: string;
}) {
  const classes = useStyles();
  const color = props.colorSet(1 - props.valueSet.indexOf(props.value) / 9);
  return (
    <div
      className={classes.dot}
      style={{
        backgroundColor:
          props.valueSet.indexOf(props.value) >= 0 ? color : 'transparent',
      }}
    />
  );
}
