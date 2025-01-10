import { useAlert } from '../playground-ui/AlertProvider';
import { useConfirmDialog } from '../playground-ui/ConfirmDialogProvider';
import { DiscordChatCrate } from '../playground-ui/DiscordChatCrate';
import { useGoogleAnalytics } from '../playground-ui/GoogleAnalyticsHook';
import TabLabel from '../playground-ui/TabLabel';
import { Example } from '../spicedb-common/examples';
import { DeveloperServiceClient } from '../spicedb-common/protodefs/authzed/api/v0/DeveloperServiceClientPb';
import {
  ShareRequest,
  ShareResponse,
} from '../spicedb-common/protodefs/authzed/api/v0/developer_pb';
import { useDeveloperService } from '../spicedb-common/services/developerservice';
import { useZedTerminalService } from '../spicedb-common/services/zedterminalservice';
import { parseValidationYAML } from '../spicedb-common/validationfileformat';
import { LinearProgress, Tab, Tabs, Tooltip } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import TextField from '@material-ui/core/TextField';
import {
  Theme,
  createStyles,
  darken,
  makeStyles,
} from '@material-ui/core/styles';
import { alpha } from '@material-ui/core/styles/colorManipulator';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CodeIcon from '@material-ui/icons/Code';
import CompareIcon from '@material-ui/icons/Compare';
import DescriptionIcon from '@material-ui/icons/Description';
import FormatTextdirectionLToRIcon from '@material-ui/icons/FormatTextdirectionLToR';
import GetAppIcon from '@material-ui/icons/GetApp';
import GridOnIcon from '@material-ui/icons/GridOn';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import RefreshIcon from '@material-ui/icons/Refresh';
import ShareIcon from '@material-ui/icons/Share';
import Alert from '@material-ui/lab/Alert';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import clsx from 'clsx';
import { saveAs } from 'file-saver';
import { fileDialog } from 'file-select-dialog';
import * as grpcWeb from 'grpc-web';
import React, { useEffect, useMemo, useState } from 'react';
import { useCookies } from 'react-cookie';
import 'react-reflex/styles.css';
import { useHistory, useLocation } from 'react-router-dom';
import sjcl from 'sjcl';
import { useKeyboardShortcuts } from 'use-keyboard-shortcuts';
import { ReactComponent as DISCORD } from '../assets/discord.svg';
import { useLiveCheckService } from '../services/check';
import AppConfig from '../services/configservice';
import {
  RelationshipsEditorType,
  useCookieService,
} from '../services/cookieservice';
import {
  DataStore,
  DataStoreItem,
  DataStoreItemKind,
  DataStorePaths,
  usePlaygroundDatastore,
} from '../services/datastore';
import { useLocalParseService } from '../services/localparse';
import { ProblemService, useProblemService } from '../services/problem';
import { Services } from '../services/services';
import {
  ValidationResult,
  ValidationStatus,
  useValidationService,
} from '../services/validation';
import {
  createValidationYAML,
  normalizeValidationYAML,
} from '../services/validationfileformat';
import { DatastoreRelationshipEditor } from './DatastoreRelationshipEditor';
import { EditorDisplay, EditorDisplayProps } from './EditorDisplay';
import { ExamplesDropdown } from './ExamplesDropdown';
import { GuidedTour, TourElementClass } from './GuidedTour';
import { AT, ET, NS, VL } from './KindIcons';
import { NormalLogo, SmallLogo } from './Logos';
import { ShareLoader } from './ShareLoader';
import { ValidateButton } from './ValidationButton';
import { Panel, useSummaryStyles } from './panels/base/common';
import { ReflexedPanelDisplay } from './panels/base/reflexed';
import { PlaygroundPanelLocation } from './panels/panels';
import { ProblemsPanel, ProblemsSummary } from './panels/problems';
import { TerminalPanel, TerminalSummary } from './panels/terminal';
import { ValidationPanel, ValidationSummary } from './panels/validation';
import { VisualizerPanel, VisualizerSummary } from './panels/visualizer';
import { WatchesPanel, WatchesSummary } from './panels/watches';

export interface AppProps {
  /**
   * withRouter, it specified, is the router to wrap the application with.
   */
  withRouter?: any;
}

const TOOLBAR_BREAKPOINT = 1550; // pixels

interface StyleProps {
  prefersDarkMode: boolean;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    '@global': {
      '.reflex-splitter': {
        backgroundColor: theme.palette.divider + '!important',
        borderColor: theme.palette.divider + '!important',
        borderLeftWidth: '0px !important',
        borderTopWidth: '0px !important',
      },
    },
    root: {
      position: 'absolute',
      top: '0px',
      left: '0px',
      right: '0px',
      bottom: '0px',
    },
    reflexContainerContainer: {
      position: 'absolute',
      top: '98px',
      left: '0px',
      right: '0px',
      bottom: '0px',
      [theme.breakpoints.down(TOOLBAR_BREAKPOINT)]: {
        top: '144px',
      },
    },
    topBar: {
      borderBottom: '1px solid transparent',
      borderBottomColor: theme.palette.divider,
      height: '48px',
      zIndex: 4,
      display: 'grid',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexDirection: 'row',
      columnGap: '10px',
      gridTemplateColumns: 'auto auto 1fr auto auto auto auto auto auto',
      backgroundColor: (props: StyleProps) =>
        props.prefersDarkMode ? '#111' : theme.palette.background.default,
      '& .MuiTab-root': {
        minWidth: 0,
      },
      '& .Mui-selected': {
        backgroundColor: '#222',
        color: 'white !important',
      },
      '& .MuiTabs-indicator': {
        top: 0,
      },
    },
    toolBar: {
      backgroundColor: (props: StyleProps) =>
        props.prefersDarkMode ? '#202020' : theme.palette.background.default,
      display: 'grid',
      flexDirection: 'row',
      columnGap: '10px',
      gridTemplateColumns: 'auto 1fr',
      '& .MuiTab-root': {
        minWidth: 0,
        backgroundColor: (props: StyleProps) =>
          props.prefersDarkMode
            ? '#1b1b1b'
            : darken(theme.palette.background.default, 0.05),
      },
      '& .Mui-selected': {
        backgroundColor: () => alpha(theme.palette.primary.light, 0.15),
        color: `${theme.palette.text.primary} !important`,
      },
      [theme.breakpoints.down(TOOLBAR_BREAKPOINT)]: {
        gridTemplateColumns: '100%',
        gridTemplateRows: 'auto auto',
        backgroundColor: (props: StyleProps) =>
          props.prefersDarkMode
            ? '#1b1b1b'
            : darken(theme.palette.background.default, 0.05),
      },
    },
    contextToolbar: {
      display: 'grid',
      flexDirection: 'row',
      alignItems: 'center',
      gridTemplateColumns: 'auto 1fr auto',
      margin: '6px',
      marginLeft: '0px',
      [theme.breakpoints.down(TOOLBAR_BREAKPOINT)]: {
        backgroundColor: (props: StyleProps) =>
          props.prefersDarkMode ? '#202020' : theme.palette.background.default,
        padding: '6px',
        margin: '0px',
      },
    },
    contextTools: {
      display: 'grid',
      flexDirection: 'row',
      alignItems: 'center',
      gridTemplateColumns: 'auto auto auto',
      columnGap: theme.spacing(1),
      '& .MuiButton-root': {
        borderColor: 'transparent',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        color: `${theme.palette.text.primary} !important`,
      },
      '& .MuiButton-root:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
      },
    },
    expectedActions: {},
    logoContainer: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '1em',
      fontSize: '125%',
      padding: theme.spacing(1),
      fontFamily: 'Roboto Mono, monospace',
      [theme.breakpoints.down('sm')]: {
        paddingTop: theme.spacing(1),
      },
    },
    docsLink: {
      [theme.breakpoints.down('sm')]: {
        display: 'none',
      },
    },
    normalLogo: {
      '& svg': {
        height: '1em',
        marginRight: theme.spacing(1),
      },
      [theme.breakpoints.down('sm')]: {
        display: 'none',
      },
      '& a': {
        textDecoration: 'none',
        color: 'inherit',
      },
    },
    smallLogo: {
      display: 'none',
      [theme.breakpoints.down('sm')]: {
        display: 'flex',
        alignItems: 'center',
        '& a': {
          height: '1.5em',
        },
      },
      '& svg': {
        width: '1.5em',
        height: '1.5em',
      },
    },
    shareUrl: {
      marginRight: theme.spacing(1),
      width: '100%',
    },
    mainContent: {
      position: 'absolute',
      top: '0px',
      left: '0px',
      right: '0px',
      bottom: '0px',
    },
    landing: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      width: '100%',
    },
    editorContainer: {
      height: '60vh',
      width: '100%',
    },
    hideTextOnMed: {
      [theme.breakpoints.down('md')]: {
        justifyContent: 'flex-start',
        overflow: 'hidden',
        width: '28px',
        minWidth: '28px',
        '& .MuiButton-label': {
          justifyContent: 'flex-start',
          overflow: 'hidden',
          width: '28px',
          '& .MuiButton-startIcon.MuiButton-iconSizeSmall': {
            marginLeft: '0px',
          },
        },
      },
    },
    hide: {
      display: 'none',
    },
    title: {
      textAlign: 'center',
      padding: theme.spacing(0.5),
      backgroundColor: theme.palette.background.default,
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      alignItems: 'center',
    },
    btnAccept: {
      '& .MuiSvgIcon-root': {
        fill: theme.palette.success.main,
      },
      color: theme.palette.getContrastText(theme.palette.success.main),
    },
    btnRevert: {
      '& .MuiSvgIcon-root': {
        fill: theme.palette.error.main,
      },
      color: theme.palette.getContrastText(theme.palette.error.main),
    },
    tenantGraphContainer: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.palette.background.default,
      backgroundSize: '20px 20px',
      backgroundImage: `
              linear-gradient(to right, ${darken(
                theme.palette.background.default,
                0.1
              )} 1px, transparent 1px),
              linear-gradient(to bottom, ${darken(
                theme.palette.background.default,
                0.1
              )} 1px, transparent 1px)
            `,
    },
    tenantGraphBar: {
      padding: theme.spacing(1),
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      columnGap: theme.spacing(1),
      alignItems: 'center',
    },
    loadBar: {
      padding: theme.spacing(1),
      display: 'grid',
      gridTemplateColumns: 'auto 500px',
      columnGap: theme.spacing(1),
      alignItems: 'center',
    },
  })
);

enum SharingStatus {
  NOT_RUN = 0,
  SHARING = 1,
  SHARED = 2,
  SHARE_ERROR = 3,
}

interface SharingState {
  status: SharingStatus;
  shareReference?: string;
}

export function FullPlayground(props: { withRouter?: any }) {
  return  <>
      <DiscordChatCrate
        serverId={AppConfig().discord.serverId}
        channelId={AppConfig().discord.channelId}
      />
      <ApolloedPlayground withRouter={props.withRouter} />
    </>
}

function ApolloedPlayground(props: { withRouter?: any }) {
  const datastore = usePlaygroundDatastore();
  const Router = props.withRouter ? props.withRouter : Box;
  return (
    <Router basename={process.env.PUBLIC_URL}>
      <ShareLoader
        datastore={datastore}
        shareUrlRoot="s"
        sharedRequired={false}
      >
        <ThemedAppView key="app" datastore={datastore} />
      </ShareLoader>
    </Router>
  );
}

export function ThemedAppView(props: { datastore: DataStore }) {
  const { pushEvent } = useGoogleAnalytics();
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirmDialog();

  const [sharingState, setSharingState] = useState<SharingState>({
    status: SharingStatus.NOT_RUN,
  });

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const classes = useStyles({ prefersDarkMode: prefersDarkMode });
  const location = useLocation();
  const history = useHistory();

  const datastore = props.datastore;

  const developerService = useDeveloperService();
  const localParseService = useLocalParseService(datastore);
  const liveCheckService = useLiveCheckService(developerService, datastore);
  const validationService = useValidationService(developerService, datastore);
  const problemService = useProblemService(
    localParseService,
    liveCheckService,
    validationService
  );
  const zedTerminalService = useZedTerminalService();

  const services = {
    localParseService,
    liveCheckService,
    validationService,
    problemService,
    developerService,
    zedTerminalService,
  };

  const currentItem = datastore.get(location.pathname);

  const [cookies, setCookie] = useCookies(['dismiss-tour']);
  const [showTour, setShowTour] = useState(cookies['dismiss-tour'] !== 'true');

  useKeyboardShortcuts([
    {
      keys: ['ctrl', 's'],
      onEvent: (event) => {
        // Do nothing. We save automatically.
      },
    },
  ]);

  // Effect: If the user lands on the `/` route, redirect them to the schema editor.
  useEffect(() => {
    (async () => {
      if (currentItem === undefined) {
        history.replace(DataStorePaths.Schema());
      }
    })();
  }, [datastore, currentItem, history]);

  const conductDownload = () => {
    const yamlContents = createValidationYAML(datastore);
    const bitArray = sjcl.hash.sha256.hash(yamlContents);
    const hash = sjcl.codec.hex.fromBits(bitArray).substring(0, 6);
    const blob = new Blob([yamlContents], { type: 'text/yaml;charset=utf-8' });
    saveAs(blob, `authzed-download-${hash}.yaml`);
  };

  const conductUpload = () => {
    (async () => {
      const file = await fileDialog({
        multiple: false,
        strict: true,
        accept: '.yaml',
      });
      if (file) {
        pushEvent('load-yaml', {
          filename: file.name,
        });

        const contents = await getFileContentsAsText(file);
        const uploaded = parseValidationYAML(contents);
        if ('message' in uploaded) {
          showAlert({
            title: 'Could not load uploaded YAML',
            content: `The uploaded validation YAML is invalid: ${uploaded.message}`,
            buttonTitle: 'Okay',
          });
          return;
        }

        services.liveCheckService.clear();

        datastore.loadFromParsed(uploaded);
        datastoreUpdated();

        history.replace(DataStorePaths.Schema());
      }
    })();
  };

  const formatSchema = () => {
    const schema = datastore.getSingletonByKind(
      DataStoreItemKind.SCHEMA
    ).editableContents;
    const request = developerService.newRequest(schema, '');
    request?.formatSchema((result) => {
      datastore.update(
        datastore.getSingletonByKind(DataStoreItemKind.SCHEMA),
        result.formattedSchema
      );
    });
    request?.execute();
  };

  const conductSharing = (callback?: (reference: string) => void) => {
    const developerEndpoint = AppConfig().authzed?.developerEndpoint;
    if (!developerEndpoint) {
      return;
    }

    if (callback !== undefined && sharingState.shareReference !== undefined) {
      callback(sharingState.shareReference);
      return;
    }

    setSharingState({
      status: SharingStatus.SHARING,
    });

    const service = new DeveloperServiceClient(developerEndpoint, null, null);

    const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA)
      .editableContents!;
    const relationshipsYaml = datastore.getSingletonByKind(
      DataStoreItemKind.RELATIONSHIPS
    ).editableContents!;
    const assertionsYaml = datastore.getSingletonByKind(
      DataStoreItemKind.ASSERTIONS
    ).editableContents!;
    const validationYaml = datastore.getSingletonByKind(
      DataStoreItemKind.EXPECTED_RELATIONS
    ).editableContents!;

    // Invoke sharing.
    const request = new ShareRequest();
    request.setSchema(schema);
    request.setRelationshipsYaml(relationshipsYaml);
    request.setAssertionsYaml(assertionsYaml);
    request.setValidationYaml(validationYaml);

    service.share(
      request,
      {},
      (err: grpcWeb.RpcError, response: ShareResponse) => {
        if (err) {
          showAlert({
            title: 'Error sharing',
            content: err.message,
            buttonTitle: 'Okay',
          });
          setSharingState({
            status: SharingStatus.SHARE_ERROR,
          });
          return;
        }

        const reference = response.getShareReference();
        pushEvent('shared', {
          reference: reference,
        });

        setSharingState({
          status: SharingStatus.SHARED,
          shareReference: reference,
        });

        if (callback !== undefined) {
          callback(reference);
        }
      }
    );
  };

  const datastoreUpdated = () => {
    if (sharingState.status !== SharingStatus.NOT_RUN) {
      setSharingState({
        status: SharingStatus.NOT_RUN,
      });
    }
  };

  const askLoadExampleData = async (ex: Example) => {
    const [result] = await showConfirm({
      title: `Replace contents with "${ex.title}"?`,
      content: `This will replace all current Playground data with the example data for "${ex.title}"`,
      buttons: [
        { title: 'Cancel', value: 'undefined' },
        {
          title: `Replace With Example`,
          variant: 'contained',
          color: 'primary',
          value: 'load',
        },
      ],
    });

    if (result !== 'load') {
      return;
    }

    pushEvent('load-example', {
      id: ex.id,
    });

    datastore.loadFromParsed(ex.data);
    datastoreUpdated();

    services.liveCheckService.clear();
    history.replace(DataStorePaths.Schema());
  };

  const [previousValidationForDiff, setPreviousValidationForDiff] = useState<
    string | undefined
  >(undefined);

  const conductValidation = () => {
    validationService.conductValidation((validated: boolean) => {
      return false;
    });
  };

  const handleGenerateAndUpdate = (diff: boolean) => {
    if (previousValidationForDiff !== undefined) {
      setPreviousValidationForDiff(undefined);
      return;
    }

    setPreviousValidationForDiff(undefined);
    validationService.conductValidation(
      (validated: boolean, result: ValidationResult) => {
        if (result.updatedValidationYaml) {
          const updatedYaml = normalizeValidationYAML(
            result.updatedValidationYaml
          );
          const expectedRelations = datastore.getSingletonByKind(
            DataStoreItemKind.EXPECTED_RELATIONS
          );

          if (updatedYaml === expectedRelations.editableContents) {
            return false;
          }

          if (diff) {
            setPreviousValidationForDiff(expectedRelations.editableContents);
          }

          if (!updatedYaml) {
            return false;
          }

          datastore.update(expectedRelations, updatedYaml);
          datastoreUpdated();

          // Rerun validation to remove any errors.
          conductValidation();
          return false;
        }
        return false;
      }
    );
  };

  const handleAcceptDiff = () => {
    setPreviousValidationForDiff(undefined);
  };

  const handleRevertDiff = () => {
    if (previousValidationForDiff !== undefined) {
      const expectedRelations = datastore.getSingletonByKind(
        DataStoreItemKind.EXPECTED_RELATIONS
      );
      datastore.update(expectedRelations, previousValidationForDiff);

      datastoreUpdated();
      setPreviousValidationForDiff(undefined);

      // Rerun validation to remove any errors.
      conductValidation();
    }
  };

  const validationState = validationService.state;

  const handleChangeTab = (
    event: React.ChangeEvent<{}>,
    selectedTabValue: string
  ) => {
    const item = datastore.getById(selectedTabValue)!;
    history.push(item.pathname);
  };

  const setDismissTour = () => {
    setShowTour(false);
    setCookie('dismiss-tour', true);
    history.push(DataStorePaths.Schema());
  };

  const handleTourBeforeStep = (selector: string) => {
    // Activate the Assertions tab before the assertions dialogs
    if (selector.includes(TourElementClass.assert)) {
      history.push(DataStorePaths.Assertions());
    }
  };

  const isOutOfDate = props.datastore.isOutOfDate();
  const cookieService = useCookieService();

  const [relationshipsEditor, setRelationshipEditor] =
    useState<RelationshipsEditorType>(() => {
      if (services.problemService.invalidRelationships.length > 0) {
        return 'code';
      }

      return cookieService.relationshipsEditorType;
    });
  const handleChangeRelationshipEditor = (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    value: any
  ) => {
    const type = value ? value.toString() : 'grid';
    if (
      type === 'grid' &&
      services.problemService.invalidRelationships.length > 0
    ) {
      return;
    }

    cookieService.setRelationshipsEditorType(type);
    setRelationshipEditor(type);
  };

  const appConfig = AppConfig();
  const isSharingEnabled = !!appConfig.authzed?.developerEndpoint;

  return (
    <div className={classes.root}>
      {!global.WebAssembly && (
        <Alert severity="error">
          WebAssembly is disabled but is required for Playground debugging. All
          debugging tools will be disabled.
        </Alert>
      )}
      {isOutOfDate && (
        <Alert severity="warning">
          The contents of the Playground have been updated in another tab.
          Please close this Playground tab.
        </Alert>
      )}
      <GuidedTour
        show={showTour}
        onSkip={setDismissTour}
        onTourEnd={setDismissTour}
        onEnterStep={handleTourBeforeStep}
      />
      <AppBar position="static" color="default" className={classes.topBar}>
        <div className={classes.logoContainer}>
          <div className={classes.normalLogo}>
            <a
              href="https://authzed.com/spicedb"
              rel="noreferrer"
              target="_blank"
            >
              <NormalLogo />
            </a>{' '}
            Playground
          </div>
          <div className={classes.smallLogo}>
            <a
              href="https://authzed.com/spicedb"
              rel="noreferrer"
              target="_blank"
            >
              <SmallLogo />
            </a>
          </div>
        </div>
        {!isOutOfDate && (
          <>
            <ExamplesDropdown
              className={TourElementClass.browse}
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
              exampleSelected={askLoadExampleData}
            />
            <div>
              {sharingState.status === SharingStatus.SHARED && (
                <TextField
                  className={classes.shareUrl}
                  value={`${window.location.protocol}//${window.location.host}${process.env.PUBLIC_URL}/s/${sharingState.shareReference}${location.pathname}`}
                  inputProps={{
                    readOnly: true,
                  }}
                />
              )}
            </div>
            {AppConfig().discord.inviteUrl ? (
              <Button
                className={classes.hideTextOnMed}
                size="small"
                target="_blank"
                rel="noreferrer noopener"
                href={AppConfig().discord.inviteUrl}
                startIcon={
                  <DISCORD
                    viewBox="0 0 71 55"
                    style={{ height: '1em', width: '1em' }}
                  />
                }
              >
                Discuss on Discord
              </Button>
            ) : (
              <span />
            )}
            <Button
              className={clsx(TourElementClass.share, classes.hideTextOnMed, {
                [classes.hide]: !isSharingEnabled,
              })}
              size="small"
              onClick={() => conductSharing()}
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
              startIcon={<ShareIcon />}
            >
              Share
            </Button>
            <Button
              className={classes.hideTextOnMed}
              size="small"
              onClick={conductDownload}
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
              startIcon={<GetAppIcon />}
            >
              Download
            </Button>
            <Button
              className={classes.hideTextOnMed}
              size="small"
              onClick={conductUpload}
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
              startIcon={<InsertDriveFileIcon />}
            >
              Load From File
            </Button>
          </>
        )}
      </AppBar>
      <AppBar className={classes.toolBar} position="static" color="default">
        <Tabs
          value={currentItem?.id}
          onChange={handleChangeTab}
          indicatorColor="primary"
          textColor="primary"
          aria-label="Tabs"
        >
          <Tab
            className={TourElementClass.schema}
            value={datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).id}
            label={
              <TabLabelWithCount
                problemService={problemService}
                kind={DataStoreItemKind.SCHEMA}
                icon={<NS small />}
                title="Schema"
              />
            }
          />
          <Tab
            className={TourElementClass.testrel}
            value={
              datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS).id
            }
            label={
              <TabLabelWithCount
                problemService={problemService}
                kind={DataStoreItemKind.RELATIONSHIPS}
                icon={<VL small />}
                title="Test Relationships"
              />
            }
          />
          <Tab
            className={TourElementClass.assert}
            value={
              datastore.getSingletonByKind(DataStoreItemKind.ASSERTIONS).id
            }
            label={
              <TabLabelWithCount
                problemService={problemService}
                kind={DataStoreItemKind.ASSERTIONS}
                icon={<AT small />}
                title="Assertions"
              />
            }
          />
          <Tab
            value={
              datastore.getSingletonByKind(DataStoreItemKind.EXPECTED_RELATIONS)
                .id
            }
            label={
              <TabLabelWithCount
                problemService={problemService}
                kind={DataStoreItemKind.EXPECTED_RELATIONS}
                icon={<ET small />}
                title="Expected Relations"
              />
            }
          />
        </Tabs>

        <div className={classes.contextToolbar}>
          <div className={classes.contextTools}>
            {currentItem?.kind === DataStoreItemKind.SCHEMA && (
              <Button
                variant="contained"
                onClick={formatSchema}
                startIcon={<FormatTextdirectionLToRIcon />}
              >
                Format
              </Button>
            )}

            {currentItem?.kind === DataStoreItemKind.RELATIONSHIPS && (
              <div>
                <ToggleButtonGroup
                  value={relationshipsEditor}
                  exclusive
                  onChange={handleChangeRelationshipEditor}
                  aria-label="relationship editor view"
                >
                  <ToggleButton
                    value="grid"
                    aria-label="grid editor"
                    disabled={
                      services.problemService.invalidRelationships.length > 0
                    }
                  >
                    <Tooltip title="Grid Editor">
                      <GridOnIcon style={{ fontSize: '1em' }} />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="code" aria-label="code editor">
                    <Tooltip title="Text Editor (Advanced)">
                      <CodeIcon style={{ fontSize: '1em' }} />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>
            )}

            {currentItem?.kind === DataStoreItemKind.ASSERTIONS && (
              <ValidateButton
                datastore={datastore}
                validationState={validationState}
                conductValidation={conductValidation}
                developerService={developerService}
              />
            )}

            {currentItem?.kind === DataStoreItemKind.EXPECTED_RELATIONS && (
              <ValidateButton
                datastore={datastore}
                validationState={validationState}
                conductValidation={conductValidation}
                developerService={developerService}
              />
            )}

            {currentItem?.kind === DataStoreItemKind.EXPECTED_RELATIONS &&
              previousValidationForDiff === undefined && (
                <ButtonGroup className={classes.expectedActions}>
                  <Button
                    variant="contained"
                    disabled={
                      developerService.state.status !== 'ready' ||
                      validationState.status === ValidationStatus.RUNNING
                    }
                    startIcon={<RefreshIcon />}
                    onClick={() => handleGenerateAndUpdate(false)}
                  >
                    Re-Generate
                  </Button>
                  <Button
                    variant="contained"
                    disabled={
                      developerService.state.status !== 'ready' ||
                      validationState.status === ValidationStatus.RUNNING
                    }
                    startIcon={<CompareIcon />}
                    onClick={() => handleGenerateAndUpdate(true)}
                  >
                    Compute and Diff
                  </Button>
                </ButtonGroup>
              )}
            {currentItem?.kind === DataStoreItemKind.EXPECTED_RELATIONS &&
              previousValidationForDiff !== undefined && (
                <ButtonGroup className={classes.expectedActions}>
                  <Button
                    variant="contained"
                    className={classes.btnAccept}
                    startIcon={<CheckCircleIcon />}
                    onClick={handleAcceptDiff}
                  >
                    Accept Update
                  </Button>
                  <Button
                    variant="contained"
                    className={classes.btnRevert}
                    startIcon={<HighlightOffIcon />}
                    onClick={handleRevertDiff}
                  >
                    Revert Update
                  </Button>
                </ButtonGroup>
              )}
          </div>
          <div />
          {currentItem?.kind === DataStoreItemKind.SCHEMA && (
            <Button
              className={classes.docsLink}
              href="https://authzed.com/docs/spicedb/modeling/developing-a-schema"
              target="_blank"
              startIcon={<DescriptionIcon />}
            >
              Schema Development Guide
            </Button>
          )}

          {currentItem?.kind === DataStoreItemKind.RELATIONSHIPS && (
            <Button
              className={classes.docsLink}
              href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#creating-test-relationships"
              target="_blank"
              startIcon={<DescriptionIcon />}
            >
              Test Relationships Guide
            </Button>
          )}

          {currentItem?.kind === DataStoreItemKind.ASSERTIONS && (
            <Button
              className={classes.docsLink}
              href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#assertions"
              target="_blank"
              startIcon={<DescriptionIcon />}
            >
              Assertions Guide
            </Button>
          )}

          {currentItem?.kind === DataStoreItemKind.EXPECTED_RELATIONS && (
            <Button
              className={classes.docsLink}
              href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#expected-relations"
              target="_blank"
              startIcon={<DescriptionIcon />}
            >
              Expected Relations Guide
            </Button>
          )}
        </div>
      </AppBar>

      <div className={classes.reflexContainerContainer}>
        <MainPanel
          datastore={datastore}
          currentItem={currentItem}
          services={services}
          sharingState={sharingState}
          previousValidationForDiff={previousValidationForDiff}
          relationshipsEditor={relationshipsEditor}
          datastoreUpdated={datastoreUpdated}
        />
      </div>
    </div>
  );
}

const TabLabelWithCount = (props: {
  problemService: ProblemService;
  kind: DataStoreItemKind;
  icon: React.ReactChild;
  title: string;
}) => {
  const classes = useSummaryStyles();
  const problemService = props.problemService;
  const errorCount = problemService.getErrorCount(props.kind);
  const warningCount = props.kind === DataStoreItemKind.SCHEMA ? problemService.warnings.length : 0;

  return (
    <div className={classes.problemTab}>
      <TabLabel icon={props.icon} title={props.title} />
      <span
        style={{ display: errorCount > 0 ? 'inline-flex' : 'none' }}
        className={clsx(classes.badge, {
          [classes.failBadge]: errorCount > 0,
        })}
      >
        {errorCount}
      </span>
      <span
        style={{ display: warningCount > 0 ? 'inline-flex' : 'none' }}
        className={clsx(classes.badge, {
          [classes.warningBadge]: warningCount > 0,
        })}
      >
        {warningCount}
      </span>
    </div>
  );
};

const panels: Panel<PlaygroundPanelLocation>[] = [
  {
    id: 'problems',
    summary: ProblemsSummary,
    content: ProblemsPanel,
  },
  {
    id: 'watches',
    summary: WatchesSummary,
    content: WatchesPanel,
  },
  {
    id: 'visualizer',
    summary: VisualizerSummary,
    content: VisualizerPanel,
  },
  {
    id: 'validation',
    summary: ValidationSummary,
    content: ValidationPanel,
  },
  {
    id: 'terminal',
    summary: TerminalSummary,
    content: TerminalPanel,
  },
];

function MainPanel(
  props: {
    datastore: DataStore;
    services: Services;
    currentItem: DataStoreItem | undefined;
    sharingState: SharingState;
    previousValidationForDiff: string | undefined;
    relationshipsEditor: RelationshipsEditorType;
    datastoreUpdated: () => void;
  } & { dimensions?: { width: number; height: number } }
) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const classes = useStyles({ prefersDarkMode: prefersDarkMode });

  const datastore = props.datastore;
  const currentItem = props.currentItem;
  const sharingState = props.sharingState;
  const devServerState = props.services.developerService.state;

  const devServerStatusDisplay = useMemo(() => {
    switch (devServerState.status) {
      case 'initializing':
        return <div>Initializing Development System</div>;

      case 'loading':
        return (
          <div className={classes.loadBar}>
            Loading Developer System:
            <LinearProgress
              variant="determinate"
              value={Math.floor(devServerState.progress * 100)}
            />
          </div>
        );

      case 'loaderror':
        return (
          <Alert severity="error">
            Could not start the Development System. Please make sure you have
            WebAssembly enabled.
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
  }, [devServerState, classes.loadBar]);

  return (
    <div key="main" className={classes.mainContent}>
      {!currentItem && (
        <div className={classes.landing}>
          To get started, please add a namespace configuration.
        </div>
      )}

      <ReflexedPanelDisplay
        datastore={datastore}
        services={props.services}
        panels={panels}
        disabled={!global.WebAssembly}
        overrideSummaryDisplay={devServerStatusDisplay}
      >
        {props.currentItem?.kind === DataStoreItemKind.RELATIONSHIPS &&
          props.relationshipsEditor === 'grid' && (
            <DatastoreRelationshipEditor
              datastore={datastore}
              services={props.services}
              isReadOnly={
                sharingState.status === SharingStatus.SHARING ||
                props.datastore.isOutOfDate()
              }
              datastoreUpdated={props.datastoreUpdated}
            />
          )}
        {(props.currentItem?.kind !== DataStoreItemKind.RELATIONSHIPS ||
          props.relationshipsEditor === 'code') && (
          <IsolatedEditorDisplay
            datastore={datastore}
            services={props.services}
            currentItem={props.currentItem}
            isReadOnly={
              sharingState.status === SharingStatus.SHARING ||
              props.datastore.isOutOfDate()
            }
            diff={
              currentItem?.kind === DataStoreItemKind.EXPECTED_RELATIONS
                ? props.previousValidationForDiff
                : undefined
            }
            datastoreUpdated={props.datastoreUpdated}
          />
        )}
      </ReflexedPanelDisplay>
    </div>
  );
}

// NOTE: This is isolated into its own component so that calling setLocalUpdateIndex only calls
// React rerendering on the editor itself, rather than the displays around it as well.
function IsolatedEditorDisplay(props: EditorDisplayProps) {
  const [localUpdateIndex, setLocalUpdateIndex] = useState(0);

  const datastoreUpdated = () => {
    props.datastoreUpdated();
    setLocalUpdateIndex(localUpdateIndex + 1);
  };

  return <EditorDisplay {...props} datastoreUpdated={datastoreUpdated} />;
}

const getFileContentsAsText = async (file: File): Promise<string> => {
  return new Promise(
    (
      resolve: (value: string | PromiseLike<string>) => void,
      reject: (reason?: any) => void
    ) => {
      const reader = new FileReader();
      reader.onloadend = function (e: ProgressEvent<FileReader>) {
        resolve(e.target?.result?.toString() ?? '');
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  );
};
