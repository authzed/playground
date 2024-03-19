import MarkdownIt from 'markdown-it';
import React from "react";

/**
 * Defines the properties for the MarkdownView.
 */
interface MarkdownViewProps {
    /**
     * The markdown to display.
     */
    markdown: string;
}

/**
 * Displays markdown code in HTML.
 * 
 * @param props The properties for this view.
 * @example <MarkdownView markdown={markdownHere} />
 */
export default function MarkdownView(props: MarkdownViewProps) {
    const md = new MarkdownIt('default', {
        html: true,
        linkify: true,
        typographer: true
    });

    return <span dangerouslySetInnerHTML={{ __html: md.render(props.markdown) }} />;
}