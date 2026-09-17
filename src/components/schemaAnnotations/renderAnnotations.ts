import type * as monacoNs from "monaco-editor";

import type {
  AnnotationView,
  ToggleState,
  UnexplainedSymbol,
} from "../../services/schemaAnnotations/types";

const TAG_PREFIX = " ‹ ";
const TAG_SUFFIX = " ›";

/** Minimal, safe markdown: escapes HTML, then renders `code` and **bold**. */
export function renderLightMarkdown(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/`([^`]+)`/g, '<code class="schema-annot-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

const EMPTY_EXPANDED: ReadonlySet<string> = new Set();

export interface AnnotationRenderInputs {
  views: AnnotationView[];
  unexplained: UnexplainedSymbol[];
  toggleState: ToggleState;
  // In Compact mode, the symbolPaths whose full block the user has clicked to
  // expand. Ignored in Full (all blocks show) and Off. Defaults to none.
  expandedSymbols?: ReadonlySet<string>;
}

export interface AnnotationRenderer {
  update(inputs: AnnotationRenderInputs): void;
  dispose(): void;
}

export function createAnnotationRenderer(
  editor: monacoNs.editor.IStandaloneCodeEditor,
  monaco: typeof monacoNs,
): AnnotationRenderer {
  const decorations = editor.createDecorationsCollection([]);
  let zones: { id: string; zone: monacoNs.editor.IViewZone; domNode: HTMLElement }[] = [];

  function clearZones() {
    if (zones.length === 0) return;
    editor.changeViewZones((accessor) => {
      for (const z of zones) accessor.removeZone(z.id);
    });
    zones = [];
  }

  function tag(
    model: monacoNs.editor.ITextModel,
    line: number,
    content: string,
    className: string,
  ) {
    const clamped = Math.min(line, model.getLineCount());
    const col = model.getLineMaxColumn(clamped);
    return {
      range: new monaco.Range(clamped, col, clamped, col),
      // The range above is collapsed (zero-width, at end of line); Monaco only
      // renders injected ("after") text for collapsed ranges when
      // showIfCollapsed is set, so this is required, not optional.
      options: { after: { content, inlineClassName: className }, showIfCollapsed: true },
    };
  }

  function update({ views, unexplained, toggleState, expandedSymbols }: AnnotationRenderInputs) {
    const model = editor.getModel();
    if (!model || toggleState === "off") {
      decorations.set([]);
      clearZones();
      return;
    }

    // Compact mode shows a short end-of-line tag per symbol. Full mode shows the
    // block explanations instead (below), so we don't also tag every symbol
    // there — only the "not yet explained" hints for symbols with no block.
    const decos: monacoNs.editor.IModelDeltaDecoration[] = [];
    if (toggleState === "compact") {
      for (const v of views) {
        const content = `${TAG_PREFIX}${v.annotation.shortLabel}${v.stale ? " ↻" : ""}${TAG_SUFFIX}`;
        decos.push(
          tag(
            model,
            v.startLine,
            content,
            v.stale ? "schema-annot-tag schema-annot-stale" : "schema-annot-tag",
          ),
        );
      }
    }
    if (toggleState === "full") {
      for (const u of unexplained) {
        decos.push(
          tag(
            model,
            u.startLine,
            `${TAG_PREFIX}not yet explained${TAG_SUFFIX}`,
            "schema-annot-unexplained",
          ),
        );
      }
    }
    decorations.set(decos);

    // Blocks (view zones): every view in Full; only the click-expanded views in
    // Compact.
    const expanded = expandedSymbols ?? EMPTY_EXPANDED;
    const blockViews =
      toggleState === "full" ? views : views.filter((v) => expanded.has(v.annotation.symbolPath));

    clearZones();
    if (blockViews.length === 0) return;

    // Constrain each block to the editor's content width and shrink the font a
    // touch so long explanations wrap inside the viewport instead of running off
    // the right edge, and read as secondary to the code.
    const layout = editor.getLayoutInfo();
    const maxWidthPx = Math.max(240, layout.width - layout.contentLeft - 24);
    const fontInfo = editor.getOption(monaco.editor.EditorOption.fontInfo);
    const tabSize = model.getOptions().tabSize;

    // Visual indentation (px) of a line's first non-whitespace char, so a block
    // can be indented to line up with the symbol it explains on the line below.
    const indentPxOf = (line: number): number => {
      const content = model.getLineContent(line);
      let cols = 0;
      for (const ch of content) {
        if (ch === "\t") cols += tabSize - (cols % tabSize);
        else if (ch === " ") cols += 1;
        else break;
      }
      return cols * fontInfo.spaceWidth;
    };

    editor.changeViewZones((accessor) => {
      for (const v of blockViews) {
        const domNode = document.createElement("div");
        domNode.className = v.stale
          ? "schema-annot-block schema-annot-stale"
          : "schema-annot-block";
        domNode.style.maxWidth = `${maxWidthPx}px`;
        domNode.style.fontSize = `${Math.max(11, fontInfo.fontSize - 1)}px`;
        domNode.style.paddingLeft = `${indentPxOf(v.startLine) + 6}px`;
        domNode.innerHTML = renderLightMarkdown(v.annotation.explanation);
        const zone: monacoNs.editor.IViewZone = {
          afterLineNumber: Math.max(0, v.startLine - 1),
          heightInPx: 24,
          domNode,
        };
        const id = accessor.addZone(zone);
        zones.push({ id, zone, domNode });
      }
    });

    // Once attached, measure real content height (accounts for wrapping) and relayout.
    requestAnimationFrame(() => {
      if (zones.length === 0) return;
      editor.changeViewZones((accessor) => {
        for (const z of zones) {
          z.zone.heightInPx = Math.max(24, z.domNode.scrollHeight);
          accessor.layoutZone(z.id);
        }
      });
    });
  }

  return {
    update,
    dispose() {
      decorations.clear();
      clearZones();
    },
  };
}
