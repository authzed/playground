import { Handle, Position, NodeProps, Node } from "@xyflow/react";

import { RelationTuple as Relationship } from "../../protodefs/core/v1/core_pb";

export type RelationshipNode = Node<{
  label: string;
  backgroundColor: string;
  namespace: string;
  objectId: string;
  relationships: Relationship[];
}>

/*
 *export type CounterNode = Node<{ initialCount?: number }, 'counter'>;
 *
 *export default function CounterNode(props: NodeProps<CounterNode>) {
 *  const [count, setCount] = useState(props.data?.initialCount ?? 0);
*/

/**
 * CustomNode renders a styled node with D3 color background
 */
export function RelationshipNode({ data, selected }: NodeProps<RelationshipNode>) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 shadow-md transition-shadow
        ${selected ? "border-blue-500 shadow-lg" : "border-gray-300"}
        hover:shadow-lg
      `}
      style={{
        backgroundColor: data.backgroundColor || "#ffffff",
        minWidth: "200px",
        minHeight: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Handle type="source" position={Position.Top} />
      <div className="text-center font-medium text-sm break-all">
        {data.label}
      </div>
      <Handle type="target" position={Position.Bottom} />
    </div>
  );
}
