import { ReactNode } from 'react'

/**
 * Defines the properties for the tab label.
 */
export type TabLabelProps = {
  icon: ReactNode;
  title: string;
}

/**
 * TabLabel defines a well-styled label for tabs.
 * @param props The props for the TabelLabel.
 * @example <Tab label={<TabLabel icon={<GroupWork />} title="Groups" />} />
 */
export default function TabLabel({ icon, title }: TabLabelProps) {
  return (
    <span className="flex content-center justify-center w-full">
      {icon}
      <span className="inline-block ml-2 truncate">{title}</span>
    </span>
  );
}
