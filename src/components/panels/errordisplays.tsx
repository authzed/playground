import "react-reflex/styles.css";

import { Link } from "@tanstack/react-router";
import { CircleX, MessageCircleWarning } from "lucide-react";

import { DataStoreItemKind, DataStorePaths } from "../../services/datastore";
import {
  DeveloperError,
  DeveloperError_Source,
  DeveloperWarning,
} from "../../spicedb-common/protodefs/developer/v1/developer_pb";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export const ERROR_SOURCE_TO_ITEM = {
  [DeveloperError_Source.SCHEMA]: DataStoreItemKind.SCHEMA,
  [DeveloperError_Source.RELATIONSHIP]: DataStoreItemKind.RELATIONSHIPS,
  [DeveloperError_Source.ASSERTION]: DataStoreItemKind.ASSERTIONS,
  [DeveloperError_Source.VALIDATION_YAML]: DataStoreItemKind.EXPECTED_RELATIONS,
  [DeveloperError_Source.CHECK_WATCH]: undefined,
  [DeveloperError_Source.UNKNOWN_SOURCE]: undefined,
};

export function DeveloperErrorDisplay({ error }: { error: DeveloperError }) {
  return (
    <Alert variant="destructive">
      <CircleX />
      <AlertTitle>{error.message}</AlertTitle>
      {error.path.length > 0 && (
        <AlertDescription>
          Found Via:
          <ul className="">
            {error.path.map((item) => (
              // NOTE: the \2192 here is the → character; tailwind needs it as an escape sequence.
              <li
                className="after:content-['\u2192'] after:ml-2 last:after:content-none"
                key={item}
              >
                {item}
              </li>
            ))}
          </ul>
        </AlertDescription>
      )}
    </Alert>
  );
}

export function DeveloperWarningDisplay({ warning }: { warning: DeveloperWarning }) {
  return (
    <Alert>
      <MessageCircleWarning />
      <AlertTitle>{warning.message}</AlertTitle>
    </Alert>
  );
}

export function DeveloperWarningSourceDisplay({ warning }: { warning: DeveloperWarning }) {
  return (
    <div className="m-2">
      In
      <Link to={DataStorePaths.Schema()}>Schema</Link>
      {/* NOTE: this is a guess; I think this was an unintentional omission. */}: {warning.message}
    </div>
  );
}

export function DeveloperSourceDisplay({ error }: { error: DeveloperError }) {
  // TODO: unify with error source above.
  return (
    <div>
      {error.source === DeveloperError_Source.SCHEMA && (
        <div className="m-2">
          In
          <Link to={DataStorePaths.Schema()}>Schema</Link>:
        </div>
      )}
      {error.source === DeveloperError_Source.ASSERTION && (
        <div className="m-2">
          In
          <Link to={DataStorePaths.Assertions()}>Assertions</Link>:
        </div>
      )}
      {error.source === DeveloperError_Source.RELATIONSHIP && (
        <div className="m-2">
          In
          <Link to={DataStorePaths.Relationships()}>Test Data</Link>:
        </div>
      )}
      {error.source === DeveloperError_Source.VALIDATION_YAML && (
        <div className="m-2">
          In
          <Link to={DataStorePaths.ExpectedRelations()}>Expected Relations</Link>:
        </div>
      )}
    </div>
  );
}
