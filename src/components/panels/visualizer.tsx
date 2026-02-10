import "react-reflex/styles.css";

import { Bubbles } from 'lucide-react'
import { useNavigate } from "@tanstack/react-router";
import monaco from "monaco-editor";

import TabLabel from "../../playground-ui/TabLabel";
import { DataStoreItem, DataStoreItemKind, DataStorePaths } from "../../services/datastore";
import TenantGraph from "../../spicedb-common/components/graph/TenantGraph";
import { TextRange } from "../../spicedb-common/include/protobuf-parser";
import { ParseRelationshipError } from "../../spicedb-common/parsing";
import { RelationTuple } from "../../spicedb-common/protodefs/core/v1/core_pb";

import { PanelProps } from "./base/common";

declare module "@tanstack/react-router" {
  interface HistoryState {
    range?: TextRange;
  }
}

const darken = () => {}

const backgroundStyles = {
      backgroundSize: "20px 20px",
      backgroundColor: "default",
      backgroundImage: `
              linear-gradient(to right, ${darken(
                "default",
                0.1,
              )} 1px, transparent 1px),
              linear-gradient(to bottom, ${darken(
                "default",
                0.1,
              )} 1px, transparent 1px)
            `,
    }

export function VisualizerSummary() {
  return <TabLabel icon={<Bubbles />} title="System Visualization" />;
}

function isRelationship(
  relOrError: RelationTuple | ParseRelationshipError,
): relOrError is RelationTuple {
  return !("errorMessage" in relOrError);
}

export function VisualizerPanel({
  services,
  dimensions,
  editorPosition,
  currentItem,
}: PanelProps & {
  dimensions?: { width: number; height: number };
  editorPosition?: monaco.Position;
  currentItem?: DataStoreItem;
}) {
  const navigate = useNavigate();

  const handleBrowseRequested = (range?: TextRange) => {
    // TODO: make this functionality use querystrings instead of history state
    navigate({
      to: DataStorePaths.Schema(),
      state: {
        range,
      },
    });
  };

  const relationships = services.localParseService.state.relationships
    .map((relFound) => relFound.parsed)
    .filter(isRelationship);

  return (
    <div className="w-full h-full" style={{ height: dimensions?.height ?? 0 }}>
      <TenantGraph
        schema={services.localParseService.state.parsed}
        relationships={relationships}
        onBrowseRequested={handleBrowseRequested}
        active={
          editorPosition
            ? {
                isSchema: currentItem?.kind === DataStoreItemKind.SCHEMA,
                position: editorPosition,
              }
            : undefined
        }
      />
    </div>
  );
}
