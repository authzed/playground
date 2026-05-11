import { TextRange } from "@authzed/spicedb-parser-js";
import { Editor, DiffEditor } from "@monaco-editor/react";
import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";
import { useLocation } from "@tanstack/react-router";
import lineColumn from "line-column";
import * as monaco from "monaco-editor";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { useSettings } from "@/components/SettingsProvider";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";

import { ScrollLocation, useCookieService } from "../services/cookieservice";
import { DataStore, DataStoreItem, DataStoreItemKind } from "../services/datastore";
import { LocalParseState } from "../services/localparse";
import { Services } from "../services/services";
import registerDSLanguage, {
  DS_LANGUAGE_NAME,
  PLAYGROUND_DARK_THEME_NAME,
  PLAYGROUND_LIGHT_THEME_NAME,
} from "../spicedb-common/lang/dslang";
import { RelationshipFound } from "../spicedb-common/parsing";
import {
  DeveloperError,
  DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";

import { useDrawerStore } from "./drawer/state";
import { ERROR_SOURCE_TO_ITEM } from "./panels/errordisplays";
import registerTupleLanguage, { TUPLE_LANGUAGE_NAME } from "./relationshipeditor/tuplelang";

// Module-level singletons for one-shot language registration. Monaco's
// `register*` calls are global; calling them on every editor mount can stack
// providers (each registration adds a new completion/definition/semantic-tokens
// provider rather than replacing). The `latestLocalParseStateRef` lets the
// registered tuple completion provider always read the most recent parse
// state without re-registering.
let languagesRegistered = false;
const latestLocalParseStateRef: { current: LocalParseState | null } = { current: null };

export type EditorDisplayProps = {
  datastore: DataStore;
  services: Services;
  currentItem: DataStoreItem | undefined;
  isReadOnly: boolean;
  datastoreUpdated: () => void;
  defaultWidth?: string;
  defaultHeight?: string;
  disableMouseWheelScrolling?: boolean;
  diff?: string | undefined;
  themeName?: string | undefined;
  hideMinimap?: boolean | undefined;
  fontSize?: number | undefined;
  scrollBeyondLastLine?: boolean | undefined;
  disableScrolling?: boolean | undefined;
  onPositionChange?: (e: monaco.editor.ICursorPositionChangedEvent) => void;
} & { dimensions?: { width: number; height: number } };

interface LocationState {
  range?: TextRange | undefined;
}

/**
 * EditorDisplays display the editor in the playground.
 */
export function EditorDisplay(props: EditorDisplayProps) {
  const monacoInstanceRef = useRef<typeof monaco | null>(null);
  const [localIndex, setLocalIndex] = useState(0);

  // Keep the module-level ref in sync so the (one-shot) tuple completion
  // provider always reads the latest parse state.
  latestLocalParseStateRef.current = props.services.localParseService.state;

  useEffect(() => {
    latestLocalParseStateRef.current = props.services.localParseService.state;
  }, [props.services.localParseService.state]);

  const location = useLocation();

  const datastore = props.datastore;
  const currentItem = props.currentItem;

  const editorRefs = useRef<Record<string, monaco.editor.IStandaloneCodeEditor>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Select the theme and language.
  const resolvedTheme = useResolvedTheme();
  const prefersDarkMode = resolvedTheme === "dark";

  const { minimapEnabled } = useSettings();
  const minimapVisible =
    props.hideMinimap === true ? false : props.hideMinimap === false ? true : minimapEnabled;

  // A single unified theme is used for every editor instance regardless of
  // language. Monaco's `setTheme` is global — applying different themes per
  // editor causes the last mount/update to win and visually corrupt the
  // others. The unified theme contains rules for every language we render.
  const themeName = useMemo(() => {
    if (props.themeName) {
      return props.themeName;
    }
    return prefersDarkMode ? PLAYGROUND_DARK_THEME_NAME : PLAYGROUND_LIGHT_THEME_NAME;
  }, [prefersDarkMode, props.themeName]);

  const languageName = useMemo(() => {
    switch (currentItem?.kind) {
      case DataStoreItemKind.SCHEMA:
        return DS_LANGUAGE_NAME;

      case DataStoreItemKind.RELATIONSHIPS:
        // Validation tuples.
        return TUPLE_LANGUAGE_NAME;

      case DataStoreItemKind.EXPECTED_RELATIONS:
        // Expected Relations => YAML.
        return "yaml";

      case DataStoreItemKind.ASSERTIONS:
        // Assertions => YAML.
        return "yaml";

      default:
        console.log("Unknown item kind in language name");
        return "yaml";
    }
  }, [currentItem?.kind]);

  const handleEditorChange = (value: string | undefined) => {
    if (props.services.validationService.isRunning || props.isReadOnly) {
      return;
    }

    // Necessary to ensure that the react-monaco editor's internal bound `value`
    // is properly updated.
    //
    // NOTE: As of React 18, these state updates are batched, which causes a problem where
    // the editor updates immediately, but then the datastore updates asynchronously in a
    // batched fashion, causing the editor to "revert" to an older version after a few 10s of
    // ms. To avoid this behavior, we tell React we want these updates to occur immediately
    // via the `flushSync` call.
    // See: https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#automatic-batching
    //
    // NOTE: We do NOT navigate the URL based on the edited item's pathname here.
    // With the editor-groups split layout the URL is owned by the primary group's
    // active tab. Typing in the secondary group must not change the URL — doing
    // so triggers the URL->primary bridge in FullPlayground which would force the
    // primary group to switch to whatever document the secondary is editing,
    // causing both Monaco editors to swap models on every keystroke (perceived
    // as a hard freeze). `datastore.update` never mutates `pathname`, so the
    // previous navigate-on-mismatch was also dead code for the single-editor
    // case.
    flushSync(() => {
      setLocalIndex(localIndex + 1);
      datastore.update(currentItem!, value || "");
      props.datastoreUpdated();
    });
  };

  const updateMarkers = () => {
    // Ensure that we are not displaying a diff editor.
    if (props.diff) {
      return;
    }

    // Ensure that we have a reference for the current path. Every path has its
    // own editor instance.
    const editors = editorRefs.current;
    if (currentItem?.id === undefined || !(currentItem?.id in editors)) {
      return;
    }

    const markers: monaco.editor.IMarkerData[] = [];

    // Generate markers for invalid validation relationships.
    if (currentItem.kind === DataStoreItemKind.RELATIONSHIPS) {
      props.services.problemService.invalidRelationships.forEach((invalid: RelationshipFound) => {
        if (!("errorMessage" in invalid.parsed)) {
          return;
        }

        if (monacoInstanceRef.current) {
          markers.push({
            startLineNumber: invalid.lineNumber + 1,
            startColumn: 0,
            endLineNumber: invalid.lineNumber + 1,
            endColumn: invalid.text.length + 1,
            message: `Malformed or invalid test data relationship: ${invalid.parsed.errorMessage}`,
            severity: monacoInstanceRef.current.MarkerSeverity.Error,
          });
        }
      });
    }

    const contents = currentItem?.editableContents ?? "";
    const finder = lineColumn(contents);
    const lines = contents.split("\n");

    // Generate markers for warnings.
    if (currentItem.kind === DataStoreItemKind.SCHEMA) {
      props.services.problemService.warnings.forEach((warning: DeveloperWarning) => {
        const lineText = lines[warning.line - 1];
        if (lineText === undefined || !monacoInstanceRef.current) {
          return;
        }
        // Locate the source code on the line, starting near the reported column.
        // Falls back to a full-line search if the reported column lands past the token.
        const searchFrom = Math.max(0, (warning.column ?? 1) - 1);
        let index = lineText.indexOf(warning.sourceCode, searchFrom);
        if (index < 0) {
          index = lineText.indexOf(warning.sourceCode);
        }
        if (index < 0) {
          return;
        }
        markers.push({
          startLineNumber: warning.line,
          startColumn: index + 1,
          endLineNumber: warning.line,
          endColumn: index + warning.sourceCode.length + 1,
          message: warning.message,
          severity: monacoInstanceRef.current.MarkerSeverity.Warning,
        });
      });
    }

    // Generate markers for all other kinds of errors.
    const allErrors = [
      ...props.services.problemService.requestErrors,
      ...props.services.problemService.validationErrors,
    ];
    allErrors.forEach((de: DeveloperError) => {
      const itemKind = ERROR_SOURCE_TO_ITEM[de.source];
      if (itemKind !== currentItem.kind) {
        return;
      }

      let line = de.line;
      let column = de.column;
      let endColumn = column;

      // Trim leading/trailing whitespace from the context. Note: per the
      // developer.v1 proto, `context` may be a broad string (e.g. the full
      // relationship for relationship issues, or the object type name for
      // schema issues) — NOT necessarily the offending token. So we only
      // use it to refine width when it's a clean single-word token; otherwise
      // we fall back to a tight 1-char squiggle at the reported column.
      const rawContext = de.context ?? "";
      const trimmedContext = rawContext.trim();
      const isSingleWordToken = !!trimmedContext && !/\s/.test(trimmedContext);

      if (isSingleWordToken) {
        // If there is no line information, search the entire document for the
        // first occurrence of the trimmed context.
        if (!line) {
          const index = contents.indexOf(trimmedContext);
          if (index >= 0) {
            const found = finder.fromIndex(index);
            if (found) {
              line = found.line;
              column = found.col;
              endColumn = column + trimmedContext.length;
            }
          }
        } else {
          // Anchor to the actual occurrence of the trimmed context on (or near)
          // the reported line. This is robust against off-by-one / 0-vs-1
          // indexed columns coming from different error producers.
          const lineText = lines[line - 1] ?? "";
          const searchFrom = Math.max(0, (column ?? 1) - 1);
          let onLineIndex = lineText.indexOf(trimmedContext, searchFrom);
          if (onLineIndex < 0) {
            onLineIndex = lineText.indexOf(trimmedContext);
          }
          if (onLineIndex >= 0) {
            column = onLineIndex + 1;
            endColumn = column + trimmedContext.length;
          } else {
            // Token not found on the reported line — trust the column and
            // underline a single character there.
            endColumn = (column ?? 1) + 1;
          }
        }
      } else {
        // Context is empty or multi-word (e.g. a full relationship string).
        // Trust the reported line/column and use a tight 1-char squiggle.
        // A narrow marker is far better than a wrong wide one.
        if (line && column !== undefined) {
          endColumn = column + 1;
        }
      }

      if (!line || column === undefined) {
        return;
      }

      // Clamp endColumn to the line's actual content length so the squiggle
      // does not visually run onto the next line when context is empty or
      // miscalculated.
      const targetLineText = lines[line - 1] ?? "";
      const maxEndColumn = targetLineText.length + 1;
      if (endColumn <= column || endColumn > maxEndColumn) {
        endColumn = Math.max(column + 1, Math.min(endColumn, maxEndColumn));
      }

      if (monacoInstanceRef.current) {
        markers.push({
          startLineNumber: line,
          startColumn: column,
          endLineNumber: line,
          endColumn: endColumn,
          message: de.message,
          severity: monacoInstanceRef.current.MarkerSeverity.Error,
          code: de.context,
        });
      }
    });

    monacoInstanceRef.current?.editor.setModelMarkers(
      editors[currentItem.id].getModel()!,
      "someowner",
      markers,
    );
  };

  const locationState = location.state as LocationState | undefined | null;
  const cookieService = useCookieService();

  const debouncedSetEditorPosition = useDebouncedCallback(
    (position: monaco.Position) => {
      if (props.currentItem?.kind !== undefined) {
        cookieService.storeEditorPosition(props.currentItem.kind, [
          position.lineNumber,
          position.column,
        ]);
      }
    },
    { wait: 250 },
  );

  const debouncedSetEditorScroll = useDebouncedCallback(
    (scrollLocation: ScrollLocation) => {
      if (props.currentItem?.kind !== undefined) {
        cookieService.storeEditorScroll(props.currentItem.kind, scrollLocation);
      }
    },
    { wait: 250 },
  );

  // Manual layout: explicitly drive editor.layout() from a ResizeObserver on the
  // container. This avoids contention between Monaco's per-instance internal
  // observer (`automaticLayout: true`) when multiple editors are visible at once
  // (e.g. in split view), which can stall the UI.
  const resizeObserversRef = useRef<Record<string, ResizeObserver>>({});

  const attachResizeObserver = (editor: monaco.editor.IStandaloneCodeEditor, key: string) => {
    // Observe our React-owned outer wrapper, NOT the Monaco internal DOM.
    // Monaco caches its rendered size after each layout() call, so observing
    // its own DOM means resize events from CSS-driven parent shrinkage
    // (e.g. drawer resize) are missed — the outer flex container shrinks
    // but Monaco's frozen-size DOM doesn't, leading to overlap. Observing
    // containerRef catches every CSS layout change since it's the outer
    // <div className="h-full w-full"> that we render in JSX.
    const observeTarget = containerRef.current;
    if (!observeTarget) return;
    // Tear down any prior observer for this key before re-attaching.
    resizeObserversRef.current[key]?.disconnect();
    // Dedupe identical sizes and coalesce to a single rAF to avoid the
    // ResizeObserver -> editor.layout() -> reflow -> ResizeObserver feedback
    // loop that can stall the UI when two editors are visible at once.
    let lastWidth = 0;
    let lastHeight = 0;
    let rafId: number | null = null;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        editor.layout({ width: lastWidth, height: lastHeight });
      });
    });
    ro.observe(observeTarget);
    resizeObserversRef.current[key] = ro;
    // Initial layout so the editor sizes itself once parent is laid out.
    editor.layout();
  };

  const handleEditorMounted = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
  ) => {
    monacoInstanceRef.current = monacoInstance;
    if (!languagesRegistered) {
      registerDSLanguage(monacoInstance);
      registerTupleLanguage(monacoInstance, () => latestLocalParseStateRef.current!);
      languagesRegistered = true;
      // Themes are defined inside registerDSLanguage. The Editor already rendered
      // with the theme prop before defineTheme ran, so Monaco fell back to its
      // built-in default. Re-apply now that the theme is defined.
      monacoInstance.editor.setTheme(themeName);
    }
    if (currentItem !== undefined && props.diff === undefined) {
      const itemId = currentItem.id;
      editorRefs.current = {
        ...editorRefs.current,
        [itemId]: editor,
      };

      editor.onDidChangeCursorPosition((e: monaco.editor.ICursorPositionChangedEvent) => {
        debouncedSetEditorPosition(e.position);
        if (props.onPositionChange !== undefined) {
          props.onPositionChange(e);
        }
      });

      editor.onDidScrollChange((e: monaco.IScrollEvent) => {
        debouncedSetEditorScroll([e.scrollTop, e.scrollLeft]);
      });

      attachResizeObserver(editor, itemId);

      // Clean up our refs when this editor instance is disposed (e.g. when
      // the host pane unmounts). Avoids unbounded growth of editorRefs and
      // dangling ResizeObservers pointing at detached DOM.
      editor.onDidDispose(() => {
        if (editorRefs.current[itemId] === editor) {
          delete editorRefs.current[itemId];
        }
        resizeObserversRef.current[itemId]?.disconnect();
        delete resizeObserversRef.current[itemId];
      });

      updateMarkers();
      updatePosition();
    }
  };

  const handleDiffEditorMounted = (editor: monaco.editor.IStandaloneDiffEditor) => {
    if (currentItem === undefined) return;
    const modified = editor.getModifiedEditor();
    const key = `${currentItem.id}-diff`;
    attachResizeObserver(modified, key);
    modified.onDidDispose(() => {
      resizeObserversRef.current[key]?.disconnect();
      delete resizeObserversRef.current[key];
    });
  };

  // Tear down all observers on unmount.
  useEffect(() => {
    return () => {
      Object.values(resizeObserversRef.current).forEach((ro) => ro.disconnect());
      resizeObserversRef.current = {};
    };
  }, []);

  // Drawer-driven relayout: the bottom drawer's resize handle mutates zustand
  // state synchronously during mousemove, but the drawer's height change
  // doesn't reliably propagate as a contentRect change to ResizeObserver
  // observed on our outer wrapper during a drag (the browser batches resize
  // observation and may skip frames mid-drag). Subscribe directly to the
  // drawer's open/active-panel/per-panel-height state and force a relayout
  // on every change, on the next animation frame so layout has settled.
  const drawerOpen = useDrawerStore((s) => s.open);
  const drawerActivePanel = useDrawerStore((s) => s.activePanel);
  const drawerHeight = useDrawerStore((s) => (s.activePanel ? s.perPanelHeight[s.activePanel] : 0));
  useEffect(() => {
    const editors = editorRefs.current;
    if (Object.keys(editors).length === 0) return;
    const rafId = requestAnimationFrame(() => {
      for (const ed of Object.values(editors)) {
        ed.layout();
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [drawerOpen, drawerActivePanel, drawerHeight]);

  const updatePosition = () => {
    const editors = editorRefs.current;
    if (currentItem?.id === undefined || !(currentItem?.id in editors)) {
      return;
    }

    const editor = editors[currentItem.id!];
    const lastPosition = cookieService.lookupEditorPosition(currentItem.kind);

    // If the location's state says to jump to a range, jump to it. This is used by the
    // visualization tab (and other code) to jump to a location in the editor.
    if (locationState && locationState.range !== undefined) {
      editor.revealRangeInCenter({
        startLineNumber: locationState.range.startIndex.line,
        startColumn: locationState.range.startIndex.column,
        endLineNumber: locationState.range.endIndex.line,
        endColumn: locationState.range.endIndex.column,
      });
      editor.setPosition({
        lineNumber: locationState.range.startIndex.line,
        column: locationState.range.startIndex.column,
      });
    } else if (lastPosition) {
      // Otherwise, if the location last stored in cookies for the cursor is valid,
      // set it in the editor.
      const lineCount = editor.getModel()?.getLineCount() ?? 0;
      const [line, column] = lastPosition;
      if (line > lineCount) {
        return;
      }

      const editorPosition = {
        lineNumber: line,
        column: column,
      };

      const validatedPosition = editor.getModel()?.validatePosition(editorPosition);
      if (!validatedPosition) {
        return;
      }

      editor.setPosition(validatedPosition);

      // Set the scroll position to either that last stored in cookies, or, if none,
      // just show the cursor on screen.
      const lastScrollPosition = cookieService.lookupEditorScroll(currentItem.kind);
      if (lastScrollPosition) {
        const [top, left] = lastScrollPosition;
        editor.setScrollLeft(left);
        editor.setScrollTop(top);
      } else {
        editor.revealRangeInCenter({
          startLineNumber: line,
          startColumn: column,
          endLineNumber: line,
          endColumn: column,
        });
      }
    }
  };

  useEffect(() => {
    updatePosition();

    // NOTE: We only care if the locationState changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState]);

  useEffect(() => {
    if (!props.services.problemService.isUpdating) {
      updateMarkers();
    }

    // NOTE: We depend on the actual problem arrays (not just stateKey/count)
    // so the markers re-render whenever errors/warnings change identity even
    // if the count happens to stay the same (e.g. one error replaced by another).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentItem?.pathname,
    props.services.problemService.isUpdating,
    props.services.problemService.requestErrors,
    props.services.problemService.warnings,
    props.services.problemService.validationErrors,
    props.services.problemService.invalidRelationships,
  ]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {currentItem && (
        <div className="w-full h-full">
          {props.diff ? (
            <DiffEditor
              height={
                props.dimensions ? `${props.dimensions.height}px` : (props.defaultHeight ?? "40vh")
              }
              width={
                props.dimensions ? `${props.dimensions.width}px` : (props.defaultWidth ?? "60vw")
              }
              theme={themeName}
              options={{
                readOnly: props.isReadOnly || !!props.diff,
                scrollbar: {
                  handleMouseWheel:
                    props.disableScrolling !== true && props.disableMouseWheelScrolling !== true,
                  vertical: props.disableScrolling ? "hidden" : undefined,
                },
                fixedOverflowWidgets: true,
                minimap: {
                  enabled: minimapVisible,
                },
                fontSize: props.fontSize,
                scrollBeyondLastLine:
                  props.scrollBeyondLastLine ?? (props.disableScrolling === true ? false : true),
                automaticLayout: false,
              }}
              original={props.diff}
              modified={currentItem?.editableContents}
              language={languageName}
              originalModelPath={`${currentItem.id}-original`}
              modifiedModelPath={currentItem.id}
              onMount={handleDiffEditorMounted}
            />
          ) : (
            <Editor
              height={
                props.dimensions ? `${props.dimensions.height}px` : (props.defaultHeight ?? "40vh")
              }
              width={
                props.dimensions ? `${props.dimensions.width}px` : (props.defaultWidth ?? "60vw")
              }
              language={languageName}
              value={currentItem.editableContents}
              theme={themeName}
              onChange={handleEditorChange}
              onMount={handleEditorMounted}
              options={{
                readOnly: props.isReadOnly || !!props.diff,
                scrollbar: {
                  handleMouseWheel:
                    props.disableScrolling !== true && props.disableMouseWheelScrolling !== true,
                  vertical: props.disableScrolling ? "hidden" : undefined,
                },
                "semanticHighlighting.enabled": true,
                fixedOverflowWidgets: true,
                minimap: {
                  enabled: minimapVisible,
                },
                fontSize: props.fontSize,
                scrollBeyondLastLine:
                  props.scrollBeyondLastLine ?? (props.disableScrolling === true ? false : true),
                automaticLayout: false,
              }}
              path={currentItem.id}
            />
          )}
        </div>
      )}
    </div>
  );
}
