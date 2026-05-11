import { parseSchema } from "@authzed/spicedb-parser-js";
import { getRouteApi } from "@tanstack/react-router";
import { SquareArrowOutUpRight } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ConnectedTabsList, ConnectedTabsTrigger, Tabs } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TenantGraph from "@/components/visualizer/TenantGraph";
import { cn } from "@/lib/utils";

import { useLiveCheckService } from "../services/check";
import { DataStore, DataStoreItemKind, useReadonlyDatastore } from "../services/datastore";
import { useLocalParseService } from "../services/localparse";
import { useProblemService } from "../services/problem";
import { useValidationService } from "../services/validation";
import { parseRelationships } from "../spicedb-common/parsing";
import { useDeveloperService } from "../spicedb-common/services/developerservice";

import { DatastoreRelationshipEditor } from "./DatastoreRelationshipEditor";
import { EditorDisplay } from "./EditorDisplay";

export function InlinePlayground() {
  const datastore = useReadonlyDatastore();
  return <InlinePlaygroundUI datastore={datastore} />;
}

type InlineTab = "schema" | "relationships" | "graph";

const INLINE_TAB_BADGES: Record<InlineTab, string> = {
  schema: "bg-violet-500",
  relationships: "bg-rose-500",
  graph: "bg-cyan-500",
};

const INLINE_TAB_CODES: Record<InlineTab, string> = {
  schema: "S",
  relationships: "R",
  graph: "V",
};

function InlineTabLabel({ tab, label }: { tab: InlineTab; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-bold uppercase text-white",
          INLINE_TAB_BADGES[tab],
        )}
      >
        {INLINE_TAB_CODES[tab]}
      </span>
      <span>{label}</span>
    </span>
  );
}

function InlinePlaygroundUI(props: { datastore: DataStore }) {
  const datastore = props.datastore;

  const developerService = useDeveloperService();
  const localParseService = useLocalParseService(datastore);
  const liveCheckService = useLiveCheckService(developerService, datastore);
  const { loadWatches } = liveCheckService;
  const validationService = useValidationService(developerService, datastore);
  const problemService = useProblemService(localParseService, liveCheckService, validationService);

  const routeApi = getRouteApi("/i/$shareId");
  const shareData = routeApi.useLoaderData();
  const { shareId } = routeApi.useParams();

  const services = {
    localParseService,
    liveCheckService,
    validationService,
    problemService,
    developerService,
    zedTerminalService: undefined,
  };

  // Load the datastore from what's loaded by the route loader
  useEffect(() => {
    datastore.load({
      schema: shareData.schema || "",
      relationshipsYaml: shareData.relationships_yaml || "",
      assertionsYaml: shareData.assertions_yaml || "",
      verificationYaml: shareData.validation_yaml || "",
    });
    datastore.setBaseline("shared", shareId);
    loadWatches(shareData.check_watches ?? []);
  }, [shareData, datastore, shareId, loadWatches]);

  const [disableMouseWheelScrolling, setDisableMouseWheelScrolling] = useState(true);
  const [tab, setTab] = useState<InlineTab>("schema");

  const schemaItem = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA);
  const parsedSchema = parseSchema(schemaItem.editableContents!);
  const relationships = parseRelationships(
    datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS).editableContents!,
  );

  return (
    <div
      onClick={() => setDisableMouseWheelScrolling(false)}
      className="grid h-screen grid-rows-[auto_1fr] bg-background"
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as InlineTab)}>
        <ConnectedTabsList className="border-b-0">
          <ConnectedTabsTrigger value="schema">
            <InlineTabLabel tab="schema" label="Schema" />
          </ConnectedTabsTrigger>
          <ConnectedTabsTrigger value="relationships">
            <InlineTabLabel tab="relationships" label="Relationships" />
          </ConnectedTabsTrigger>
          <ConnectedTabsTrigger value="graph">
            <InlineTabLabel tab="graph" label="Graph" />
          </ConnectedTabsTrigger>

          <div className="ml-auto flex items-center pr-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon-sm" variant="ghost" title="Open in Playground">
                  <a
                    href={window.location.toString().replace("/i/", "/s/")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <SquareArrowOutUpRight />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in Playground</TooltipContent>
            </Tooltip>
          </div>
        </ConnectedTabsList>
      </Tabs>

      {tab === "schema" && (
        <EditorDisplay
          services={services}
          datastore={datastore}
          isReadOnly
          currentItem={schemaItem}
          datastoreUpdated={() => null}
          disableMouseWheelScrolling={disableMouseWheelScrolling}
          defaultWidth="100vw"
          defaultHeight="100%"
        />
      )}

      {tab === "relationships" && (
        <DatastoreRelationshipEditor
          datastore={datastore}
          services={services}
          isReadOnly
          datastoreUpdated={() => null}
          dimensions={{
            width: document.body.clientWidth,
            height: document.body.clientHeight,
          }}
        />
      )}

      {tab === "graph" && (
        <div
          className="h-[98vh] w-full bg-background"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.20 0 0) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.20 0 0) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <TenantGraph schema={parsedSchema} relationships={relationships} />
        </div>
      )}
    </div>
  );
}
