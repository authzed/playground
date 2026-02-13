import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps, Edge } from "@xyflow/react";
import { ReactNode } from "react";

export type CustomEdgeType = Edge<{
  type?: string;
  relationName?: string;
  relationNames?: string[];
  permissionNames?: string[];
  label?: ReactNode; // JSX label content
}>;

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps<CustomEdgeType>) {
  // Calculate bezier path and label position
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Render the edge line */}
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />

      {/* Render complex label using EdgeLabelRenderer if label exists */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            // TODO: Make this use Tailwind
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: "var(--card)",
              color: "var(--card-foreground)",
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid var(--border)",
              fontSize: "10px",
              lineHeight: "1.2",
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
