import {
  ContextualizedCaveatSchema,
  RelationTuple as Relationship,
  RelationTupleSchema as RelationshipSchema,
} from "./protodefs/core/v1/core_pb";
import {
  Timestamp,
  timestampDate,
  timestampFromMs,
} from "@bufbuild/protobuf/wkt";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { create } from "@bufbuild/protobuf";

export const CAVEAT_NAME_EXPR =
  "([a-z][a-z0-9_]{1,61}[a-z0-9]/)?[a-z][a-z0-9_]{1,62}[a-z0-9]";

const namespaceNameExpr =
  "([a-z][a-z0-9_]{1,61}[a-z0-9]/)*[a-z][a-z0-9_]{1,62}[a-z0-9]";
const resourceIDExpr = "([a-zA-Z0-9/_|\\-=+]{1,})";
const subjectIDExpr = "([a-zA-Z0-9/_|\\-=+]{1,})|\\*";
const relationExpr = "([a-z][a-z0-9_]{1,62}[a-z0-9])";

const resourceExpr = `(?<resourceType>${namespaceNameExpr}):(?<resourceID>${resourceIDExpr})#(?<resourceRel>${relationExpr})`;
const subjectExpr = `(?<subjectType>${namespaceNameExpr}):(?<subjectID>${subjectIDExpr})(#(?<subjectRel>${relationExpr}|\\.\\.\\.))?`;
const caveatNameExpr =
  "([a-z][a-z0-9_]{1,61}[a-z0-9]/)*[a-z][a-z0-9_]{1,62}[a-z0-9]";
const caveatExpr = `\\[(?<caveatName>(${caveatNameExpr}))(:(?<caveatContext>(\\{(.+)\\})))?\\]`;

const expirationExpr = `\\[expiration:(?<expirationDateTime>([\\d\\-\\.:TZ]+))\\]`;

const RELATIONSHIP_REGEX = new RegExp(
  `^${resourceExpr}@${subjectExpr}(${caveatExpr})?(${expirationExpr})?$`,
);

export const NAMESPACE_REGEX =
  /^([a-z][a-z0-9_]{1,61}[a-z0-9]\/)*[a-z][a-z0-9_]{1,62}[a-z0-9]$/;
export const RESOURCE_ID_REGEX = /^([a-zA-Z0-9/_|\-=+]{1,1024})$/;
export const SUBJECT_ID_REGEX = /^(([a-zA-Z0-9/_|\-=+]{1,1024})|\*)$/;
export const RELATION_REGEX = /^(\.\.\.|[a-z][a-z0-9_]{1,62}[a-z0-9])$/;

export const maxObjectIDLength = 1024;

/**
 * ParseRelationshipError is an error returned if parsing a relationship failed.
 */
export interface ParseRelationshipError {
  errorMessage: string;
}

/**
 * RelationshipFound contains information about a relationship.
 */
export interface RelationshipFound {
  /**
   * text is the text of the relationship.
   */
  text: string;

  /**
   * lineNumber is the (0-indexed) line number of the relationship in the input
   * string.
   */
  lineNumber: number;

  /**
   * parsed is the parsed relationship or undefined if parsing failed.
   */
  parsed: Relationship | ParseRelationshipError;
}

/**
 * ParseRelationshipError is an error returned if parsing a relationship failed.
 */
export interface ParseRelationshipError {
  errorMessage: string;
}

/**
 * parseRelationship parses a single relationship into a Relationship and returns it or undefined
 * if failed to parse.
 */
export const parseRelationship = (value: string): Relationship | undefined => {
  const parsed = parseRelationshipWithError(value);
  if ("errorMessage" in parsed) {
    return undefined;
  }

  return parsed;
};

/**
 * parseRelationshipWithError parses a single relationship into a Relationship and returns it or the error
 * if failed to parse.
 */
export const parseRelationshipWithError = (
  value: string,
): Relationship | ParseRelationshipError => {
  const trimmed = value.trim();
  const parsed = RELATIONSHIP_REGEX.exec(trimmed);
  if (!parsed || !parsed.groups) {
    return {
      errorMessage:
        'Relationship must be of the form `resourcetype:resourceid#relation@subjecttype:subjectid[caveatname:[{"key":"value"}]][expiration:2025-09-11T16:57:57Z]`',
    };
  }

  const resourceNamespace = parsed?.groups["resourceType"] ?? "";
  const resourceObjectId = parsed?.groups["resourceID"] ?? "";
  const resourceRelation = parsed?.groups["resourceRel"] ?? "";

  const subjectNamespace = parsed?.groups["subjectType"] ?? "";
  const subjectObjectId = parsed?.groups["subjectID"] ?? "";
  const subjectRelation = parsed?.groups["subjectRel"] ?? "...";

  // Validate the namespaces, object ids and relation(s).
  if (!NAMESPACE_REGEX.test(resourceNamespace)) {
    return {
      errorMessage: `Invalid namespace '${resourceNamespace}': Must be alphanumeric`,
    };
  }
  if (!NAMESPACE_REGEX.test(subjectNamespace)) {
    return {
      errorMessage: `Invalid namespace '${subjectNamespace}': Must be alphanumeric`,
    };
  }

  if (!RESOURCE_ID_REGEX.test(resourceObjectId)) {
    return {
      errorMessage: `Invalid resource object ID '${resourceObjectId}': Must be alphanumeric. Wildcards are not allowed`,
    };
  }
  if (!SUBJECT_ID_REGEX.test(subjectObjectId)) {
    return {
      errorMessage: `Invalid subject object ID '${subjectObjectId}': Must be alphanumeric`,
    };
  }

  if (resourceObjectId.length > maxObjectIDLength) {
    return {
      errorMessage: `Invalid resource object ID '${resourceObjectId}': Must be alphanumeric and no more than ${maxObjectIDLength} characters long. Wildcards are not allowed`,
    };
  }
  if (subjectObjectId.length > maxObjectIDLength) {
    return {
      errorMessage: `Invalid subject object ID '${subjectObjectId}': Must be alphanumeric and no more than ${maxObjectIDLength} characters long`,
    };
  }

  if (!RELATION_REGEX.test(resourceRelation)) {
    return {
      errorMessage: `Invalid relation '${resourceRelation}': Must be alphanumeric`,
    };
  }
  if (!RELATION_REGEX.test(subjectRelation)) {
    return {
      errorMessage: `Invalid relation '${subjectRelation}': Must be alphanumeric`,
    };
  }

  let contextualizedCaveat:
    | MessageInitShape<typeof ContextualizedCaveatSchema>
    | undefined = undefined;
  if (parsed.groups["caveatName"]) {
    contextualizedCaveat = {
      caveatName: parsed.groups["caveatName"] ?? "",
    };

    if (parsed.groups["caveatContext"]) {
      try {
        const caveatContext = JSON.parse(parsed.groups["caveatContext"]);
        if (typeof parsed !== "object") {
          return {
            errorMessage: `Invalid value for caveat context: must be object`,
          };
        }

        contextualizedCaveat.context = caveatContext;
      } catch (e) {
        return {
          errorMessage: `Invalid caveat context: ${e}`,
        };
      }
    }
  }

  let optionalExpirationTime: Timestamp | undefined = undefined;
  if (parsed.groups["expirationDateTime"]) {
    try {
      let dtString = parsed.groups["expirationDateTime"];
      if (!dtString.endsWith("Z")) {
        dtString += "Z";
      }

      const milliseconds = Date.parse(dtString);
      optionalExpirationTime = timestampFromMs(milliseconds);
    } catch (e) {
      return {
        errorMessage: `Invalid expiration time: ${e}`,
      };
    }
  }

  return create(RelationshipSchema, {
    resourceAndRelation: {
      namespace: resourceNamespace,
      objectId: resourceObjectId,
      relation: resourceRelation,
    },
    subject: {
      namespace: subjectNamespace,
      objectId: subjectObjectId,
      relation: subjectRelation,
    },
    caveat: contextualizedCaveat,
    optionalExpirationTime: optionalExpirationTime,
  });
};

/**
 * parseRelationships parses the relationships found in the newline delimited relationships string.
 */
export const parseRelationships = (value: string): Relationship[] => {
  const lines = value.split("\n");
  const relationships: Relationship[] = [];

  for (let i = 0; i < lines.length; ++i) {
    const trimmed = lines[i].trim();
    if (!trimmed.length || trimmed.startsWith("//")) {
      continue;
    }

    const pieces = trimmed.split("@", 2);
    if (pieces.length < 2) {
      continue;
    }

    const relationship = parseRelationship(trimmed);
    if (!relationship) {
      continue;
    }

    relationships.push(relationship);
  }

  return relationships;
};

/**
 * parseRelationshipsWithErrors parses relationships in the string and returns them, or errors
 * for each invalid one found.
 */
export const parseRelationshipsWithErrors = (
  relsStr: string,
): RelationshipFound[] => {
  const lines = relsStr.split("\n");
  return lines
    .map((line: string, index: number) => {
      const trimmed = line.trim();
      if (!trimmed.length || trimmed.startsWith("//")) {
        return undefined;
      }

      const parsed = parseRelationshipWithError(trimmed);
      return {
        text: line,
        lineNumber: index,
        parsed: parsed,
      };
    })
    .filter((tf: RelationshipFound | undefined) => !!tf) as RelationshipFound[];
};

/**
 * convertRelationshipToString converts a Relationship into its string form.
 */
export const convertRelationshipToString = (rel: Relationship) => {
  let caveatString = "";
  if (rel.caveat) {
    caveatString = `[${rel.caveat.caveatName}${
      rel.caveat.context && Object.keys(rel.caveat.context ?? {}).length > 0
        ? `:${JSON.stringify(rel.caveat.context)}`
        : ""
    }]`;
  }

  let expirationString = "";
  if (rel.optionalExpirationTime) {
    const datetime = timestampDate(rel.optionalExpirationTime);
    expirationString = `[expiration:${datetime.toISOString().replace(".000", "")}]`;
  }

  const subjectRelation =
    rel.subject?.relation && rel.subject.relation !== "..."
      ? `#${rel.subject.relation}`
      : "";
  return `${rel.resourceAndRelation?.namespace}:${rel.resourceAndRelation?.objectId}#${rel.resourceAndRelation?.relation}@${rel.subject?.namespace}:${rel.subject?.objectId}${subjectRelation}${caveatString}${expirationString}`;
};

/**
 * convertRelationshipsToStrings converts a list of Relationship into string forms.
 */
export const convertRelationshipsToStrings = (
  rels: Relationship[],
): string[] => {
  return rels.map(convertRelationshipToString);
};

export type RelationshipOrComment =
  | {
      comment: string;
    }
  | Relationship;

/**
 * parseRelationshipsAndComments parses the relationships and comments found in the given string
 * and returns them.
 */
export const parseRelationshipsAndComments = (
  value: string,
): RelationshipOrComment[] => {
  const lines = value.split("\n");
  const found: RelationshipOrComment[] = [];

  for (let i = 0; i < lines.length; ++i) {
    const trimmed = lines[i].trim();
    if (!trimmed.length) {
      continue;
    }

    if (trimmed.startsWith("//")) {
      found.push({
        comment: trimmed.substring(2).trim(),
      });
      continue;
    }

    const parsed = parseRelationshipWithError(trimmed);
    if ("errorMessage" in parsed) {
      found.push({
        comment: `${parsed.errorMessage}: ${trimmed}`,
      });
      continue;
    }

    found.push(parsed);
  }

  return found;
};

export interface RelationshipWithComments {
  relationship?: Relationship;
  comments: string[];
  text: string;
}

/**
 * parseRelationshipsWithComments parses the relationships found in the given string
 * and returns them.
 */
export const parseRelationshipsWithComments = (
  value: string,
): RelationshipWithComments[] => {
  const lines = value.split("\n");
  const rels: RelationshipWithComments[] = [];
  let comments: string[] = [];

  for (let i = 0; i < lines.length; ++i) {
    const trimmed = lines[i].trim();
    if (!trimmed.length) {
      continue;
    }

    if (trimmed.startsWith("//")) {
      comments.push(trimmed.substring(2).trim());
      continue;
    }

    const parsed = parseRelationship(trimmed);
    rels.push({
      relationship: parsed,
      comments: comments,
      text: trimmed,
    });

    comments = [];
  }

  return rels;
};

/**
 * mergeRelationshipsStringAndComments merges an existing string containing
 * relationships and comments with the relationships provided in the updated
 * array, returning a string with the comments and any common relationships
 * maintained. If a relationship is not found in updated, it is removed and
 * if it is new in updated, it is added.
 */
export const mergeRelationshipsStringAndComments = (
  existing: string,
  updated: Relationship[],
) => {
  const parsed = parseRelationshipsAndComments(existing);
  return mergeRelationshipsAndComments(parsed, updated);
};

export const mergeRelationshipsAndComments = (
  existing: RelationshipOrComment[],
  updated: Relationship[],
) => {
  const updatedRelStrings = updated.map(convertRelationshipToString);

  const existingRelStringsSet = new Set();
  const updatedRelStringsSet = new Set(updatedRelStrings);

  const filtered = existing
    .filter((e) => {
      if ("comment" in e) {
        return true;
      }

      const relString = convertRelationshipToString(e);
      existingRelStringsSet.add(relString);
      return updatedRelStringsSet.has(relString);
    })
    .map((e) => {
      if ("comment" in e) {
        return `// ${e.comment}`;
      }

      return convertRelationshipToString(e);
    });

  const updatedFiltered = updatedRelStrings.filter((relString) => {
    return !existingRelStringsSet.has(relString);
  });
  filtered.push(...updatedFiltered);

  return filtered.join("\n");
};
