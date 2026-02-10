import { Handle, Position, NodeProps } from "@xyflow/react";

import { RelationTuple as Relationship } from "../../protodefs/core/v1/core_pb";

export interface CustomNodeData extends Record<string, unknown> {
  label: string;
  backgroundColor: string;
  namespace: string;
  objectId: string;
  relationships: Relationship[];
}

/**
 * CustomNode renders a styled node with D3 color background
 */
export function CustomNode({ data, selected }: NodeProps) {
  const nodeData = data as CustomNodeData;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 shadow-md transition-shadow
        ${selected ? "border-blue-500 shadow-lg" : "border-gray-300"}
        hover:shadow-lg
      `}
      style={{
        backgroundColor: nodeData.backgroundColor || "#ffffff",
        minWidth: "200px",
        minHeight: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="text-center font-medium text-sm break-all">
        {nodeData.label}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
