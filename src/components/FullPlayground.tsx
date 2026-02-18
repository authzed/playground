import "react-reflex/styles.css";

import { LinearProgress, Tab, Tabs } from "@material-ui/core";
import AppBar from "@material-ui/core/AppBar";
import { Theme, createStyles, darken, makeStyles } from "@material-ui/core/styles";
import { alpha } from "@material-ui/core/styles/colorManipulator";
import TextField from "@material-ui/core/TextField";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CodeIcon from "@material-ui/icons/Code";
import CompareIcon from "@material-ui/icons/Compare";
import DescriptionIcon from "@material-ui/icons/Description";
import FormatTextdirectionLToRIcon from "@material-ui/icons/FormatTextdirectionLToR";
import GetAppIcon from "@material-ui/icons/GetApp";
import GridOnIcon from "@material-ui/icons/GridOn";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import InsertDriveFileIcon from "@material-ui/icons/InsertDriveFile";
import RefreshIcon from "@material-ui/icons/Refresh";
import ShareIcon from "@material-ui/icons/Share";
import { useNavigate, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { saveAs } from "file-saver";
import { fileDialog } from "file-select-dialog";
import { CircleX, MessageCircleWarning } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode, type ChangeEvent } from "react";
import { useCookies } from "react-cookie";
import sjcl from "sjcl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import DISCORD from "../assets/discord.svg?react";
import { DiscordChatCrate } from "../playground-ui/DiscordChatCrate";
import { useGoogleAnalytics } from "../playground-ui/GoogleAnalyticsHook";
import TabLabel from "../playground-ui/TabLabel";
import { useLiveCheckService } from "../services/check";
import AppConfig from "../services/configservice";
import { RelationshipsEditorType, useCookieService } from "../services/cookieservice";
import {
  DataStore,
  DataStoreItem,
  DataStoreItemKind,
  DataStorePaths,
  usePlaygroundDatastore,
} from "../services/datastore";
import { useLocalParseService } from "../services/localparse";
import { ProblemService, useProblemService } from "../services/problem";
import { Services } from "../services/services";
import { ValidationResult, ValidationStatus, useValidationService } from "../services/validation";
import { createValidationYAML, normalizeValidationYAML } from "../services/validationfileformat";
import { Example } from "../spicedb-common/examples";
import { useDeveloperService } from "../spicedb-common/services/developerservice";
import { useZedTerminalService } from "../spicedb-common/services/zedterminalservice";
import { parseValidationYAML } from "../spicedb-common/validationfileformat";

import { DatastoreRelationshipEditor } from "./DatastoreRelationshipEditor";
import { EditorDisplay, EditorDisplayProps } from "./EditorDisplay";
import { ExamplesDropdown } from "./ExamplesDropdown";
import { GuidedTour, TourElementClass } from "./GuidedTour";
import { AT, ET, NS, VL } from "./KindIcons";
import { NormalLogo, SmallLogo } from "./Logos";
import { Panel, useSummaryStyles } from "./panels/base/common";
import { ReflexedPanelDisplay } from "./panels/base/reflexed";
import { ProblemsPanel, ProblemsSummary } from "./panels/problems";
import { TerminalPanel, TerminalSummary } from "./panels/terminal";
import { ValidationPanel, ValidationSummary } from "./panels/validation";
import { VisualizerPanel, VisualizerSummary } from "./panels/visualizer";
import { WatchesPanel, WatchesSummary } from "./panels/watches";
import { ShareLoader } from "./ShareLoader";
import { Alert, AlertTitle } from "./ui/alert";
import { ValidateButton } from "./ValidationButton";

const TOOLBAR_BREAKPOINT = 1550; // pixels

interface StyleProps {
  prefersDarkMode: boolean;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    "@global": {
      ".reflex-splitter": {
        backgroundColor: theme.palette.divider + "!important",
        borderColor: theme.palette.divider + "!important",
        borderLeftWidth: "0px !important",
        borderTopWidth: "0px !important",
      },
    },
    root: {
      position: "absolute",
      top: "0px",
      left: "0px",
      right: "0px",
      bottom: "0px",
    },
    reflexContainerContainer: {
      position: "absolute",
      top: "98px",
      left: "0px",
      right: "0px",
      bottom: "0px",
      [theme.breakpoints.down(TOOLBAR_BREAKPOINT)]: {
        top: "144px",
      },
    },
    topBar: {
      borderBottom: "1px solid transparent",
      borderBottomColor: theme.palette.divider,
      height: "48px",
      zIndex: 4,
      display: "grid",
      alignItems: "center",
      justifyContent: "flex-end",
      flexDirection: "row",
      columnGap: "10px",
      gridTemplateColumns: "auto auto 1fr auto auto auto auto auto auto",
      backgroundColor: (props: StyleProps) =>
        props.prefersDarkMode ? "#111" : theme.palette.background.default,
      "& .MuiTab-root": {
        minWidth: 0,
      },
      "& .Mui-selected": {
        backgroundColor: "#222",
        color: "white !important",
      },
      "& .MuiTabs-indicator": {
        top: 0,
      },
    },
    toolBar: {
      backgroundColor: (props: StyleProps) =>
        props.prefersDarkMode ? "#202020" : theme.palette.background.default,
      display: "grid",
      flexDirection: "row",
      columnGap: "10px",
      gridTemplateColumns: "auto 1fr",
      "& .MuiTab-root": {
        minWidth: 0,
        backgroundColor: (props: StyleProps) =>
          props.prefersDarkMode ? "#1b1b1b" : darken(theme.palette.background.default, 0.05),
      },
      "& .Mui-selected": {
        backgroundColor: () => alpha(theme.palette.primary.light, 0.15),
        color: `${theme.palette.text.primary} !important`,
      },
      [theme.breakpoints.down(TOOLBAR_BREAKPOINT)]: {
        gridTemplateColumns: "100%",
        gridTemplateRows: "auto auto",
        backgroundColor: (props: StyleProps) =>
          props.prefersDarkMode ? "#1b1b1b" : darken(theme.palette.background.default, 0.05),
      },
    },
    contextToolbar: {
      display: "grid",
      flexDirection: "row",
      alignItems: "center",
      gridTemplateColumns: "auto 1fr auto",
      margin: "6px",
      marginLeft: "0px",
      [theme.breakpoints.down(TOOLBAR_BREAKPOINT)]: {
        backgroundColor: (props: StyleProps) =>
          props.prefersDarkMode ? "#202020" : theme.palette.background.default,
        padding: "6px",
        margin: "0px",
      },
    },
    contextTools: {
      display: "grid",
      flexDirection: "row",
      alignItems: "center",
      gridTemplateColumns: "auto auto auto",
      columnGap: theme.spacing(1),
      "& .MuiButton-root": {
        borderColor: "transparent",
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        color: `${theme.palette.text.primary} !important`,
      },
      "& .MuiButton-root:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.25)",
      },
    },
    logoContainer: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: "1em",
      fontSize: "125%",
      padding: theme.spacing(1),
      fontFamily: "Roboto Mono, monospace",
      [theme.breakpoints.down("sm")]: {
        paddingTop: theme.spacing(1),
      },
    },
    normalLogo: {
      "& svg": {
        height: "1em",
        marginRight: theme.spacing(1),
      },
      [theme.breakpoints.down("sm")]: {
        display: "none",
      },
      "& a": {
        textDecoration: "none",
        color: "inherit",
      },
    },
    smallLogo: {
      display: "none",
      [theme.breakpoints.down("sm")]: {
        display: "flex",
        alignItems: "center",
        "& a": {
          height: "1.5em",
        },
      },
      "& svg": {
        width: "1.5em",
        height: "1.5em",
      },
    },
    shareUrl: {
      marginRight: theme.spacing(1),
      width: "100%",
    },
    mainContent: {
      position: "absolute",
      top: "0px",
      left: "0px",
      right: "0px",
      bottom: "0px",
    },
    landing: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "60vh",
      width: "100%",
    },
    editorContainer: {
      height: "60vh",
      width: "100%",
    },
    hideTextOnMed: {
      [theme.breakpoints.down("md")]: {
        justifyContent: "flex-start",
        overflow: "hidden",
        width: "28px",
        minWidth: "28px",
        "& .MuiButton-label": {
          justifyContent: "flex-start",
          overflow: "hidden",
          width: "28px",
          "& .MuiButton-startIcon.MuiButton-iconSizeSmall": {
            marginLeft: "0px",
          },
        },
      },
    },
    hide: {
      display: "none",
    },
    title: {
      textAlign: "center",
      padding: theme.spacing(0.5),
      backgroundColor: theme.palette.background.default,
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
    },
    tenantGraphContainer: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.palette.background.default,
      backgroundSize: "20px 20px",
      backgroundImage: `
              linear-gradient(to right, ${darken(
                theme.palette.background.default,
                0.1,
              )} 1px, transparent 1px),
              linear-gradient(to bottom, ${darken(
                theme.palette.background.default,
                0.1,
              )} 1px, transparent 1px)
            `,
    },
    tenantGraphBar: {
      padding: theme.spacing(1),
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      columnGap: theme.spacing(1),
      alignItems: "center",
    },
    loadBar: {
      padding: theme.spacing(1),
      display: "grid",
      gridTemplateColumns: "auto 500px",
      columnGap: theme.spacing(1),
      alignItems: "center",
    },
  }),
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

export function FullPlayground() {
  return (
    <>
      <DiscordChatCrate
        serverId={AppConfig().discord.serverId}
        channelId={AppConfig().discord.channelId}
      />
      <ApolloedPlayground />
    </>
  );
}

function ApolloedPlayground() {
  const datastore = usePlaygroundDatastore();
  return (
    <ShareLoader datastore={datastore} shareUrlRoot="s" sharedRequired={false}>
      <ThemedAppView key="app" datastore={datastore} />
    </ShareLoader>
  );
}

export function ThemedAppView(props: { datastore: DataStore }) {
  const { pushEvent } = useGoogleAnalytics();

  const [sharingState, setSharingState] = useState<SharingState>({
    status: SharingStatus.NOT_RUN,
  });

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const classes = useStyles({ prefersDarkMode: prefersDarkMode });
  const location = useLocation();
  const navigate = useNavigate();

  const datastore = props.datastore;

  const developerService = useDeveloperService();
  const localParseService = useLocalParseService(datastore);
  const liveCheckService = useLiveCheckService(developerService, datastore);
  const validationService = useValidationService(developerService, datastore);
  const problemService = useProblemService(localParseService, liveCheckService, validationService);
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

  const [cookies, setCookie] = useCookies(["dismiss-tour"]);
  const [showTour, setShowTour] = useState(cookies["dismiss-tour"] !== "true");

  // Effect: If the user lands on the `/` route, redirect them to the schema editor.
  // TODO: this should probably be a redirect at the routing layer.
  useEffect(() => {
    if (currentItem === undefined) {
      void navigate({ to: DataStorePaths.Schema(), replace: true });
    }
  }, [datastore, currentItem, navigate]);

  const conductDownload = () => {
    const yamlContents = createValidationYAML(datastore);
    const bitArray = sjcl.hash.sha256.hash(yamlContents);
    const hash = sjcl.codec.hex.fromBits(bitArray).substring(0, 6);
    const blob = new Blob([yamlContents], { type: "text/yaml;charset=utf-8" });
    saveAs(blob, `authzed-download-${hash}.yaml`);
  };

  const conductUpload = async () => {
    const file = await fileDialog({
      multiple: false,
      strict: true,
      accept: ".yaml",
    });
    if (file) {
      pushEvent("load-yaml", {
        filename: file.name,
      });

      const contents = await file.text();
      const uploaded = parseValidationYAML(contents);
      if ("message" in uploaded) {
        toast.error("Could not load uploaded YAML", {
          description: `The uploaded validation YAML is invalid: ${uploaded.message}`,
        });
        return;
      }

      services.liveCheckService.clear();

      datastore.loadFromParsed(uploaded);
      datastoreUpdated();

      void navigate({ to: DataStorePaths.Schema(), replace: true });
    }
  };

  const formatSchema = () => {
    const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents;
    const request = developerService.newRequest(schema, "");
    request?.formatSchema((result) => {
      datastore.update(
        datastore.getSingletonByKind(DataStoreItemKind.SCHEMA),
        result.formattedSchema,
      );
    });
    request?.execute();
  };

  const conductSharing = async () => {
    const shareApiEndpoint = AppConfig().shareApiEndpoint;
    if (!shareApiEndpoint) {
      return;
    }

    setSharingState({
      status: SharingStatus.SHARING,
    });

    const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents!;
    const relationshipsYaml = datastore.getSingletonByKind(
      DataStoreItemKind.RELATIONSHIPS,
    ).editableContents!;
    const assertionsYaml = datastore.getSingletonByKind(
      DataStoreItemKind.ASSERTIONS,
    ).editableContents!;
    const validationYaml = datastore.getSingletonByKind(
      DataStoreItemKind.EXPECTED_RELATIONS,
    ).editableContents!;

    // Invoke sharing.
    try {
      const response = await fetch(`${shareApiEndpoint}/api/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "2",
          schema,
          relationships_yaml: relationshipsYaml,
          assertions_yaml: assertionsYaml,
          validation_yaml: validationYaml,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        toast.error("Error sharing", {
          description: errorData.error || "Failed to share playground",
        });
        setSharingState({
          status: SharingStatus.SHARE_ERROR,
        });
        return;
      }

      const result = await response.json();
      const reference = result.hash;
      pushEvent("shared", {
        reference: reference,
      });

      setSharingState({
        status: SharingStatus.SHARED,
        shareReference: reference,
      });
    } catch (error: unknown) {
      toast.error("Error sharing", {
        description: error instanceof Error ? error.message : "Failed to share playground",
      });
      setSharingState({
        status: SharingStatus.SHARE_ERROR,
      });
      return;
    }
  };

  const datastoreUpdated = () => {
    if (sharingState.status !== SharingStatus.NOT_RUN) {
      setSharingState({
        status: SharingStatus.NOT_RUN,
      });
    }
  };

  const loadExampleData = async (ex: Example) => {
    pushEvent("load-example", {
      id: ex.id,
    });

    datastore.loadFromParsed(ex.data);
    datastoreUpdated();

    services.liveCheckService.clear();
    void navigate({ to: DataStorePaths.Schema(), replace: true });
  };

  const [previousValidationForDiff, setPreviousValidationForDiff] = useState<string | undefined>(
    undefined,
  );

  const conductValidation = () => {
    validationService.conductValidation(() => {
      return false;
    });
  };

  const handleGenerateAndUpdate = (diff: boolean) => {
    if (previousValidationForDiff !== undefined) {
      setPreviousValidationForDiff(undefined);
      return;
    }

    setPreviousValidationForDiff(undefined);
    validationService.conductValidation((_validated: boolean, result: ValidationResult) => {
      if (result.updatedValidationYaml) {
        const updatedYaml = normalizeValidationYAML(result.updatedValidationYaml);
        const expectedRelations = datastore.getSingletonByKind(
          DataStoreItemKind.EXPECTED_RELATIONS,
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
    });
  };

  const handleAcceptDiff = () => {
    setPreviousValidationForDiff(undefined);
  };

  const handleRevertDiff = () => {
    if (previousValidationForDiff !== undefined) {
      const expectedRelations = datastore.getSingletonByKind(DataStoreItemKind.EXPECTED_RELATIONS);
      datastore.update(expectedRelations, previousValidationForDiff);

      datastoreUpdated();
      setPreviousValidationForDiff(undefined);

      // Rerun validation to remove any errors.
      conductValidation();
    }
  };

  const validationState = validationService.state;

  const handleChangeTab = (
    // TODO: this should be a Link
    _event: ChangeEvent<object>,
    selectedTabValue: string,
  ) => {
    const item = datastore.getById(selectedTabValue)!;
    void navigate({ to: item.pathname });
  };

  const setDismissTour = () => {
    setShowTour(false);
    setCookie("dismiss-tour", true);
    void navigate({ to: DataStorePaths.Schema() });
  };

  const handleTourBeforeStep = (selector: string) => {
    // Activate the Assertions tab before the assertions dialogs
    if (selector.includes(TourElementClass.assert)) {
      void navigate({ to: DataStorePaths.Assertions() });
    }
  };

  const isOutOfDate = props.datastore.isOutOfDate();
  const cookieService = useCookieService();

  const [relationshipsEditor, setRelationshipEditor] = useState<RelationshipsEditorType>(() => {
    if (services.problemService.invalidRelationships.length > 0) {
      return "code";
    }

    return cookieService.relationshipsEditorType;
  });
  const handleChangeRelationshipEditor = (value: string) => {
    if (value === "grid" && services.problemService.invalidRelationships.length > 0) {
      return;
    }

    if (value === "grid" || value === "code") {
      cookieService.setRelationshipsEditorType(value);
      setRelationshipEditor(value);
    }
  };

  const appConfig = AppConfig();
  const isSharingEnabled = !!appConfig.shareApiEndpoint;

  return (
    <div className={classes.root}>
      {!WebAssembly && (
        <Alert variant="destructive">
          <CircleX />
          <AlertTitle>
            WebAssembly is disabled but is required for Playground debugging. All debugging tools
            will be disabled.
          </AlertTitle>
        </Alert>
      )}
      {isOutOfDate && (
        <Alert>
          <MessageCircleWarning />
          <AlertTitle>
            The contents of the Playground have been updated in another tab. Please close this
            Playground tab.
          </AlertTitle>
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
            <a href="https://authzed.com/spicedb" rel="noreferrer" target="_blank">
              <NormalLogo />
            </a>{" "}
            Playground
          </div>
          <div className={classes.smallLogo}>
            <a href="https://authzed.com/spicedb" rel="noreferrer" target="_blank">
              <SmallLogo />
            </a>
          </div>
        </div>
        {!isOutOfDate && (
          <>
            <ExamplesDropdown
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
              loadExample={loadExampleData}
            />
            <div>
              {sharingState.status === SharingStatus.SHARED && (
                <TextField
                  className={classes.shareUrl}
                  value={`${window.location.protocol}//${window.location.host}/s/${sharingState.shareReference}${location.pathname}`}
                  inputProps={{
                    readOnly: true,
                  }}
                />
              )}
            </div>
            {AppConfig().discord.inviteUrl && (
              <Button asChild size="sm" title="Discord" variant="ghost">
                <a href={AppConfig().discord.inviteUrl}>
                  <DISCORD viewBox="0 0 71 55" style={{ height: "1em", width: "1em" }} />
                  <span className="hidden md:inline">Discuss on Discord</span>
                </a>
              </Button>
            )}
            {isSharingEnabled && (
              <Button
                title="Share"
                size="sm"
                variant="ghost"
                onClick={conductSharing}
                disabled={
                  sharingState.status === SharingStatus.SHARING ||
                  validationState.status === ValidationStatus.RUNNING
                }
              >
                <ShareIcon />
                <span className="hidden md:inline">Share</span>
              </Button>
            )}
            <Button
              size="sm"
              title="Download"
              variant="ghost"
              onClick={conductDownload}
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
            >
              <GetAppIcon />
              <span className="hidden md:inline">Download</span>
            </Button>
            <Button
              size="sm"
              onClick={conductUpload}
              variant="ghost"
              title="Load from File"
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
            >
              <InsertDriveFileIcon />
              <span className="hidden md:inline">Load From File</span>
            </Button>
          </>
        )}
      </AppBar>
      <AppBar className={classes.toolBar} position="static" color="default">
        {currentItem?.id && (
          // NOTE: Tabs doesn't like having an undefined value, so we wait to render
          // until we've got it.
          <Tabs
            value={currentItem.id}
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
              value={datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS).id}
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
              value={datastore.getSingletonByKind(DataStoreItemKind.ASSERTIONS).id}
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
              value={datastore.getSingletonByKind(DataStoreItemKind.EXPECTED_RELATIONS).id}
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
        )}

        <div className={classes.contextToolbar}>
          <div className={classes.contextTools}>
            {currentItem?.kind === DataStoreItemKind.SCHEMA && (
              <Button onClick={formatSchema} variant="outline">
                <FormatTextdirectionLToRIcon />
                Format
              </Button>
            )}

            {currentItem?.kind === DataStoreItemKind.RELATIONSHIPS && (
              <div>
                <ToggleGroup
                  value={relationshipsEditor}
                  variant="outline"
                  type="single"
                  onValueChange={handleChangeRelationshipEditor}
                  aria-label="relationship editor view"
                >
                  <ToggleGroupItem
                    value="grid"
                    aria-label="grid editor"
                    title="Grid Editor"
                    disabled={services.problemService.invalidRelationships.length > 0}
                  >
                    <GridOnIcon style={{ fontSize: "1em" }} />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="code"
                    title="Text Editor (Advanced)"
                    aria-label="code editor"
                  >
                    <CodeIcon style={{ fontSize: "1em" }} />
                  </ToggleGroupItem>
                </ToggleGroup>
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
                <ButtonGroup>
                  <Button
                    variant="outline"
                    disabled={
                      developerService.state.status !== "ready" ||
                      validationState.status === ValidationStatus.RUNNING
                    }
                    onClick={() => handleGenerateAndUpdate(false)}
                  >
                    <RefreshIcon />
                    Re-Generate
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      developerService.state.status !== "ready" ||
                      validationState.status === ValidationStatus.RUNNING
                    }
                    onClick={() => handleGenerateAndUpdate(true)}
                  >
                    <CompareIcon />
                    Compute and Diff
                  </Button>
                </ButtonGroup>
              )}
            {currentItem?.kind === DataStoreItemKind.EXPECTED_RELATIONS &&
              previousValidationForDiff !== undefined && (
                <ButtonGroup>
                  <Button onClick={handleAcceptDiff}>
                    <CheckCircleIcon />
                    Accept Update
                  </Button>
                  <Button variant="destructive" onClick={handleRevertDiff}>
                    <HighlightOffIcon />
                    Revert Update
                  </Button>
                </ButtonGroup>
              )}
          </div>
          <div />
          {currentItem?.kind === DataStoreItemKind.SCHEMA && (
            <DocLink
              title="Schema Development Guide"
              href="https://authzed.com/docs/spicedb/modeling/developing-a-schema"
            />
          )}

          {currentItem?.kind === DataStoreItemKind.RELATIONSHIPS && (
            <DocLink
              title="Test Relationships Guide"
              href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#creating-test-relationships"
            />
          )}

          {currentItem?.kind === DataStoreItemKind.ASSERTIONS && (
            <DocLink
              title="Assertions Guide"
              href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#assertions"
            />
          )}

          {currentItem?.kind === DataStoreItemKind.EXPECTED_RELATIONS && (
            <DocLink
              title="Expected Relations Guide"
              href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#expected-relations"
            />
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

const DocLink = ({ title, href }: { title: string; href: string }) => (
  <Button asChild variant="ghost" title={title}>
    <a href={href} target="_blank">
      <DescriptionIcon />
      <span className="hidden sm:inline">{title}</span>
    </a>
  </Button>
);

const TabLabelWithCount = (props: {
  problemService: ProblemService;
  kind: DataStoreItemKind;
  icon: ReactNode;
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
        style={{ display: errorCount > 0 ? "inline-flex" : "none" }}
        className={clsx(classes.badge, {
          [classes.failBadge]: errorCount > 0,
        })}
      >
        {errorCount}
      </span>
      <span
        style={{ display: warningCount > 0 ? "inline-flex" : "none" }}
        className={clsx(classes.badge, {
          [classes.warningBadge]: warningCount > 0,
        })}
      >
        {warningCount}
      </span>
    </div>
  );
};

const panels: Panel[] = [
  {
    id: "problems",
    Summary: ProblemsSummary,
    Content: ProblemsPanel,
  },
  {
    id: "watches",
    Summary: WatchesSummary,
    Content: WatchesPanel,
  },
  {
    id: "visualizer",
    Summary: VisualizerSummary,
    Content: VisualizerPanel,
  },
  {
    id: "validation",
    Summary: ValidationSummary,
    Content: ValidationPanel,
  },
  {
    id: "terminal",
    Summary: TerminalSummary,
    Content: TerminalPanel,
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
  } & { dimensions?: { width: number; height: number } },
) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const classes = useStyles({ prefersDarkMode: prefersDarkMode });

  const datastore = props.datastore;
  const currentItem = props.currentItem;
  const sharingState = props.sharingState;
  const devServerState = props.services.developerService.state;

  const devServerStatusDisplay = useMemo(() => {
    switch (devServerState.status) {
      case "initializing":
        return <div>Initializing Development System</div>;

      case "loading":
        return (
          <div className={classes.loadBar}>
            Loading Developer System:
            <LinearProgress
              variant="determinate"
              value={Math.floor(devServerState.progress * 100)}
            />
          </div>
        );

      case "loaderror":
        return (
          <Alert variant="destructive">
            <CircleX />
            <AlertTitle>
              Could not start the Development System. Please make sure you have WebAssembly enabled.
            </AlertTitle>
          </Alert>
        );

      case "unsupported":
        return (
          <Alert variant="destructive">
            <CircleX />
            <AlertTitle>Your browser does not support WebAssembly</AlertTitle>
          </Alert>
        );

      case "ready":
        return undefined;
    }
  }, [devServerState, classes.loadBar]);

  return (
    <div key="main" className={classes.mainContent}>
      {!currentItem && (
        <div className={classes.landing}>To get started, please add a namespace configuration.</div>
      )}

      <ReflexedPanelDisplay
        datastore={datastore}
        services={props.services}
        panels={panels}
        disabled={!WebAssembly}
        overrideSummaryDisplay={devServerStatusDisplay}
      >
        {props.currentItem?.kind === DataStoreItemKind.RELATIONSHIPS &&
          props.relationshipsEditor === "grid" && (
            <DatastoreRelationshipEditor
              datastore={datastore}
              services={props.services}
              isReadOnly={
                sharingState.status === SharingStatus.SHARING || props.datastore.isOutOfDate()
              }
              datastoreUpdated={props.datastoreUpdated}
            />
          )}
        {(props.currentItem?.kind !== DataStoreItemKind.RELATIONSHIPS ||
          props.relationshipsEditor === "code") && (
          <IsolatedEditorDisplay
            datastore={datastore}
            services={props.services}
            currentItem={props.currentItem}
            isReadOnly={
              sharingState.status === SharingStatus.SHARING || props.datastore.isOutOfDate()
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
