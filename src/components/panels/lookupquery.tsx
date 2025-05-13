"use client"

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {DataStore, DataStoreItemKind} from "@/services/datastore.ts";
import {ZedTerminalService} from "@/spicedb-common/services/zedterminalservice.ts";
import IconButton from "@material-ui/core/IconButton";
import Input from "@material-ui/core/Input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import {useForm} from "react-hook-form";

const FormLookupSchema = z.object({
    type: z
        .string({
            required_error: "You must enter a type.",
        }),
    permission: z
        .string({
            required_error: "You must enter a permission.",
        }),
    object: z
        .string({
            required_error: "You must enter a object.",
        }),
})

const LookupResult = ({ list }) => {
    return (
        <ol>
            {list.map((item, index) => (
                <li key={index}>
                    {item}
                </li>
            ))}
        </ol>
    );
}

export function LookupQueryForm(props: {datastore: DataStore, zts: ZedTerminalService}) {
    const {datastore, zts} = props;
    // 1. Define your form.
    const form = useForm<z.infer<typeof FormLookupSchema>>({
        resolver: zodResolver(FormLookupSchema),
        defaultValues: {
            type: "",
            permission: "",
            object: "",
        },
    })

    const [result, setResult] = useState<{ list: string[] }>({ list: [] });

    // 2. Define a submit handler.
    function onSubmit(data: z.infer<typeof FormLookupSchema>) {
        const schema = datastore.getSingletonByKind(
            DataStoreItemKind.SCHEMA,
        ).editableContents!;
        const relationshipsString = datastore.getSingletonByKind(
            DataStoreItemKind.RELATIONSHIPS,
        ).editableContents!;
        const [result] = zts.runCommand("zed permission lookup-subjects " + data.object + " " + data.permission + " " + data.type + " --consistency-full", schema, relationshipsString);
        if (result?.output) {
            const lines  = result?.output?.split(/\r?\n/);
            const objects: string[] = [];
            for (let i = 1; i < lines.length; i++) {
                objects.push(lines[i])
            }
            setResult({ list: objects });
        }

    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div style={{ display: 'flex', gap: '1rem' }}>
                    for
                    <FormField
                        control={form.control}
                        name="object"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="object id" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />,
                    what objects of type
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="type" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    have
                    <FormField
                        control={form.control}
                        name="permission"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="permission" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    permission
                    ?
                    <IconButton type="submit">List</IconButton>
                    <LookupResult list={result.list} />
                </div>

            </form>
        </Form>
    )
}