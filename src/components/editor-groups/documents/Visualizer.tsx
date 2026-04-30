import { useMemo } from "react";

import TenantGraph from "@/components/visualizer/TenantGraph";

import { Services } from "../../../services/services";
import { ParseRelationshipError } from "../../../spicedb-common/parsing";
import { RelationTuple } from "../../../spicedb-common/protodefs/core/v1/core_pb";

interface VisualizerDocumentProps {
  services: Services;
}

function isRelationship(
  relOrError: RelationTuple | ParseRelationshipError,
): relOrError is RelationTuple {
  return !("errorMessage" in relOrError);
}

export function VisualizerDocument({ services }: VisualizerDocumentProps) {
  const relationships = useMemo(
    () =>
      services.localParseService.state.relationships.map((r) => r.parsed).filter(isRelationship),
    [services.localParseService.state.relationships],
  );

  return (
    <div className="absolute inset-0">
      <TenantGraph schema={services.localParseService.state.parsed} relationships={relationships} />
    </div>
  );
}
