import { ParsedSchema, Resolver } from "@authzed/spicedb-parser-js";
import DataEditor, {
  CompactSelection,
  EditableGridCell,
  GridCell,
  GridCellKind,
  GridColumn,
  GridMouseEventArgs,
  GridSelection,
  Rectangle,
  type CellClickedEventArgs,
  type Item,
  type Theme,
  type Highlight,
} from "@glideapps/glide-data-grid";
// Bring in the CSS for glide-data-grid
import "@glideapps/glide-data-grid/dist/index.css";
import { ClipboardList, MessageSquare, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useDeepCompareEffect, useDeepCompareMemo } from "use-deep-compare";

import { useSchemaJumpStore } from "@/components/editor-groups/schema-jump";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useModifierKeyHeld } from "@/hooks/use-modifier-key-held";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import {
  ParseRelationshipError,
  parseRelationshipsWithComments,
  parseRelationshipWithError,
} from "@/spicedb-common/parsing";
import { RelationTuple as Relationship } from "@/spicedb-common/protodefs/core/v1/core_pb";
import { useRelationshipsService } from "@/spicedb-common/services/relationshipsservice";

import {
  Column,
  COLUMNS,
  CommentCellPrefix,
  DataKind,
  DataRegex,
  MIN_COLUMN_WIDTH,
  validate,
} from "./columns";
import { COMMENT_CELL_KIND, copyDataForCommentCell } from "./commentcell";
import { RelEditorCustomCell, useCustomCells } from "./customcells";
import {
  AnnotatedData,
  datumToAnnotated,
  emptyAnnotatedDatum,
  fromExternalData,
  getColumnData,
  PartialRelationship,
  RelationshipDatum,
  RelationshipDatumAndMetadata,
  relationshipToColumnData,
  relationshipToDatum,
  toExternalData,
  toRelationshipString,
  updateRowInData,
} from "./data";
import {
  CAVEATCONTEXT_CELL_KIND,
  CAVEATNAME_CELL_KIND,
  EXPIRATION_CELL_KIND,
  ExpirationCell,
  OBJECTID_CELL_KIND,
  RELATION_CELL_KIND,
  TYPE_CELL_KIND,
} from "./fieldcell";
import { resolveGridCellTarget } from "./jump-targets";

export type RelationTupleHighlight = {
  tupleString: string;
  color: string;
  message: string;
};

export type RelationshipEditorProps = {
  relationshipData?: RelationshipDatum[];
  highlights?: RelationTupleHighlight[];
  isReadOnly: boolean;
  dataUpdated: (updatedData: RelationshipDatum[]) => void;
  resolver?: Resolver;
  themeOverrides?: Partial<Theme>;
  dimensions?: { width: number; height: number };
  schema?: ParsedSchema;
};

interface TooltipData {
  message: string;
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

/**
 * RelationshipEditor defines a grid-based editor for editing relationships.
 */
export function RelationshipEditor({
  relationshipData,
  highlights,
  isReadOnly,
  dataUpdated,
  resolver,
  themeOverrides,
  dimensions,
  schema,
}: RelationshipEditorProps) {
  // data holds the grid data+metadata array for the grid, indexed by row.
  const [data, setDataDirectly] = useState<AnnotatedData>(() => {
    return fromExternalData(relationshipData);
  });

  // TODO: see if this memoization can live further up.
  useDeepCompareEffect(() => {
    const converted = fromExternalData(relationshipData);
    setDataDirectly(converted);
  }, [relationshipData]);

  const setData = (data: AnnotatedData) => {
    if (isReadOnly) {
      return;
    }
    setDataDirectly(data);
  };

  // inFlightData holds the state of the grid while being edited, before setData has been resolved.
  const inFlightData = useRef<AnnotatedData>(data);

  useEffect(() => {
    inFlightData.current = data;
    dataUpdated(toExternalData(data));
  }, [data, dataUpdated]);

  // relationships holds a filtered form of the grid, containing only valid relationships.
  const relationships = useDeepCompareMemo(() => {
    return data
      .filter((item: RelationshipDatumAndMetadata) => {
        if ("comment" in item.datum) {
          return false;
        }

        return (
          item.datum.resourceType &&
          item.datum.resourceId &&
          item.datum.relation &&
          item.datum.subjectId &&
          item.datum.subjectType
        );
      })
      .map((value: RelationshipDatumAndMetadata) => {
        const relData = value.datum as PartialRelationship;
        const caveatContext = relData.caveatContext ? `:${relData.caveatContext}` : "";
        const str = `${relData.resourceType}:${relData.resourceId}#${
          relData.relation
        }@${relData.subjectType}:${relData.subjectId}${
          relData.subjectRelation ? `#${relData.subjectRelation}` : ""
        }${
          relData.caveatName ? `[${relData.caveatName}${caveatContext}]` : ""
        }${relData.expiration ? `[expiration:${relData.expiration}]` : ""}`;
        return parseRelationshipWithError(str);
      })
      .filter((value: Relationship | ParseRelationshipError) => {
        return !("errorMessage" in value);
      })
      .map((value: Relationship | ParseRelationshipError) => {
        return value as Relationship;
      });
  }, [data]);

  // relationshipsService is a service for quickly accessing the types, ids and relations defined
  // for all *valid* relationships.
  const relationshipsService = useRelationshipsService(relationships, schema);

  const adjustData = (dataRowIndex: number, newColumnData: string[]) => {
    if (isReadOnly) {
      return;
    }

    const updated = updateRowInData(inFlightData.current, dataRowIndex, newColumnData);
    inFlightData.current = updated;
    setData(updated);
  };

  const [gridSelection, setGridSelection] = useState<GridSelection | undefined>(undefined);
  const handleGridSelectionChanged = (newSelection: GridSelection | undefined) => {
    // Prevent column-only selection.
    if (newSelection?.columns && newSelection.columns.length > 0) {
      return;
    }

    setGridSelection(newSelection);
  };

  const handleCellEdited = (
    cellPosition: readonly [number, number],
    newValue: EditableGridCell,
  ) => {
    const [col, row] = cellPosition;
    if (row >= inFlightData.current.length || col >= COLUMNS.length) {
      return;
    }

    const cell = newValue as unknown as RelEditorCustomCell;
    if ("comment" in inFlightData.current[row].datum) {
      // If the comment cell doesn't start with `// `, convert into a relationship.
      if (!cell.data.dataValue.startsWith(CommentCellPrefix)) {
        const parsed = parseRelationshipWithError(cell.data.dataValue.trim());
        if ("errorMessage" in parsed) {
          return;
        }

        const adjustedData = Array.from(inFlightData.current);
        adjustedData[row] = datumToAnnotated(
          relationshipToDatum(parsed),
          adjustedData[row].dataRowIndex,
        );
        setData(adjustedData);
        return;
      }

      const adjustedData = Array.from(inFlightData.current);
      adjustedData[row].datum = { comment: cell.data.dataValue };
      adjustedData[row].columnData = [cell.data.dataValue];
      setData(adjustedData);
      return;
    }

    // If the cell data starts with `// ` and this is the first column, convert to a comment.
    if (col === 0 && cell.data.dataValue.startsWith(CommentCellPrefix)) {
      const adjustedData = Array.from(inFlightData.current);
      const commentString = [cell.data.dataValue, ...adjustedData[row].columnData.slice(1)].join(
        " ",
      );
      adjustedData[row].datum = { comment: commentString };
      adjustedData[row].columnData = [commentString];
      setData(adjustedData);
      return;
    }

    // Update the column data for the changed column.
    const existingColumnData = inFlightData.current[row].columnData;
    const newColumnData = Array.from(existingColumnData);
    const validator = DataRegex[COLUMNS[col].dataKind];
    const validated = validate(validator, cell.data.dataValue);
    if (!validated) {
      const regex = DataRegex[COLUMNS[col].dataKind];

      toast.error(`Expected format for ${COLUMNS[col].title}:`, {
        description: regex instanceof RegExp ? regex.toString() : COLUMNS[col].dataDescription,
      });
    }

    newColumnData[col] = validated ? cell.data.dataValue : "";

    adjustData(row, newColumnData);

    // Jump to cell to the right, but only if the next cell is empty.
    if (newColumnData[col] && col < COLUMNS.length - 1 && existingColumnData[col + 1] === "") {
      // NOTE: timeout needed for glide grid to apply its own grid selection change before we do.
      const range = {
        x: col + 1,
        y: row,
        width: 1,
        height: 1,
      };

      setTimeout(() => {
        setGridSelection({
          current: {
            cell: [col + 1, row],
            range: range,
            rangeStack: [],
          },
          columns: CompactSelection.empty(),
          rows: CompactSelection.empty(),
        });
      }, 10);
    }
  };

  const handleRowAppended = async (): Promise<"bottom"> => {
    if (isReadOnly) {
      return "bottom";
    }

    const updatedData = Array.from(data);
    updatedData.push(emptyAnnotatedDatum(updatedData.length));
    setData(updatedData);
    return "bottom";
  };

  const handleDelete = (selection: GridSelection): GridSelection | boolean => {
    if (selection.current?.range) {
      let adjustedData = Array.from(data);
      const range = selection.current.range;

      for (let y = range.y; y < range.y + range.height; y++) {
        const newColData: string[] = [];
        for (let x = range.x; x < range.x + range.width; x++) {
          newColData.push("");
        }

        adjustedData = updateRowInData(adjustedData, y, newColData, range.x);
      }

      inFlightData.current = adjustedData;
      setGridSelection(undefined);
      setData(adjustedData);
      return false;
    }

    if (selection.rows) {
      const adjustedData = Array.from(data);
      for (let row = selection.rows.last() ?? 0; row >= (selection.rows.first() ?? 1); row--) {
        if (!selection.rows.hasIndex(row)) {
          continue;
        }

        adjustedData.splice(row, 1);
      }

      inFlightData.current = adjustedData;
      setData(adjustedData);
      setGridSelection(undefined);
      return false;
    }

    // NOTE: We explicitly ignore deletion by column.
    return false;
  };

  const resolvedTheme = useResolvedTheme();
  const modifierHeld = useModifierKeyHeld();

  const dataEditorTheme: Partial<Theme> = useMemo(() => {
    const isDark = resolvedTheme === "dark";

    const palette = isDark
      ? {
          textDark: "#e5e5e5",
          textMedium: "#e5e5e5",
          textLight: "#a0a0a0",
          textBubble: "#e5e5e5",
          bgIconHeader: "#e5e5e5",
          fgIconHeader: "#e5e5e5",
          textHeader: "#e5e5e5",
          textGroupHeader: "#e5e5e5",
          textHeaderSelected: "#e5e5e5",
          bgCell: "#0a0a0a",
          bgCellMedium: "#141414",
          bgHeader: "#1d1d1d",
          bgHeaderHovered: "#1e3a8a",
          bgBubble: "black",
          bgBubbleSelected: "black",
          borderColor: "#2a2a2a",
          horizontalBorderColor: "#2a2a2a",
          drilldownBorder: "#2a2a2a",
        }
      : {
          textDark: "#1a1a1a",
          textMedium: "#3a3a3a",
          textLight: "#666666",
          textBubble: "#1a1a1a",
          bgIconHeader: "#3a3a3a",
          fgIconHeader: "#3a3a3a",
          textHeader: "#1a1a1a",
          textGroupHeader: "#1a1a1a",
          textHeaderSelected: "#1a1a1a",
          bgCell: "#ffffff",
          bgCellMedium: "#f7f7f7",
          bgHeader: "#f5f5f5",
          bgHeaderHovered: "#dbeafe",
          bgBubble: "#f5f5f5",
          bgBubbleSelected: "#e5e5e5",
          borderColor: "#e5e5e5",
          horizontalBorderColor: "#e5e5e5",
          drilldownBorder: "#e5e5e5",
        };

    return {
      accentColor: "#3b82f6",
      accentFg: "#ffffff",
      accentLight: "rgba(59, 130, 246, 0.2)",

      ...palette,

      editorFontSize: "13px",

      bgHeaderHasFocus: "#3b82f6",
      bgSearchResult: "#3b82f6",

      linkColor: "#3b82f6",

      cellHorizontalPadding: 8,
      cellVerticalPadding: 3,

      headerFontStyle: "600 13px",
      baseFontStyle: "13px",
      fontFamily:
        "Inter, Roboto, -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Ubuntu, noto, arial, sans-serif",
      ...themeOverrides,
    };
  }, [themeOverrides, resolvedTheme]);

  const getCellData = useCallback(
    ([col, row]: readonly [number, number]): GridCell => {
      if (row >= data.length) {
        return {
          kind: GridCellKind.Text,
          data: "",
          allowOverlay: true,
          displayData: "",
        };
      }

      const rowData = data[row];
      if ("comment" in rowData.datum) {
        return {
          kind: GridCellKind.Custom,
          data: {
            kind: COMMENT_CELL_KIND,
            row: row,
            col: col,
            dataValue: data[row].columnData[0],
          },
          allowOverlay: true,
          copyData: copyDataForCommentCell(data[row].columnData[0]),
          span: [0, COLUMNS.length - 1],
        };
      }

      if (col >= data[row].columnData.length) {
        return {
          kind: GridCellKind.Text,
          data: "",
          allowOverlay: true,
          displayData: "",
        };
      }

      // While a modifier key is held, jumpable cells that resolve to a schema
      // location get a pointer cursor. glide applies a cell's `cursor` only
      // while the pointer is over it, so this is naturally hovered-cell-only.
      const jumpCursor =
        modifierHeld &&
        resolver !== undefined &&
        resolveGridCellTarget(resolver, COLUMNS[col].dataKind, data[row].columnData, col) !==
          undefined
          ? "pointer"
          : undefined;

      switch (COLUMNS[col].dataKind) {
        case DataKind.RESOURCE_TYPE:
        case DataKind.SUBJECT_TYPE:
          return {
            kind: GridCellKind.Custom,
            data: {
              kind: TYPE_CELL_KIND,
              row: row,
              col: col,
              dataValue: data[row].columnData[col],
            },
            allowOverlay: true,
            copyData: data[row].columnData[col],
            cursor: jumpCursor,
          };

        case DataKind.RESOURCE_ID:
        case DataKind.SUBJECT_ID:
          return {
            kind: GridCellKind.Custom,
            data: {
              kind: OBJECTID_CELL_KIND,
              row: row,
              col: col,
              dataValue: data[row].columnData[col],
            },
            allowOverlay: true,
            copyData: data[row].columnData[col],
          };

        case DataKind.SUBJECT_RELATION:
        case DataKind.RELATION:
          return {
            kind: GridCellKind.Custom,
            data: {
              kind: RELATION_CELL_KIND,
              row: row,
              col: col,
              dataValue: data[row].columnData[col],
            },
            allowOverlay: true,
            copyData: data[row].columnData[col],
            cursor: jumpCursor,
          };

        case DataKind.CAVEAT_NAME:
          return {
            kind: GridCellKind.Custom,
            data: {
              kind: CAVEATNAME_CELL_KIND,
              row: row,
              col: col,
              dataValue: data[row].columnData[col],
            },
            allowOverlay: true,
            copyData: data[row].columnData[col],
            cursor: jumpCursor,
          };

        case DataKind.CAVEAT_CONTEXT:
          return {
            kind: GridCellKind.Custom,
            data: {
              kind: CAVEATCONTEXT_CELL_KIND,
              row: row,
              col: col,
              dataValue: data[row].columnData[col],
            },
            allowOverlay: true,
            copyData: data[row].columnData[col],
          };

        case DataKind.EXPIRATION:
          return {
            kind: GridCellKind.Custom,
            data: {
              kind: EXPIRATION_CELL_KIND,
              row: row,
              col: col,
              dataValue: data[row].columnData[col],
            },
            allowOverlay: true,
            copyData: data[row].columnData[col],
          } as ExpirationCell;

        default:
          return {
            kind: GridCellKind.Text,
            data: data[row].columnData[col],
            allowOverlay: true,
            displayData: data[row].columnData[col],
          };
      }
    },
    [data, resolver, modifierHeld],
  );

  const getCellsForSelection = useCallback(
    (selection: Rectangle): readonly (readonly GridCell[])[] => {
      const result: GridCell[][] = [];
      for (let y = selection.y; y < selection.y + selection.height; y++) {
        // NOTE: This can happen when search is called and indicates that the entire
        // grid is "selected" for search (i.e. there is no active selection).
        if (y >= data.length) {
          continue;
        }

        const row: GridCell[] = [];
        for (let x = selection.x; x < selection.x + selection.width; x++) {
          row.push({
            kind: GridCellKind.Text,
            data: data[y].columnData[x],
            allowOverlay: true,
            displayData: data[y].columnData[x],
          });
        }
        result.push(row);
      }

      return result;
    },
    [data],
  );

  const handleRowMoved = (startIndex: number, endIndex: number) => {
    if (isReadOnly) {
      return;
    }

    const adjustedData = Array.from(data);
    const removed = adjustedData.splice(startIndex, 1);
    if (removed.length) {
      adjustedData.splice(endIndex, 0, removed[0]);
      setData(adjustedData);
    }
  };

  const handlePaste = (
    target: readonly [number, number],
    values: readonly (readonly string[])[],
  ) => {
    if (isReadOnly) {
      return false;
    }

    const [startingCol, startingRow] = target;

    let adjustedData = inFlightData.current;
    let rowOffset = 0;
    values.forEach((newColDataOrRelationships: readonly string[]) => {
      const rowToUpdate = startingRow + rowOffset;

      // Determine if the pasted data contains a tuple string. If so, parse it
      // into column data.
      let columnData = newColDataOrRelationships;
      if (columnData.length === 0) {
        return;
      }

      if (!columnData[0].startsWith(CommentCellPrefix)) {
        if (columnData.length === 1) {
          const asRelationship = parseRelationshipsWithComments(columnData[0]);
          if (asRelationship.length === 1) {
            columnData = relationshipToColumnData(asRelationship[0]) ?? columnData;
          }
        }

        columnData = columnData.map((value: string, cIndex: number) => {
          const columnIndex = startingCol + cIndex;
          const dataKind = COLUMNS[columnIndex].dataKind;
          const validator = DataRegex[dataKind];
          if (validate(validator, value)) {
            return value;
          }

          return "";
        });
      }

      // Skip empty/invalid rows.
      if (columnData.filter((v) => !!v).length === 0) {
        return;
      }

      adjustedData = updateRowInData(adjustedData, rowToUpdate, columnData, startingCol);
      rowOffset++;
    });

    inFlightData.current = adjustedData;
    setData(adjustedData);
    return false;
  };

  const highlightRegions = useDeepCompareMemo(() => {
    return (highlights ?? [])
      .map((highlight: RelationTupleHighlight) => {
        const rowIndex = data.findIndex((datum: RelationshipDatumAndMetadata) => {
          return toRelationshipString(datum) === highlight.tupleString;
        });
        if (rowIndex === undefined) {
          return undefined;
        }

        return {
          color: highlight.color,
          range: {
            x: 0,
            y: rowIndex,
            width: COLUMNS.length,
            height: 1,
          },
        };
      })
      .filter((highlight: Highlight | undefined) => {
        return !!highlight;
      }) as Highlight[];
  }, [highlights, data]);

  const highlightsByRowIndex = useDeepCompareMemo(() => {
    const byRowIndex: Record<number, RelationTupleHighlight> = {};
    (highlights ?? []).forEach((highlight: RelationTupleHighlight) => {
      const rowIndex = data.findIndex((datum: RelationshipDatumAndMetadata) => {
        return toRelationshipString(datum) === highlight.tupleString;
      });
      if (rowIndex === undefined) {
        return;
      }

      byRowIndex[rowIndex] = highlight;
    });
    return byRowIndex;
  }, [highlights, data]);

  const deleteSelectedRows = () => {
    if (gridSelection) {
      handleDelete(gridSelection);
    }
  };

  const copySelectedRows = async () => {
    if (gridSelection?.rows) {
      const selected = data.filter((annotated: RelationshipDatumAndMetadata) =>
        gridSelection?.rows.hasIndex(annotated.dataRowIndex),
      );
      if (selected) {
        const data = selected
          .map((annotated: RelationshipDatumAndMetadata) => {
            if ("comment" in annotated.datum) {
              return `${CommentCellPrefix} ${annotated.datum.comment.trim()}`;
            }

            return toRelationshipString(annotated) || "";
          })
          .join("\n");

        await navigator.clipboard.writeText(data);
      }
    }
  };

  const convertSelectedRows = () => {
    if (gridSelection?.rows) {
      const updated = data.map((annotated: RelationshipDatumAndMetadata) => {
        if (!gridSelection?.rows.hasIndex(annotated.dataRowIndex)) {
          return annotated;
        }

        if ("comment" in annotated.datum) {
          const parsed = parseRelationshipWithError(
            annotated.datum.comment.substring(CommentCellPrefix.length).trim(),
          );
          if ("errorMessage" in parsed) {
            return annotated;
          }

          const datum = relationshipToDatum(parsed);
          return {
            ...annotated,
            columnData: getColumnData(datum),
            datum: datum,
          };
        }

        const relString = toRelationshipString(annotated) ?? "";
        return {
          ...annotated,
          columnData: [`${CommentCellPrefix} ${relString}`],
          datum: {
            comment: `${CommentCellPrefix} ${relString}`,
          },
        };
      });
      setData(updated);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isReadOnly) {
      return;
    }

    // NOTE: the input check is to ensure that hitting `/` inside an editor does not convert
    // the cell into a comment.
    const nodeName =
      "nodeName" in e.target ? (e.target as HTMLElement).nodeName.toLowerCase() : undefined;
    if (e.key === "/" && gridSelection?.current?.cell && nodeName !== "input") {
      const [col, row] = gridSelection.current.cell;
      if (col === 0) {
        const rowData = data[row].columnData;
        if (rowData.filter((v) => !!v).length === 0) {
          const adjustedData = Array.from(data);
          adjustedData[row] = {
            ...data[row],
            columnData: [`${CommentCellPrefix} a comment`],
            datum: {
              comment: `${CommentCellPrefix} a comment`,
            },
          };
          setData(adjustedData);
        }
      }
    }
  };

  const [tooltip, setTooltip] = useState<TooltipData | undefined>();

  const handleItemHovered = useCallback(
    (args: GridMouseEventArgs) => {
      if (args.kind !== "cell") {
        setTooltip(undefined);
        return;
      }

      const [, row] = args.location;
      if (!(row in highlightsByRowIndex)) {
        setTooltip(undefined);
        return;
      }

      const found = highlightsByRowIndex[row];
      setTooltip({
        message: found.message,
        bounds: {
          left: args.bounds.x,
          top: args.bounds.y + args.bounds.height,
          width: args.bounds.width,
          height: args.bounds.height,
        },
      });
    },
    [highlightsByRowIndex, setTooltip],
  );

  const width = dimensions?.width ?? 1200;
  const height = dimensions?.height ?? 300;
  const toolbarHeight = 50;
  const hasCheckedRows = gridSelection?.rows !== undefined && gridSelection.rows.length > 0;
  const allRowsChecked =
    gridSelection?.rows !== undefined &&
    data.length > 0 &&
    gridSelection.rows.length === data.length;
  const toggleCheckedRows = () => {
    if (allRowsChecked) {
      setGridSelection({
        current: undefined,
        columns: CompactSelection.empty(),
        rows: CompactSelection.empty(),
      });
      return;
    }

    setGridSelection({
      current: undefined,
      columns: CompactSelection.empty(),
      rows: CompactSelection.fromSingleSelection([0, data.length]),
    });
  };

  const [cookies, setCookies] = useCookies(["relgrid-similar-highlighting"]);
  const [similarHighlighting, setSimilarHighlighting] = useState(
    cookies["relgrid-similar-highlighting"] !== "0",
  );
  const handleToggleSimilarHighlighting = () => {
    const updated = !similarHighlighting;
    setSimilarHighlighting(updated);
    setCookies("relgrid-similar-highlighting", updated ? "1" : "0");
  };

  const [overriddenColumnWidths, setOverriddenColumnWidths] = useState<Record<string, number>>({});

  const columnsWithWidths = useMemo(() => {
    const defaultColWidth = Math.max(width / (COLUMNS.length + 0.5), MIN_COLUMN_WIDTH); // +0.5 to give some padding
    return COLUMNS.map((col: Column) => {
      return {
        ...col,
        width:
          col.id! in overriddenColumnWidths ? overriddenColumnWidths[col.id!] : defaultColWidth,
        trailingRowOptions: isReadOnly ? undefined : col.trailingRowOptions,
      };
    });
  }, [width, overriddenColumnWidths, isReadOnly]);

  const handleColumnResize = (col: GridColumn, newSize: number) => {
    if (newSize < MIN_COLUMN_WIDTH) {
      return;
    }

    setOverriddenColumnWidths({
      ...overriddenColumnWidths,
      [col.id!]: newSize,
    });
  };

  const { customRenderers } = useCustomCells(
    relationshipsService,
    data,
    gridSelection,
    resolver,
    similarHighlighting,
    columnsWithWidths,
    modifierHeld,
  );

  // Cmd/Ctrl+click a type / relation / caveat-name cell jumps to the schema.
  // Plain clicks fall through to glide's normal selection/edit behavior.
  const handleCellClicked = useCallback(
    (cell: Item, event: CellClickedEventArgs) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      if (!resolver) {
        return;
      }
      const [col, row] = cell;
      if (row >= data.length || col >= COLUMNS.length) {
        return;
      }
      const rowData = data[row];
      if ("comment" in rowData.datum) {
        return;
      }
      const target = resolveGridCellTarget(
        resolver,
        COLUMNS[col].dataKind,
        rowData.columnData,
        col,
      );
      if (!target) {
        return;
      }
      useSchemaJumpStore.getState().jumpToSchema(target.line, target.column);
    },
    [resolver, data],
  );

  return (
    <div className="relative [&_input]:!bg-background" onKeyDown={handleKeyDown}>
      <div
        className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 border-b border-border bg-background px-2"
        style={{ height: toolbarHeight }}
      >
        {!isReadOnly && (
          <Checkbox
            className="ml-1"
            checked={allRowsChecked}
            onClick={toggleCheckedRows}
            disabled={data.length === 0}
          />
        )}
        {isReadOnly && <span />}
        {hasCheckedRows && !isReadOnly && (
          <span className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="ghost" onClick={deleteSelectedRows}>
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Rows</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="ghost" onClick={copySelectedRows}>
                  <ClipboardList />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy Rows to Clipboard</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="ghost" onClick={convertSelectedRows}>
                  <MessageSquare />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Convert to/from comments</TooltipContent>
            </Tooltip>
          </span>
        )}
        {(!hasCheckedRows || isReadOnly) && <span />}
        <span />
        <div className="flex items-center gap-2">
          <Checkbox
            id="relgrid-similar-highlighting"
            checked={similarHighlighting}
            onClick={handleToggleSimilarHighlighting}
          />
          <Label htmlFor="relgrid-similar-highlighting">
            Highlight same types, objects and relations
          </Label>
        </div>
      </div>
      <DataEditor
        theme={dataEditorTheme}
        keybindings={{ search: true }}
        getCellContent={getCellData}
        width={width}
        height={height - toolbarHeight}
        columns={columnsWithWidths}
        rows={data.length}
        onPaste={handlePaste}
        customRenderers={customRenderers}
        getCellsForSelection={getCellsForSelection}
        onCellEdited={isReadOnly ? undefined : handleCellEdited}
        onRowAppended={isReadOnly ? undefined : handleRowAppended}
        onDelete={isReadOnly ? undefined : handleDelete}
        onRowMoved={isReadOnly ? undefined : handleRowMoved}
        onItemHovered={handleItemHovered}
        onCellClicked={handleCellClicked}
        isDraggable={false}
        trailingRowOptions={{ tint: !isReadOnly }}
        rowMarkers={isReadOnly ? "number" : "both"}
        rowSelectionMode={isReadOnly ? undefined : "multi"}
        gridSelection={gridSelection}
        highlightRegions={highlightRegions}
        onGridSelectionChange={handleGridSelectionChanged}
        onColumnResize={handleColumnResize}
      />
      {tooltip !== undefined && (
        <div
          className="fixed z-[99999] whitespace-nowrap rounded-lg bg-black/85 px-3 py-2 text-[13px] font-medium text-white"
          style={{
            top: tooltip.bounds.top,
            left: tooltip.bounds.left,
          }}
        >
          {tooltip?.message}
        </div>
      )}
    </div>
  );
}
