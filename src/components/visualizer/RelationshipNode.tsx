import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { useMemo } from "react";

import { RelationTuple as Relationship } from "@/spicedb-common/protodefs/core/v1/core_pb";

export type RelationshipNodeType = Node<{
  label: string;
  backgroundColor: string;
  namespace: string;
  objectId: string;
  relationships: Relationship[];
}>;

/**
 * Returns a foreground color (black or white) that contrasts well against
 * the given CSS hex or rgb() background color.
 */
function contrastingTextColor(backgroundColor: string): string {
  let r = 0,
    g = 0,
    b = 0;

  if (backgroundColor.startsWith("#")) {
    const hex = backgroundColor.replace("#", "");
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    const match = backgroundColor.match(/\d+/g);
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10);
      g = parseInt(match[1], 10);
      b = parseInt(match[2], 10);
    }
  }

  // WCAG relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function RelationshipNode({ data, selected }: NodeProps<RelationshipNodeType>) {
  const bg = data.backgroundColor || "#ffffff";
  const textColor = useMemo(() => contrastingTextColor(bg), [bg]);

  return (
    <div
      // TODO: use twmerge/clsx for this.
      className={`
        px-4 py-3 rounded-lg border-2 shadow-md transition-shadow
        ${selected ? "border-blue-500 shadow-lg" : "border-gray-300"}
        hover:shadow-lg
      `}
      // TODO: use tailwind for this.
      style={{
        backgroundColor: bg,
        color: textColor,
        minWidth: "200px",
        minHeight: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Handle type="source" position={Position.Top} />
      <div className="text-center font-medium text-sm break-all">{data.label}</div>
      <Handle type="target" position={Position.Bottom} />
    </div>
  );
}
