import type { ParsedSchema, ParsedObjectDefinition } from "@authzed/spicedb-parser-js";
import dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  NodeTypes,
  EdgeTypes,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useEffect } from "react";

import { RelationTuple as Relationship } from "@/spicedb-common/protodefs/core/v1/core_pb";
import { useRelationshipsService } from "@/spicedb-common/services/relationshipsservice";

import CustomEdge, { CustomEdgeType } from "./CustomEdge";
import { RelationshipNode, RelationshipNodeType } from "./RelationshipNode";

export interface SchemaGraphProps {
  /**
   * schema is the parsed schema.
   */
  schema: ParsedSchema;

  /**
   * relationships are optional, for color consistency.
   */
  relationships?: Relationship[];
}

// Use dagre to compute the layout for schema graph
function getLayoutedElements<NodeType extends Node, EdgeType extends Edge>(
  nodes: NodeType[],
  edges: EdgeType[],
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "BT",
    ranksep: 120,
    nodesep: 100,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Define custom node types
const nodeTypes: NodeTypes = {
  relationship: RelationshipNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Helper to generate schema edges from definitions
// TODO: refactor to use maps and flatmaps
function generateSchemaEdges(definitions: ParsedObjectDefinition[]): Edge[] {
  const edges: Edge[] = [];
  let edgeId = 0;

  // Create set of valid definition names to validate targets
  const definitionNames = new Set(definitions.map((d) => d.name));

  definitions.forEach((def) => {
    // Process relations
    def.relations.forEach((relation) => {
      relation.allowedTypes.types.forEach((typeRef) => {
        // Skip if target type doesn't exist
        if (!definitionNames.has(typeRef.path)) {
          console.warn(`Relation ${relation.name} references undefined type: ${typeRef.path}`);
          return;
        }

        // Build label
        let label = relation.name;
        if (typeRef.relationName) {
          label = `${relation.name}: ${typeRef.path}#${typeRef.relationName}`;
        } else if (typeRef.wildcard) {
          label = `${relation.name}: ${typeRef.path}*`;
        }

        edges.push({
          id: `edge-${edgeId++}`,
          type: "custom",
          source: def.name,
          target: typeRef.path,
          label: label,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: false,
          style: { stroke: "#666" },
          data: {
            type: "relation",
            relationName: relation.name,
            typeRef: typeRef,
          },
        });
      });
    });
  });

  // Group edges by source-target pair and combine labels
  const edgeGroups = new Map<string, Edge[]>();
  edges.forEach((edge) => {
    const key = `${edge.source}->${edge.target}`;
    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, []);
    }
    edgeGroups.get(key)!.push(edge);
  });

  // Combine multiple edges into single edges with combined labels
  const consolidatedEdges: Edge[] = [];
  edgeGroups.forEach((group) => {
    if (group.length === 1) {
      // Single edge: move label to data.label for consistency
      const edge = {
        ...group[0],
        label: undefined,
        data: {
          ...group[0].data,
          label: group[0].label,
        },
      };
      consolidatedEdges.push(edge);
    } else {
      // Multiple edges: combine into one with bulleted list labels
      const labels = group.map((e) => e.label).filter(Boolean);
      const combinedLabel = (
        <div>
          <strong>Relations:</strong>
          <ul style={{ margin: "2px 0 0 0", paddingLeft: "12px", listStyleType: "disc" }}>
            {labels.map((label, idx) => (
              <li key={idx}>{label}</li>
            ))}
          </ul>
        </div>
      );

      // Use the first edge as the base and update its data.label
      const consolidatedEdge = {
        ...group[0],
        label: undefined,
        data: {
          ...group[0].data,
          label: combinedLabel,
          relationNames: group
            .filter((e) => e.data?.type === "relation")
            .map((e) => e.data?.relationName)
            .filter(Boolean),
          permissionNames: group
            .filter((e) => e.data?.type === "permission")
            .map((e) => e.data?.permissionName)
            .filter(Boolean),
        },
      };

      consolidatedEdges.push(consolidatedEdge);
    }
  });

  return consolidatedEdges;
}

/**
 * SchemaGraph renders a graphical view of the schema structure.
 */
export default function SchemaGraph({ schema, relationships }: SchemaGraphProps) {
  const relationshipsService = useRelationshipsService(relationships ?? []);

  const definitions = useMemo(
    () =>
      schema.definitions.filter((def): def is ParsedObjectDefinition => def.kind === "objectDef"),
    [schema],
  );

  // Build schema graph nodes and edges
  const { nodes, edges }: { nodes: RelationshipNodeType[]; edges: CustomEdgeType[] } =
    useMemo(() => {
      // Create node for each definition
      const nodes: RelationshipNodeType[] = definitions.map((def) => {
        const color = relationshipsService.getTypeColor(def.name) || "#e0e0e0";

        return {
          id: def.name,
          type: "relationship",
          data: {
            label: def.name,
            namespace: def.name,
            objectId: "",
            backgroundColor: color,
            // TODO: this is a misuse
            relationships: [],
          },
          position: { x: 0, y: 0 },
        };
      });

      // Generate edges
      const edges = generateSchemaEdges(definitions);

      const layouted: { nodes: RelationshipNodeType[]; edges: CustomEdgeType[] } =
        getLayoutedElements(nodes, edges);
      return { nodes: layouted.nodes, edges: layouted.edges };
    }, [definitions, relationshipsService]);

  // NOTE: this statefulness is required because otherwise setting the position of the nodes
  // via layout prevents the nodes from being dragged around.
  const [statefulNodes, setNodesState, onNodesChange] = useNodesState(nodes);

  useEffect(() => {
    setNodesState(nodes);
  }, [setNodesState, nodes]);

  // Check for empty state
  if (!schema || schema.definitions.filter((d) => d.kind === "objectDef").length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        No schema to visualize. Add schema definitions to see the graph.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={statefulNodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        edges={edges}
        edgeTypes={edgeTypes}
        colorMode="system"
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node: RelationshipNodeType) => {
            const nodeData = node.data;
            return nodeData.backgroundColor || "#e2e2e2";
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
