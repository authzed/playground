import {
  type DataEditorProps,
  type GridCell,
  GridCellKind,
  type GridSelection,
  type ProvideEditorCallback,
  type CustomCell
} from "@glideapps/glide-data-grid";
import { useCallback, useMemo, useRef } from "react";
import { Resolver } from "../../parsers/dsl/resolution";
import { RelationshipsService } from "../../services/relationshipsservice";
import { COLUMNS, Column, DataKind } from "./columns";
import { CommentCell, CommentCellRenderer } from "./commentcell";
import { AnnotatedData } from "./data";
import {
  CaveatContextCell,
  CaveatContextCellRenderer,
  CaveatNameCell,
  CaveatNameCellRenderer,
  ExpirationCell,
  ExpirationCellRenderer,
  ObjectIdCell,
  ObjectIdCellRenderer,
  RelationCell,
  RelationCellRenderer,
  TypeCell,
  TypeCellRenderer,
} from "./fieldcell";

/**
 * RelEditorCustomCell defines the custom cell types supported by the editor.
 */
export type RelEditorCustomCell =
  | CommentCell
  | TypeCell
  | ObjectIdCell
  | RelationCell
  | CaveatNameCell
  | CaveatContextCell
  | ExpirationCell;

// Copied from: https://github.com/glideapps/glide-data-grid/blob/6b0a04f9d6550378890580b4db1e1168e4268c54/packages/cells/src/index.ts#L12
export type DrawCallback = NonNullable<DataEditorProps["drawCell"]>;

/**
 * useCustomCells is a hook which provides drawCell and provideEditor callbacks for
 * handling all custom cell types in the relationship editor.
 */
export function useCustomCells(
  relationshipsService: RelationshipsService,
  annotatedData: AnnotatedData,
  gridSelection: GridSelection | undefined,
  resolver: Resolver | undefined,
  similarHighlighting: boolean,
  columnsWithWidths: Column[],
  isReadOnly: boolean,
): {
  drawCell: DrawCallback;
  provideEditor: ProvideEditorCallback<GridCell>;
} {
  const selectedType = useMemo(() => {
    if (!gridSelection?.current?.cell) {
      return undefined;
    }

    const [col, row] = gridSelection.current.cell;
    if (row >= annotatedData.length) {
      return undefined;
    }

    if (col >= COLUMNS.length) {
      return undefined;
    }

    const dataKind = COLUMNS[col].dataKind;
    if (
      dataKind !== DataKind.RESOURCE_TYPE &&
      dataKind !== DataKind.SUBJECT_TYPE
    ) {
      return undefined;
    }

    return { type: annotatedData[row].columnData[col] };
  }, [gridSelection, annotatedData]);

  const selectedObject = useMemo(() => {
    if (!gridSelection?.current?.cell) {
      return undefined;
    }

    const [col, row] = gridSelection.current.cell;
    if (row >= annotatedData.length) {
      return undefined;
    }

    if (col >= COLUMNS.length) {
      return undefined;
    }

    const dataKind = COLUMNS[col].dataKind;
    if (dataKind !== DataKind.RESOURCE_ID && dataKind !== DataKind.SUBJECT_ID) {
      return undefined;
    }

    return {
      type: annotatedData[row].columnData[col - 1],
      objectid: annotatedData[row].columnData[col],
    };
  }, [gridSelection, annotatedData]);

  const selectedRelation = useMemo(() => {
    if (!gridSelection?.current?.cell) {
      return undefined;
    }

    const [col, row] = gridSelection.current.cell;
    if (row >= annotatedData.length) {
      return undefined;
    }

    if (col >= COLUMNS.length) {
      return undefined;
    }

    const dataKind = COLUMNS[col].dataKind;
    if (dataKind !== DataKind.RELATION) {
      return undefined;
    }

    return {
      type: annotatedData[row].columnData[col - 2],
      objectid: annotatedData[row].columnData[col - 1],
      relation: annotatedData[row].columnData[col],
    };
  }, [gridSelection, annotatedData]);

  const selectedCaveatName = useMemo(() => {
    if (!gridSelection?.current?.cell) {
      return undefined;
    }

    const [col, row] = gridSelection.current.cell;
    if (row >= annotatedData.length) {
      return undefined;
    }

    if (col >= COLUMNS.length) {
      return undefined;
    }

    const dataKind = COLUMNS[col].dataKind;
    if (dataKind !== DataKind.CAVEAT_NAME) {
      return undefined;
    }

    return {
      type: annotatedData[row].columnData[col - 6],
      objectid: annotatedData[row].columnData[col - 5],
      relation: annotatedData[row].columnData[col - 4],
      caveatname: annotatedData[row].columnData[col],
    };
  }, [gridSelection, annotatedData]);

  const selectedCaveatContext = useMemo(() => {
    if (!gridSelection?.current?.cell) {
      return undefined;
    }

    const [col, row] = gridSelection.current.cell;
    if (row >= annotatedData.length) {
      return undefined;
    }

    if (col >= COLUMNS.length) {
      return undefined;
    }

    const dataKind = COLUMNS[col].dataKind;
    if (dataKind !== DataKind.CAVEAT_CONTEXT) {
      return undefined;
    }

    return { caveatcontext: annotatedData[row].columnData[col] };
  }, [gridSelection, annotatedData]);

  const selectedExpiration = useMemo(() => {
    if (!gridSelection?.current?.cell) {
      return undefined;
    }

    const [col, row] = gridSelection.current.cell;
    if (row >= annotatedData.length) {
      return undefined;
    }

    if (col >= COLUMNS.length) {
      return undefined;
    }

    const dataKind = COLUMNS[col].dataKind;
    if (dataKind !== DataKind.EXPIRATION) {
      return undefined;
    }

    return { expiration: annotatedData[row].columnData[col] };
  }, [gridSelection, annotatedData]);

  const props = useRef({
    relationshipsService: relationshipsService,
    annotatedData: annotatedData,
    gridSelection: gridSelection,
    resolver: resolver,
    selected: {
      selectedType: selectedType,
      selectedObject: selectedObject,
      selectedRelation: selectedRelation,
      selectedCaveatName: selectedCaveatName,
      selectedCaveatContext: selectedCaveatContext,
      selectedExpiration: selectedExpiration,
    },
    similarHighlighting: similarHighlighting,
    columnsWithWidths: columnsWithWidths,
  });

  // NOTE: we always set the current value on the props to ensure that the renderers
  // have the most up-to-date version of this information.
  props.current = {
    relationshipsService: relationshipsService,
    annotatedData: annotatedData,
    gridSelection: gridSelection,
    resolver: resolver,
    selected: {
      selectedType: selectedType,
      selectedObject: selectedObject,
      selectedRelation: selectedRelation,
      selectedCaveatName: selectedCaveatName,
      selectedCaveatContext: selectedCaveatContext,
      selectedExpiration: selectedExpiration,
    },
    similarHighlighting: similarHighlighting,
    columnsWithWidths: columnsWithWidths,
  };

  // renderers defines the custom cell types supported by the RelationshipEditor.
  const renderers = useMemo(() => {
    return [
      CommentCellRenderer(props),
      TypeCellRenderer(props),
      ObjectIdCellRenderer(props),
      RelationCellRenderer(props),
      CaveatNameCellRenderer(props),
      CaveatContextCellRenderer(props),
      ExpirationCellRenderer(props),
    ];
  }, []);

  // TODO: come up with a way to express this that doesn't require looping.
  const drawCell = useCallback<DrawCallback>(
    (args) => {
      const { cell } = args;
      if (cell.kind !== GridCellKind.Custom) return false;
      for (const r of renderers) {
        if (r.isMatch(cell)) {
          // @ts-expect-error typescript can't see that we're looping over something static
          return r.draw(args, cell);
        }
      }
      return false;
    },
    [renderers],
  );

  const provideEditor = useCallback<ProvideEditorCallback<GridCell>>(
    // @ts-expect-error typescript can't see that we're looping over something static.
    (cell) => {
      if (cell.kind !== GridCellKind.Custom || isReadOnly) return undefined;

      for (const r of renderers) {
        if (r.isMatch(cell)) {
          return r.provideEditor();
        }
      }

      return undefined;
    },
    [renderers, isReadOnly],
  );

  return { drawCell, provideEditor };
}
