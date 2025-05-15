import { useEffect, useRef, useState } from "react";
import "react-reflex/styles.css";
import { PanelProps } from "./base/common";
import { PlaygroundPanelLocation } from "./panels";
import {CheckQueryForm} from "@/components/panels/checkquery.tsx";
import {LookupQueryForm} from "@/components/panels/lookupquery.tsx";


export function QueriesPanel(props: PanelProps<PlaygroundPanelLocation>) {
    const zts = props.services.zedTerminalService!;

    useEffect(() => {
        zts.start();
    }, [zts]);

    return (
        <>
            <div><LookupQueryForm datastore={props.datastore} zts={zts} /></div>
            <div><CheckQueryForm datastore={props.datastore} zts={zts} /></div>
        </>
    )
}