import * as monaco from "monaco-editor";
import { describe, expect, it } from "vitest";

import registerDSLanguage, { DS_LANGUAGE_NAME } from "../../spicedb-common/lang/dslang";

// Register the DSL language once so monaco.editor.tokenize can use its monarch grammar.
if (!monaco.languages.getLanguages().some((l) => l.id === DS_LANGUAGE_NAME)) {
  registerDSLanguage(monaco);
}

interface LineToken {
  text: string;
  type: string;
}

// Tokenizes `text` and returns the tokens (with their source text) for a single line.
function tokensForLine(text: string, lineIndex: number): LineToken[] {
  const allLines = monaco.editor.tokenize(text, DS_LANGUAGE_NAME);
  const lineText = text.split("\n")[lineIndex] ?? "";
  const tokens = allLines[lineIndex] ?? [];
  return tokens.map((tok, i) => {
    const start = tok.offset;
    const end = i + 1 < tokens.length ? tokens[i + 1].offset : lineText.length;
    return { text: lineText.slice(start, end).trim(), type: tok.type };
  });
}

describe("dsl tokenizer: permission type annotations", () => {
  it("tokenizes a single annotation type as a type identifier", () => {
    const schema = [
      "definition user {}",
      "definition doc {",
      "  permission view: user = viewer",
      "}",
    ].join("\n");
    const toks = tokensForLine(schema, 2);

    // The annotation type `user` is a type identifier.
    const userTok = toks.find((t) => t.text === "user");
    expect(userTok?.type).toContain("type.identifier");

    // The permission name and the compute expression keep their existing tokens.
    expect(toks.find((t) => t.text === "view")?.type).toContain("identifier.permission");
    expect(toks.find((t) => t.text === "viewer")?.type).toContain("identifier.relorperm");
  });

  it("tokenizes multiple piped annotation types", () => {
    const schema = ["definition doc {", "  permission view: user | group = viewer", "}"].join("\n");
    const typeTexts = tokensForLine(schema, 1)
      .filter((t) => t.type.includes("type.identifier"))
      .map((t) => t.text);
    expect(typeTexts).toContain("user");
    expect(typeTexts).toContain("group");
  });

  it("still tokenizes a permission without an annotation", () => {
    const schema = ["definition doc {", "  permission view = viewer", "}"].join("\n");
    const toks = tokensForLine(schema, 1);
    expect(toks.find((t) => t.text === "view")?.type).toContain("identifier.permission");
    expect(toks.find((t) => t.text === "viewer")?.type).toContain("identifier.relorperm");
    // No annotation types should appear.
    expect(toks.some((t) => t.type.includes("type.identifier"))).toBe(false);
  });

  it("colorizes schema into themed spans (the mechanism the chat highlighter uses)", async () => {
    const html = await monaco.editor.colorize(
      "definition user {}\npermission view: user = viewer",
      DS_LANGUAGE_NAME,
      {},
    );
    // Monaco emits <span class="mtkN"> tokens with the source text preserved.
    expect(html).toContain('class="mtk');
    expect(html).toContain("definition");
    expect(html).toContain("permission");
  });
});
