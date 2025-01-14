import { RelationTuple as Relationship } from '../../protodefs/core/v1/core';
import {
  ObjectOrCaveatDefinition,
  ParsedObjectDefinition,
  ParsedPermission,
  ParsedRelation,
  ParsedSchema,
  TextRange,
} from '../../parsers/dsl/dsl';

export interface RelationLink {
  key: string;
  objectRelation: RelationHandle;
  subjectType: TypeHandle;
  subjectRelation: RelationOrPermissionHandle | undefined;
  relationships: Relationship[];
}

export type RelationOrPermissionHandle = RelationHandle | PermissionHandle;

/**
 * TypeSet is a helper class which wraps a parsed schema and creates easy handles
 * for referencing the types, relations and permissions within.
 */
export class TypeSet {
  private tracker: RelationTracker;
  public types: Record<string, TypeHandle>;

  constructor(
    private schema: ParsedSchema,
    private relationships: Relationship[] | undefined
  ) {
    const objectDefs = this.schema.definitions.filter(
      (def) => def.kind === 'objectDef'
    );

    this.types = Object.fromEntries(
      objectDefs.map((def: ObjectOrCaveatDefinition, index: number) => {
        return [def.name, new TypeHandle(def as ParsedObjectDefinition, index)];
      })
    );
    this.tracker = new RelationTracker(relationships, this);
  }

  /**
   * lookupType returns the handle of the type with the given name as defined in the schema
   * or undefined if none.
   */
  public lookupType(name: string): TypeHandle | undefined {
    if (!(name in this.types)) {
      return undefined;
    }
    return this.types[name];
  }

  /**
   * forEachType executes the handler for each type defined in the schema.
   */
  public forEachType(handler: (tr: TypeHandle) => void) {
    return Object.values(this.types).forEach(handler);
  }

  /**
   * lookupRelationLinks returns the list of all relation links for the given relation.
   */
  public lookupRelationLinks(relation: RelationHandle): RelationLink[] {
    return this.tracker.lookupLinks(relation);
  }
}

/**
 * RelationTracker is a helper class for tracking relations and their associated
 * links while building the graph, based on the given test relationships.
 */
export class RelationTracker {
  private inferredLinks: RelationLink[] = [];

  constructor(
    relationships: Relationship[] | undefined,
    private typeSet: TypeSet
  ) {
    if (!relationships?.length) {
      return;
    }

    relationships.forEach((rel: Relationship) => {
      this.addRelationLink(rel);
    });
  }

  /**
   * lookupLinks returns all relation links from the given relation in
   * the test relationship data set. If no tuples were defined, returns an empty list.
   */
  public lookupLinks(relation: RelationHandle): RelationLink[] {
    return this.inferredLinks.filter((link: RelationLink) => {
      return link.objectRelation.key() === relation.key();
    });
  }

  private addRelationLink(rel: Relationship) {
    const leftType = rel.resourceAndRelation?.namespace;
    const rightType = rel.subject?.namespace;
    const leftRelation = rel.resourceAndRelation?.relation;
    const rightRelation = rel.subject?.relation;
    if (!leftType || !leftRelation || !rightType || !rightRelation) {
      return;
    }

    const objectType = this.typeSet.lookupType(leftType);
    const subjectType = this.typeSet.lookupType(rightType);
    if (!objectType || !subjectType) {
      return;
    }

    const objectRelation = objectType.lookupRelation(leftRelation);
    if (!objectRelation) {
      return;
    }

    const subjectRelation =
      rightRelation && rightRelation !== '...'
        ? subjectType.lookupRelationOrPermission(rightRelation)
        : undefined;
    const key = `${objectRelation.key()}=>${subjectType.key()}${
      subjectRelation ? `#${subjectRelation}` : ''
    }`;
    const existing = this.inferredLinks.find(
      (link: RelationLink) => link.key === key
    );
    if (existing !== undefined) {
      existing.relationships.push(rel);
    }

    this.inferredLinks.push({
      key: key,
      objectRelation: objectRelation,
      subjectType: subjectType,
      subjectRelation: subjectRelation,
      relationships: [rel],
    });
  }
}

/**
 * TypeHandle is a reference to a defined type.
 */
export class TypeHandle {
  /**
   * relations are the relations defined under the type, by name.
   */
  public relations: Record<string, RelationHandle>;

  /**
   * permissions are the permissions defined under the type, by name.
   */
  public permissions: Record<string, PermissionHandle>;

  constructor(public definition: ParsedObjectDefinition, public index: number) {
    let relOrPermCounter = 0;
    this.relations = Object.fromEntries(
      definition.relations.map((rel: ParsedRelation) => {
        relOrPermCounter += 1;
        return [rel.name, new RelationHandle(rel, this, relOrPermCounter)];
      })
    );
    this.permissions = Object.fromEntries(
      definition.permissions.map((perm: ParsedPermission) => {
        relOrPermCounter += 1;
        return [perm.name, new PermissionHandle(perm, this, relOrPermCounter)];
      })
    );
  }

  /**
   * lookupRelation returns the handle of the relation with the given name in the type,
   * or undefined if none.
   */
  public lookupRelation(name: string): RelationHandle | undefined {
    if (!(name in this.relations)) {
      return undefined;
    }
    return this.relations[name];
  }

  /**
   * lookupPermission returns the handle of the permission with the given name in the type,
   * or undefined if none.
   */
  public lookupPermission(name: string): PermissionHandle | undefined {
    if (!(name in this.permissions)) {
      return undefined;
    }
    return this.permissions[name];
  }

  /**
   * lookupRelationOrPermission returns the handle of the relation or permission with the given name in the type,
   * or undefined if none.
   */
  public lookupRelationOrPermission(
    name: string
  ): RelationOrPermissionHandle | undefined {
    const relation = this.lookupRelation(name);
    if (relation !== undefined) {
      return relation;
    }

    return this.lookupPermission(name);
  }

  /**
   * key returns a unique key for this type.
   */
  public key(): string {
    return `type-${this.index}`;
  }
}

/**
 * RelationHandle is a reference to a defined relation.
 */
export class RelationHandle {
  public kind = 'relation';
  public range: TextRange;

  constructor(
    public relation: ParsedRelation,
    public parentType: TypeHandle,
    public index: number
  ) {
    this.range = relation.range;
  }

  /**
   * key returns a unique key for this relation.
   */
  public key(): string {
    return `rel-${this.parentType.key()}-${this.index}`;
  }
}

/**
 * PermissionHandle is a reference to a defined permission.
 */
export class PermissionHandle {
  public kind = 'permission';
  public range: TextRange;

  constructor(
    public permission: ParsedPermission,
    public parentType: TypeHandle,
    public index: number
  ) {
    this.range = permission.range;
  }
}
