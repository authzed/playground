import { useCallback, useMemo, useState } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import type monaco from "monaco-editor";
import { Network, GitBranch } from "lucide-react";

import { RelationTuple as Relationship } from "../../protodefs/core/v1/core_pb";
import { useRelationshipsService } from "../../services/relationshipsservice";
import { CustomNode, CustomNodeData } from "./CustomNode";
import { NodeTooltip, EdgeTooltip } from "./GraphTooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

// Helper to create a unique node ID from namespace and object ID
function createNodeId(namespace: string, objectId: string): string {
  return `${namespace}:${objectId}`;
}

// Helper to create a display label for a node
function createNodeLabel(namespace: string, objectId: string): string {
  return `${namespace}:${objectId}`;
}

// Use dagre to compute the layout
function getLayoutedElements(nodes: Node[], edges: Edge[], isSchemaGraph = false) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "BT",
    ranksep: isSchemaGraph ? 120 : 100,
    nodesep: isSchemaGraph ? 100 : 80,
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

  return edges;
}

/**
 * TenantGraph renders a graphical view of the relationships.
 */
export default function TenantGraph({
  schema,
  relationships,
  onBrowseRequested,
  active,
  onNodeClick,
}: TenantGraphProps) {
  const relationshipsService = useRelationshipsService(relationships ?? []);
  const [viewMode, setViewMode] = useState<'relationships' | 'schema'>('relationships');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Build nodes and edges from relationships with colors
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!relationships || relationships.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodeMap = new Map<
      string,
      {
        namespace: string;
        objectId: string;
        relationships: Relationship[];
      }
    >();
    const edges: Edge[] = [];

    // First pass: collect all nodes and their relationships
    relationships.forEach((rel) => {
      if (!rel.resourceAndRelation || !rel.subject) {
        return;
      }

      const resourceId = createNodeId(
        rel.resourceAndRelation.namespace,
        rel.resourceAndRelation.objectId,
      );
      const subjectId = createNodeId(
        rel.subject.namespace,
        rel.subject.objectId,
      );

      // Track relationships for resource node
      if (!nodeMap.has(resourceId)) {
        nodeMap.set(resourceId, {
          namespace: rel.resourceAndRelation.namespace,
          objectId: rel.resourceAndRelation.objectId,
          relationships: [],
        });
      }
      nodeMap.get(resourceId)!.relationships.push(rel);

      // Track relationships for subject node
      if (!nodeMap.has(subjectId)) {
        nodeMap.set(subjectId, {
          namespace: rel.subject.namespace,
          objectId: rel.subject.objectId,
          relationships: [],
        });
      }
      nodeMap.get(subjectId)!.relationships.push(rel);
    });

    // Second pass: create nodes with colors
    const nodes: Node<CustomNodeData>[] = Array.from(nodeMap.entries()).map(
      ([nodeId, nodeData]) => {
        const color =
          relationshipsService.getObjectColor(
            nodeData.namespace,
            nodeData.objectId,
          ) || "#e0e0e0";

        return {
          id: nodeId,
          type: "custom",
          data: {
            label: createNodeLabel(nodeData.namespace, nodeData.objectId),
            namespace: nodeData.namespace,
            objectId: nodeData.objectId,
            backgroundColor: color,
            relationships: nodeData.relationships,
          },
          position: { x: 0, y: 0 }, // Will be set by dagre
        };
      },
    );

    // Third pass: create edges with labels and data
    relationships.forEach((rel, index) => {
      if (!rel.resourceAndRelation || !rel.subject) {
        return;
      }

      const resourceId = createNodeId(
        rel.resourceAndRelation.namespace,
        rel.resourceAndRelation.objectId,
      );
      const subjectId = createNodeId(
        rel.subject.namespace,
        rel.subject.objectId,
      );

      // Add edge from subject to resource with relation label
      const relationLabel = rel.resourceAndRelation.relation
        ? `${rel.resourceAndRelation.relation}${rel.subject.relation && rel.subject.relation !== "..." ? ` (${rel.subject.relation})` : ""}`
        : "";

      edges.push({
        id: `edge-${index}`,
        source: resourceId,
        target: subjectId,
        label: relationLabel,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        animated: false,
        data: {
          relation: rel.resourceAndRelation.relation || "",
          subjectRelation:
            rel.subject.relation && rel.subject.relation !== "..."
              ? rel.subject.relation
              : undefined,
          caveat: rel.caveat?.caveatName || undefined,
          expiration: rel.optionalExpirationTime
            ? new Date(
                Number(rel.optionalExpirationTime.seconds) * 1000,
              ).toISOString()
            : undefined,
        },
      });
    });

    const layouted = getLayoutedElements(nodes, edges);

    return {
      initialNodes: layouted.nodes,
      initialEdges: layouted.edges,
    };
  }, [relationships, relationshipsService]);

  // Build schema graph nodes and edges
  const { schemaNodes, schemaEdges } = useMemo(() => {
    if (!schema || viewMode !== 'schema') {
      return { schemaNodes: [], schemaEdges: [] };
    }

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

    const layouted = getLayoutedElements(nodes, edges, true);
    return { schemaNodes: layouted.nodes, schemaEdges: layouted.edges };
  }, [schema, viewMode, relationshipsService]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when view mode or data changes
  useMemo(() => {
    if (viewMode === 'schema') {
      setNodes(schemaNodes);
      setEdges(schemaEdges);
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [viewMode, schemaNodes, schemaEdges, initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const nodeData = node.data as CustomNodeData;
      if (onNodeClick && nodeData) {
        onNodeClick(nodeData.namespace, nodeData.objectId);
      }
    },
    [onNodeClick],
  );

  // Handle schema node click
  const handleSchemaNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (viewMode !== 'schema') return;

      const definition = schema?.definitions.find(
        (def): def is ParsedObjectDefinition =>
          def.kind === 'objectDef' && def.name === node.id
      );

      if (definition && onBrowseRequested) {
        onBrowseRequested(definition.range);
      }
    },
    [viewMode, schema, onBrowseRequested]
  );

  // Handle mouse move to track position for tooltip
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  // Handle node mouse enter/leave for tooltip
  const handleNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setHoveredNode(node.id);
    },
    [],
  );

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  // Handle edge mouse enter/leave for tooltip
  const handleEdgeMouseEnter = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setHoveredEdge(edge.id);
    },
    [],
  );

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdge(null);
  }, []);

  // Check for empty state based on view mode
  if (viewMode === 'relationships') {
    if (!relationships || relationships.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          No relationships to visualize. Add some relationships to see the graph.
        </div>
      );
    }
  } else {
    if (!schema || schema.definitions.filter(d => d.kind === 'objectDef').length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          No schema to visualize. Add schema definitions to see the graph.
        </div>
      );
    }
  }

  // Find hovered node/edge data for tooltip
  const hoveredNodeData = hoveredNode
    ? (nodes.find((n) => n.id === hoveredNode)?.data as CustomNodeData | undefined)
    : undefined;
  const hoveredEdgeData = hoveredEdge
    ? (edges.find((e) => e.id === hoveredEdge)?.data as any)
    : undefined;

  return (
    <div className="w-full h-full relative" onMouseMove={handleMouseMove}>
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

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={viewMode === 'schema' ? handleSchemaNodeClick : handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
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

      {/* Tooltip for nodes */}
      {hoveredNodeData && (
        <div
          style={{
            position: "fixed",
            left: mousePosition.x + 10,
            top: mousePosition.y + 10,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <NodeTooltip
            namespace={hoveredNodeData.namespace}
            objectId={hoveredNodeData.objectId}
            relationships={hoveredNodeData.relationships}
          />
        </div>
      )}

      {/* Tooltip for edges */}
      {hoveredEdgeData && (
        <div
          style={{
            position: "fixed",
            left: mousePosition.x + 10,
            top: mousePosition.y + 10,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <EdgeTooltip
            relation={hoveredEdgeData.relation}
            subjectRelation={hoveredEdgeData.subjectRelation}
            caveat={hoveredEdgeData.caveat}
            expiration={hoveredEdgeData.expiration}
          />
        </div>
      )}
    </div>
  );
}
