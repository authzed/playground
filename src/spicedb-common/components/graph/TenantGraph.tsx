import { useState } from "react";
import type { ParsedSchema } from "@authzed/spicedb-parser-js";
import { Network, GitBranch } from "lucide-react";

import { RelationTuple as Relationship } from "../../protodefs/core/v1/core_pb";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import RelationshipGraph from "./RelationshipGraph";
import SchemaGraph from "./SchemaGraph";

export interface TenantGraphProps {
  /**
   * schema is the parsed schema.
   */
  schema: ParsedSchema | undefined;

  /**
   * relationships are the test relationships for the schema.
   */
  relationships?: Relationship[] | undefined;
}

/**
 * TenantGraph renders a graphical view that toggles between relationships and schema.
 */
export default function TenantGraph({
  schema,
  relationships,
}: TenantGraphProps) {
  const [viewMode, setViewMode] = useState('relationships');

  return (
    <div className="w-full h-full relative">
      {/* Toggle for view mode */}
      <div className="absolute top-4 left-4 z-10 bg-background rounded-md shadow-sm">
        <ToggleGroup
          value={viewMode}
          variant="outline"
          type="single"
          onValueChange={setViewMode}
        >
          <ToggleGroupItem value="relationships" title="Relationship Graph">
            <Network className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="schema" title="Schema Graph">
            <GitBranch className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === 'relationships' ? (
        <RelationshipGraph
          relationships={relationships ?? []}
        />
      ) : (
        schema && (
          <SchemaGraph
            schema={schema}
            relationships={relationships}
          />
        )
      )}
    </div>
  );
}
