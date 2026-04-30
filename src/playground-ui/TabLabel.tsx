import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Defines the properties for the tab label.
 */
export interface TabLabelProps {
  icon: ReactNode;
  title: string;
  className?: string;
}

/**
 * TabLabel defines a well-styled label for tabs.
 * @param props The props for the TabelLabel.
 * @example <Tab label={<TabLabel icon={<GroupWork />} title="Groups" />} />
 */
export default function TabLabel({ icon, title, className }: TabLabelProps) {
  return (
    <span className={cn("inline-flex w-full items-center justify-center gap-1.5", className)}>
      <span className="inline-flex">{icon}</span>
      <span className="inline-block overflow-hidden text-ellipsis whitespace-nowrap">{title}</span>
    </span>
  );
}
