import * as monaco from "monaco-editor";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAnnotationRenderer } from "../../components/schemaAnnotations/renderAnnotations";
import type { AnnotationView } from "../../services/schemaAnnotations/types";

let container: HTMLElement;
let editor: monaco.editor.IStandaloneCodeEditor;

const SCHEMA = "definition document {\n\tpermission view = viewer\n}\n";

function viewFor(): AnnotationView {
  return {
    annotation: {
      symbolKind: "permission",
      symbolPath: "document/view",
      shortLabel: "viewers can view",
      explanation: "Anyone who is a viewer can view.",
      sourceHash: "x",
    },
    startLine: 2,
    startColumn: 2,
    endLine: 2,
    endColumn: 26,
    stale: false,
  };
}

beforeEach(() => {
  container = document.createElement("div");
  container.style.width = "800px";
  container.style.height = "400px";
  document.body.appendChild(container);
  editor = monaco.editor.create(container, { value: SCHEMA, language: "plaintext" });
});

afterEach(() => {
  editor.dispose();
  container.remove();
});

describe("createAnnotationRenderer", () => {
  it("renders a compact tag and no block in Compact mode", async () => {
    const r = createAnnotationRenderer(editor, monaco);
    r.update({ views: [viewFor()], unexplained: [], toggleState: "compact" });
    // Monaco paints injected-text decorations on its next render frame (the
    // decoration is set on the model synchronously, but the DOM span isn't
    // painted until then), so wait a frame before asserting on the DOM.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(container.querySelectorAll(".schema-annot-tag").length).toBe(1);
    expect(container.querySelectorAll(".schema-annot-block").length).toBe(0);
    r.dispose();
  });

  it("renders a full block (and no compact tag) in Full mode, and clears on Off", () => {
    const r = createAnnotationRenderer(editor, monaco);
    r.update({ views: [viewFor()], unexplained: [], toggleState: "full" });
    expect(container.querySelectorAll(".schema-annot-block").length).toBe(1);
    // Full mode shows blocks only — no redundant end-of-line tags for views.
    expect(container.querySelectorAll(".schema-annot-tag").length).toBe(0);

    r.update({ views: [viewFor()], unexplained: [], toggleState: "off" });
    expect(container.querySelectorAll(".schema-annot-tag").length).toBe(0);
    expect(container.querySelectorAll(".schema-annot-block").length).toBe(0);
    r.dispose();
  });

  it("expands a symbol's block in Compact only when it is in expandedSymbols", () => {
    const r = createAnnotationRenderer(editor, monaco);
    // Not expanded: tag only, no block.
    r.update({ views: [viewFor()], unexplained: [], toggleState: "compact" });
    expect(container.querySelectorAll(".schema-annot-block").length).toBe(0);
    // Expanded (as if the tag was clicked): the symbol's full block appears.
    r.update({
      views: [viewFor()],
      unexplained: [],
      toggleState: "compact",
      expandedSymbols: new Set(["document/view"]),
    });
    expect(container.querySelectorAll(".schema-annot-block").length).toBe(1);
    r.dispose();
  });
});
