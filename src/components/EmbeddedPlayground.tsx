import type { ParsedObjectDefinition } from "@authzed/spicedb-parser-js";
import { create } from "@bufbuild/protobuf";
import { getRouteApi } from "@tanstack/react-router";
import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Database,
  File,
  HelpCircle,
  Loader,
  ThumbsUp,
  User,
} from "lucide-react";
import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  liveCheckItemToWatch,
  type LiveCheckService,
  useLiveCheckService,
} from "../services/check";
import AppConfig from "../services/configservice";
import { DataStore, DataStoreItemKind, useReadonlyDatastore } from "../services/datastore";
import { useLocalParseService } from "../services/localparse";
import { useProblemService } from "../services/problem";
import { Services } from "../services/services";
import { useValidationService } from "../services/validation";
import { DS_EMBED_DARK_THEME_NAME } from "../spicedb-common/lang/dslang";
import { RelationshipFound, parseRelationship } from "../spicedb-common/parsing";
import {
  CheckOperationParametersSchema,
  CheckOperationsResult,
  CheckOperationsResult_Membership,
  CheckOperationsResultSchema,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";
import {
  type DeveloperService,
  useDeveloperService,
} from "../spicedb-common/services/developerservice";

import { DatastoreRelationshipEditor } from "./DatastoreRelationshipEditor";
import { EditorDisplay } from "./EditorDisplay";
import "./fonts.css";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const FONT_FAMILY =
  'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

export function EmbeddedPlayground() {
  const datastore = useReadonlyDatastore();
  const developerService = useDeveloperService();
  const liveCheckService = useLiveCheckService(developerService, datastore);
  return (
    <div
      className="group bg-[rgb(14,13,17)] h-screen w-screen flex items-center justify-center relative text-white"
      style={{ fontFamily: FONT_FAMILY }}
    >
      <EmbeddedPlaygroundUI
        datastore={datastore}
        developerService={developerService}
        liveCheckService={liveCheckService}
      />
    </div>
  );
}

function EmbeddedPlaygroundUI(props: {
  datastore: DataStore;
  developerService: DeveloperService;
  liveCheckService: LiveCheckService;
}) {
  const datastore = props.datastore;
  const developerService = props.developerService;
  const { loadWatches } = props.liveCheckService;
  const localParseService = useLocalParseService(datastore);
  const validationService = useValidationService(developerService, datastore);
  const problemService = useProblemService(
    localParseService,
    props.liveCheckService,
    validationService,
  );
  const zedTerminalService = undefined; // not used

  const routeApi = getRouteApi("/e/$shareId");
  const shareData = routeApi.useLoaderData();
  const { shareId } = routeApi.useParams();

  // Load the datastore from what's loaded by the route loader
  useEffect(() => {
    datastore.load({
      schema: shareData.schema || "",
      relationshipsYaml: shareData.relationships_yaml || "",
      assertionsYaml: shareData.assertions_yaml || "",
      verificationYaml: shareData.validation_yaml || "",
    });
    datastore.setBaseline("shared", shareId);
    if (loadWatches) {
      loadWatches(shareData.check_watches ?? []);
    }
  }, [shareData, datastore, shareId, loadWatches]);

  const services = {
    localParseService,
    liveCheckService: props.liveCheckService,
    validationService,
    problemService,
    developerService,
    zedTerminalService,
  };

  const [disableMouseWheelScrolling, setDisableMouseWheelScrolling] = useState(true);

  const schema = datastore.getById(datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).id);
  const [resizeIndex, setResizeIndex] = useState(0);

  useEffect(() => {
    const handler = () => {
      // Force a rerender
      setResizeIndex(resizeIndex + 1);
    };

    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
    };
  }, [resizeIndex, setResizeIndex]);

  const [mode, setMode] = useState<"schema" | "relationships">("schema");

  const shareAndOpen = async () => {
    const shareApiEndpoint = AppConfig().shareApiEndpoint;
    if (!shareApiEndpoint) {
      return;
    }

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

    const checkWatches = props.liveCheckService.items.map(liveCheckItemToWatch);

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
        return;
      }

      const result = await response.json();
      const reference = result.hash;
      window.open(`${window.location.origin}/s/${reference}`);
    } catch (error: unknown) {
      toast.error("Error sharing", {
        description: error instanceof Error ? error.message : "Failed to share playground",
      });
      return;
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity ease-in-out duration-200"
        onClick={shareAndOpen}
      >
        Open In Playground
      </Button>
      <div
        onClick={() => setDisableMouseWheelScrolling(false)}
        className="[border-style:outset] border border-[#6d49ac] rounded-2xl h-screen w-screen grid grid-cols-[1fr_1px_1fr] gap-x-2.5 p-6"
      >
        <div className="grid grid-rows-[auto_1fr]">
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="text-[85%] inline-grid grid-cols-[auto_auto_auto] gap-x-1.5 items-center mb-4 border border-[rgba(232,232,232,0.21)] rounded-lg uppercase p-2 bg-[linear-gradient(90deg,rgba(243,241,255,0.1)_0%,rgba(243,241,255,0)_100%)] cursor-pointer outline-none">
                  {mode === "schema" && (
                    <>
                      <SchemaIcon />
                      Example Definitions
                    </>
                  )}
                  {mode === "relationships" && (
                    <>
                      <Database className="size-4" />
                      Example Relationships
                    </>
                  )}
                  <span className="opacity-50">
                    <ChevronDown className="size-4" />
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[rgb(20,18,24)] border border-[rgba(232,232,232,0.21)] text-white max-h-[300px] max-w-[500px]">
                <DropdownMenuItem
                  className="grid grid-cols-[auto_1fr] gap-x-1.5 items-center text-white focus:bg-white/10 focus:text-white cursor-pointer"
                  onClick={() => setMode("schema")}
                >
                  <SchemaIcon />
                  Definitions
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="grid grid-cols-[auto_1fr] gap-x-1.5 items-center text-white focus:bg-white/10 focus:text-white cursor-pointer"
                  onClick={() => setMode("relationships")}
                >
                  <Database className="size-4" />
                  Relationships
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <>
            {mode === "schema" && (
              <EditorDisplay
                services={services}
                datastore={datastore}
                isReadOnly={false}
                currentItem={schema}
                datastoreUpdated={() => null}
                disableMouseWheelScrolling={disableMouseWheelScrolling}
                defaultWidth="100%"
                defaultHeight="100%"
                themeName={DS_EMBED_DARK_THEME_NAME}
                fontSize={13}
                scrollBeyondLastLine={false}
                hideMinimap
              />
            )}
            {mode === "relationships" && (
              <DatastoreRelationshipEditor
                datastore={datastore}
                services={services}
                isReadOnly={false}
                datastoreUpdated={() => null}
                dimensions={{
                  width: document.body.clientWidth / 2 - 40,
                  height: document.body.clientHeight - 120,
                }}
                themeOverrides={{
                  bgCell: "rgb(14,13,17)",
                  bgCellMedium: "#1f1f23",
                  bgHeader: "#1f1f23",
                }}
              />
            )}
          </>
        </div>
        <div className="bg-[#444]" />
        <div className="grid grid-rows-[auto_1fr]">
          <div>
            <div className="text-[85%] inline-grid grid-cols-[auto_auto_auto] gap-x-1.5 items-center mb-4 border border-[rgba(232,232,232,0.21)] rounded-lg uppercase p-2 bg-[linear-gradient(90deg,rgba(243,241,255,0.1)_0%,rgba(243,241,255,0)_100%)]">
              <div className="relative w-4 h-4 overflow-hidden">
                <svg
                  className="absolute top-[-10px] left-[-6px]"
                  width="30"
                  height="30"
                  viewBox="0 0 30 30"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12.6418 17.9979C12.6418 17.3235 12.5302 16.6809 12.3069 16.0702C12.0881 15.4595 11.7737 14.9081 11.3635 14.4159C11.245 14.2746 11.1197 14.188 10.9875 14.1561C10.8599 14.1197 10.7369 14.1265 10.6184 14.1766C10.5045 14.2222 10.4087 14.2929 10.3313 14.3886C10.2584 14.4843 10.2196 14.5936 10.2151 14.7167C10.2105 14.8397 10.2515 14.9605 10.3381 15.079C10.73 15.5712 11.0058 16.0429 11.1653 16.494C11.3293 16.9406 11.4114 17.4419 11.4114 17.9979C11.4114 18.5539 11.3293 19.0575 11.1653 19.5087C11.0058 19.9553 10.7323 20.4247 10.3449 20.9169C10.2538 21.0354 10.2105 21.1561 10.2151 21.2792C10.2242 21.4022 10.2652 21.5116 10.3381 21.6073C10.4156 21.6985 10.5113 21.7668 10.6252 21.8124C10.7392 21.858 10.8599 21.8648 10.9875 21.8329C11.1197 21.801 11.245 21.7144 11.3635 21.5731C11.7737 21.0855 12.0881 20.5363 12.3069 19.9257C12.5302 19.3104 12.6418 18.6679 12.6418 17.9979ZM16.2102 17.9979C16.2102 16.968 16.053 15.9813 15.7385 15.038C15.424 14.0946 14.9752 13.231 14.3918 12.4472C14.2779 12.2922 14.1526 12.1942 14.0158 12.1532C13.8791 12.1122 13.7492 12.1122 13.6262 12.1532C13.5031 12.1942 13.4006 12.2649 13.3186 12.3651C13.2411 12.4654 13.2001 12.5816 13.1955 12.7138C13.1955 12.8459 13.2502 12.9826 13.3596 13.1239C13.8882 13.8121 14.2893 14.5709 14.5627 15.4003C14.8407 16.2297 14.9797 17.0956 14.9797 17.9979C14.9797 18.9003 14.8407 19.7662 14.5627 20.5956C14.2893 21.4205 13.8882 22.1793 13.3596 22.872C13.2502 23.0087 13.1955 23.1431 13.1955 23.2753C13.2001 23.412 13.2411 23.5282 13.3186 23.6239C13.4006 23.7242 13.5031 23.7948 13.6262 23.8358C13.7492 23.8768 13.8791 23.8768 14.0158 23.8358C14.1526 23.7948 14.2779 23.6991 14.3918 23.5487C14.9752 22.7649 15.424 21.9013 15.7385 20.9579C16.053 20.0145 16.2102 19.0279 16.2102 17.9979ZM19.7854 17.9979C19.7854 16.6125 19.5757 15.2863 19.1565 14.0194C18.7418 12.7525 18.147 11.5836 17.3723 10.5126C17.2675 10.3713 17.1467 10.2802 17.01 10.2391C16.8778 10.1936 16.7502 10.189 16.6272 10.2255C16.5041 10.2619 16.4016 10.328 16.3196 10.4237C16.2375 10.5194 16.1942 10.6334 16.1897 10.7655C16.1851 10.8977 16.2398 11.0367 16.3537 11.1825C17.0738 12.1623 17.6207 13.2287 17.9944 14.3817C18.3681 15.5347 18.5549 16.7401 18.5549 17.9979C18.5549 19.2512 18.3681 20.4566 17.9944 21.6141C17.6207 22.7671 17.0738 23.829 16.3537 24.7997C16.2489 24.9501 16.1965 25.0914 16.1965 25.2235C16.2011 25.3557 16.2421 25.4696 16.3196 25.5653C16.4016 25.6656 16.5041 25.7339 16.6272 25.7704C16.7502 25.8069 16.8778 25.8023 17.01 25.7567C17.1467 25.7157 17.2675 25.62 17.3723 25.4696C18.147 24.4032 18.7418 23.2365 19.1565 21.9696C19.5757 20.7027 19.7854 19.3788 19.7854 17.9979Z"
                    fill="#CE99EE"
                  />
                </svg>
              </div>
              Example Query
            </div>
          </div>
          <div>
            <EmbeddedQuery services={services} />
          </div>
        </div>
      </div>
    </>
  );
}

function EmbeddedQuery(props: { services: Services }) {
  const [subject, setSubject] = useState("");
  const [permission, setPermission] = useState("");
  const [resource, setResource] = useState("");

  const schemaText = props.services.localParseService.state.schemaText;
  const relsText = props.services.localParseService.state.relsText;

  const devService = props.services.developerService;
  const queryResult: CheckOperationsResult | undefined = useMemo(() => {
    if (devService.state.status !== "ready") {
      return undefined;
    }

    if (!resource || !permission || !subject) {
      return undefined;
    }

    const relationship = parseRelationship(`${resource}#${permission}@${subject}`);
    if (relationship === undefined) {
      return undefined;
    }

    const request = devService.newRequest(schemaText, relsText);
    let checkResult: CheckOperationsResult = create(CheckOperationsResultSchema, {
      membership: CheckOperationsResult_Membership.UNKNOWN,
    });
    request?.check(
      create(CheckOperationParametersSchema, {
        resource: relationship.resourceAndRelation!,
        subject: relationship.subject!,
      }),
      (r: CheckOperationsResult) => {
        checkResult = r;
      },
    );
    if (request?.execute().developerErrors || request?.execute().internalError) {
      return undefined;
    }
    return checkResult;
  }, [subject, permission, resource, devService, schemaText, relsText]);

  const resultBgClass =
    queryResult === undefined
      ? "bg-[#aaa]"
      : queryResult.membership === CheckOperationsResult_Membership.NOT_MEMBER
        ? "bg-[#f44336]"
        : queryResult.membership === CheckOperationsResult_Membership.MEMBER
          ? "bg-[#4caf50]"
          : queryResult.membership === CheckOperationsResult_Membership.CAVEATED_MEMBER
            ? "bg-[#8787ff]"
            : "bg-[#ccc]";

  return (
    <div>
      <div className="[border-style:outset] border border-[#6d49ac] rounded-2xl mb-4 p-2 grid grid-cols-[6px_1fr] gap-x-2.5">
        <span className="rounded-2xl bg-[#444]" />
        <div className="p-1.5">
          Can{" "}
          <Selector
            type="subject"
            currentValue={subject}
            services={props.services}
            onChange={(v) => setSubject(v)}
          />{" "}
          <Selector
            type="permission"
            currentValue={permission}
            currentResource={resource}
            services={props.services}
            onChange={(v) => setPermission(v)}
          />{" "}
          <Selector
            type="resource"
            currentValue={resource}
            services={props.services}
            onChange={(v) => setResource(v)}
          />
          ?
        </div>
      </div>
      <div className="[border-style:outset] border border-[#6d49ac] rounded-2xl mb-4 p-2 grid grid-cols-[6px_1fr] gap-x-2.5">
        <span className={clsx("rounded-2xl", resultBgClass)} />
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-1.5">
          {devService.state.status === "loading" && (
            <>
              <Loader className="size-4 animate-spin" />
              Loading developer system
            </>
          )}
          {(devService.state.status === "loaderror" ||
            devService.state.status === "unsupported") && (
            <>
              Sorry, could not load the developer system. Please try the{" "}
              <a
                href="https://play.authzed.com"
                target="_blank"
                rel="noopener nofollow noreferrer"
                className="text-white"
              >
                standalone Playground
              </a>
            </>
          )}
          {devService.state.status === "ready" && !queryResult && (
            <>Sorry, there is an issue in the provided schema, relationships or query</>
          )}
          {queryResult?.checkError !== undefined && (
            <>
              <AlertCircle className="size-4" />
              <div>{queryResult.checkError.message}</div>
            </>
          )}
          {queryResult?.membership === CheckOperationsResult_Membership.NOT_MEMBER && (
            <>
              <AlertCircle className="size-4 text-[#f44336]" />
              <div>
                <Display kind="subject">{subject}</Display> does not have permission{" "}
                <Display kind="permission">{permission}</Display> on{" "}
                <Display kind="resource">{resource}</Display>
              </div>
            </>
          )}
          {queryResult?.membership === CheckOperationsResult_Membership.MEMBER && (
            <>
              <CheckCircle2 className="size-4 text-[#4caf50]" />
              <div>
                <Display kind="subject">{subject}</Display> has permission{" "}
                <Display kind="permission">{permission}</Display> on{" "}
                <Display kind="resource">{resource}</Display>
              </div>
            </>
          )}
          {queryResult?.membership === CheckOperationsResult_Membership.CAVEATED_MEMBER && (
            <>
              <HelpCircle className="size-4 text-[#8787ff]" />
              <div>
                <Display kind="subject">{subject}</Display> might have permission{" "}
                <Display kind="permission">{permission}</Display> on{" "}
                <Display kind="resource">{resource}</Display> depending on the value(s) of{" "}
                <Display kind="caveatfields">
                  {queryResult.partialCaveatInfo?.missingRequiredContext.join(", ")}
                </Display>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Display(
  props: PropsWithChildren<{
    kind: "subject" | "permission" | "resource" | "caveatfields";
  }>,
) {
  const colorClass = {
    resource: "text-[#E9786E]",
    subject: "text-[#cec2f3]",
    permission: "text-[#1acc92]",
    caveatfields: "text-[#8787ff]",
  }[props.kind];

  return <code className={colorClass}>{props.children}</code>;
}

function Selector(props: {
  type: "subject" | "permission" | "resource";
  services: Services;
  currentValue: string;
  currentResource?: string;
  onChange: (value: string) => void;
}) {
  const relationships = props.services.localParseService.state.relationships;

  const filter = (values: (string | null)[]): string[] => {
    const filtered = values.filter((v: string | null) => !!v);
    const set = new Set(filtered);
    const deduped: string[] = [];
    set.forEach((value: string | null) => {
      deduped.push(value!);
    });
    return deduped;
  };

  const resources = useMemo(() => {
    return filter(
      relationships.map((r: RelationshipFound) => {
        if ("resourceAndRelation" in r.parsed) {
          const onr = r.parsed.resourceAndRelation;
          if (onr === undefined) {
            return null;
          }
          return `${onr.namespace}:${onr.objectId}`;
        }
        return null;
      }),
    );
  }, [relationships]);

  const subjects = useMemo(() => {
    return filter(
      relationships.map((r: RelationshipFound) => {
        if ("resourceAndRelation" in r.parsed) {
          const onr = r.parsed.subject;
          if (onr === undefined) {
            return null;
          }
          if (onr.relation !== "...") {
            return `${onr.namespace}:${onr.objectId}#${onr.relation}`;
          }
          return `${onr.namespace}:${onr.objectId}`;
        }
        return null;
      }),
    );
  }, [relationships]);

  const parsedSchema = props.services.localParseService.state.parsed;

  const currentResource = props.currentResource;
  const permissions = useMemo(() => {
    const hasPermission = (resourceType: string, permission: string) => {
      const found = parsedSchema?.definitions
        .filter((def) => def.kind === "objectDef")
        .find((def) => def.name === resourceType);
      if (!found) {
        return false;
      }
      return !!(found as ParsedObjectDefinition).permissions.find((p) => p.name === permission);
    };

    const unfilteredPermissions =
      parsedSchema?.definitions.flatMap((def) => {
        if (def.kind === "objectDef") {
          return def.permissions.map((p) => p.name);
        }
        return [];
      }) ?? [];

    const [resourceType] = currentResource ? currentResource.split(":", 2) : [""];

    return unfilteredPermissions.filter((p) => {
      return !resourceType || hasPermission(resourceType, p);
    });
  }, [parsedSchema, currentResource]);

  const values: string[] = {
    subject: subjects,
    permission: permissions,
    resource: resources,
  }[props.type];

  const current = props.currentValue;

  useEffect(() => {
    if (current === "" && values.length > 0) {
      props.onChange(values[0]);
    }
  }, [current, values, props]);

  const icon = useMemo(() => {
    return {
      resource: <File className="size-4" />,
      subject: <User className="size-4" />,
      permission: <ThumbsUp className="size-4" />,
    }[props.type];
  }, [props.type]);

  const borderColorClass = {
    resource: "border-[#E9786E]",
    subject: "border-[#cec2f3]",
    permission: "border-[#1acc92]",
  }[props.type];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={clsx(
            "text-[85%] inline-grid grid-cols-[auto_auto_auto] gap-x-1.5 items-center mx-2 border border-[rgba(232,232,232,0.21)] rounded-lg p-2 bg-[linear-gradient(90deg,rgba(243,241,255,0.1)_0%,rgba(243,241,255,0)_100%)] align-middle cursor-pointer outline-none",
            borderColorClass,
          )}
        >
          {icon}
          {current}
          <span className="opacity-50">
            <ChevronDown className="size-4" />
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-[rgb(20,18,24)] border border-[rgba(232,232,232,0.21)] text-white max-h-[300px] max-w-[500px] overflow-y-auto">
        {values.map((v) => (
          <DropdownMenuItem
            key={v}
            className="text-white focus:bg-white/10 focus:text-white cursor-pointer"
            onClick={() => props.onChange(v)}
          >
            {v}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SchemaIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1.15723 9.40234C1.6403 9.40234 1.88184 9.16081 1.88184 8.67773V3.5166C1.88184 3.03353 1.6403 2.79199 1.15723 2.79199C0.674154 2.79199 0.432617 3.03353 0.432617 3.5166V8.67773C0.432617 9.16081 0.674154 9.40234 1.15723 9.40234ZM4.58203 7.76172C5.0651 7.76172 5.30664 7.52018 5.30664 7.03711V5.15723C5.30664 4.67415 5.0651 4.43262 4.58203 4.43262C4.09896 4.43262 3.85742 4.67415 3.85742 5.15723V7.03711C3.85742 7.52018 4.09896 7.76172 4.58203 7.76172ZM8 11.9932C8.48307 11.9932 8.72461 11.7516 8.72461 11.2686V0.925781C8.72461 0.442708 8.48307 0.201172 8 0.201172C7.51693 0.201172 7.27539 0.442708 7.27539 0.925781V11.2686C7.27539 11.7516 7.51693 11.9932 8 11.9932ZM11.418 7.76172C11.901 7.76172 12.1426 7.52018 12.1426 7.03711V5.15723C12.1426 4.67415 11.901 4.43262 11.418 4.43262C10.9395 4.43262 10.7002 4.67415 10.7002 5.15723V7.03711C10.7002 7.52018 10.9395 7.76172 11.418 7.76172ZM14.8428 9.40234C15.3258 9.40234 15.5674 9.16081 15.5674 8.67773V3.5166C15.5674 3.03353 15.3258 2.79199 14.8428 2.79199C14.3597 2.79199 14.1182 3.03353 14.1182 3.5166V8.67773C14.1182 9.16081 14.3597 9.40234 14.8428 9.40234Z"
        fill="#08C4FF"
      />
    </svg>
  );
}
