import { BaseEdge, EdgeProps, getBezierPath } from "@xyflow/react";
import type { CSSProperties } from "react";

export type CustomBezierEdgeData = {
  offset?: number;
  type?: string;
  relationName?: string;
  permissionName?: string;
  typeRef?: unknown;
};

export default function CustomBezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const edgeData = data as CustomBezierEdgeData | undefined;
  const offset = edgeData?.offset || 0;

  // Apply offset perpendicular to the edge direction
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    // Self-referencing edge - create a circular arc with offset
    const loopSize = 50 + Math.abs(offset);
    const loopOffset = offset;

    // Create a circular path for self-referencing edges
    const path = `M ${sourceX},${sourceY}
                  C ${sourceX + loopSize + loopOffset},${sourceY - loopSize}
                    ${sourceX + loopSize + loopOffset},${sourceY + loopSize}
                    ${sourceX},${sourceY}`;

    // Label position
    const labelX = sourceX + loopSize + loopOffset;
    const labelY = sourceY;

    return (
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={style}
        labelX={labelX}
        labelY={labelY}
      />
    );
  }

  // For edges between different nodes, calculate perpendicular offset
  const perpX = -dy / distance;
  const perpY = dx / distance;

  const offsetSourceX = sourceX + perpX * offset;
  const offsetSourceY = sourceY + perpY * offset;
  const offsetTargetX = targetX + perpX * offset;
  const offsetTargetY = targetY + perpY * offset;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: offsetSourceX,
    sourceY: offsetSourceY,
    sourcePosition,
    targetX: offsetTargetX,
    targetY: offsetTargetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={style}
      labelX={labelX}
      labelY={labelY}
    />
  );
}
