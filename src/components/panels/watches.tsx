import type { ParsedPermission, ParsedRelation } from "@authzed/spicedb-parser-js";
import { interpolateBlues, interpolateOranges, interpolatePurples } from "d3-scale-chromatic";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  CircleX,
  Info,
  Loader2,
  MessageCircleWarning,
  PlusCircle,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { type ChangeEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  LiveCheckItem,
  LiveCheckItemStatus,
  LiveCheckService,
  LiveCheckStatus,
} from "../../services/check";
import { DataStore, DataStoreItemKind } from "../../services/datastore";
import { LocalParseService } from "../../services/localparse";
import { Services } from "../../services/services";
import { parseRelationships } from "../../spicedb-common/parsing";
import { RelationTuple as Relationship } from "../../spicedb-common/protodefs/core/v1/core_pb";
import { CheckDebugTraceView } from "../CheckDebugTraceView";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";

interface WatchesPanelProps {
  services: Services;
  datastore: DataStore;
}

export function WatchesPanel({ services, datastore }: WatchesPanelProps) {
  const liveCheckService = services.liveCheckService;
  const localParseService = services.localParseService;
  const editorUpdateIndex = -1; // FIXME

  return (
    <div className="overflow-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead className="w-8" />
            <TableHead>Resource</TableHead>
            <TableHead>Permission</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Context (optional)</TableHead>
            <TableHead className="w-8">
              <Button size="icon-sm" variant="ghost" onClick={liveCheckService.addItem}>
                <PlusCircle />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        {liveCheckService.state.status === LiveCheckStatus.PARSE_ERROR && (
          <TableBody>
            <TableRow>
              <TableCell colSpan={7}>
                <Alert>
                  <MessageCircleWarning />
                  <AlertTitle>Checks not run</AlertTitle>
                  <AlertDescription>
                    There is an error in the schema or test relationships
                  </AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
        {liveCheckService.state.status === LiveCheckStatus.NEVER_RUN && (
          <TableBody>
            <TableRow>
              <TableCell colSpan={7}>
                <Alert>
                  <Info />
                  <AlertTitle>Developer system is currently loading</AlertTitle>
                </Alert>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
        {liveCheckService.state.status === LiveCheckStatus.SERVICE_ERROR && (
          <TableBody>
            <TableRow>
              <TableCell colSpan={7}>
                <Alert variant="destructive">
                  <CircleX />
                  <AlertTitle>{liveCheckService.state.serverErr}</AlertTitle>
                </Alert>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
        <TableBody>
          {liveCheckService.items.map((item: LiveCheckItem) => (
            <LiveCheckRow
              key={item.id}
              service={liveCheckService}
              localParseService={localParseService}
              editorUpdateIndex={editorUpdateIndex}
              datastore={datastore}
              item={item}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function notNull(value: string | null): value is string {
  return value !== null;
}

const filter = (values: (string | null)[]): string[] => {
  const filtered = values.filter(notNull);
  return Array.from(new Set(filtered));
};

interface LiveCheckRowProps {
  service: LiveCheckService;
  item: LiveCheckItem;
  editorUpdateIndex?: number;
  datastore: DataStore;
  localParseService: LocalParseService;
}

function LiveCheckRow(props: LiveCheckRowProps) {
  const item = props.item;
  const datastore = props.datastore;
  const liveCheckService = props.service;

  const [object, setObject] = useState(item.object);
  const [action, setAction] = useState(item.action);
  const [subject, setSubject] = useState(item.subject);
  const [context, setContext] = useState(() =>
    item.context ? item.context.substring("default:".length) : "",
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const handleObjectChange = (next: string) => {
    setObject(next);
    item.object = next;
    liveCheckService.itemUpdated(item);
  };
  const handleActionChange = (next: string) => {
    setAction(next);
    item.action = next;
    liveCheckService.itemUpdated(item);
  };
  const handleSubjectChange = (next: string) => {
    setSubject(next);
    item.subject = next;
    liveCheckService.itemUpdated(item);
  };
  const handleContextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setContext(next);
    item.context = next ? `default:${next}` : "";
    liveCheckService.itemUpdated(item);
  };

  const relationshipContents =
    props.datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS).editableContents ?? "";
  const relationships = useMemo(
    () => parseRelationships(relationshipContents),
    [relationshipContents],
  );

  const objects = useMemo(
    () =>
      filter(
        relationships.map((r: Relationship) => {
          const onr = r.resourceAndRelation;
          return onr ? `${onr.namespace}:${onr.objectId}` : null;
        }),
      ),
    [relationships],
  );

  const actions = useMemo(() => {
    const [definitionPath] = object.split(":", 2);
    const definition = props.localParseService.lookupDefinition(definitionPath);
    if (definition) {
      return definition
        .listRelationsAndPermissions()
        .map((r: ParsedRelation | ParsedPermission) => r.name);
    }
    return filter(
      relationships.map((r: Relationship) => r.resourceAndRelation?.relation ?? null),
    );
    // NOTE: we include editorUpdateIndex to ensure this is recomputed on
    // editor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datastore, relationships, object, props.editorUpdateIndex, props.localParseService]);

  const subjects = useMemo(
    () =>
      filter(
        relationships.map((r: Relationship) => {
          const s = r.subject;
          if (!s || s.objectId === "*") return null;
          if (s.relation === "...") return `${s.namespace}:${s.objectId}`;
          return `${s.namespace}:${s.objectId}#${s.relation}`;
        }),
      ),
    [relationships],
  );

  const status = liveCheckService.state.status;
  const statusIcon = (() => {
    if (status === LiveCheckStatus.CHECKING) return <Loader2 className="size-4 animate-spin" />;
    if (status === LiveCheckStatus.PARSE_ERROR)
      return <TriangleAlert className="size-4 text-muted-foreground" />;
    if (status === LiveCheckStatus.SERVICE_ERROR)
      return <CircleAlert className="size-4 text-destructive" />;
    if (status === LiveCheckStatus.NEVER_RUN)
      return <span className="size-4 rounded-full border border-current" />;
    if (status === LiveCheckStatus.NOT_CHECKING) {
      switch (item.status) {
        case LiveCheckItemStatus.FOUND:
          return <CheckCircle className="size-4 text-emerald-500" />;
        case LiveCheckItemStatus.NOT_FOUND:
          return <CircleX className="size-4 text-destructive" />;
        case LiveCheckItemStatus.NOT_CHECKED:
          return <span className="size-4 rounded-full border border-current" />;
        case LiveCheckItemStatus.NOT_VALID:
          return <Trash2 className="size-4 text-muted-foreground" />;
        case LiveCheckItemStatus.INVALID:
          return <TriangleAlert className="size-4 text-yellow-700" />;
        case LiveCheckItemStatus.CAVEATED:
          return <CircleHelp className="size-4 text-indigo-400" />;
      }
    }
    return null;
  })();

  return (
    <>
      {item.status === LiveCheckItemStatus.INVALID && (
        <TableRow>
          <TableCell colSpan={7} className="bg-yellow-700/30 text-foreground">
            {item.errorMessage}:
          </TableCell>
        </TableRow>
      )}
      <TableRow>
        <TableCell className="w-8 px-1 align-middle">
          {item.debugInformation !== undefined && (
            <Button size="icon-xs" variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </Button>
          )}
        </TableCell>
        <TableCell className="w-8 px-1 align-middle">{statusIcon}</TableCell>
        <TableCell className="w-[28%]">
          <div className="flex items-center gap-2">
            <DotDisplay colorSet={interpolatePurples} valueSet={objects} value={object} />
            <Combobox
              options={objects.map((o) => ({ value: o }))}
              value={object}
              onValueChange={handleObjectChange}
              placeholder="tenant/namespace:objectid"
              inputClassName="font-mono"
            />
          </div>
        </TableCell>
        <TableCell className="w-[18%]">
          <div className="flex items-center gap-2">
            <DotDisplay colorSet={interpolateBlues} valueSet={actions} value={action} />
            <Combobox
              options={actions.map((a) => ({ value: a }))}
              value={action}
              onValueChange={handleActionChange}
              placeholder="view"
              inputClassName="font-mono"
            />
          </div>
        </TableCell>
        <TableCell className="w-[28%]">
          <div className="flex items-center gap-2">
            <DotDisplay colorSet={interpolateOranges} valueSet={subjects} value={subject} />
            <Combobox
              options={subjects.map((s) => ({ value: s }))}
              value={subject}
              onValueChange={handleSubjectChange}
              placeholder="tenant/user:someuser"
              inputClassName="font-mono"
            />
          </div>
        </TableCell>
        <TableCell className="w-[26%]">
          <Input
            value={context}
            onChange={handleContextChange}
            placeholder='{"field": value}'
            className="font-mono"
          />
        </TableCell>
        <TableCell className="w-8">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => liveCheckService.removeItem(item)}
          >
            <Trash2 />
          </Button>
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
  const found = props.valueSet.indexOf(props.value);
  const color = found >= 0 ? props.colorSet(1 - found / 9) : "transparent";
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
