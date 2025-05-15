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

const FormCheckSchema = z.object({
    subject: z
        .string({
            required_error: "You must enter a subject.",
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

const PermissionCheckResult = ({ hasPermission }) => {
    return (
        <div style={{ marginTop: '1rem' }}>
            {hasPermission ? (
                <span style={{ color: 'green', fontSize: '24px' }}>&#10004;</span>
            ) : (
                <span style={{ color: 'red', fontSize: '24px' }}>&#10008;</span>
            )}
        </div>
    );
};

export function CheckQueryForm(props: {datastore: DataStore, zts: ZedTerminalService}) {
    const {datastore, zts} = props;

    // 1. Define your form.
    const form = useForm<z.infer<typeof FormCheckSchema>>({
        resolver: zodResolver(FormCheckSchema),
        defaultValues: {
            subject: "",
            permission: "",
            object: "",
        },
    })

    const [result, setResult] = useState({ output: false });

    // 2. Define a submit handler.
    function onSubmit(data: z.infer<typeof FormCheckSchema>) {
        const schema = datastore.getSingletonByKind(
            DataStoreItemKind.SCHEMA,
        ).editableContents!;
        const relationshipsString = datastore.getSingletonByKind(
            DataStoreItemKind.RELATIONSHIPS,
        ).editableContents!;
        const [result] = zts.runCommand("zed permission check " + data.object + " " + data.permission + " " + data.subject + " --consistency-full --json", schema, relationshipsString);
        if (result?.output?.includes("HAS_PERMISSION")) {
            setResult({ output: true });
        } else {
            setResult({ output: false });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div style={{ display: 'flex', gap: '1rem' }}>
                    on
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
                    does
                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="subject" {...field} />
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
                    <IconButton type="submit">Check</IconButton>
                    <PermissionCheckResult hasPermission={result.output} />
                </div>

            </form>
        </Form>
    )
}