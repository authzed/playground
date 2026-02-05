import { Theme } from "@glideapps/glide-data-grid";
import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";
import { useCallback, useMemo, useState } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";

import { DataStore, DataStoreItemKind } from "../services/datastore";
import { Services } from "../services/services";
import { CommentCellPrefix } from "../spicedb-common/components/relationshipeditor/columns";
import {
  RelationshipDatum,
  relationshipToDatum,
  toFullRelationshipString,
} from "../spicedb-common/components/relationshipeditor/data";
import {
  RelationTupleHighlight,
  RelationshipEditor,
} from "../spicedb-common/components/relationshipeditor/RelationshipEditor";
import { RelationshipOrComment, parseRelationshipsAndComments } from "../spicedb-common/parsing";
import {
  DeveloperError,
  DeveloperError_Source,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";

const partialRelationshipCommentPrefix = "partial relationship: ";

function fromRelationshipsString(relString: string): RelationshipDatum[] {
  return parseRelationshipsAndComments(relString).map((value: RelationshipOrComment) => {
    if ("comment" in value) {
      const comment = value.comment.trim();
      if (comment.startsWith(partialRelationshipCommentPrefix)) {
        return JSON.parse(comment.substring(partialRelationshipCommentPrefix.length));
      }

      return {
        comment: `${CommentCellPrefix} ${comment}`,
      };
    }

    return relationshipToDatum(value);
  });
}

function toRelationshipsString(data: RelationshipDatum[]): string {
  return data
    .map((datum: RelationshipDatum, index: number) => {
      if ("comment" in datum) {
        const hasPreviousRelationship = index > 0 && !("comment" in data[index - 1]);
        return `${hasPreviousRelationship ? "\n" : ""}${datum.comment}`;
      }

      return (
        toFullRelationshipString(datum) ??
        `// ${partialRelationshipCommentPrefix}${JSON.stringify(datum)}`
      );
    })
    .filter((v: string | undefined) => {
      return !!v;
    })
    .join("\n");
}

export type DatastoreRelationshipEditorProps = {
  datastore: DataStore;
  services: Services;
  isReadOnly: boolean;
  datastoreUpdated: () => void;
  themeOverrides?: Partial<Theme> | undefined;
} & { dimensions?: { width: number; height: number } };

export function DatastoreRelationshipEditor(props: DatastoreRelationshipEditorProps) {
  const debouncedUpdateDatastore = useDebouncedCallback(
    (data: RelationshipDatum[]) => {
      const editableContents = toRelationshipsString(data);
      props.datastore.update(relationshipsItem, editableContents);
      props.datastoreUpdated();
    },
    { wait: 50 },
  );

  const handleDataUpdated = useCallback(
    (data: RelationshipDatum[]) => {
      debouncedUpdateDatastore(data);
    },
    [debouncedUpdateDatastore],
  );

  const relErrors = useMemo(() => {
    return props.services.problemService.requestErrors.filter(
      (error: DeveloperError) => error.source === DeveloperError_Source.RELATIONSHIP,
    );
  }, [props.services.problemService.requestErrors]);

  const [highlights, setHighlights] = useState<RelationTupleHighlight[]>([]);
  useDeepCompareEffect(() => {
    setHighlights(
      relErrors.map((error: DeveloperError) => {
        return {
          tupleString: error.context,
          color: "rgba(255, 0, 0, 0.2)",
          message: error.message,
        };
      }),
    );
  }, [relErrors]);

  const relationshipsItem = props.datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS);
  const relationshipsString = relationshipsItem.editableContents;
  const relationshipData: RelationshipDatum[] = useMemo(() => {
    return fromRelationshipsString(relationshipsString);
  }, [relationshipsString]);

  return (
    <RelationshipEditor
      {...props}
      relationshipData={relationshipData}
      resolver={props.services.localParseService.state.resolver}
      highlights={highlights}
      dataUpdated={handleDataUpdated}
      isReadOnly={props.isReadOnly}
    />
  );
}
