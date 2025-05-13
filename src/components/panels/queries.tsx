import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import TabLabel from "../../playground-ui/TabLabel";
import { faTerminal } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import { useEffect, useRef, useState } from "react";
import "react-reflex/styles.css";
import { DataStoreItemKind } from "../../services/datastore";
import { PanelProps } from "./base/common";
import { PlaygroundPanelLocation } from "./panels";
import {CheckQueryForm} from "@/components/panels/checkquery.tsx";
import {LookupQueryForm} from "@/components/panels/lookupquery.tsx";

export function QueriesSummary() {
    return (
        <TabLabel
            icon={<FontAwesomeIcon icon={faTerminal} />}
            title="Write Queries"
        />
    );
}

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