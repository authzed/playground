import type { DeveloperService } from "../../spicedb-common/services/developerservice";
import { DataStore, DataStoreItemKind } from "../datastore";
import { buildAssertionsYaml, buildValidationBlockYaml } from "../validationfileformat";
import { type CheckTuple, runChecksAgainst, runValidationAgainst } from "../wasmRunners";

export interface CheckRunResult {
  result: "allowed" | "denied" | "conditional" | "error";
  message?: string;
  missingContext?: string[];
}

function readDoc(datastore: DataStore, kind: DataStoreItemKind): string {
  return datastore.getSingletonByKind(kind).editableContents ?? "";
}

export function runCheck(
  dev: DeveloperService,
  datastore: DataStore,
  tuple: CheckTuple,
): CheckRunResult {
  const schema = readDoc(datastore, DataStoreItemKind.SCHEMA);
  const relationships = readDoc(datastore, DataStoreItemKind.RELATIONSHIPS);
  const res = runChecksAgainst(dev, schema, relationships, [tuple]);
  if (!res) return { result: "error", message: "Could not compile the schema." };
  const o = res.outcomes[0];
  switch (o.kind) {
    case "member":
      return { result: "allowed" };
    case "not_member":
      return { result: "denied" };
    case "caveated":
      return { result: "conditional" };
    case "error":
      return { result: "error", message: o.message };
    case "unparseable":
      return { result: "error", message: "Could not parse the check tuple." };
  }
}

export interface ValidationRunResult {
  passed: boolean;
  failures: { message: string; line: number; column: number }[];
  requestErrors: { message: string; line: number; column: number }[];
}

const pick = (e: { message: string; line: number; column: number }) => ({
  message: e.message,
  line: e.line,
  column: e.column,
});

export function runValidation(dev: DeveloperService, datastore: DataStore): ValidationRunResult {
  const schema = readDoc(datastore, DataStoreItemKind.SCHEMA);
  const relationships = readDoc(datastore, DataStoreItemKind.RELATIONSHIPS);
  const outcome = runValidationAgainst(
    dev,
    schema,
    relationships,
    buildAssertionsYaml(datastore),
    buildValidationBlockYaml(datastore),
  );
  if (!outcome) {
    return {
      passed: false,
      failures: [],
      requestErrors: [{ message: "Could not compile the schema.", line: 0, column: 0 }],
    };
  }
  return {
    passed: outcome.requestErrors.length === 0 && outcome.validationErrors.length === 0,
    failures: outcome.validationErrors.map(pick),
    requestErrors: outcome.requestErrors.map(pick),
  };
}
