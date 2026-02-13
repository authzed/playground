import "@xyflow/react/dist/style.css";

import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  NodeTypes,
  useNodesState,
} from "@xyflow/react";
import dagre from "dagre";
import { useCallback, useMemo, useState, useEffect, MouseEvent } from "react";

import { RelationTuple as Relationship } from "@/spicedb-common/protodefs/core/v1/core_pb";
import { useRelationshipsService } from "@/spicedb-common/services/relationshipsservice";

import { CustomEdgeType } from "./CustomEdge";
import { NodeTooltip, EdgeTooltip } from "./GraphTooltip";
import { RelationshipNode, RelationshipNodeType } from "./RelationshipNode";

export interface RelationshipGraphProps {
  /**
   * relationships are the test relationships for the schema.
   */
  relationships: Relationship[];
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
// TODO: refactor to reuse?
function getLayoutedElements<NodeType extends Node, EdgeType extends Edge>(
  nodes: NodeType[],
  edges: EdgeType[],
) {
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
  relationship: RelationshipNode,
};

// TODO: this type is a hack
type RelationshipGraphEdgeType = Omit<CustomEdgeType, "data"> & {
  data: CustomEdgeType["data"] & {
    relation: string;
    subjectRelation?: string;
    caveat?: string;
    expiration?: string;
  };
};

/**
 * RelationshipGraph renders a graphical view of relationship instances.
 */
export default function RelationshipGraph({ relationships }: RelationshipGraphProps) {
  const relationshipsService = useRelationshipsService(relationships);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Build nodes and edges from relationships with colors
  const { nodes, edges } = useMemo(() => {
    if (!relationships || relationships.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodeMap = new Map<
      string,
      {
        namespace: string;
        objectId: string;
        relationships: Relationship[];
      }
    >();
    const edges: RelationshipGraphEdgeType[] = [];

    // First pass: collect all nodes and their relationships
    // TODO: just do this in a single pass
    relationships.forEach((rel) => {
      if (!rel.resourceAndRelation || !rel.subject) {
        return;
      }

      const resourceId = createNodeId(
        rel.resourceAndRelation.namespace,
        rel.resourceAndRelation.objectId,
      );
      const subjectId = createNodeId(rel.subject.namespace, rel.subject.objectId);

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
    const nodes: RelationshipNodeType[] = Array.from(nodeMap.entries()).map(
      ([nodeId, nodeData]) => {
        const color =
          relationshipsService.getObjectColor(nodeData.namespace, nodeData.objectId) || "#e0e0e0";

        return {
          id: nodeId,
          type: "relationship",
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
    // TODO: use a map() for this
    relationships.forEach((rel) => {
      if (!rel.resourceAndRelation || !rel.subject) {
        return;
      }

      const resourceId = createNodeId(
        rel.resourceAndRelation.namespace,
        rel.resourceAndRelation.objectId,
      );
      const subjectId = createNodeId(rel.subject.namespace, rel.subject.objectId);

      // Add edge from subject to resource with relation label
      const relationLabel = rel.resourceAndRelation.relation
        ? `${rel.resourceAndRelation.relation}${rel.subject.relation && rel.subject.relation !== "..." ? ` (${rel.subject.relation})` : ""}`
        : "";

      edges.push({
        id: `${resourceId}:${relationLabel}:${subjectId}`,
        type: "custom",
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
            ? new Date(Number(rel.optionalExpirationTime.seconds) * 1000).toISOString()
            : undefined,
        },
      });
    });

    const layouted = getLayoutedElements(nodes, edges);

    return {
      nodes: layouted.nodes,
      edges: layouted.edges,
    };
  }, [relationships, relationshipsService]);

  // Handle mouse move to track position for tooltip
  const handleMouseMove = useCallback((event: MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  // Handle node mouse enter/leave for tooltip
  const handleNodeMouseEnter = useCallback((_: MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  // Handle edge mouse enter/leave for tooltip
  const handleEdgeMouseEnter = useCallback((_: MouseEvent, edge: Edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  // NOTE: this statefulness is required because otherwise setting the position of the nodes
  // via layout prevents the nodes from being dragged around.
  const [statefulNodes, setNodesState, onNodesChange] = useNodesState(nodes);

  useEffect(() => {
    setNodesState(nodes);
  }, [setNodesState, nodes]);

  // Check for empty state
  if (!relationships || relationships.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        No relationships to visualize. Add some relationships to see the graph.
      </div>
    );
  }

  // Find hovered node/edge data for tooltip
  const hoveredNode = hoveredNodeId ? nodes?.find((n) => n.id === hoveredNodeId) : undefined;
  const hoveredEdge = hoveredEdgeId ? edges?.find((e) => e.id === hoveredEdgeId) : undefined;

  return (
    <div className="w-full h-full relative" onMouseMove={handleMouseMove}>
      <ReactFlow
        nodes={statefulNodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        edges={edges}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
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

      {/* Tooltip for nodes */}
      {hoveredNode && (
        <div
          // TODO: use tailwind for this
          style={{
            position: "fixed",
            left: mousePosition.x + 10,
            top: mousePosition.y + 10,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <NodeTooltip
            namespace={hoveredNode.data.namespace}
            objectId={hoveredNode.data.objectId}
            relationships={hoveredNode.data.relationships}
          />
        </div>
      )}

      {/* Tooltip for edges */}
      {hoveredEdge && (
        <div
          // TODO: use tailwind for this.
          style={{
            position: "fixed",
            left: mousePosition.x + 10,
            top: mousePosition.y + 10,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <EdgeTooltip
            relation={hoveredEdge.data?.relation}
            subjectRelation={hoveredEdge.data?.subjectRelation}
            caveat={hoveredEdge.data?.caveat}
            expiration={hoveredEdge.data?.expiration}
          />
        </div>
      )}
    </div>
  );
}
