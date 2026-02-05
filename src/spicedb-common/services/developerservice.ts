import { create, fromJsonString, toJsonString } from "@bufbuild/protobuf";
import { useCallback, useEffect, useState } from "react";

import wasmConfig from "../../wasm-config.json";
import { parseRelationships } from "../parsing";
import { RelationTuple as Relationship } from "../protodefs/core/v1/core_pb";
import {
  CheckOperationParameters,
  CheckOperationsResult,
  DeveloperRequest,
  DeveloperResponse,
  FormatSchemaParameters,
  FormatSchemaParametersSchema,
  FormatSchemaResult,
  OperationResult,
  RunAssertionsParameters,
  RunAssertionsParametersSchema,
  RunAssertionsResult,
  RunValidationParameters,
  RunValidationParametersSchema,
  RunValidationResult,
  SchemaWarningsParameters,
  SchemaWarningsParametersSchema,
  SchemaWarningsResult,
  DeveloperRequestSchema,
  DeveloperResponseSchema,
} from "../protodefs/developer/v1/developer_pb";

const WASM_FILE = `/static/main.wasm`;
const ESTIMATED_WASM_BINARY_SIZE = 46376012; // bytes

/**
 * DeveloperService is a helper service which invokes the developer package against a locally
 * running WASM-based service.
 */
export interface DeveloperService {
  /**
   * state is the state of the developer service.
   */
  state: DeveloperServiceState;

  /**
   * newRequest creates and returns a new request to the developer service, with the given schema
   * and relationships (as a newline separated string) as test data.
   */
  newRequest: (schema: string, relationshipsString: string) => DeveloperServiceRequest | undefined;
}

/**
 * DeveloperServiceState represents the various states of the developer service.
 */
export type DeveloperServiceState =
  | {
      status: "initializing" | "unsupported" | "loaderror" | "ready";
    }
  | {
      status: "loading";
      progress: number;
    };

/**
 * DeveloperServiceError is a possible error raised by the developer service itself; this is usally
 * considered a fatal error and not based on bad user input.
 */
export type DeveloperServiceError = string | null;

export type DevServiceCallback<T> = (result: T) => void;

type ResultExtractor = (result: OperationResult) => void;

type OperationAndCallback =
  | {
      operation: "check";
      parameters: {
        checkParameters: CheckOperationParameters;
      };
      callback: ResultExtractor;
    }
  | {
      operation: "runAssertions";
      parameters: {
        assertionsParameters: RunAssertionsParameters;
      };
      callback: ResultExtractor;
    }
  | {
      operation: "runValidation";
      parameters: {
        validationParameters: RunValidationParameters;
      };
      callback: ResultExtractor;
    }
  | {
      operation: "formatSchema";
      parameters: {
        formatSchemaParameters: FormatSchemaParameters;
      };
      callback: ResultExtractor;
    }
  | {
      operation: "schemaWarnings";
      parameters: {
        schemaWarningsParameters: SchemaWarningsParameters;
      };
      callback: ResultExtractor;
    };

/**
 * DeveloperServiceRequest is a request being constructed to call the developer package.
 * All calls to the various developer methods will be collected and only executed when
 * the `execute` method is invoked.
 */
class DeveloperServiceRequest {
  private relationships: Relationship[] = [];
  private operations: OperationAndCallback[] = [];

  constructor(
    private schema: string,
    relationshipsString: string,
  ) {
    this.relationships = parseRelationships(relationshipsString);
  }

  /**
   * schemaWarnings returns the request's schema's warnings, if any.
   */
  public schemaWarnings(callback: DevServiceCallback<SchemaWarningsResult>) {
    this.operations.push({
      operation: "schemaWarnings",
      parameters: {
        schemaWarningsParameters: create(SchemaWarningsParametersSchema, {}),
      },
      callback: (result: OperationResult) => {
        callback(result.schemaWarningsResult!);
      },
    });
  }

  /**
   * formatSchema returns the request's schema formatted.
   */
  public formatSchema(callback: DevServiceCallback<FormatSchemaResult>) {
    this.operations.push({
      operation: "formatSchema",
      parameters: {
        formatSchemaParameters: create(FormatSchemaParametersSchema, {}),
      },
      callback: (result: OperationResult) => {
        callback(result.formatSchemaResult!);
      },
    });
  }

  /**
   * check adds a check request operation to be executed.
   */
  public check(
    parameters: CheckOperationParameters,
    callback: DevServiceCallback<CheckOperationsResult>,
  ) {
    this.operations.push({
      operation: "check",
      parameters: {
        checkParameters: parameters,
      },
      callback: (result: OperationResult) => {
        callback(result.checkResult!);
      },
    });
  }

  /**
   * runAssertions adds a run assertions operation to be executed.
   */
  public runAssertions(yaml: string, callback: DevServiceCallback<RunAssertionsResult>) {
    this.operations.push({
      operation: "runAssertions",
      parameters: {
        assertionsParameters: create(RunAssertionsParametersSchema, {
          assertionsYaml: yaml,
        }),
      },
      callback: (result: OperationResult) => {
        callback(result.assertionsResult!);
      },
    });
  }

  /**
   * runValidation adds a run validation operation to be executed.
   */
  public runValidation(yaml: string, callback: DevServiceCallback<RunValidationResult>) {
    this.operations.push({
      operation: "runValidation",
      parameters: {
        validationParameters: create(RunValidationParametersSchema, {
          validationYaml: yaml,
        }),
      },
      callback: (result: OperationResult) => {
        callback(result.validationResult!);
      },
    });
  }

  /**
   * execute executes the queued operations, returning any *input* errors found.
   */
  public execute(): DeveloperResponse {
    const request: DeveloperRequest = create(DeveloperRequestSchema, {
      context: {
        schema: this.schema,
        relationships: this.relationships,
      },
      operations: this.operations.map((opc: OperationAndCallback) => opc.parameters),
    });

    const developerRequest = toJsonString(DeveloperRequestSchema, request);
    // NOTE: the "" codepath should not be hit under normal operation; this function
    // won't be invoked if WASM isn't available.
    const encodedResponse = window.runSpiceDBDeveloperRequest?.(developerRequest) ?? "";

    const response = fromJsonString(DeveloperResponseSchema, encodedResponse, {
      ignoreUnknownFields: true,
    });
    if (this.operations.length > 0 && response.operationsResults) {
      this.operations.forEach((osc, index) => {
        const result = response.operationsResults?.results[index];
        if (result) {
          osc.callback(result);
        }
      });
    }
    return response;
  }
}

const wasmVersion: number | string = wasmConfig?.spicedb
  ? encodeURIComponent(wasmConfig.spicedb)
  : Math.random();

/**
 * useDeveloperService returns a reference to the developer service for invoking calls against the WASM-based
 * developer package. Note that it is safe to invoke this hook multiple times; it will instantiate a singleton
 * WASM interface and invoke operations through it automatically.
 */
export function useDeveloperService(): DeveloperService {
  const [state, setState] = useState<DeveloperServiceState>({
    status: "initializing",
  });

  const loadWebAssembly = useCallback(async () => {
    console.log("Loading developer package");

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
    const contentLength = +(fetched.headers.get("Content-Length") ?? ESTIMATED_WASM_BINARY_SIZE);

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
      const result = await WebAssembly.instantiateStreaming(refetched, go.importObject);
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
    const initialized = window.runSpiceDBDeveloperRequest;
    switch (state.status) {
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
    newRequest: (schema: string, relationshipsString: string) => {
      if (!window.runSpiceDBDeveloperRequest) {
        return undefined;
      }

      return new DeveloperServiceRequest(schema, relationshipsString);
    },
  };
}
