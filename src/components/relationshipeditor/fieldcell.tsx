import { ResolvedDefinition, Resolver } from "@authzed/spicedb-parser-js";
import {
  CustomCell,
  GridCellKind,
  DrawCellCallback,
  GridSelection,
} from "@glideapps/glide-data-grid";
import { RefObject, useEffect, useRef, useState } from "react";
import stc from "string-to-color";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { RelationshipsService } from "@/spicedb-common/services/relationshipsservice";

import { COLUMNS, Column, DataKind, DataTitle, RelationshipSection } from "./columns";
import { AnnotatedData } from "./data";
import { resolveGridCellTarget } from "./jump-targets";

export const TYPE_CELL_KIND = "type-field-cell";
export const OBJECTID_CELL_KIND = "objectid-field-cell";
export const RELATION_CELL_KIND = "relation-field-cell";
export const CAVEATNAME_CELL_KIND = "caveatname-field-cell";
export const CAVEATCONTEXT_CELL_KIND = "caveatcontext-field-cell";
export const EXPIRATION_CELL_KIND = "expiration-field-cell";

interface FieldCellProps {
  readonly kind: string;
  readonly dataValue: string;
  readonly row: number;
  readonly col: number;
  readonly readonly: boolean;
}

type TypeCellProps = FieldCellProps & {
  readonly kind: "type-field-cell";
  readonly readonly: false;
};

type ObjectIdCellProps = FieldCellProps & {
  readonly kind: "objectid-field-cell";
  readonly readonly: false;
};

type RelationCellProps = FieldCellProps & {
  readonly kind: "relation-field-cell";
  readonly readonly: false;
};

type CaveatNameCellProps = FieldCellProps & {
  readonly kind: "caveatname-field-cell";
  readonly readonly: false;
};

type CaveatContextCellProps = FieldCellProps & {
  readonly kind: "caveatcontext-field-cell";
  readonly readonly: false;
};

type ExpirationCellProps = FieldCellProps & {
  readonly kind: "expiration-field-cell";
  readonly readonly: false;
};

export type TypeCell = CustomCell<TypeCellProps>;
export type ObjectIdCell = CustomCell<ObjectIdCellProps>;
export type RelationCell = CustomCell<RelationCellProps>;
export type CaveatNameCell = CustomCell<CaveatNameCellProps>;
export type CaveatContextCell = CustomCell<CaveatContextCellProps>;
export type ExpirationCell = CustomCell<ExpirationCellProps>;

export type AnyCell = TypeCell | ObjectIdCell | RelationCell | CaveatNameCell | CaveatContextCell;

type SelectedType = {
  type: string;
};

type SelectedObject = SelectedType & { objectid: string };

type SelectedRelation = SelectedObject & { relation: string };

type SelectedCaveatName = SelectedRelation & { caveatname: string };

type SelectedCaveatContext = { caveatcontext: string };

type SelectedExpiration = { expiration: string };

export interface FieldCellRendererProps {
  relationshipsService: RelationshipsService;
  annotatedData: AnnotatedData;
  gridSelection: GridSelection | undefined;
  resolver: Resolver | undefined;
  selected: {
    selectedType: SelectedType | undefined;
    selectedObject: SelectedObject | undefined;
    selectedRelation: SelectedRelation | undefined;
    selectedCaveatName: SelectedCaveatName | undefined;
    selectedCaveatContext: SelectedCaveatContext | undefined;
    selectedExpiration: SelectedExpiration | undefined;
  };
  similarHighlighting: boolean;
  columnsWithWidths: Column[];
  modifierHeld: boolean;
}

type GetAutocompleteOptions<Q extends FieldCellProps> = (
  props: FieldCellRendererProps | null,
  cellProps: Q,
) => string[];

function fieldCellRenderer<T extends CustomCell<Q>, Q extends FieldCellProps>(
  kind: string,
  getAutocompleteOptions: GetAutocompleteOptions<Q>,
) {
  return (propsRefs: RefObject<FieldCellRendererProps>) => {
    return {
      // TODO: see if there's a way to do this without the as
      isMatch: (cell: CustomCell): cell is T => (cell as T).data.kind === kind,
      kind: GridCellKind.Custom,
      draw: (args: Parameters<DrawCellCallback>[0], cell: CustomCell<Q>) => {
        const { ctx, rect, row, col, theme, highlighted } = args;
        let { dataValue } = cell.data;
        // Truncate text
        const textMetrics = ctx.measureText(dataValue);
        if (textMetrics.width / rect.width > 1) {
          dataValue = dataValue
            .substring(0, dataValue.length * (rect.width / textMetrics.width) - 4)
            .concat("...");
        }

        const zeroIndexedCol = col - 1; // +1 for the checkbox column.

        const dataKind: DataKind = COLUMNS[zeroIndexedCol].dataKind;
        if (dataValue === "" && DataTitle[dataKind]) {
          ctx.save();
          ctx.fillStyle = "gray";
          ctx.font = "12px Roboto Mono, Monospace";
          ctx.fillText(
            `(${DataTitle[dataKind]})`,
            rect.x + 10,
            rect.y + rect.height / 2 + 1,
            rect.width,
          );
          ctx.restore();
          return true;
        }

        const props = propsRefs.current;

        // While a modifier key is held, the cell under the cursor that resolves
        // to a schema location gets an underline. `args.hoverX` is defined only
        // for the cell currently under the pointer — glide re-invokes draw for
        // a cell whenever its hover state changes, so no separate hover state
        // is needed.
        const shouldUnderlineJump =
          args.hoverX !== undefined &&
          props?.modifierHeld === true &&
          props.resolver !== undefined &&
          resolveGridCellTarget(
            props.resolver,
            dataKind,
            props.annotatedData[row].columnData,
            zeroIndexedCol,
          ) !== undefined;

        const selectedType: SelectedType | undefined =
          props?.selected.selectedType ||
          props?.selected.selectedObject ||
          props?.selected.selectedRelation;
        const selectedObject: SelectedObject | undefined =
          props?.selected.selectedObject || props?.selected.selectedRelation;
        const selectedRelation: SelectedRelation | undefined = props?.selected.selectedRelation;
        const selectedCaveatName: SelectedCaveatName | undefined =
          props?.selected.selectedCaveatName;

        let similarColor: string | undefined = undefined;
        if (props?.similarHighlighting) {
          switch (dataKind) {
            case DataKind.RESOURCE_TYPE:
            case DataKind.SUBJECT_TYPE:
              if (
                dataValue &&
                selectedType !== undefined &&
                selectedType.type &&
                dataValue === selectedType.type
              ) {
                similarColor = props.relationshipsService.getTypeColor(selectedType.type);
              }
              break;

            case DataKind.RESOURCE_ID:
            case DataKind.SUBJECT_ID:
              if (
                dataValue &&
                selectedObject !== undefined &&
                selectedObject.objectid &&
                dataValue === selectedObject.objectid &&
                props.annotatedData[row].columnData[zeroIndexedCol - 1] === selectedObject.type
              ) {
                similarColor = props.relationshipsService.getObjectColor(
                  selectedObject.type,
                  selectedObject.objectid,
                );
              }
              break;

            case DataKind.RELATION:
            case DataKind.SUBJECT_RELATION:
              if (
                dataValue &&
                selectedRelation !== undefined &&
                selectedRelation.relation &&
                dataValue === selectedRelation.relation &&
                props.annotatedData[row].columnData[zeroIndexedCol - 2] === selectedRelation.type &&
                props.annotatedData[row].columnData[zeroIndexedCol - 1] ===
                  selectedRelation.objectid
              ) {
                similarColor = stc(
                  `${selectedRelation.type}:${selectedRelation.objectid}#${selectedRelation.relation}`,
                );
              }
              break;
            case DataKind.CAVEAT_NAME:
              if (
                dataValue &&
                selectedCaveatName !== undefined &&
                selectedCaveatName.caveatname &&
                dataValue === selectedCaveatName.caveatname
              ) {
                similarColor = stc(dataValue);
              }
              break;
            case DataKind.CAVEAT_CONTEXT:
              // No highlighting for context values
              break;
            case DataKind.EXPIRATION:
              // No highlighting for expiration
              break;
          }
        }

        if (similarColor && !highlighted) {
          ctx.strokeStyle = similarColor;
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 5]);

          const previousAlpha = ctx.globalAlpha;
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = similarColor;
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          ctx.globalAlpha = previousAlpha;
          ctx.strokeRect(rect.x + 2, rect.y + 2, rect.width - 3, rect.height - 3);
        }

        if (highlighted) {
          ctx.fillStyle = theme.bgHeaderHasFocus;
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }

        ctx.save();
        ctx.fillStyle = theme.textDark;
        ctx.font = "12px Roboto Mono, Monospace";
        ctx.fillText(dataValue, rect.x + 10, rect.y + rect.height / 2 + 1, rect.width - 20);

        if (shouldUnderlineJump) {
          const underlineWidth = Math.min(ctx.measureText(dataValue).width, rect.width - 20);
          const underlineY = rect.y + rect.height / 2 + 7;
          ctx.strokeStyle = theme.textDark;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rect.x + 10, underlineY);
          ctx.lineTo(rect.x + 10 + underlineWidth, underlineY);
          ctx.stroke();
        }

        ctx.restore();
        return true;
      },
      provideEditor: () => (p: FieldCellEditorProps<T, Q>) => {
        const { onChange, value, initialValue, onFinishedEditing } = p;
        return (
          <FieldCellEditor<T, Q>
            fieldPropsRef={propsRefs}
            onChange={onChange}
            value={value}
            initialValue={initialValue}
            onFinishedEditing={onFinishedEditing}
            getAutocompleteOptions={getAutocompleteOptions}
            kind={kind}
          />
        );
      },
    };
  };
}

type FieldCellEditorProps<T extends CustomCell<Q>, Q extends FieldCellProps> = {
  fieldPropsRef: RefObject<FieldCellRendererProps>;
  onChange: (newValue: T) => void;
  value: T;
  initialValue: string | undefined;
  onFinishedEditing: (newValue?: T) => void;
  getAutocompleteOptions: GetAutocompleteOptions<Q>;
  kind: string;
};

const FieldCellEditor = <T extends CustomCell<Q>, Q extends FieldCellProps>(
  props: FieldCellEditorProps<T, Q>,
) => {
  const edited = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [open, setOpen] = useState(true);

  // NOTE: In order to handle the initialValue correctly, we have to include it as
  // the default for the field, but *only* if the user hasn't manually edited the
  // contents. Failing to do the `edited.current` check results in the initial value
  // always appearing for an otherwise empty value, preventing users from deleting
  // the contents completely.
  // We could probably work around this by setting a defaultValue, but that has odd
  // interactions with autocomplete, so we use this approach instead.
  const editableValue = edited.current
    ? props.value.data.dataValue
    : props.value.data.dataValue || props.initialValue;

  // Auto-focus on mount so the editor behaves like a typical grid cell editor.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Mark that a user edit has occurred.
    edited.current = true;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      const newValue = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
      props.onFinishedEditing({
        ...props.value,
        copyData: newValue,
        data: {
          ...props.value.data,
          dataValue: newValue,
        },
      });
    }
  };

  const handleInputChange = (newValue: string) => {
    props.onChange({
      ...props.value,
      copyData: newValue,
      data: {
        ...props.value.data,
        dataValue: newValue,
      },
    });
  };

  const handleSelect = (selected: string) => {
    props.onFinishedEditing({
      ...props.value,
      copyData: selected,
      data: {
        ...props.value.data,
        dataValue: selected,
      },
    });
  };

  const autocompleteOptions: string[] = props.getAutocompleteOptions(
    props.fieldPropsRef.current,
    props.value.data,
  );

  const isMultiline = props.kind === CAVEATCONTEXT_CELL_KIND;
  const inputValue = editableValue ?? "";
  const inputClass =
    "w-full bg-transparent px-3 py-2 text-sm outline-none border border-input rounded-md font-mono";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div style={{ width: "150px", zIndex: 9999999999 }}>
          {isMultiline ? (
            <textarea
              ref={(el) => {
                inputRef.current = el;
              }}
              value={inputValue}
              className={inputClass}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setOpen(true)}
            />
          ) : (
            <input
              ref={(el) => {
                inputRef.current = el;
              }}
              value={inputValue}
              className={inputClass}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setOpen(true)}
            />
          )}
        </div>
      </PopoverAnchor>
      {autocompleteOptions.length > 0 && (
        <PopoverContent
          // NOTE: the special className of `click-outside-ignore` is necessary to prevent
          // clicking the autocomplete from closing the editor.
          // See: https://github.com/glideapps/glide-data-grid/blob/main/packages/core/src/click-outside-container/click-outside-container.tsx#L23
          className="click-outside-ignore w-[250px] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ zIndex: 9999999999 }}
        >
          <Command shouldFilter={true}>
            <CommandList>
              <CommandEmpty>No matches</CommandEmpty>
              <CommandGroup>
                {autocompleteOptions.map((option) => (
                  <CommandItem key={option} value={option} onSelect={() => handleSelect(option)}>
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
};

export const TypeCellRenderer = fieldCellRenderer<TypeCell, TypeCellProps>(
  TYPE_CELL_KIND,
  (props: FieldCellRendererProps | null, cellProps: TypeCellProps) => {
    if (props?.resolver === undefined) {
      return [];
    }

    if (COLUMNS[cellProps.col].section === RelationshipSection.RESOURCE) {
      // Resource type. Only include types with at least one relation defined.
      return props.resolver
        .listDefinitions()
        .filter((def: ResolvedDefinition) => def.listRelationNames().length > 0)
        .map((def: ResolvedDefinition) => def.definition.name)
        .sort();
    }

    // Subject type.
    return props.resolver
      .listDefinitions()
      .map((def: ResolvedDefinition) => def.definition.name)
      .sort();
  },
);

export const ObjectIdCellRenderer = fieldCellRenderer<ObjectIdCell, ObjectIdCellProps>(
  OBJECTID_CELL_KIND,
  (props: FieldCellRendererProps | null, cellProps: ObjectIdCellProps) => {
    if (props?.resolver === undefined) {
      return [];
    }

    const resolvedDefinition = props.resolver.lookupDefinition(
      props.annotatedData[cellProps.row].columnData[cellProps.col - 1],
    );
    if (resolvedDefinition === undefined) {
      return [];
    }

    return (
      props.relationshipsService.getObjectIds(resolvedDefinition.definition.name)?.sort() ?? []
    );
  },
);

export const RelationCellRenderer = fieldCellRenderer<RelationCell, RelationCellProps>(
  RELATION_CELL_KIND,
  (props: FieldCellRendererProps | null, cellProps: RelationCellProps) => {
    if (props?.resolver === undefined) {
      return [];
    }

    const resolvedDefinition = props.resolver.lookupDefinition(
      props.annotatedData[cellProps.row].columnData[cellProps.col - 2],
    );
    if (resolvedDefinition === undefined) {
      return [];
    }

    if (COLUMNS[cellProps.col].section === RelationshipSection.RESOURCE) {
      return resolvedDefinition.listRelationNames().sort();
    }

    return resolvedDefinition.listRelationsAndPermissionNames().sort();
  },
);

export const CaveatNameCellRenderer = fieldCellRenderer<CaveatNameCell, CaveatNameCellProps>(
  CAVEATNAME_CELL_KIND,
  (props: FieldCellRendererProps | null) => {
    if (props?.resolver === undefined) {
      return [];
    }

    const { selectedCaveatName } = props.selected;
    if (selectedCaveatName?.type === undefined) {
      return [];
    }

    const def = props.resolver.lookupDefinition(selectedCaveatName.type);
    return def ? def.listWithCaveatNames().sort() : [];
  },
);

export const CaveatContextCellRenderer = fieldCellRenderer<
  CaveatContextCell,
  CaveatContextCellProps
>(CAVEATCONTEXT_CELL_KIND, () => {
  // No autocomplete support
  return [];
});

export const ExpirationCellRenderer = fieldCellRenderer<ExpirationCell, ExpirationCellProps>(
  EXPIRATION_CELL_KIND,
  () => {
    // No autocomplete support
    return [];
  },
);
