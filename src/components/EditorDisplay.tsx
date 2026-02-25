import { TextRange } from "@authzed/spicedb-parser-js";
import { Editor, DiffEditor, useMonaco } from "@monaco-editor/react";
import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";
import { useNavigate, useLocation } from "@tanstack/react-router";
import lineColumn from "line-column";
import * as monaco from "monaco-editor";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import "react-reflex/styles.css";

import { useMediaQuery } from "@/hooks/use-media-query";

import { ScrollLocation, useCookieService } from "../services/cookieservice";
import { DataStore, DataStoreItem, DataStoreItemKind } from "../services/datastore";
import { LocalParseState } from "../services/localparse";
import { Services } from "../services/services";
import registerDSLanguage, {
  DS_DARK_THEME_NAME,
  DS_LANGUAGE_NAME,
  DS_THEME_NAME,
} from "../spicedb-common/lang/dslang";
import { RelationshipFound } from "../spicedb-common/parsing";
import {
  DeveloperError,
  DeveloperWarning,
} from "../spicedb-common/protodefs/developer/v1/developer_pb";

import { ERROR_SOURCE_TO_ITEM } from "./panels/errordisplays";
import registerTupleLanguage, {
  TUPLE_DARK_THEME_NAME,
  TUPLE_LANGUAGE_NAME,
  TUPLE_THEME_NAME,
} from "./relationshipeditor/tuplelang";

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
  const monacoRef = useMonaco();
  const [monacoReady, setMonacoReady] = useState(false);
  const [localIndex, setLocalIndex] = useState(0);
  const localParseState = useRef<LocalParseState>(props.services.localParseService.state);

  // Effect: Register the languages in monaco.
  useEffect(() => {
    if (monacoRef) {
      registerDSLanguage(monacoRef);
      registerTupleLanguage(monacoRef, () => localParseState.current);
      setMonacoReady(true);
    }
  }, [monacoRef]);

  useEffect(() => {
    localParseState.current = props.services.localParseService.state;
  }, [props.services.localParseService.state]);

  const navigate = useNavigate();
  const location = useLocation();

  const datastore = props.datastore;
  const currentItem = props.currentItem;

  const editorRefs = useRef<Record<string, monaco.editor.IStandaloneCodeEditor>>({});

  // Select the theme and language.
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const themeName = useMemo(() => {
    if (props.themeName) {
      return props.themeName;
    }

    switch (currentItem?.kind) {
      case DataStoreItemKind.SCHEMA:
        // Schema.
        return prefersDarkMode ? DS_DARK_THEME_NAME : DS_THEME_NAME;

      case DataStoreItemKind.RELATIONSHIPS:
        // Validation tuples.
        return prefersDarkMode ? TUPLE_DARK_THEME_NAME : TUPLE_THEME_NAME;

      case DataStoreItemKind.EXPECTED_RELATIONS:
        // Expected Relations YAML.
        return prefersDarkMode ? "vs-dark" : "vs";

      case DataStoreItemKind.ASSERTIONS:
        // Assertions YAML.
        return prefersDarkMode ? "vs-dark" : "vs";

      case undefined:
        // Schema.
        return prefersDarkMode ? DS_DARK_THEME_NAME : DS_THEME_NAME;

      default:
        console.log(`Unknown item kind ${currentItem?.kind} in theme name`);
        return "vs";
    }
  }, [prefersDarkMode, currentItem?.kind, props.themeName]);

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
    flushSync(() => {
      setLocalIndex(localIndex + 1);

      // TODO: this shouldn't be necessary. Moving to redux may make this less painful.
      const updated = datastore.update(currentItem!, value || "");
      if (updated && updated.pathname !== location.pathname) {
        void navigate({ to: updated.pathname, replace: true });
      }

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

        if (monacoRef) {
          markers.push({
            startLineNumber: invalid.lineNumber + 1,
            startColumn: 0,
            endLineNumber: invalid.lineNumber + 1,
            endColumn: invalid.text.length + 1,
            message: `Malformed or invalid test data relationship: ${invalid.parsed.errorMessage}`,
            severity: monacoRef.MarkerSeverity.Error,
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
        const line = lines[warning.line - 1];
        const index = line.indexOf(warning.sourceCode, warning.column - 1);
        if (monacoRef) {
          markers.push({
            startLineNumber: warning.line,
            startColumn: index + 1,
            endLineNumber: warning.line,
            endColumn: index + warning.sourceCode.length + 1,
            message: warning.message,
            severity: monacoRef.MarkerSeverity.Warning,
          });
        }
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

      if (de.context) {
        // If there is no line information, then search for the first occurrence of the context.
        if (!line) {
          const index = contents.indexOf(de.context);
          if (index !== undefined && index >= 0) {
            const found = finder.fromIndex(index);
            if (found) {
              line = found.line;
              column = found.col;
              endColumn = column + de.context.length;
            }
          }
        } else {
          // If there is, ensure the position is still valid.
          endColumn = column + de.context.length;
          const index = finder.toIndex(line, column);
          if (index === undefined) {
            return;
          }

          if (contents.substring(index, de.context.length + index) !== de.context) {
            const updatedIndex = contents.indexOf(de.context, index);
            if (updatedIndex < index) {
              return;
            }

            const translated = finder.fromIndex(updatedIndex);
            if (translated?.line !== line) {
              return;
            }

            line = translated.line;
            column = translated.col;
            endColumn = column + de.context.length;
          }
        }
      }

      if (!line || column === undefined) {
        return;
      }

      if (monacoRef) {
        markers.push({
          startLineNumber: line,
          startColumn: column,
          endLineNumber: line,
          endColumn: endColumn,
          message: de.message,
          severity: monacoRef.MarkerSeverity.Error,
          code: de.context,
        });
      }
    });

    monacoRef?.editor.setModelMarkers(editors[currentItem.id].getModel()!, "someowner", markers);
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

  const handleEditorMounted = (editor: monaco.editor.IStandaloneCodeEditor) => {
    if (currentItem !== undefined && props.diff === undefined) {
      editorRefs.current = {
        ...editorRefs.current,
        [currentItem.id]: editor,
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

      updateMarkers();
      updatePosition();
    }
  };

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

    // NOTE: We only care if the currentItem changes or the errors change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentItem?.pathname,
    props.services.problemService.isUpdating,
    props.services.problemService.stateKey,
  ]);

  return (
    <div>
      {monacoReady && currentItem && (
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
                  enabled: props.hideMinimap !== true,
                },
                fontSize: props.fontSize,
                scrollBeyondLastLine:
                  props.scrollBeyondLastLine ?? (props.disableScrolling === true ? false : true),
              }}
              original={props.diff}
              modified={currentItem?.editableContents}
              language={languageName}
            />
          ) : (
            <Editor
              height={
                props.dimensions ? `${props.dimensions.height}px` : (props.defaultHeight ?? "40vh")
              }
              width={
                props.dimensions ? `${props.dimensions.width}px` : (props.defaultWidth ?? "60vw")
              }
              defaultLanguage={languageName}
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
                  enabled: props.hideMinimap !== true,
                },
                fontSize: props.fontSize,
                scrollBeyondLastLine:
                  props.scrollBeyondLastLine ?? (props.disableScrolling === true ? false : true),
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
