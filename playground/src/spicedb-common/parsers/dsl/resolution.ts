import {
  flatMapExpression,
  ObjectOrCaveatDefinition,
  ParsedCaveatDefinition,
  ParsedCaveatParameter,
  ParsedExpression,
  ParsedObjectDefinition,
  ParsedPermission,
  ParsedRelation,
  ParsedRelationRefExpression,
  ParsedSchema,
  TypeRef,
} from './dsl';

/**
 * TypeRefResolution is the result of resolving a type reference.
 */
export type TypeRefResolution = {
  /**
   * definition is the definition which is referred by this type reference.
   */
  definition: ParsedObjectDefinition | undefined;

  /**
   * relation is the (optional) relation which is referred by this type reference. For refs
   * without relations, this will be undefined. This will *also* be undefined for unresolvable
   * refs, so make sure to check the expression to see if it has a relation reference.
   */
  relation: ParsedRelation | undefined;

  /**
   * permission is the (optional) permission which is referred by this type reference. For refs
   * without relations, this will be undefined. This will *also* be undefined for unresolvable
   * refs, so make sure to check the expression to see if it has a relation reference.
   */
  permission: ParsedPermission | undefined;
};

/**
 * ExpressionResolution is the resolution of a reference in a permission expression.
 */
export type ExpressionResolution = ParsedRelation | ParsedPermission;

/**
 * ResolvedTypeReference is a type reference found in the schema, with resolution attempted.
 */
export interface ResolvedTypeReference {
  kind: 'type';
  reference: TypeRef;
  referencedTypeAndRelation: TypeRefResolution | undefined;
}

/**
 * ResolvedExprReference is a relation reference expression found in the schema, with resolution attempted.
 */
export interface ResolvedExprReference {
  kind: 'expression';
  reference: ParsedRelationRefExpression;
  resolvedRelationOrPermission: ExpressionResolution | undefined;
}

/**
 * ResolvedReference is a found and resolution performed type reference or expression.
 */
export type ResolvedReference = ResolvedTypeReference | ResolvedExprReference;

/**
 * Resolver is a helper class for easily resolving information in a parsed schema.
 */
export class Resolver {
  private definitionsByName: Record<string, ResolvedDefinition> = {};
  private caveatsByName: Record<string, ResolvedCaveatDefinition> = {};
  private populated = false;

  constructor(public schema: ParsedSchema) {}

  private populate() {
    if (this.populated) {
      return;
    }

    this.schema.definitions.forEach((def: ObjectOrCaveatDefinition) => {
      if (def.kind === 'objectDef') {
        this.definitionsByName[def.name] = new ResolvedDefinition(def);
        return;
      }

      if (def.kind === 'caveatDef') {
        this.caveatsByName[def.name] = new ResolvedCaveatDefinition(def);
        return;
      }
    });
    this.populated = true;
  }

  /**
   * listDefinitions lists all definitions in the resolver.
   */
  public listDefinitions(): ResolvedDefinition[] {
    this.populate();
    return Object.values(this.definitionsByName);
  }

  /**
   * lookupDefinition returns the definition with the given name, if any, or undefined
   * if none.
   */
  public lookupDefinition(name: string): ResolvedDefinition | undefined {
    this.populate();

    if (!(name in this.definitionsByName)) {
      return undefined;
    }

    return this.definitionsByName[name];
  }

  /**
   * listCaveats returns all resolved caveat definitions in the schema.
   */
  public listCaveats(): ResolvedCaveatDefinition[] {
    this.populate();
    return Object.values(this.caveatsByName);
  }

  /**
   * resolvedReferences returns all the resolved type and expression references in the schema.
   */
  public resolvedReferences(): ResolvedReference[] {
    this.populate();

    const refs = [
      ...this.lookupAndResolveTypeReferences(),
      ...this.lookupAndResolveExprReferences(),
    ];
    refs.sort((a: ResolvedReference, b: ResolvedReference) => {
      return (
        a.reference.range.startIndex.offset -
        b.reference.range.startIndex.offset
      );
    });
    return refs;
  }

  /**
   * resolveTypeReference attempts to resolve a type reference.
   */
  public resolveTypeReference(typeRef: TypeRef): TypeRefResolution | undefined {
    this.populate();

    if (!(typeRef.path in this.definitionsByName)) {
      return undefined;
    }

    const definition = this.definitionsByName[typeRef.path];
    if (!typeRef.relationName) {
      return {
        definition: definition.definition,
        relation: undefined,
        permission: undefined,
      };
    }

    return {
      definition: definition.definition,
      relation: definition.lookupRelation(typeRef.relationName),
      permission: definition.lookupPermission(typeRef.relationName),
    };
  }

  /**
   * resolveRelationOrPermission attempts to resolve a relation reference expression.
   */
  public resolveRelationOrPermission(
    current: ParsedRelationRefExpression,
    def: ObjectOrCaveatDefinition
  ): ExpressionResolution | undefined {
    this.populate();

    const definition = this.definitionsByName[def.name];
    return definition.lookupRelationOrPermission(current.relationName);
  }

  private lookupAndResolveTypeReferences(): ResolvedTypeReference[] {
    this.populate();
    return this.schema.definitions.flatMap((def: ObjectOrCaveatDefinition) => {
      if (def.kind !== 'objectDef') {
        return [];
      }

      return def.relations.flatMap((rel: ParsedRelation) => {
        return rel.allowedTypes.types.map((typeRef: TypeRef) => {
          return {
            kind: 'type',
            reference: typeRef,
            referencedTypeAndRelation: this.resolveTypeReference(typeRef),
          };
        });
      });
    });
  }

  private lookupAndResolveExprReferences(): ResolvedExprReference[] {
    this.populate();
    return this.schema.definitions.flatMap((def: ObjectOrCaveatDefinition) => {
      if (def.kind !== 'objectDef') {
        return [];
      }

      return def.permissions.flatMap((perm: ParsedPermission) => {
        return flatMapExpression<ResolvedExprReference>(
          perm.expr,
          (current: ParsedExpression) => {
            switch (current.kind) {
              case 'relationref':
                return {
                  kind: 'expression',
                  reference: current,
                  resolvedRelationOrPermission:
                    this.resolveRelationOrPermission(current, def),
                };

              default:
                return undefined;
            }
          }
        );
      });
    });
  }
}

export class ResolvedDefinition {
  private relationsByName: Record<string, ParsedRelation> = {};
  private permissionByName: Record<string, ParsedPermission> = {};

  constructor(public definition: ParsedObjectDefinition) {
    definition.permissions.forEach((perm: ParsedPermission) => {
      this.permissionByName[perm.name] = perm;
    });
    definition.relations.forEach((rel: ParsedRelation) => {
      this.relationsByName[rel.name] = rel;
    });
  }

  public listRelationNames(): string[] {
    return Object.keys(this.relationsByName);
  }

  public listRelations(): ParsedRelation[] {
    return Object.values(this.relationsByName);
  }

  public listRelationsAndPermissions(): (ParsedRelation | ParsedPermission)[] {
    return [
      ...Object.values(this.relationsByName),
      ...Object.values(this.permissionByName),
    ];
  }

  public listRelationsAndPermissionNames(): string[] {
    return Array.from(
      new Set<string>([
        ...Object.keys(this.relationsByName),
        ...Object.keys(this.permissionByName),
      ])
    );
  }

  public listWithCaveatNames(): string[] {
    const withCaveats = Object.values(this.relationsByName).filter((rel) => {
      return rel.allowedTypes.types.find((ref) => ref.withCaveat);
    });

    let names: string[] = [];
    withCaveats.forEach((rel) => {
      rel.allowedTypes.types.forEach((ref) => {
        if (ref.withCaveat) {
          names.push(ref.withCaveat.path);
        }
      });
    });
    return names;
  }

  public lookupRelation(name: string): ParsedRelation | undefined {
    if (!(name in this.relationsByName)) {
      return undefined;
    }

    return this.relationsByName[name];
  }

  public lookupPermission(name: string): ParsedPermission | undefined {
    if (!(name in this.permissionByName)) {
      return undefined;
    }

    return this.permissionByName[name];
  }

  public lookupRelationOrPermission(
    name: string
  ): ParsedRelation | ParsedPermission | undefined {
    const rel = this.lookupRelation(name);
    if (rel) {
      return rel;
    }

    return this.lookupPermission(name);
  }
}

export class ResolvedCaveatDefinition {
  private paramsByName: Record<string, ParsedCaveatParameter> = {};
  private name: string;

  constructor(public definition: ParsedCaveatDefinition) {
    definition.parameters.forEach((param: ParsedCaveatParameter) => {
      this.paramsByName[param.name] = param;
    });
    this.name = definition.name;
  }

  public getName(): string {
    return this.name;
  }

  public listParameterNames(): string[] {
    return Object.keys(this.paramsByName);
  }
}
