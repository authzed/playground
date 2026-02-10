import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position } from '@xyflow/react';
import type { CSSProperties } from 'react';

export type CustomEdgeData = {
  type?: string;
  relationName?: string;
  relationNames?: string[];
  permissionNames?: string[];
  typeRef?: any;
  label?: React.ReactNode; // JSX label content
};

type CustomEdgeProps = {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  style?: CSSProperties;
  markerEnd?: string;
  data?: CustomEdgeData;
};

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
}: CustomEdgeProps) {
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
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: 'var(--card)',
              color: 'var(--card-foreground)',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              fontSize: '10px',
              lineHeight: '1.2',
              pointerEvents: 'all',
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
