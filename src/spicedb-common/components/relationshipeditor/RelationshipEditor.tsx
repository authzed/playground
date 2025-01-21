import {
  ParseRelationshipError,
  parseRelationshipsWithComments,
  parseRelationshipWithError,
} from '../../parsing';
import DataEditor, {
  CompactSelection,
  EditableGridCell,
  GridCell,
  GridCellKind,
  GridColumn,
  GridMouseEventArgs,
  GridSelection,
  Rectangle,
  Theme,
  type Highlight,
} from '@glideapps/glide-data-grid';
import {
  Checkbox,
  FormControlLabel,
  IconButton,
  Snackbar,
  Tooltip,
  Typography,
} from '@material-ui/core';
import {
  createStyles,
  makeStyles,
  Theme as MuiTheme,
  useTheme,
} from '@material-ui/core/styles';
import { Assignment, Comment, Delete } from '@material-ui/icons';
import Alert from '@material-ui/lab/Alert';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { useCookies } from 'react-cookie';
import { ThemeProvider } from 'styled-components';
import { useDeepCompareEffect, useDeepCompareMemo } from 'use-deep-compare';
import { Resolver } from '../../parsers/dsl/resolution';
import { RelationTuple as Relationship } from '../../protodefs/core/v1/core';
import { useRelationshipsService } from '../../services/relationshipsservice';
import {
  Column,
  COLUMNS,
  CommentCellPrefix,
  DataKind,
  DataRegex,
  MIN_COLUMN_WIDTH,
  validate,
} from './columns';
import {
  COMMENT_CELL_KIND,
  CommentCell,
  copyDataForCommentCell,
} from './commentcell';
import { RelEditorCustomCell, useCustomCells } from './customcells';
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
} from './data';
import {
  CAVEATCONTEXT_CELL_KIND,
  CaveatContextCell,
  CAVEATNAME_CELL_KIND,
  CaveatNameCell,
  OBJECTID_CELL_KIND,
  ObjectIdCell,
  RELATION_CELL_KIND,
  RelationCell,
  TYPE_CELL_KIND,
  TypeCell,
} from './fieldcell';

const useStyles = makeStyles((theme: MuiTheme) =>
  createStyles({
    root: {
      '& input': {
        backgroundColor: `${theme.palette.background.paper} !important`,
      },
      position: 'relative',
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing(4),
      right: theme.spacing(2),
      zIndex: 9999,
    },
    speedDialTooltip: {
      whiteSpace: 'nowrap',
    },
    tooltip: {
      position: 'fixed',
      zIndex: 99999,
      whiteSpace: 'nowrap',
      padding: '8px 12px',
      color: 'white',
      font: '500 13px',
      fontFamily: theme.typography.fontFamily,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderRadius: 9,
    },
    toolbar: {
      backgroundColor: theme.palette.background.default,
      borderBottom: '1px solid transparent',
      borderBottomColor: theme.palette.divider,
      display: 'grid',
      gridTemplateColumns: 'auto auto 1fr auto',
      alignItems: 'center',
    },
    toolbarCheckbox: {
      padding: '4px',
    },
  })
);

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
  resolver?: Resolver | undefined;
  themeOverrides?: Partial<Theme> | undefined;
} & { dimensions?: { width: number; height: number } };

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
export function RelationshipEditor(props: RelationshipEditorProps) {
  // data holds the grid data+metadata array for the grid, indexed by row.
  const [data, setDataDirectly] = useState<AnnotatedData>(() => {
    return fromExternalData(props.relationshipData);
  });

  useDeepCompareEffect(() => {
    const converted = fromExternalData(props.relationshipData);
    setDataDirectly(converted);
  }, [props.relationshipData]);

  const setData = (data: AnnotatedData) => {
    if (props.isReadOnly) {
      return;
    }
    setDataDirectly(data);
  };

  // inFlightData holds the state of the grid while being edited, before setData has been resolved.
  const inFlightData = useRef<AnnotatedData>(data);
  const dataUpdated = props.dataUpdated;

  useEffect(() => {
    inFlightData.current = data;
    dataUpdated(toExternalData(data));

    // NOTE: we do not want to rerun this if the dataUpdated callback has changed (which it should
    // not, ideally).
  }, [data]);

  // relationships holds a filtered form of the grid, containing only valid relationships.
  const relationships = useDeepCompareMemo(() => {
    return data
      .filter((item: RelationshipDatumAndMetadata) => {
        if ('comment' in item.datum) {
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
        const caveatContext = relData.caveatContext
          ? `:${relData.caveatContext}`
          : '';
        const str = `${relData.resourceType}:${relData.resourceId}#${
          relData.relation
        }@${relData.subjectType}:${relData.subjectId}${
          relData.subjectRelation ? `#${relData.subjectRelation}` : ''
        }${
          relData.caveatName ? `[${relData.caveatName}${caveatContext}]` : ''
        }`;
        return parseRelationshipWithError(str);
      })
      .filter((value: Relationship | ParseRelationshipError) => {
        return !('errorMessage' in value);
      })
      .map((value: Relationship | ParseRelationshipError) => {
        return value as Relationship;
      });
  }, [data]);

  // relationshipsService is a service for quickly accessing the types, ids and relations defined
  // for all *valid* relationships.
  const relationshipsService = useRelationshipsService(relationships);

  const adjustData = (dataRowIndex: number, newColumnData: string[]) => {
    if (props.isReadOnly) {
      return;
    }

    const updated = updateRowInData(
      inFlightData.current,
      dataRowIndex,
      newColumnData
    );
    inFlightData.current = updated;
    setData(updated);
  };

  const [gridSelection, setGridSelection] = useState<GridSelection | undefined>(
    undefined
  );
  const handleGridSelectionChanged = (
    newSelection: GridSelection | undefined
  ) => {
    // Prevent column-only selection.
    if (newSelection?.columns && newSelection.columns.length > 0) {
      return;
    }

    setGridSelection(newSelection);
  };

  const handleCellEdited = (
    cellPosition: readonly [number, number],
    newValue: EditableGridCell
  ) => {
    const [col, row] = cellPosition;
    if (row >= inFlightData.current.length || col >= COLUMNS.length) {
      return;
    }

    const cell = newValue as unknown as RelEditorCustomCell;
    if ('comment' in inFlightData.current[row].datum) {
      // If the comment cell doesn't start with `// `, convert into a relationship.
      if (!cell.data.dataValue.startsWith(CommentCellPrefix)) {
        const parsed = parseRelationshipWithError(cell.data.dataValue.trim());
        if ('errorMessage' in parsed) {
          return;
        }

        const adjustedData = Array.from(inFlightData.current);
        adjustedData[row] = datumToAnnotated(
          relationshipToDatum(parsed),
          adjustedData[row].dataRowIndex
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
      const commentString = [
        cell.data.dataValue,
        ...adjustedData[row].columnData.slice(1),
      ].join(' ');
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
      setSnackbarMessage(
        <div>
          <Typography variant="caption">
            Expected format for {COLUMNS[col].title}:
          </Typography>
          {regex instanceof RegExp && (
            <Typography variant="subtitle1">{regex.toString()}</Typography>
          )}
          {!(regex instanceof RegExp) && (
            <Typography variant="subtitle1">
              {COLUMNS[col].dataDescription}
            </Typography>
          )}
        </div>
      );
    }

    newColumnData[col] = validated ? cell.data.dataValue : '';

    adjustData(row, newColumnData);

    // Jump to cell to the right, but only if the next cell is empty.
    if (
      newColumnData[col] &&
      col < COLUMNS.length - 1 &&
      existingColumnData[col + 1] === ''
    ) {
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

  const handleRowAppended = async (): Promise<'bottom'> => {
    if (props.isReadOnly) {
      return 'bottom';
    }

    const updatedData = Array.from(data);
    updatedData.push(emptyAnnotatedDatum(updatedData.length));
    setData(updatedData);
    return 'bottom';
  };

  const handleDelete = (selection: GridSelection): GridSelection | boolean => {
    if (selection.current?.range) {
      let adjustedData = Array.from(data);
      const range = selection.current.range;

      for (let y = range.y; y < range.y + range.height; y++) {
        const newColData: string[] = [];
        for (let x = range.x; x < range.x + range.width; x++) {
          newColData.push('');
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
      for (
        var row = selection.rows.last() ?? 0;
        row >= (selection.rows.first() ?? 1);
        row--
      ) {
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

  const theme = useTheme();
  const themeOverrides = props.themeOverrides;
  const dataEditorTheme: Theme = useMemo(() => {
    return {
      accentColor: theme.palette.primary.light,
      accentFg: theme.palette.getContrastText(theme.palette.action.focus),
      accentLight: theme.palette.action.focus,

      textDark: theme.palette.text.primary,
      textMedium: theme.palette.text.primary,
      textLight: theme.palette.grey[500],
      textBubble: theme.palette.text.primary,

      editorFontSize: `${theme.typography.fontSize}px`,

      bgIconHeader: theme.palette.text.primary,
      fgIconHeader: theme.palette.text.primary,
      textHeader: theme.palette.text.primary,
      textGroupHeader: theme.palette.text.primary,
      textHeaderSelected: theme.palette.text.primary,

      bgCell: theme.palette.background.paper,
      bgCellMedium: theme.palette.background.default,
      bgHeader: theme.palette.background.default,
      bgHeaderHasFocus: theme.palette.primary.main,
      bgHeaderHovered: theme.palette.primary.dark,

      bgBubble: 'black',
      bgBubbleSelected: 'black',

      bgSearchResult: theme.palette.primary.light,

      borderColor: theme.palette.divider,
      horizontalBorderColor: theme.palette.divider,
      drilldownBorder: theme.palette.divider,

      linkColor: theme.palette.primary.main,

      cellHorizontalPadding: 8,
      cellVerticalPadding: 3,

      headerFontStyle: '600 13px',
      baseFontStyle: '13px',
      fontFamily:
        'Inter, Roboto, -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Ubuntu, noto, arial, sans-serif',
      ...(themeOverrides ?? {}),
    };
  }, [theme, themeOverrides]);

  const getCellData = useCallback(
    ([col, row]: readonly [number, number]): GridCell => {
      if (row >= data.length) {
        return {
          kind: GridCellKind.Text,
          data: '',
          allowOverlay: true,
          displayData: '',
        };
      }

      const rowData = data[row];
      if ('comment' in rowData.datum) {
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
        } as CommentCell;
      }

      if (col >= data[row].columnData.length) {
        return {
          kind: GridCellKind.Text,
          data: '',
          allowOverlay: true,
          displayData: '',
        };
      }

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
          } as TypeCell;

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
          } as ObjectIdCell;

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
          } as RelationCell;

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
          } as CaveatNameCell;

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
          } as CaveatContextCell;

        default:
          return {
            kind: GridCellKind.Text,
            data: data[row].columnData[col],
            allowOverlay: true,
            displayData: data[row].columnData[col],
          };
      }
    },
    [data]
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
    [data]
  );

  const classes = useStyles();
  const handleRowMoved = (startIndex: number, endIndex: number) => {
    if (props.isReadOnly) {
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
    values: readonly (readonly string[])[]
  ) => {
    if (props.isReadOnly) {
      return false;
    }

    const [oneIndexedColumn, startingRow] = target;
    const startingCol = oneIndexedColumn - 1; // col is +1 for the checkbox.

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
            columnData =
              relationshipToColumnData(asRelationship[0]) ?? columnData;
          }
        }

        columnData = columnData.map((value: string, cIndex: number) => {
          const columnIndex = startingCol + cIndex;
          const dataKind = COLUMNS[columnIndex].dataKind;
          const validator = DataRegex[dataKind];
          if (validate(validator, value)) {
            return value;
          }

          return '';
        });
      }

      // Skip empty/invalid rows.
      if (columnData.filter((v) => !!v).length === 0) {
        return;
      }

      adjustedData = updateRowInData(
        adjustedData,
        rowToUpdate,
        columnData,
        startingCol
      );
      rowOffset++;
    });

    inFlightData.current = adjustedData;
    setData(adjustedData);
    return false;
  };

  const highlightRegions = useDeepCompareMemo(() => {
    return (props.highlights ?? [])
      .map((highlight: RelationTupleHighlight) => {
        const rowIndex = data.findIndex(
          (datum: RelationshipDatumAndMetadata) => {
            return toRelationshipString(datum) === highlight.tupleString;
          }
        );
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
  }, [props.highlights, data]);

  const highlightsByRowIndex = useDeepCompareMemo(() => {
    const byRowIndex: Record<number, RelationTupleHighlight> = {};
    (props.highlights ?? []).forEach((highlight: RelationTupleHighlight) => {
      const rowIndex = data.findIndex((datum: RelationshipDatumAndMetadata) => {
        return toRelationshipString(datum) === highlight.tupleString;
      });
      if (rowIndex === undefined) {
        return;
      }

      byRowIndex[rowIndex] = highlight;
    });
    return byRowIndex;
  }, [props.highlights, data]);

  const deleteSelectedRows = () => {
    if (gridSelection) {
      handleDelete(gridSelection);
    }
  };

  const copySelectedRows = () => {
    if (gridSelection?.rows) {
      const selected = data.filter((annotated: RelationshipDatumAndMetadata) =>
        gridSelection?.rows.hasIndex(annotated.dataRowIndex)
      );
      if (selected) {
        const data = selected
          .map((annotated: RelationshipDatumAndMetadata) => {
            if ('comment' in annotated.datum) {
              return `${CommentCellPrefix} ${annotated.datum.comment.trim()}`;
            }

            return toRelationshipString(annotated) || '';
          })
          .join('\n');

        navigator.clipboard.writeText(data);
      }
    }
  };

  const convertSelectedRows = () => {
    if (gridSelection?.rows) {
      const updated = data.map((annotated: RelationshipDatumAndMetadata) => {
        if (!gridSelection?.rows.hasIndex(annotated.dataRowIndex)) {
          return annotated;
        }

        if ('comment' in annotated.datum) {
          const parsed = parseRelationshipWithError(
            annotated.datum.comment.substring(CommentCellPrefix.length).trim()
          );
          if ('errorMessage' in parsed) {
            return annotated;
          }

          const datum = relationshipToDatum(parsed);
          return {
            ...annotated,
            columnData: getColumnData(datum),
            datum: datum,
          };
        }

        const relString = toRelationshipString(annotated) ?? '';
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
    if (props.isReadOnly) {
      return;
    }

    // NOTE: the input check is to ensure that hitting `/` inside an editor does not convert
    // the cell into a comment.
    const nodeName =
      'nodeName' in e.target
        ? (e.target as HTMLElement).nodeName.toLowerCase()
        : undefined;
    if (e.key === '/' && gridSelection?.current?.cell && nodeName !== 'input') {
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
      if (args.kind !== 'cell') {
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
    [highlightsByRowIndex, setTooltip]
  );

  const width = props.dimensions?.width ?? 1200;
  const height = props.dimensions?.height ?? 300;
  const toolbarHeight = 50;
  const hasCheckedRows =
    gridSelection?.rows !== undefined && gridSelection.rows.length > 0;
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

  const [cookies, setCookies] = useCookies(['relgrid-similar-highlighting']);
  const [similarHighlighting, setSimilarHighlighting] = useState(
    cookies['relgrid-similar-highlighting'] !== '0'
  );
  const handleToggleSimilarHighlighting = () => {
    const updated = !similarHighlighting;
    setSimilarHighlighting(updated);
    setCookies('relgrid-similar-highlighting', updated ? '1' : '0');
  };

  const [overriddenColumnWidths, setOverriddenColumnWidths] = useState<
    Record<string, number>
  >({});

  const columnsWithWidths = useMemo(() => {
    const defaultColWidth = Math.max(
      width / (COLUMNS.length + 0.5),
      MIN_COLUMN_WIDTH
    ); // +0.5 to give some padding
    return COLUMNS.map((col: Column) => {
      return {
        ...col,
        width:
          col.id! in overriddenColumnWidths
            ? overriddenColumnWidths[col.id!]
            : defaultColWidth,
        trailingRowOptions: props.isReadOnly
          ? undefined
          : col.trailingRowOptions,
      };
    });
  }, [width, overriddenColumnWidths, props.isReadOnly]);

  const handleColumnResize = (col: GridColumn, newSize: number) => {
    if (newSize < MIN_COLUMN_WIDTH) {
      return;
    }

    setOverriddenColumnWidths({
      ...overriddenColumnWidths,
      [col.id!]: newSize,
    });
  };

  const { drawCell, provideEditor } = useCustomCells(
    relationshipsService,
    data,
    gridSelection,
    props.resolver,
    similarHighlighting,
    columnsWithWidths,
    props.isReadOnly
  );

  // TODO: get JSX out of state.
  const [snackbarMessage, setSnackbarMessage] = useState<
    ReactNode | undefined
  >(undefined);

  return (
    <div className={classes.root} onKeyDown={handleKeyDown}>
      <ThemeProvider theme={dataEditorTheme}>
        <div style={{ position: 'relative' }}>
          <Snackbar
            open={!!snackbarMessage}
            onClose={() => setSnackbarMessage(undefined)}
          >
            <Alert
              onClose={() => setSnackbarMessage(undefined)}
              severity="info"
              variant="filled"
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </div>
        <div className={classes.toolbar} style={{ height: toolbarHeight }}>
          {!props.isReadOnly && (
            <Checkbox
              className={classes.toolbarCheckbox}
              checked={allRowsChecked}
              onClick={toggleCheckedRows}
              disabled={data.length === 0}
            />
          )}
          {props.isReadOnly && <span />}
          {hasCheckedRows && !props.isReadOnly && (
            <span>
              <Tooltip title="Delete Rows">
                <IconButton onClick={deleteSelectedRows}>
                  <Delete />
                </IconButton>
              </Tooltip>
              <Tooltip title="Copy Rows to Clipboard">
                <IconButton onClick={copySelectedRows}>
                  <Assignment />
                </IconButton>
              </Tooltip>
              <Tooltip title="Convert to/from comments">
                <IconButton onClick={convertSelectedRows}>
                  <Comment />
                </IconButton>
              </Tooltip>
            </span>
          )}
          {(!hasCheckedRows || props.isReadOnly) && <span />}
          <span />
          <FormControlLabel
            control={
              <Checkbox
                checked={similarHighlighting}
                onClick={handleToggleSimilarHighlighting}
              />
            }
            label="Highlight same types, objects and relations"
          />
        </div>
        <DataEditor
          keybindings={{ search: true }}
          getCellContent={getCellData}
          width={width}
          height={height - toolbarHeight}
          columns={columnsWithWidths}
          rows={data.length}
          onPaste={handlePaste}
          drawCell={drawCell}
          provideEditor={provideEditor}
          getCellsForSelection={getCellsForSelection}
          onCellEdited={props.isReadOnly ? undefined : handleCellEdited}
          onRowAppended={props.isReadOnly ? undefined : handleRowAppended}
          onDelete={props.isReadOnly ? undefined : handleDelete}
          onRowMoved={props.isReadOnly ? undefined : handleRowMoved}
          onItemHovered={handleItemHovered}
          isDraggable={false}
          trailingRowOptions={{ tint: !props.isReadOnly }}
          rowMarkers={props.isReadOnly ? 'number' : 'both'}
          rowSelectionMode={props.isReadOnly ? undefined : 'multi'}
          gridSelection={gridSelection}
          highlightRegions={highlightRegions}
          onGridSelectionChange={handleGridSelectionChanged}
          onColumnResized={handleColumnResize}
        />
      </ThemeProvider>
      {tooltip !== undefined && (
        <div
          className={classes.tooltip}
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
