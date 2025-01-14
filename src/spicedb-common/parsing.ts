import {
  ContextualizedCaveat,
  RelationTuple as Relationship,
} from './protodefs/core/v1/core';
import { Struct } from './protodefs/google/protobuf/struct';

export const CAVEAT_NAME_EXPR =
  '([a-z][a-z0-9_]{1,61}[a-z0-9]/)?[a-z][a-z0-9_]{1,62}[a-z0-9]';

const CAVEAT_REGEX = new RegExp(
  `\\[(?<caveat_name>(${CAVEAT_NAME_EXPR}))(:(?<caveat_context>(\\{(.+)\\})))?\\]`
);

const OBJECT_AND_RELATION_REGEX =
  /(?<namespace>[^:]+):(?<object_id>[^#]+)#(?<relation>[^@]+)/;
const SUBJECT_REGEX =
  /(?<namespace>[^:]+):(?<object_id>[^#]+)(#(?<relation>[^@[]+))?/;

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
  if ('errorMessage' in parsed) {
    return undefined;
  }

  return parsed;
};

/**
 * parseRelationshipWithError parses a single relationship into a Relationship and returns it or the error
 * if failed to parse.
 */
export const parseRelationshipWithError = (
  value: string
): Relationship | ParseRelationshipError => {
  const trimmed = value.trim();
  const pieces = trimmed.split('@');
  if (pieces.length <= 1) {
    return { errorMessage: 'Relationship missing a subject' };
  }

  if (pieces.length < 2) {
    return {
      errorMessage: 'Relationship must be of the form `resource@subject`',
    };
  }

  const resourceString = pieces[0];
  // Add back any '@' characters that may have been in the caveat context
  let subjectString = pieces.slice(1).join('@');
  let caveatString = '';
  if (subjectString.endsWith(']')) {
    const subjectPieces = subjectString.split('[');
    if (subjectPieces.length < 2) {
      return {
        errorMessage:
          'Relationship must be of the form `resource@subject[caveat]`',
      };
    }

    subjectString = subjectPieces[0];
    caveatString = '[' + subjectPieces.splice(1).join('[');
  }

  const resource = OBJECT_AND_RELATION_REGEX.exec(resourceString);
  const subject = SUBJECT_REGEX.exec(subjectString);
  const caveat = CAVEAT_REGEX.exec(caveatString);

  if (!resource?.groups || !subject?.groups) {
    return {
      errorMessage:
        'Relationship must be of the form `resourcetype:resourceid#relation@subjecttype:subjectid`',
    };
  }

  if (caveatString && !caveat?.groups) {
    return {
      errorMessage:
        'Relationship must be of the form `resourcetype:resourceid#relation@subjecttype:subjectid[caveatName]`',
    };
  }

  const resourceNamespace = resource?.groups['namespace'] ?? '';
  const resourceObjectId = resource?.groups['object_id'] ?? '';
  const resourceRelation = resource?.groups['relation'] ?? '';

  const subjectNamespace = subject?.groups['namespace'] ?? '';
  const subjectObjectId = subject?.groups['object_id'] ?? '';
  const subjectRelation = subject?.groups['relation'] ?? '...';

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

  let contextualizedCaveat: ContextualizedCaveat | undefined = undefined;
  if (caveat?.groups) {
    contextualizedCaveat = {
      caveatName: caveat.groups['caveat_name'] ?? '',
    };

    if (caveat.groups['caveat_context']) {
      try {
        const parsed = JSON.parse(caveat.groups['caveat_context']);
        if (typeof parsed !== 'object') {
          return {
            errorMessage: `Invalid value for caveat context: must be object`,
          };
        }

        contextualizedCaveat.context = Struct.fromJson(parsed);
      } catch (e) {
        return {
          errorMessage: `Invalid caveat context: ${e}`,
        };
      }
    }
  }

  return {
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
  };
};

/**
 * parseRelationships parses the relationships found in the newline delimited relationships string.
 */
export const parseRelationships = (value: string): Relationship[] => {
  const lines = value.split('\n');
  const relationships: Relationship[] = [];

  for (let i = 0; i < lines.length; ++i) {
    const trimmed = lines[i].trim();
    if (!trimmed.length || trimmed.startsWith('//')) {
      continue;
    }

    const pieces = trimmed.split('@', 2);
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
  relsStr: string
): RelationshipFound[] => {
  const lines = relsStr.split('\n');
  return lines
    .map((line: string, index: number) => {
      const trimmed = line.trim();
      if (!trimmed.length || trimmed.startsWith('//')) {
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
  let caveatString = '';
  if (rel.caveat) {
    caveatString = `[${rel.caveat.caveatName}${
      rel.caveat.context && Object.keys(Struct.toJson(rel.caveat.context) ?? {}).length > 0 ? `:${Struct.toJsonString(rel.caveat.context)}` : ''
    }]`;
  }

  const subjectRelation =
    rel.subject?.relation && rel.subject.relation !== '...'
      ? `#${rel.subject.relation}`
      : '';
  return `${rel.resourceAndRelation?.namespace}:${rel.resourceAndRelation?.objectId}#${rel.resourceAndRelation?.relation}@${rel.subject?.namespace}:${rel.subject?.objectId}${subjectRelation}${caveatString}`;
};

/**
 * convertRelationshipsToStrings converts a list of Relationship into string forms.
 */
export const convertRelationshipsToStrings = (
  rels: Relationship[]
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
  value: string
): RelationshipOrComment[] => {
  const lines = value.split('\n');
  const found: RelationshipOrComment[] = [];

  for (let i = 0; i < lines.length; ++i) {
    const trimmed = lines[i].trim();
    if (!trimmed.length) {
      continue;
    }

    if (trimmed.startsWith('//')) {
      found.push({
        comment: trimmed.substring(2).trim(),
      });
      continue;
    }

    const parsed = parseRelationshipWithError(trimmed);
    if ('errorMessage' in parsed) {
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
  value: string
): RelationshipWithComments[] => {
  const lines = value.split('\n');
  const rels: RelationshipWithComments[] = [];
  let comments: string[] = [];

  for (let i = 0; i < lines.length; ++i) {
    const trimmed = lines[i].trim();
    if (!trimmed.length) {
      continue;
    }

    if (trimmed.startsWith('//')) {
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
  updated: Relationship[]
) => {
  const parsed = parseRelationshipsAndComments(existing);
  return mergeRelationshipsAndComments(parsed, updated);
};

export const mergeRelationshipsAndComments = (
  existing: RelationshipOrComment[],
  updated: Relationship[]
) => {
  const updatedRelStrings = updated.map(convertRelationshipToString);

  const existingRelStringsSet = new Set();
  const updatedRelStringsSet = new Set(updatedRelStrings);

  const filtered = existing
    .filter((e) => {
      if ('comment' in e) {
        return true;
      }

      const relString = convertRelationshipToString(e);
      existingRelStringsSet.add(relString);
      return updatedRelStringsSet.has(relString);
    })
    .map((e) => {
      if ('comment' in e) {
        return `// ${e.comment}`;
      }

      return convertRelationshipToString(e);
    });

  const updatedFiltered = updatedRelStrings.filter((relString) => {
    return !existingRelStringsSet.has(relString);
  });
  filtered.push(...updatedFiltered);

  return filtered.join('\n');
};
