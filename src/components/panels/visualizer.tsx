import "react-reflex/styles.css";

import { Bubbles } from "lucide-react";
import monaco from "monaco-editor";

// TODO: rename
import TenantGraph from "@/components/visualizer/TenantGraph";

import TabLabel from "../../playground-ui/TabLabel";
import { DataStoreItem } from "../../services/datastore";
import { ParseRelationshipError } from "../../spicedb-common/parsing";
import { RelationTuple } from "../../spicedb-common/protodefs/core/v1/core_pb";

import { PanelProps } from "./base/common";

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
}: PanelProps & {
  dimensions?: { width: number; height: number };
  editorPosition?: monaco.Position;
  currentItem?: DataStoreItem;
}) {
  const relationships = services.localParseService.state.relationships
    .map((relFound) => relFound.parsed)
    .filter(isRelationship);

  return (
    <div
      className="w-full h-full"
      // NOTE: this style is to allow the reflexed pane to control the height of the container.
      // Without this it doesn't render correctly, though there may be a different way
      // to get the same behavior.
      style={dimensions?.height ? { height: dimensions.height } : undefined}
    >
      <TenantGraph schema={services.localParseService.state.parsed} relationships={relationships} />
    </div>
  );
}
