import {AlertDialog} from "@/playground-ui/AlertDialog.tsx";
import { useMemo, useState } from "react";

import SyntaxHighlighter from 'react-syntax-highlighter';

import React from "react";
import Grid from '@material-ui/core/Grid';
import Button from "@material-ui/core/Button";

function generateRelUpdateJs(yaml: string): string {
    let result = ""
    for (const tuple of yaml.split("\n")) {
        const match = tuple.match(/([^#]+)#([^@]+)@(.+)/);
        if (!match) {
            continue
        }
        const [obj, rel, sub] = [match[1], match[2], match[3]]
        const [subType, subId] = sub.split(":");
        const [objType, objId] = obj.split(":");
        result += `v1.RelationshipUpdate.create({
      relationship: v1.Relationship.create({
        resource: v1.ObjectReference.create({
          objectType: '${objType}',
          objectId: '${objId}',
        }),
        relation: '${rel}',
        subject: v1.SubjectReference.create({
          object: v1.ObjectReference.create({
            objectType: '${subType}',
            objectId: '${subId}',
          }),
        }),
      }),
      operation: v1.RelationshipUpdate_Operation.CREATE,
    }),`
    }
    return result

}

function LangGenerator(props: {schema: string, relationshipsYaml: string, lang: string}) {
    if (props.lang == "Go") {
        return `package main

import (
	"context"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"log"

	"github.com/authzed/authzed-go/proto/authzed/api/v1"
	"github.com/authzed/authzed-go/v1"
	"github.com/authzed/grpcutil"
)

func main() {
	client, err := authzed.NewClient(
		"localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpcutil.WithInsecureBearerToken("your_token_here"),
	)
	if err != nil {
		log.Fatalf("unable to initialize client: %s", err)
	}

    // Write the schema.
	resp, err := client.WriteSchema(context.Background(), &v1.WriteSchemaRequest{
		Schema: ` + "`" + props.schema + "`" + `,
	})
	if err != nil {
		log.Fatalf("failed to write schema: %s", err)
	}
	log.Println("Written at: " + resp.WrittenAt.String())
	
	// Write relationships.
	// TODO
}

    `} else if (props.lang == "JS") {
        return `import { v1 } from '@authzed/authzed-node';
// set up it on localhost like this:
const client = v1.NewClient('your_token_here', 'localhost:50051', v1.ClientSecurity.INSECURE_LOCALHOST_ALLOWED);
// const client = v1.NewClient('your_token_here');
const { promises: promiseClient } = client; // access client.promises after instantiating client

const writeRequest = v1.WriteSchemaRequest.create({
  schema: ` + "`" + props.schema + "`" + `,
});

// Write the schema.
await new Promise((resolve, reject) => {
  client.writeSchema(writeRequest, function (err, response) {
    if (err) reject(err);
    resolve(response);
  });
});

// Write relationships.
const writeRelationshipRequest = v1.WriteRelationshipsRequest.create({
  updates: [` +generateRelUpdateJs(props.relationshipsYaml) + `
  ],
});

await new Promise((resolve, reject) => {
  client.writeRelationships(writeRelationshipRequest, function (err, response) {
    if (err) reject(err);
    resolve(response);
  });
});

`
    } else {
        return ""
    }
}

export function GenerateContent({ schema, relationshipsYaml, langPicked, setLangPicked }) {
    const generatedCode = useMemo(
        () => LangGenerator({ lang: langPicked, schema, relationshipsYaml }),
        [langPicked, schema, relationshipsYaml]
    );

    const syntaxLang = langPicked === "Go" ? "go" : "javascript";

    return (
        <Grid container spacing={1} sx={{ width: '900px' }}>
            <Grid item xs={2}>
                <Button
                    variant={langPicked === "Go" ? "contained" : "outlined"}
                    onClick={() => setLangPicked("Go")}
                >
                    Go
                </Button>
                <Button
                    variant={langPicked === "JS" ? "contained" : "outlined"}
                    onClick={() => setLangPicked("JS")}
                >
                    JS
                </Button>
            </Grid>
            <Grid item xs={10}>
                <SyntaxHighlighter language={syntaxLang} customStyle={{ fontSize: 11 }}>
                    {generatedCode}
                </SyntaxHighlighter>
            </Grid>
        </Grid>
    );
}

export function CodeGenerator(props: { schema: string, relationshipsYaml: string, onClose: () => void }) {
    const [showAlert] = useState(true);
    const [langPicked, setLangPicked] = useState("Go");

    // Always up-to-date code based on current language
    const generatedCode = useMemo(
        () => LangGenerator({ lang: langPicked, schema: props.schema, relationshipsYaml: props.relationshipsYaml }),
        [langPicked, props.schema, props.relationshipsYaml]
    );

    const handleClose = () => {
        navigator.clipboard.writeText(generatedCode)
        props.onClose()
    };

    return (
        <AlertDialog
            isOpen={showAlert}
            handleClose={handleClose}
            title=""
            content={
                <GenerateContent
                    schema={props.schema}
                    relationshipsYaml={props.relationshipsYaml}
                    langPicked={langPicked}
                    setLangPicked={setLangPicked}
                />
            }
            buttonTitle="Copy"
        />
    );
}
