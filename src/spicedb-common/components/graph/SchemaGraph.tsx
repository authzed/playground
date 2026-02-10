import { useCallback, useMemo } from "react";
import type { TextRange, ParsedSchema, ParsedObjectDefinition } from "@authzed/spicedb-parser-js";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
  EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import { RelationTuple as Relationship } from "../../protodefs/core/v1/core_pb";
import { useRelationshipsService } from "../../services/relationshipsservice";
import { CustomNode, CustomNodeData } from "./CustomNode";
import CustomBezierEdge from "./CustomBezierEdge";

export interface SchemaGraphProps {
  /**
   * schema is the parsed schema.
   */
  schema: ParsedSchema;

  /**
   * relationships are optional, for color consistency.
   */
  relationships?: Relationship[];

  /**
   * onBrowseRequested is invoked if the user has requested a browse to the specific
   * range in the schema.
   */
  onBrowseRequested?: (range: TextRange | undefined) => void;
}

// Use dagre to compute the layout for schema graph
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
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
  custom: CustomNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  customBezier: CustomBezierEdge,
};

// Helper to generate schema edges from definitions
function generateSchemaEdges(definitions: ParsedObjectDefinition[]): Edge[] {
  const edges: Edge[] = [];
  let edgeId = 0;

  // Create set of valid definition names to validate targets
  const definitionNames = new Set(definitions.map(d => d.name));

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
          type: 'customBezier',
          source: def.name,
          target: typeRef.path,
          label: label,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: false,
          style: { stroke: '#666' },
          data: {
            type: 'relation',
            relationName: relation.name,
            typeRef: typeRef,
          },
        });
      });
    });

    // Process permissions (show as self-referencing edges)
    def.permissions.forEach((permission) => {
      edges.push({
        id: `edge-${edgeId++}`,
        type: 'customBezier',
        source: def.name,
        target: def.name,
        label: permission.name,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: false,
        style: {
          stroke: '#9333ea',        // Purple color
          strokeDasharray: '5,5'    // Dashed line
        },
        data: {
          type: 'permission',
          permissionName: permission.name,
        },
      });
    });
  });

  // Group edges by source-target pair to handle overlapping edges
  const edgeGroups = new Map<string, Edge[]>();
  edges.forEach((edge) => {
    const key = `${edge.source}->${edge.target}`;
    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, []);
    }
    edgeGroups.get(key)!.push(edge);
  });

  // Apply offsets to create non-overlapping bezier curves
  const edgesWithOffsets: Edge[] = [];
  edgeGroups.forEach((group) => {
    if (group.length === 1) {
      // Single edge: no offset needed
      edgesWithOffsets.push(group[0]);
    } else {
      // Multiple edges: apply symmetric offsets to fan them out
      const offsetStep = 40; // Spacing between edges
      const totalWidth = (group.length - 1) * offsetStep;
      const startOffset = -totalWidth / 2;

      group.forEach((edge, index) => {
        const offset = startOffset + (index * offsetStep);
        edgesWithOffsets.push({
          ...edge,
          data: {
            ...edge.data,
            offset,
          },
        });
      });
    }
  });

  return edgesWithOffsets;
}

/**
 * SchemaGraph renders a graphical view of the schema structure.
 */
export default function SchemaGraph({
  schema,
  relationships,
  onBrowseRequested,
}: SchemaGraphProps) {
  const relationshipsService = useRelationshipsService(relationships ?? []);

  // Build schema graph nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    // Filter to object definitions only
    const definitions = schema.definitions.filter(
      (def): def is ParsedObjectDefinition => def.kind === 'objectDef'
    );

    // Create node for each definition
    const nodes: Node<CustomNodeData>[] = definitions.map((def) => {
      const color = relationshipsService.getTypeColor(def.name) || '#e0e0e0';

      return {
        id: def.name,
        type: 'custom',
        data: {
          label: def.name,
          namespace: def.name,
          objectId: '',
          backgroundColor: color,
          relationships: [],
        },
        position: { x: 0, y: 0 },
      };
    });

    // Generate edges
    const edges = generateSchemaEdges(definitions);

    const layouted = getLayoutedElements(nodes, edges);
    return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
  }, [schema, relationshipsService]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle schema node click
  const handleSchemaNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const definition = schema.definitions.find(
        (def): def is ParsedObjectDefinition =>
          def.kind === 'objectDef' && def.name === node.id
      );

      if (definition && onBrowseRequested) {
        onBrowseRequested(definition.range);
      }
    },
    [schema, onBrowseRequested]
  );

  // Check for empty state
  if (!schema || schema.definitions.filter(d => d.kind === 'objectDef').length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        No schema to visualize. Add schema definitions to see the graph.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleSchemaNodeClick}
        colorMode="system"
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const nodeData = node.data as CustomNodeData;
            return nodeData.backgroundColor || '#e2e2e2';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
