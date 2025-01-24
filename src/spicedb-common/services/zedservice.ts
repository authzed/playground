import { RelationTuple as Relationship } from "../protodefs/core/v1/core_pb";
import { useCallback, useEffect, useState } from "react";
import { parseRelationships } from "../parsing";
import { RequestContextSchema } from "../protodefs/developer/v1/developer_pb";
import { create, toJson } from "@bufbuild/protobuf";
import wasmConfig from "../../wasm-config.json";

const WASM_FILE = `/static/zed.wasm`;
const ESTIMATED_WASM_BINARY_SIZE = 55126053; // bytes

/**
 * ZedService exposes a service for running commands against an in-memory `zed`
 * instance serviced by WASM.
 */
export interface ZedService {
  /**
   * state is the state of the developer service.
   */
  state: ZedServiceState;

  /**
   * start starts the zed service if it is in standby mode.
   * @returns
   */
  start: () => void;

  /**
   * runCommand runs a zed command over the given schema and string containing
   * relationships, returning the result.
   * @param schema The schema as a string.
   * @param relationshipsString A string with newline delimited relationships.
   * @param args The args for the zed command without the `zed` itself.
   * @returns The result of the command run.
   */
  runCommand: (
    schema: string,
    relationshipsString: string,
    args: string[],
  ) => CommandResult;
}

export type CommandResult = {
  updatedSchema?: string;
  updatedRelationships?: Relationship[];
  output?: string;
  error?: string;
};

export type ZedServiceState =
  | {
      status:
        | "standby"
        | "initializing"
        | "unsupported"
        | "loaderror"
        | "ready";
    }
  | {
      status: "loading";
      progress: number;
    };

const wasmVersion: number | string = wasmConfig?.zed
  ? encodeURIComponent(wasmConfig.zed)
  : Math.random();

export function useZedService(): ZedService {
  const [state, setState] = useState<ZedServiceState>({
    status: "standby",
  });

  const loadWebAssembly = useCallback(async () => {
    console.log("Loading zed package");

    setState({
      status: "loading",
      progress: 0,
    });

    // WebAssembly.instantiateStreaming is not currently available in Safari
    if (WebAssembly && !WebAssembly.instantiateStreaming) {
      // polyfill
      WebAssembly.instantiateStreaming = async (resp, importObject) => {
        const source = await (await resp).arrayBuffer();
        return await WebAssembly.instantiate(source, importObject);
      };
    }

    // Fetch the WASM file with progress tracking.
    const fetched = await fetch(`${WASM_FILE}?_r=${wasmVersion}`);
    const contentLength = +(
      fetched.headers.get("Content-Length") ?? ESTIMATED_WASM_BINARY_SIZE
    );

    const reader = fetched.body?.getReader();
    if (!reader) {
      console.warn("Failed to download developer package");
      setState({
        status: "loaderror",
      });
      return;
    }

    let totalDownloaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalDownloaded += value?.length ?? 0;
      setState({
        status: "loading",
        progress: totalDownloaded / contentLength,
      });
    }

    // Refetch, which should be from cache.
    const go = new window.Go();
    const refetched = await fetch(`${WASM_FILE}?_r=${wasmVersion}`);

    try {
      const result = await WebAssembly.instantiateStreaming(
        refetched,
        go.importObject,
      );
      go.run(result.instance);
      setState({
        status: "ready",
      });
    } catch (e) {
      console.warn("Failed to load developer package:", e);
      setState({
        status: "loaderror",
      });
    }
  }, [setState]);

  useEffect(() => {
    const initialized = window.runZedCommand;
    switch (state.status) {
      case "standby":
        return;

      case "initializing":
        if (initialized) {
          setState({
            status: "ready",
          });
          return;
        }

        if (!WebAssembly || !window.Go) {
          console.error("WebAssembly is not supported in your browser");
          setState({
            status: "unsupported",
          });
          return;
        }

        loadWebAssembly();
        break;

      case "ready":
        // Nothing to do.
        break;

      case "loading":
        // Working
        break;

      case "loaderror":
        // Nothing to do.
        break;

      case "unsupported":
        // Nothing to do.
        break;
    }
  }, [state, setState, loadWebAssembly]);

  return {
    state: state,
    start: () => {
      if (state.status === "standby") {
        setState({
          status: "initializing",
        });
        return;
      }
    },
    runCommand: (
      schema: string,
      relationshipsString: string,
      args: string[],
    ): CommandResult => {
      const reqContext = {
        schema: schema,
        relationships: parseRelationships(relationshipsString),
      };

      const contextJSONString = JSON.stringify(
        toJson(RequestContextSchema, create(RequestContextSchema, reqContext)),
      );

      const resultString = window.runZedCommand?.(contextJSONString, args)
      if (!resultString) {
          return { error: "Zed command function was undefined." }
      }
      const result = JSON.parse(resultString);
      const updatedContext = result.updated_context
        ? create(RequestContextSchema, JSON.parse(result.updated_context))
        : undefined;
      return {
        updatedSchema: updatedContext?.schema,
        updatedRelationships: updatedContext?.relationships,
        output: result.output,
        error: result.error,
      };
    },
  };
}
