import { mapParsedSchema, ParsedNode, ParsedSchema, parseSchema } from "./dsl";
import { rewriteSchema } from "./generator";
import { describe, it, expect } from "vitest";

const stripRange = (schema: ParsedSchema | undefined) => {
  if (schema === undefined) {
    return undefined;
  }

  const emptyRange = {
    startIndex: { offset: 0, line: 0, column: 0 },
    endIndex: { offset: 0, line: 0, column: 0 },
  };

  mapParsedSchema(schema, (node: ParsedNode) => {
    node.range = emptyRange;
  });

  schema.stringValue = "";
  return schema;
};

describe("rewriteSchema", () => {
  it("properly rewrites a schema", () => {
    const schema = `
        /**
         * user represents a user that can be granted role(s)
         */
        definition user {}
        
        definition organization {
           relation admin: user
        }

        caveat some_caveat(firstParam int, secondParam map<string>) {
            firstParam == 42
        }
        
        /**
         * document represents a document protected by Authzed.
         */
        definition document {
           /**
            * writer indicates that the user is a writer on the document.
            */
           relation writer: user with some_caveat
        
           /**
            * reader indicates that the user is a reader on the document.
            */
           relation reader: user | user:*
        
           relation organization: organization
        
           /**
            * edit indicates that the user has permission to edit the document.
            */
           permission edit = writer + organization->admin
        
           /**
            * view indicates that the user has permission to view the document, if they
            * are a permission.
            */
           permission view = reader + edit + nil
        }`;

    const rewritten = rewriteSchema(schema, "somePrefix");
    expect(rewritten).toContain("definition somePrefix/organization");
    expect(rewritten).toContain("relation writer: somePrefix/user");
    expect(rewritten).toContain(" with somePrefix/some_caveat");
    expect(rewritten).toContain(
      "caveat somePrefix/some_caveat(firstParam int, secondParam map<string>)",
    );

    expect(stripRange(parseSchema(rewritten ?? ""))).toEqual(
      stripRange(
        parseSchema(`
definition somePrefix/user {}

definition somePrefix/organization {
    relation admin: somePrefix/user;
}

caveat somePrefix/some_caveat(firstParam int, secondParam map<string>) {
    firstParam == 42
}

definition somePrefix/document {
    relation writer: somePrefix/user with somePrefix/some_caveat;
    relation reader: somePrefix/user | somePrefix/user:*;
    relation organization: somePrefix/organization;
    permission edit = (writer + organization->admin);
    permission view = (reader + edit + nil);
}`),
      ),
    );
  });
});
