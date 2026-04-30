import { saveAs } from "file-saver";
import { fileDialog } from "file-select-dialog";
import {
  BookOpenText,
  CircleCheck,
  CircleX,
  Code,
  Download,
  File as FileIcon,
  Form,
  GitCompare,
  Grid3x3,
  MessageCircleWarning,
  Network,
  RefreshCw,
  Share2,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useCookies } from "react-cookie";
import sjcl from "sjcl";
import { toast } from "sonner";

import { AuthSlot } from "@/components/auth-slot";
import { BreadcrumbPill } from "@/components/breadcrumb-pill";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import DISCORD from "../assets/discord.svg?react";
import { useDocumentIdentity } from "../hooks/use-document-identity";
import { useConfirmDialog } from "../playground-ui/ConfirmDialogProvider";
import { DiscordChatCrate } from "../playground-ui/DiscordChatCrate";
import { useGoogleAnalytics } from "../playground-ui/GoogleAnalyticsHook";
import { useLiveCheckService, type LiveCheckService, liveCheckItemToWatch } from "../services/check";
import AppConfig from "../services/configservice";
import { RelationshipsEditorType, useCookieService } from "../services/cookieservice";
import {
  DataStore,
  DataStoreItemKind,
  usePlaygroundDatastore,
} from "../services/datastore";
import { useLocalParseService } from "../services/localparse";
import { useProblemService } from "../services/problem";
import { ValidationResult, ValidationStatus, useValidationService } from "../services/validation";
import { createValidationYAML, normalizeValidationYAML } from "../services/validationfileformat";
import { Example, LoadExamples } from "../spicedb-common/examples";
import { useDeveloperService, type DeveloperService } from "../spicedb-common/services/developerservice";
import { useZedTerminalService } from "../spicedb-common/services/zedterminalservice";
import { parseValidationYAML } from "../spicedb-common/validationfileformat";

import { DatastoreRelationshipEditor } from "./DatastoreRelationshipEditor";
import { Drawer } from "./drawer/Drawer";
import { StatusStrip } from "./drawer/StatusStrip";
import { EditorDisplay } from "./EditorDisplay";
import { EditorGroups } from "./editor-groups/EditorGroups";
import { VisualizerDocument } from "./editor-groups/documents/Visualizer";
import { useEditorStore } from "./editor-groups/state";
import type { DocumentRef } from "./editor-groups/types";
import { GuidedTour, TourElementClass } from "./GuidedTour";
import { NormalLogo, SmallLogo } from "./Logos";
import { ProblemsPanel } from "./panels/problems";
import { TerminalPanel } from "./panels/terminal";
import { WatchesPanel } from "./panels/watches";
import { ShareLoader } from "./ShareLoader";
import { Alert, AlertTitle } from "./ui/alert";
import { ValidateButton } from "./ValidationButton";

function useElementSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | undefined>();
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

type GridContainerProps = Omit<
  ComponentProps<typeof DatastoreRelationshipEditor>,
  "dimensions"
>;

function GridContainer(props: GridContainerProps) {
  const [ref, size] = useElementSize();
  return (
    <div ref={ref} className="h-full w-full">
      {size && <DatastoreRelationshipEditor {...props} dimensions={size} />}
    </div>
  );
}

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
  const developerService = useDeveloperService();
  const liveCheckService = useLiveCheckService(developerService, datastore, { persist: true });
  return (
    <ShareLoader
      datastore={datastore}
      liveCheckService={liveCheckService}
      shareUrlRoot="s"
      sharedRequired={false}
    >
      <ThemedAppView
        key="app"
        datastore={datastore}
        developerService={developerService}
        liveCheckService={liveCheckService}
      />
    </ShareLoader>
  );
}

export function ThemedAppView(props: {
  datastore: DataStore;
  developerService: DeveloperService;
  liveCheckService: LiveCheckService;
}) {
  const { pushEvent } = useGoogleAnalytics();
  const { showConfirm } = useConfirmDialog();

  const [sharingState, setSharingState] = useState<SharingState>({
    status: SharingStatus.NOT_RUN,
  });

  const confirmDiscardIfModified = async (): Promise<boolean> => {
    if (!props.datastore.isModified()) return true;
    const [result] = await showConfirm({
      title: "Discard unsaved changes?",
      content: (
        <p>
          You have unsaved edits. Loading will replace your current schema, relationships, and
          assertions. Consider <b>Share</b> or <b>Download</b> first to keep a copy.
        </p>
      ),
      buttons: [
        { value: "nevermind", title: "Cancel", color: "default" },
        {
          value: "replace",
          title: "Discard and Load",
          color: "primary",
          variant: "contained",
        },
      ],
    });
    return result === "replace";
  };

  const datastore = props.datastore;

  const developerService = props.developerService;
  const liveCheckService = props.liveCheckService;
  const localParseService = useLocalParseService(datastore);
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

  const [cookies, setCookie] = useCookies(["dismiss-tour"]);
  const [showTour, setShowTour] = useState(!cookies["dismiss-tour"]);

  const conductDownload = () => {
    const yamlContents = createValidationYAML(
      datastore,
      liveCheckService.items.map(liveCheckItemToWatch),
    );
    const bitArray = sjcl.hash.sha256.hash(yamlContents);
    const hash = sjcl.codec.hex.fromBits(bitArray).substring(0, 6);
    const blob = new Blob([yamlContents], { type: "text/yaml;charset=utf-8" });
    saveAs(blob, `authzed-download-${hash}.yaml`);
  };

  const conductUpload = async () => {
    if (!(await confirmDiscardIfModified())) return;
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

      datastore.loadFromParsed(uploaded);
      services.liveCheckService.loadWatches(uploaded.checkWatches ?? []);
      datastoreUpdated();
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

    const checkWatches = liveCheckService.items.map(liveCheckItemToWatch);

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
          ...(checkWatches.length > 0 ? { check_watches: checkWatches } : {}),
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
    if (!(await confirmDiscardIfModified())) return;
    pushEvent("load-example", {
      id: ex.id,
    });

    datastore.loadFromParsed(ex.data);
    datastore.setBaseline("example", ex.id);
    datastoreUpdated();

    services.liveCheckService.loadWatches(ex.data.checkWatches ?? []);
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

  const setDismissTour = () => {
    setShowTour(false);
    setCookie("dismiss-tour", "true");
  };

  const handleTourBeforeStep = (selector: string) => {
    // Activate the Assertions tab before the assertions dialogs
    if (selector.includes(TourElementClass.assert)) {
      const s = useEditorStore.getState();
      const groupId = s.layout.kind === "single" ? s.layout.group.id : s.layout.primary.id;
      if (s.closedPool.includes("assertions")) {
        s.openInGroup("assertions", groupId);
      } else {
        s.setActiveTab(groupId, "assertions");
      }
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

  const isReadOnly =
    sharingState.status === SharingStatus.SHARING || props.datastore.isOutOfDate();

  const renderToolbar = (children: ReactNode) => (
    <div className="flex shrink-0 items-center gap-2 px-2 py-1 border-b border-chrome-divider">
      {children}
    </div>
  );

  const renderDocument = (active: DocumentRef): ReactNode => {
    if (active === "schema") {
      const item = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA);
      return (
        <div className={`flex flex-col h-full ${TourElementClass.schema}`}>
          {renderToolbar(
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={formatSchema} variant="outline" size="sm">
                    <Form />
                    Format
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Format the schema</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => useEditorStore.getState().showDocument("visualizer")}
                    variant="outline"
                    size="sm"
                  >
                    <Network />
                    Visualize
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open the schema visualizer</TooltipContent>
              </Tooltip>
              <div className="ml-auto" />
              <DocLink
                title="Schema Development Guide"
                href="https://authzed.com/docs/spicedb/modeling/developing-a-schema"
              />
            </>,
          )}
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <EditorDisplay
                datastore={datastore}
                services={services}
                currentItem={item}
                isReadOnly={isReadOnly}
                datastoreUpdated={datastoreUpdated}
                defaultWidth="100%"
                defaultHeight="100%"
              />
            </div>
          </div>
        </div>
      );
    }

    if (active === "relationships") {
      const item = datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS);
      return (
        <div className={`flex flex-col h-full ${TourElementClass.testrel}`}>
          {renderToolbar(
            <>
              <ToggleGroup
                value={relationshipsEditor}
                variant="outline"
                type="single"
                onValueChange={handleChangeRelationshipEditor}
                aria-label="relationship editor view"
                size="sm"
              >
                <ToggleGroupItem
                  value="grid"
                  aria-label="grid editor"
                  title="Grid Editor"
                  disabled={services.problemService.invalidRelationships.length > 0}
                >
                  <Grid3x3 />
                </ToggleGroupItem>
                <ToggleGroupItem value="code" title="Text Editor" aria-label="code editor">
                  <Code />
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="ml-auto" />
              <DocLink
                title="Test Relationships Guide"
                href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#creating-test-relationships"
              />
            </>,
          )}
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              {relationshipsEditor === "grid" ? (
                <GridContainer
                  datastore={datastore}
                  services={services}
                  isReadOnly={isReadOnly}
                  datastoreUpdated={datastoreUpdated}
                />
              ) : (
                <EditorDisplay
                  datastore={datastore}
                  services={services}
                  currentItem={item}
                  isReadOnly={isReadOnly}
                  datastoreUpdated={datastoreUpdated}
                  defaultWidth="100%"
                  defaultHeight="100%"
                />
              )}
            </div>
          </div>
        </div>
      );
    }

    if (active === "assertions") {
      const item = datastore.getSingletonByKind(DataStoreItemKind.ASSERTIONS);
      return (
        <div className={`flex flex-col h-full ${TourElementClass.assert}`}>
          {renderToolbar(
            <>
              <ValidateButton
                datastore={datastore}
                validationState={validationState}
                conductValidation={conductValidation}
                developerService={developerService}
              />
              <div className="ml-auto" />
              <DocLink
                title="Assertions Guide"
                href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#assertions"
              />
            </>,
          )}
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <EditorDisplay
                datastore={datastore}
                services={services}
                currentItem={item}
                isReadOnly={isReadOnly}
                datastoreUpdated={datastoreUpdated}
                defaultWidth="100%"
                defaultHeight="100%"
              />
            </div>
          </div>
        </div>
      );
    }

    if (active === "expected") {
      const item = datastore.getSingletonByKind(DataStoreItemKind.EXPECTED_RELATIONS);
      return (
        <div className="flex flex-col h-full">
          {renderToolbar(
            <>
              <ValidateButton
                datastore={datastore}
                validationState={validationState}
                conductValidation={conductValidation}
                developerService={developerService}
              />
              {previousValidationForDiff === undefined && (
                <ButtonGroup>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      developerService.state.status !== "ready" ||
                      validationState.status === ValidationStatus.RUNNING
                    }
                    onClick={() => handleGenerateAndUpdate(false)}
                  >
                    <RefreshCw />
                    Re-Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      developerService.state.status !== "ready" ||
                      validationState.status === ValidationStatus.RUNNING
                    }
                    onClick={() => handleGenerateAndUpdate(true)}
                  >
                    <GitCompare />
                    Compute and Diff
                  </Button>
                </ButtonGroup>
              )}
              {previousValidationForDiff !== undefined && (
                <ButtonGroup>
                  <Button onClick={handleAcceptDiff} size="sm">
                    <CircleCheck />
                    Accept Update
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleRevertDiff}>
                    <CircleX />
                    Revert Update
                  </Button>
                </ButtonGroup>
              )}
              <div className="ml-auto" />
              <DocLink
                title="Expected Relations Guide"
                href="https://authzed.com/docs/spicedb/modeling/developing-a-schema#expected-relations"
              />
            </>,
          )}
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <EditorDisplay
                datastore={datastore}
                services={services}
                currentItem={item}
                isReadOnly={isReadOnly}
                datastoreUpdated={datastoreUpdated}
                diff={previousValidationForDiff}
                defaultWidth="100%"
                defaultHeight="100%"
              />
            </div>
          </div>
        </div>
      );
    }

    if (active === "visualizer") {
      return <VisualizerDocument services={services} />;
    }

    return null;
  };

  const drawerPanels = {
    problems: <ProblemsPanel services={services} />,
    watches: <WatchesPanel services={services} datastore={datastore} />,
    terminal: <TerminalPanel services={services} datastore={datastore} />,
  };

  const appConfig = AppConfig();
  const isSharingEnabled = !!appConfig.shareApiEndpoint;

  return (
    <div className="isolate flex h-screen w-screen flex-col overflow-hidden">
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
      {/* === Top bar === */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-chrome-divider bg-chrome-topbar px-3 text-sm">
        <a
          href="https://authzed.com/spicedb"
          rel="noreferrer"
          target="_blank"
          className="flex items-center hover:opacity-90"
          aria-label="SpiceDB Playground"
          title="SpiceDB Playground"
        >
          <img src="/favicon.svg" alt="SpiceDB" className="size-7" />
        </a>
        <span className="text-muted-foreground/50 hidden md:inline">/</span>
        {!isOutOfDate && (
          <BreadcrumbDropdown datastore={datastore} loadExample={loadExampleData} />
        )}

        <div className="flex-1" />

        <ThemeToggle />

        {AppConfig().discord.inviteUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="sm" variant="ghost">
                <a href={AppConfig().discord.inviteUrl} target="_blank" rel="noreferrer">
                  <DISCORD viewBox="0 0 71 55" style={{ height: "1em", width: "1em" }} />
                  <span className="hidden xl:inline">Discord</span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Discuss on Discord</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild size="sm" variant="ghost">
              <a href="https://authzed.com/docs/spicedb" target="_blank" rel="noreferrer">
                <BookOpenText />
                <span className="hidden xl:inline">Docs</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Docs</TooltipContent>
        </Tooltip>

        {isSharingEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="default"
                onClick={conductSharing}
                disabled={
                  sharingState.status === SharingStatus.SHARING ||
                  validationState.status === ValidationStatus.RUNNING
                }
                className="bg-chrome-soft-button hover:bg-chrome-soft-button/80 text-foreground"
              >
                <Share2 />
                Share
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              title="Download"
              onClick={conductDownload}
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
              className="bg-chrome-soft-button hover:bg-chrome-soft-button/80"
            >
              <Download />
              <span className="hidden xl:inline">Download</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download as YAML</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={conductUpload}
              variant="ghost"
              title="Load from File"
              disabled={
                sharingState.status === SharingStatus.SHARING ||
                validationState.status === ValidationStatus.RUNNING
              }
              className="bg-chrome-soft-button hover:bg-chrome-soft-button/80"
            >
              <FileIcon />
              <span className="hidden xl:inline">Load From File</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Load workspace from a YAML file</TooltipContent>
        </Tooltip>

        <div className="w-2" />
        <AuthSlot />
      </header>

      {/* === Editor groups (tab strip + content per group) === */}
      <div className="flex-1 min-h-0">
        <EditorGroups
          renderContent={renderDocument}
          tabDiagnostics={{
            schema: {
              errors: services.problemService.getErrorCount(DataStoreItemKind.SCHEMA),
              warnings: services.problemService.warnings.length,
            },
            relationships: {
              errors: services.problemService.getErrorCount(DataStoreItemKind.RELATIONSHIPS),
              warnings: 0,
            },
            assertions: {
              errors: services.problemService.getErrorCount(DataStoreItemKind.ASSERTIONS),
              warnings: 0,
            },
            expected: {
              errors: services.problemService.getErrorCount(DataStoreItemKind.EXPECTED_RELATIONS),
              warnings: 0,
            },
          }}
        />
      </div>

      {/* === Bottom drawer (one panel at a time) === */}
      <Drawer panels={drawerPanels} />

      {/* === Status strip === */}
      <StatusStrip services={services} />
    </div>
  );
}

function BreadcrumbDropdown({
  datastore,
  loadExample,
}: {
  datastore: DataStore;
  loadExample: (ex: Example) => Promise<void> | void;
}) {
  const [examples] = useState<Example[]>(() => LoadExamples());
  const identity = useDocumentIdentity(datastore, (id) => {
    const example = examples.find((e) => e.id === id);
    return example?.title;
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <BreadcrumbPill identity={identity} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-72">
        {examples.map((example) => (
          <DropdownMenuItem
            key={example.id}
            onClick={() => {
              void loadExample(example);
            }}
          >
            {example.title}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() => {
            datastore.load({
              schema: "definition user {}\n",
              relationshipsYaml: "",
              assertionsYaml: "",
              verificationYaml: "",
            });
            datastore.clearBaseline();
          }}
        >
          Reset to blank
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const DocLink = ({ title, href }: { title: string; href: string }) => (
  <Button asChild variant="ghost" size="sm" title={title}>
    <a href={href} target="_blank" rel="noreferrer">
      <BookOpenText />
      <span className="hidden lg:inline">{title}</span>
    </a>
  </Button>
);
