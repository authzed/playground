import { useState } from "react";
import type { TextRange, ParsedSchema } from "@authzed/spicedb-parser-js";
import type monaco from "monaco-editor";
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

  /**
   * onBrowseRequested is invoked if the user has requested a browse to the specific
   * range in the schema.
   */
  onBrowseRequested?: (range: TextRange | undefined) => void;

  /**
   * active is the current editor position for highlighting
   */
  active?:
    | {
        isSchema: boolean;
        position: monaco.Position;
      }
    | undefined;

  /**
   * onNodeClick is invoked when a node is clicked
   */
  onNodeClick?: (namespace: string, objectId: string) => void;
}

/**
 * TenantGraph renders a graphical view that toggles between relationships and schema.
 */
export default function TenantGraph({
  schema,
  relationships,
  onBrowseRequested,
  active, // Currently unused but kept for backward compatibility
  onNodeClick,
}: TenantGraphProps) {
  const [viewMode, setViewMode] = useState<'relationships' | 'schema'>('relationships');

  return (
    <div className="w-full h-full relative">
      {/* Toggle for view mode */}
      <div className="absolute top-4 left-4 z-10 bg-background rounded-md shadow-sm">
        <ToggleGroup
          value={viewMode}
          variant="outline"
          type="single"
          onValueChange={(value) => value && setViewMode(value as 'relationships' | 'schema')}
        >
          <ToggleGroupItem value="relationships" title="Relationship Graph">
            <Network className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="schema" title="Schema Graph">
            <GitBranch className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Conditional rendering based on view mode */}
      {viewMode === 'relationships' ? (
        <RelationshipGraph
          relationships={relationships ?? []}
          onNodeClick={onNodeClick}
        />
      ) : (
        schema && (
          <SchemaGraph
            schema={schema}
            relationships={relationships}
            onBrowseRequested={onBrowseRequested}
          />
        )
      )}
    </div>
  );
}
