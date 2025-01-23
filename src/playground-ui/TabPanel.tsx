import React, { CSSProperties } from 'react';

/**
 * Defines the properties for the tab panel.
 */
export interface TabPanelProps {
    /**
     * children is the content of the tab panel.
     */
    children?: React.ReactNode;

    /**
     * index is the index for which, if the value matches, the tab is displayed.
     */
    index: string;

    /**
     * value is the current tab value.
     */
    value: string;

    /**
     * className is the custom classname for the TabPanel.
     */
    className?: string;

    /**
     * style is any styles for the component.
     */
    style?: CSSProperties | undefined;
}

// Based on: https://material-ui.com/components/tabs/#vertical-tabs

/**
 * TabPanel defines a panel that displays based on the currently active tab.
 * @param props The props for the TabPanel.
 */
export default function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            style={props.style}
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            <div>{children}</div>
        </div>
    );
}
