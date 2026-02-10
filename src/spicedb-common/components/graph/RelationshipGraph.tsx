import { useCallback, useMemo, useState } from "react";
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

import { RelationTuple as Relationship } from "../../protodefs/core/v1/core_pb";
import { useRelationshipsService } from "../../services/relationshipsservice";
import { CustomNode, CustomNodeData } from "./CustomNode";
import { NodeTooltip, EdgeTooltip } from "./GraphTooltip";

export interface RelationshipGraphProps {
  /**
   * relationships are the test relationships for the schema.
   */
  relationships: Relationship[];

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
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "BT",
    ranksep: 100,
    nodesep: 80,
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

/**
 * RelationshipGraph renders a graphical view of relationship instances.
 */
export default function RelationshipGraph({
  relationships,
  onNodeClick,
}: RelationshipGraphProps) {
  const relationshipsService = useRelationshipsService(relationships);
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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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

  // Check for empty state
  if (!relationships || relationships.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        No relationships to visualize. Add some relationships to see the graph.
      </div>
    );
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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
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
