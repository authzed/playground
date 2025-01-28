import { RelationshipWithComments } from "../../parsing";
import { RelationTuple as Relationship } from "../../protodefs/core/v1/core";
import { Struct } from "../../protodefs/google/protobuf/struct";
import { COLUMNS } from "./columns";

/**
 * ColumnData holds raw column data for the grid.
 */
export type ColumnData = readonly string[];

/**
 * Comment represents a comment in the grid.
 */
export type Comment = {
  comment: string;
};

/**
 * PartialRelationship represents a (possibly partial) relationship.
 */
export type PartialRelationship = {
  resourceType: string;
  resourceId: string;
  relation: string;
  subjectType: string;
  subjectId: string;
  subjectRelation: string;
  caveatName: string;
  caveatContext: string;
  expiration: string;
};

/**
 * RelationshipDatum represents a single row in the grid.
 */
export type RelationshipDatum = PartialRelationship | Comment;

/**
 * RelationshipDatumAndMetadata is a type which holds both the datum, as well as the metadata for
 * the rel grid.
 */
export interface RelationshipDatumAndMetadata {
  /**
   * datum is the datum forming the row in the grid.
   */
  datum: RelationshipDatum;

  /**
   * dataRowIndex is the index of the datum in the array from which this
   * item was constructed.
   */
  dataRowIndex: number;

  /**
   * columnData holds the raw column data for the row.
   */
  columnData: ColumnData;
}

/**
 * AnnotatedData represents the data found in the grid, as an array of RelationshipDatumAndMetadata,
 * one per row.
 */
export type AnnotatedData = RelationshipDatumAndMetadata[];

/**
 * toExternalData converts the annotated data into a simple RelationshipDatum array.
 */
export function toExternalData(data: AnnotatedData): RelationshipDatum[] {
  return data.map((datum: RelationshipDatumAndMetadata) => datum.datum);
}

/**
 * fromExternalData converts a simple RelationshipDatum array into the annotated data.
 */
export function fromExternalData(
  externalData: RelationshipDatum[] | undefined
): AnnotatedData {
  return (externalData ?? []).map(datumToAnnotated);
}

/**
 * emptyAnnotatedDatum returns an empty annotated datum for the grid, at the given index.
 */
export function emptyAnnotatedDatum(
  index: number
): RelationshipDatumAndMetadata {
  return datumToAnnotated(
    {
      resourceType: "",
      resourceId: "",
      relation: "",
      subjectType: "",
      subjectId: "",
      subjectRelation: "",
      caveatName: "",
      caveatContext: "",
      expiration: "",
    },
    index
  );
}

/**
 * toRelationshipString converts the given annotated datum into a relationship string. If the
 * datum is a comment or not a full relationship, returns undefined.
 */
export function toRelationshipString(
  annotated: RelationshipDatumAndMetadata
): string | undefined {
  if ("comment" in annotated.datum) {
    return undefined;
  }

  return toFullRelationshipString(annotated.datum);
}

/**
 * toFullRelationshipString returns the full relationship found, or undefined if none.
 */
export function toFullRelationshipString(
  annotated: PartialRelationship
): string | undefined {
  if (
    !annotated.resourceType ||
    !annotated.resourceId ||
    !annotated.relation ||
    !annotated.subjectType ||
    !annotated.subjectId
  ) {
    return undefined;
  }
  return toPartialRelationshipString(annotated);
}

/**
 * toPartialRelationshipString returns a relationship string with the given relationship's data.
 */
export function toPartialRelationshipString(
  annotated: PartialRelationship
): string | undefined {
  const caveatContext = annotated.caveatContext
    ? `:${annotated.caveatContext}`
    : "";
  const caveat = annotated.caveatName
    ? `[${annotated.caveatName}${caveatContext}]`
    : "";
  const expiration = annotated.expiration
    ? `[expiration:${annotated.expiration}]`
    : "";
  return `${annotated.resourceType}:${annotated.resourceId}#${
    annotated.relation
  }@${annotated.subjectType}:${annotated.subjectId}${
    annotated.subjectRelation ? `#${annotated.subjectRelation}` : ""
  }${caveat}${expiration}`;
}

/**
 * datumToAnnotated returns an annotated datum with the given row index.
 */
export function datumToAnnotated(
  datum: RelationshipDatum,
  index: number
): RelationshipDatumAndMetadata {
  return {
    datum: datum,
    dataRowIndex: index,
    columnData: getColumnData(datum),
  };
}

/**
 * getColumnData returns the column data for a datum.
 */
export function getColumnData(datum: RelationshipDatum) {
  if ("comment" in datum) {
    return [datum.comment];
  }

  const colData = [
    datum.resourceType,
    datum.resourceId,
    datum.relation,
    datum.subjectType,
    datum.subjectId,
    datum.subjectRelation ?? "",
    datum.caveatName ?? "",
    datum.caveatContext ?? "",
    datum.expiration ?? "",
  ];

  return colData;
}

/**
 * relationshipToDatum converts a relationship into a datum row.
 */
export function relationshipToDatum(rel: Relationship): PartialRelationship {
  let subRel = rel.subject?.relation;
  if (subRel === "...") {
    subRel = "";
  }

  return {
    resourceType: rel.resourceAndRelation?.namespace ?? "",
    resourceId: rel.resourceAndRelation?.objectId ?? "",
    relation: rel.resourceAndRelation?.relation ?? "",
    subjectType: rel.subject?.namespace ?? "",
    subjectId: rel.subject?.objectId ?? "",
    subjectRelation: subRel ?? "",
    caveatName: rel.caveat?.caveatName ?? "",
    caveatContext: rel.caveat?.context
      ? Struct.toJsonString(rel.caveat?.context)
      : "",
    expiration: rel.optionalExpirationTime
      ? new Date(parseFloat(rel.optionalExpirationTime.seconds) * 1000)
          .toISOString()
          .replace(".000", "")
      : "",
  };
}

/**
 * fromColumnData converts column data into a partial relationship.
 */
function fromColumnData(columnData: ColumnData): PartialRelationship | Comment {
  if (columnData[0].startsWith("// ")) {
    return {
      comment: columnData[0],
    };
  }

  return {
    resourceType: columnData[0],
    resourceId: columnData[1],
    relation: columnData[2],
    subjectType: columnData[3],
    subjectId: columnData[4],
    subjectRelation: columnData[5] ?? "",
    caveatName: columnData[6] ?? "",
    caveatContext: columnData[7] ?? "",
    expiration: columnData[8] ?? "",
  };
}

// relationshipToColumnData converts the given relationship into column data.
export function relationshipToColumnData(
  rel: RelationshipWithComments
): ColumnData | undefined {
  const relationship = rel.relationship;
  if (relationship === undefined) {
    return undefined;
  }

  let userRel = relationship.subject?.relation ?? "";
  if (userRel.trim() === "...") {
    userRel = "";
  }

  const caveatContext = relationship.caveat?.context
    ? JSON.stringify(relationship.caveat.context)
    : "";
  const columnData = [
    relationship.resourceAndRelation?.namespace ?? "",
    relationship.resourceAndRelation?.objectId ?? "",
    relationship.resourceAndRelation?.relation ?? "",
    relationship.subject?.namespace ?? "",
    relationship.subject?.objectId ?? "",
    userRel,
    relationship.caveat?.caveatName ?? "",
    caveatContext,
    relationship.optionalExpirationTime
      ? new Date(parseFloat(relationship.optionalExpirationTime.seconds) * 1000)
          .toISOString()
          .replace(".000", "")
      : "",
  ];

  if (columnData.length !== COLUMNS.length) {
    throw Error("Missing column");
  }

  return columnData;
}

/**
 * updateRowInData updates the grid data for a specific set of new column data.
 * @param inFlightGridData The current *in flight* annotated grid data.
 * @param dataRowIndex The index of the row to be updated in the grid data.
 * @param newColumnData The new column data for the row.
 * @param startingColIndex If specified, the column at which the newColumnData starts.
 */
export function updateRowInData(
  inFlightGridData: AnnotatedData,
  dataRowIndex: number,
  newColumnData: ColumnData,
  startingColIndex?: number
): AnnotatedData {
  const adjustedData = Array.from(inFlightGridData);
  if (dataRowIndex === adjustedData.length) {
    // Add a new row.
    adjustedData.push(emptyAnnotatedDatum(dataRowIndex));
  } else if (dataRowIndex > adjustedData.length) {
    // Skip any outside of the immediate range.
    return adjustedData;
  }

  // If startingColIndex is given, build an adjusted fullNewColumnData.
  let fullNewColumnData: string[] = Array.from(newColumnData);
  if (startingColIndex !== undefined) {
    const existingColumnData = adjustedData[dataRowIndex].columnData;
    fullNewColumnData = [
      ...existingColumnData.slice(0, startingColIndex),
      ...newColumnData,
      ...existingColumnData.slice(startingColIndex + newColumnData.length),
    ];
    for (let i = fullNewColumnData.length; i < COLUMNS.length; ++i) {
      fullNewColumnData.push("");
    }
  }

  adjustedData[dataRowIndex] = {
    datum: fromColumnData(fullNewColumnData),
    columnData: fullNewColumnData,
    dataRowIndex: dataRowIndex,
  };
  return adjustedData;
}
