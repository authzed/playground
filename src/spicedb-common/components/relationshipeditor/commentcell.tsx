import { CustomCell } from "@glideapps/glide-data-grid";
import TextField from "@material-ui/core/TextField";
import React, { MutableRefObject, useEffect, useRef } from "react";
import { Column, CommentCellPrefix } from "./columns";
import { FieldCellRendererProps } from "./fieldcell";

export const COMMENT_CELL_KIND = "comment-cell";

interface CommentCellProps {
  readonly kind: "comment-cell";
  readonly dataValue: string;
  readonly row: number;
  readonly col: number;
}

/**
 * CommentCell is a cell for viewing and editing comments.
 */
export type CommentCell = CustomCell<CommentCellProps>;

export function copyDataForCommentCell(dataValue: string): string {
  if (!dataValue.startsWith(CommentCellPrefix)) {
    dataValue = `${CommentCellPrefix} ${dataValue.trim()}`;
  }

  return dataValue;
}

const CommentCellEditor = (props: {
  columnsWithWidths: Column[];
  onChange: (newValue: CommentCell) => void;
  value: CommentCell;
  initialValue: string | undefined;
}) => {
  // From: https://github.com/mui/material-ui/issues/12779
  // Ensures that the autofocus jumps to the end of the input's value.
  const handleFocus = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const lengthOfInput = event.target.value.length;
    return event.target.setSelectionRange(lengthOfInput, lengthOfInput);
  };

  let adjustedInitialValue = props.initialValue;
  if (
    adjustedInitialValue &&
    !adjustedInitialValue.startsWith(CommentCellPrefix)
  ) {
    adjustedInitialValue = `${CommentCellPrefix} ${adjustedInitialValue}`;
  }

  const defaultValue = adjustedInitialValue || props.value.data.dataValue || "";
  const width = props.columnsWithWidths
    .slice(props.value.data.col)
    .map((col: Column) => col.width)
    .reduce((n, m) => n + m);
  const fieldRef = useRef<HTMLDivElement | null>(null);

  // NOTE: This is necessary to ensure that the container for the comment editor can span
  // the entire width of the comment cell span. The data grid by default sets a max width
  // of ~400px on the parent element, which was cutting off the editor.
  useEffect(() => {
    if (fieldRef.current) {
      if (fieldRef.current.parentElement?.parentElement) {
        fieldRef.current.parentElement.parentElement.style.maxWidth = "none";
      }
    }
  }, []);

  return (
    <TextField
      ref={fieldRef}
      autoFocus={true}
      defaultValue={defaultValue}
      onFocus={handleFocus}
      fullWidth
      style={{ width: width }}
      onChange={(e) => {
        props.onChange({
          ...props.value,
          copyData: copyDataForCommentCell(e.target.value),
          data: {
            ...props.value.data,
            dataValue: e.target.value,
          },
        });
      }}
    />
  );
};

export const CommentCellRenderer = (
  props: MutableRefObject<FieldCellRendererProps>,
) => {
  return {
    isMatch: (cell: CustomCell): cell is CommentCell =>
      cell.data.kind === COMMENT_CELL_KIND,
    draw: (args, cell) => {
      const { ctx, rect } = args;
      const { dataValue } = cell.data;
      ctx.save();
      ctx.fillStyle = args.theme.bgHeader;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.fillStyle = "#608b4e";
      ctx.font = "10pt Courier";
      ctx.fillText(
        dataValue,
        rect.x + 10,
        rect.y + rect.height / 2 + 1,
        rect.width,
      );
      ctx.restore();
      return true;
    },
    provideEditor: () => (p) => {
      const { onChange, value, initialValue } = p;
      return (
        <CommentCellEditor
          onChange={onChange}
          value={value}
          initialValue={initialValue}
          columnsWithWidths={props.current.columnsWithWidths}
        />
      );
    },
  };
};
