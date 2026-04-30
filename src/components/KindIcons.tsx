import { Database, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

interface StyleProps {
  small?: boolean;
}

const baseClass = "font-mono font-bold";
const sizeClass = (small?: boolean) => (small ? "text-[85%]" : "text-[125%]");

export function NS(props: StyleProps) {
  return (
    <span
      className={cn(baseClass, sizeClass(props.small))}
      style={{ color: "#8787ff" }}
    >
      DEF
    </span>
  );
}

export function VL(props: StyleProps) {
  return (
    <span
      className={cn(baseClass, sizeClass(props.small))}
      style={{ color: "#87deff" }}
    >
      <Database />
    </span>
  );
}

export function AT(props: StyleProps) {
  return (
    <span className={cn(baseClass, "[&_svg]:text-orange-500", sizeClass(props.small))}>
      <TriangleAlert />
    </span>
  );
}

export function ET(props: StyleProps) {
  return (
    <span
      className={cn(baseClass, sizeClass(props.small))}
      style={{ color: "#3dc9b0" }}
    >
      []
    </span>
  );
}
