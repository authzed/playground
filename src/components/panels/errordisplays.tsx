import { DataStoreItemKind } from "../../services/datastore";
import {
  DeveloperError,
  DeveloperError_Source,
  DeveloperWarning,
} from "../../spicedb-common/protodefs/developer/v1/developer_pb";
import { DocumentLink } from "../document-link";

export const ERROR_SOURCE_TO_ITEM = {
  [DeveloperError_Source.SCHEMA]: DataStoreItemKind.SCHEMA,
  [DeveloperError_Source.RELATIONSHIP]: DataStoreItemKind.RELATIONSHIPS,
  [DeveloperError_Source.ASSERTION]: DataStoreItemKind.ASSERTIONS,
  [DeveloperError_Source.VALIDATION_YAML]: DataStoreItemKind.EXPECTED_RELATIONS,
  [DeveloperError_Source.CHECK_WATCH]: undefined,
  [DeveloperError_Source.UNKNOWN_SOURCE]: undefined,
};

/**
 * Inline source-location label for a warning. Renders just a short link to
 * the document in muted text — no leading "In " preamble.
 */
export function DeveloperWarningSourceDisplay(_props: { warning: DeveloperWarning }) {
  return <DocumentLink to="schema">Schema</DocumentLink>;
}

/**
 * Inline source-location label for a developer error. Renders just the
 * source name (linked) in muted text — no leading "In " preamble.
 */
export function DeveloperSourceDisplay({ error }: { error: DeveloperError }) {
  if (error.source === DeveloperError_Source.SCHEMA) {
    return <DocumentLink to="schema">Schema</DocumentLink>;
  }
  if (error.source === DeveloperError_Source.ASSERTION) {
    return <DocumentLink to="assertions">Assertions</DocumentLink>;
  }
  if (error.source === DeveloperError_Source.RELATIONSHIP) {
    return <DocumentLink to="relationships">Test Data</DocumentLink>;
  }
  if (error.source === DeveloperError_Source.VALIDATION_YAML) {
    return <DocumentLink to="expected">Expected Relations</DocumentLink>;
  }
  return null;
}
