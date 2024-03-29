import { SizedGridColumn } from "@glideapps/glide-data-grid";
import {
  CAVEAT_NAME_EXPR,
  NAMESPACE_REGEX,
  RELATION_REGEX,
  RESOURCE_ID_REGEX,
  SUBJECT_ID_REGEX,
} from "../../parsing";

/**
 * DataKind defines the different kinds of data that can be found in columns.
 */
export enum DataKind {
  NONE = 0,
  RESOURCE_TYPE = 1,
  RESOURCE_ID = 2,
  RELATION = 3,
  SUBJECT_TYPE = 4,
  SUBJECT_ID = 5,
  SUBJECT_RELATION = 6,
  CAVEAT_NAME = 7,
  CAVEAT_CONTEXT = 8,
}

export type DataValidator = RegExp | ((input: string) => boolean);

export function validate(
  validator: DataValidator,
  dataValue: string | undefined
): boolean {
  const isValid =
    typeof validator === "function"
      ? validator(dataValue ?? "")
      : validator instanceof RegExp
      ? validator.test(dataValue ?? "")
      : false;
  return isValid;
}

/**
 * DataRegex defines the regular expressions for validating the various data types.
 */
export const DataRegex: Record<DataKind, DataValidator> = {
  [DataKind.NONE]: /.+/,
  [DataKind.RESOURCE_TYPE]: NAMESPACE_REGEX,
  [DataKind.RESOURCE_ID]: RESOURCE_ID_REGEX,
  [DataKind.RELATION]: RELATION_REGEX,
  [DataKind.SUBJECT_TYPE]: NAMESPACE_REGEX,
  [DataKind.SUBJECT_ID]: SUBJECT_ID_REGEX,
  [DataKind.SUBJECT_RELATION]: RELATION_REGEX,
  [DataKind.CAVEAT_NAME]: new RegExp(`^${CAVEAT_NAME_EXPR}$`),
  [DataKind.CAVEAT_CONTEXT]: (input: string) => {
    try {
      const result = JSON.parse(input);
      return typeof result === "object" && Object.keys(result).length > 0;
    } catch {
      return false;
    }
  },
};

export const DataTitle: Record<DataKind, string> = {
  [DataKind.NONE]: "",
  [DataKind.RESOURCE_TYPE]: "resource type",
  [DataKind.RESOURCE_ID]: "resource id",
  [DataKind.RELATION]: "relation",
  [DataKind.SUBJECT_TYPE]: "subject type",
  [DataKind.SUBJECT_ID]: "subject id",
  [DataKind.SUBJECT_RELATION]: "",
  [DataKind.CAVEAT_NAME]: "",
  [DataKind.CAVEAT_CONTEXT]: "",
};

export enum RelationshipSection {
  NONE = 0,
  RESOURCE = 1,
  SUBJECT = 2,
  CAVEAT = 3,
}

export type Column = SizedGridColumn & {
  dataKind: DataKind;
  section: RelationshipSection;
  dataDescription: string;
};

// CommentCellPrefix is the prefix expected on all data in comment cells.
export const CommentCellPrefix = "//";

export const DEFAULT_COLUMN_WIDTH = 200;
export const MIN_COLUMN_WIDTH = 100;

export const COLUMNS: Column[] = [
  {
    title: "Type",
    id: "type",
    width: DEFAULT_COLUMN_WIDTH,
    group: "Resource",
    dataKind: DataKind.RESOURCE_TYPE,
    section: RelationshipSection.RESOURCE,
    dataDescription: "definition name",
  },
  {
    title: "ID",
    id: "id",
    width: DEFAULT_COLUMN_WIDTH,
    group: "Resource",
    dataKind: DataKind.RESOURCE_ID,
    section: RelationshipSection.RESOURCE,
    trailingRowOptions: {
      hint: "Add relationship",
      targetColumn: 0,
    },
    dataDescription: "object ID",
  },
  {
    title: "Relation",
    id: "relation",
    width: DEFAULT_COLUMN_WIDTH,
    group: "Resource",
    dataKind: DataKind.RELATION,
    section: RelationshipSection.RESOURCE,
    dataDescription: "relation",
  },
  {
    title: "Type",
    id: "subject-type",
    width: DEFAULT_COLUMN_WIDTH,
    group: "Subject",
    dataKind: DataKind.SUBJECT_TYPE,
    section: RelationshipSection.SUBJECT,
    dataDescription: "definition name",
  },
  {
    title: "ID",
    id: "subject-id",
    width: DEFAULT_COLUMN_WIDTH,
    group: "Subject",
    dataKind: DataKind.SUBJECT_ID,
    section: RelationshipSection.SUBJECT,
    dataDescription: "object id",
  },
  {
    title: "Subject Relation (optional)",
    id: "subject-relation",
    width: MIN_COLUMN_WIDTH,
    group: "Subject",
    dataKind: DataKind.SUBJECT_RELATION,
    section: RelationshipSection.SUBJECT,
    dataDescription: "relation",
  },
  {
    title: "Name",
    id: "caveat-name",
    width: DEFAULT_COLUMN_WIDTH,
    group: "Caveat (optional)",
    dataKind: DataKind.CAVEAT_NAME,
    section: RelationshipSection.CAVEAT,
    dataDescription: "caveat name",
  },
  {
    title: "Context",
    id: "caveat-context",
    width: DEFAULT_COLUMN_WIDTH,
    group: "Caveat (optional)",
    dataKind: DataKind.CAVEAT_CONTEXT,
    section: RelationshipSection.CAVEAT,
    dataDescription: "JSON",
  },
];
