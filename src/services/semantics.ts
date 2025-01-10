import {
  ParsedPermission,
  ParsedRelation,
  TypeRef,
} from '../spicedb-common/parsers/dsl/dsl';
import {
  ResolvedCaveatDefinition,
  ResolvedDefinition,
} from '../spicedb-common/parsers/dsl/resolution';
import { LocalParseState } from './localparse';

const TYPE_AND_OBJECT_REGEX = /(?<typepath>[^:@]+):(?<object_id>[^#]+)(#?)/g;
const TYPE_OBJECT_AND_REL_REGEX =
  /(?<typepath>[^:@]+):(?<object_id>[^#]+)#(?<rel>[^@]+)/g;

/**
 * getRelatableDefinitions returns the name of all definitions found in the local parse state.
 */
export const getRelatableDefinitions = (
  localParseState: LocalParseState
): string[] => {
  const resolver = localParseState.resolver;
  if (resolver === undefined) {
    return [];
  }

  return resolver
    .listDefinitions()
    .filter((def: ResolvedDefinition) => def.definition.relations.length > 0)
    .map((def: ResolvedDefinition) => def.definition.name);
};

/**
 * StorableRelation is a relation in which data can be stored.
 */
export interface StorableRelation {
  name: string;
  isPermission: boolean;
}

/**
 * getStorableRelations returns all relations (and permissions if the subject) defined in the
 * local parse state in which data can be stored. Note that whether we treat the listing for
 * the left hand side or right hand side of the relation depends on how many ONRs we find in
 * the string.
 */
export const getStorableRelations = (
  onrs: string,
  localParseState: LocalParseState
): StorableRelation[] => {
  const resolver = localParseState.resolver;
  if (resolver === undefined) {
    return [];
  }

  const found = [];
  while (true) {
    const matched = TYPE_AND_OBJECT_REGEX.exec(onrs);
    if (!matched || !matched?.groups) {
      break;
    }
    found.push(matched.groups!);
  }

  if (!found.length) {
    return [];
  }

  const info = found[found.length - 1]!;
  const definition = resolver.lookupDefinition(info['typepath']);
  if (definition === undefined) {
    return [];
  }

  if (found.length === 1) {
    return definition.listRelationNames().map((name: string) => {
      return {
        name: name,
        isPermission: false,
      };
    });
  }

  const rels = definition
    .listRelationsAndPermissions()
    .map((relOrPerm: ParsedPermission | ParsedRelation) => {
      return {
        name: relOrPerm.name,
        isPermission: relOrPerm.kind === 'permission',
      };
    });
  if (rels.length === 0) {
    return [
      {
        name: '...',
        isPermission: false,
      },
    ];
  }
  return rels;
};

export interface SubjectDefinition {
  name: string;
  isUserDefinition: boolean;
}

/**
 * getSubjectDefinitions returns the definitions which can be used as the right hand side subject
 * of a tuple.
 */
export const getSubjectDefinitions = (
  objectString: string,
  localParseState: LocalParseState
): SubjectDefinition[] => {
  const resolver = localParseState.resolver;
  if (resolver === undefined) {
    return [];
  }

  const matched = TYPE_OBJECT_AND_REL_REGEX.exec(objectString);
  if (!matched || !matched?.groups) {
    return [];
  }

  // Resolve the type definition.
  const definition = resolver.lookupDefinition(matched.groups['typepath']);
  if (definition !== undefined) {
    // Resolve the relation.
    const relation = definition.lookupRelation(matched.groups['rel']);
    if (relation !== undefined) {
      return resolver
        .listDefinitions()
        .filter((def: ResolvedDefinition) => {
          return (
            relation.allowedTypes.types.findIndex((allowedType: TypeRef) => {
              return allowedType.path === def.definition.name;
            }) >= 0
          );
        })
        .map((def: ResolvedDefinition) => {
          return {
            name: def.definition.name,
            isUserDefinition:
              def.definition.permissions.length +
                def.definition.relations.length ===
              0,
          };
        });
    }
  }

  return resolver.listDefinitions().map((def: ResolvedDefinition) => {
    return {
      name: def.definition.name,
      isUserDefinition:
        def.definition.permissions.length + def.definition.relations.length ===
        0,
    };
  });
};

/**
 * getCaveatDefinitions returns the name of all caveats found in the local parse state.
 */
export const getCaveatDefinitions = (
  localParseState: LocalParseState
): string[] => {
  const resolver = localParseState.resolver;
  if (resolver === undefined) {
    return [];
  }

  return resolver
    .listCaveats()
    .map((def: ResolvedCaveatDefinition) => def.definition.name);
};
