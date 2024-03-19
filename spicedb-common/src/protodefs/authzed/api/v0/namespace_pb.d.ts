import * as jspb from 'google-protobuf'

import * as google_protobuf_any_pb from 'google-protobuf/google/protobuf/any_pb';
import * as validate_validate_pb from '../../../validate/validate_pb';
import * as authzed_api_v0_core_pb from '../../../authzed/api/v0/core_pb';


export class Metadata extends jspb.Message {
  getMetadataMessageList(): Array<google_protobuf_any_pb.Any>;
  setMetadataMessageList(value: Array<google_protobuf_any_pb.Any>): Metadata;
  clearMetadataMessageList(): Metadata;
  addMetadataMessage(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Metadata.AsObject;
  static toObject(includeInstance: boolean, msg: Metadata): Metadata.AsObject;
  static serializeBinaryToWriter(message: Metadata, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Metadata;
  static deserializeBinaryFromReader(message: Metadata, reader: jspb.BinaryReader): Metadata;
}

export namespace Metadata {
  export type AsObject = {
    metadataMessageList: Array<google_protobuf_any_pb.Any.AsObject>,
  }
}

export class NamespaceDefinition extends jspb.Message {
  getName(): string;
  setName(value: string): NamespaceDefinition;

  getRelationList(): Array<Relation>;
  setRelationList(value: Array<Relation>): NamespaceDefinition;
  clearRelationList(): NamespaceDefinition;
  addRelation(value?: Relation, index?: number): Relation;

  getMetadata(): Metadata | undefined;
  setMetadata(value?: Metadata): NamespaceDefinition;
  hasMetadata(): boolean;
  clearMetadata(): NamespaceDefinition;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): NamespaceDefinition.AsObject;
  static toObject(includeInstance: boolean, msg: NamespaceDefinition): NamespaceDefinition.AsObject;
  static serializeBinaryToWriter(message: NamespaceDefinition, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): NamespaceDefinition;
  static deserializeBinaryFromReader(message: NamespaceDefinition, reader: jspb.BinaryReader): NamespaceDefinition;
}

export namespace NamespaceDefinition {
  export type AsObject = {
    name: string,
    relationList: Array<Relation.AsObject>,
    metadata?: Metadata.AsObject,
  }
}

export class Relation extends jspb.Message {
  getName(): string;
  setName(value: string): Relation;

  getUsersetRewrite(): UsersetRewrite | undefined;
  setUsersetRewrite(value?: UsersetRewrite): Relation;
  hasUsersetRewrite(): boolean;
  clearUsersetRewrite(): Relation;

  getTypeInformation(): TypeInformation | undefined;
  setTypeInformation(value?: TypeInformation): Relation;
  hasTypeInformation(): boolean;
  clearTypeInformation(): Relation;

  getMetadata(): Metadata | undefined;
  setMetadata(value?: Metadata): Relation;
  hasMetadata(): boolean;
  clearMetadata(): Relation;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Relation.AsObject;
  static toObject(includeInstance: boolean, msg: Relation): Relation.AsObject;
  static serializeBinaryToWriter(message: Relation, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Relation;
  static deserializeBinaryFromReader(message: Relation, reader: jspb.BinaryReader): Relation;
}

export namespace Relation {
  export type AsObject = {
    name: string,
    usersetRewrite?: UsersetRewrite.AsObject,
    typeInformation?: TypeInformation.AsObject,
    metadata?: Metadata.AsObject,
  }
}

export class TypeInformation extends jspb.Message {
  getAllowedDirectRelationsList(): Array<AllowedRelation>;
  setAllowedDirectRelationsList(value: Array<AllowedRelation>): TypeInformation;
  clearAllowedDirectRelationsList(): TypeInformation;
  addAllowedDirectRelations(value?: AllowedRelation, index?: number): AllowedRelation;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TypeInformation.AsObject;
  static toObject(includeInstance: boolean, msg: TypeInformation): TypeInformation.AsObject;
  static serializeBinaryToWriter(message: TypeInformation, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TypeInformation;
  static deserializeBinaryFromReader(message: TypeInformation, reader: jspb.BinaryReader): TypeInformation;
}

export namespace TypeInformation {
  export type AsObject = {
    allowedDirectRelationsList: Array<AllowedRelation.AsObject>,
  }
}

export class AllowedRelation extends jspb.Message {
  getNamespace(): string;
  setNamespace(value: string): AllowedRelation;

  getRelation(): string;
  setRelation(value: string): AllowedRelation;

  getPublicWildcard(): AllowedRelation.PublicWildcard | undefined;
  setPublicWildcard(value?: AllowedRelation.PublicWildcard): AllowedRelation;
  hasPublicWildcard(): boolean;
  clearPublicWildcard(): AllowedRelation;

  getRelationOrWildcardCase(): AllowedRelation.RelationOrWildcardCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AllowedRelation.AsObject;
  static toObject(includeInstance: boolean, msg: AllowedRelation): AllowedRelation.AsObject;
  static serializeBinaryToWriter(message: AllowedRelation, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AllowedRelation;
  static deserializeBinaryFromReader(message: AllowedRelation, reader: jspb.BinaryReader): AllowedRelation;
}

export namespace AllowedRelation {
  export type AsObject = {
    namespace: string,
    relation: string,
    publicWildcard?: AllowedRelation.PublicWildcard.AsObject,
  }

  export class PublicWildcard extends jspb.Message {
    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PublicWildcard.AsObject;
    static toObject(includeInstance: boolean, msg: PublicWildcard): PublicWildcard.AsObject;
    static serializeBinaryToWriter(message: PublicWildcard, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PublicWildcard;
    static deserializeBinaryFromReader(message: PublicWildcard, reader: jspb.BinaryReader): PublicWildcard;
  }

  export namespace PublicWildcard {
    export type AsObject = {
    }
  }


  export enum RelationOrWildcardCase { 
    RELATION_OR_WILDCARD_NOT_SET = 0,
    RELATION = 3,
    PUBLIC_WILDCARD = 4,
  }
}

export class UsersetRewrite extends jspb.Message {
  getUnion(): SetOperation | undefined;
  setUnion(value?: SetOperation): UsersetRewrite;
  hasUnion(): boolean;
  clearUnion(): UsersetRewrite;

  getIntersection(): SetOperation | undefined;
  setIntersection(value?: SetOperation): UsersetRewrite;
  hasIntersection(): boolean;
  clearIntersection(): UsersetRewrite;

  getExclusion(): SetOperation | undefined;
  setExclusion(value?: SetOperation): UsersetRewrite;
  hasExclusion(): boolean;
  clearExclusion(): UsersetRewrite;

  getRewriteOperationCase(): UsersetRewrite.RewriteOperationCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UsersetRewrite.AsObject;
  static toObject(includeInstance: boolean, msg: UsersetRewrite): UsersetRewrite.AsObject;
  static serializeBinaryToWriter(message: UsersetRewrite, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UsersetRewrite;
  static deserializeBinaryFromReader(message: UsersetRewrite, reader: jspb.BinaryReader): UsersetRewrite;
}

export namespace UsersetRewrite {
  export type AsObject = {
    union?: SetOperation.AsObject,
    intersection?: SetOperation.AsObject,
    exclusion?: SetOperation.AsObject,
  }

  export enum RewriteOperationCase { 
    REWRITE_OPERATION_NOT_SET = 0,
    UNION = 1,
    INTERSECTION = 2,
    EXCLUSION = 3,
  }
}

export class SetOperation extends jspb.Message {
  getChildList(): Array<SetOperation.Child>;
  setChildList(value: Array<SetOperation.Child>): SetOperation;
  clearChildList(): SetOperation;
  addChild(value?: SetOperation.Child, index?: number): SetOperation.Child;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SetOperation.AsObject;
  static toObject(includeInstance: boolean, msg: SetOperation): SetOperation.AsObject;
  static serializeBinaryToWriter(message: SetOperation, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SetOperation;
  static deserializeBinaryFromReader(message: SetOperation, reader: jspb.BinaryReader): SetOperation;
}

export namespace SetOperation {
  export type AsObject = {
    childList: Array<SetOperation.Child.AsObject>,
  }

  export class Child extends jspb.Message {
    getThis(): SetOperation.Child.This | undefined;
    setThis(value?: SetOperation.Child.This): Child;
    hasThis(): boolean;
    clearThis(): Child;

    getComputedUserset(): ComputedUserset | undefined;
    setComputedUserset(value?: ComputedUserset): Child;
    hasComputedUserset(): boolean;
    clearComputedUserset(): Child;

    getTupleToUserset(): TupleToUserset | undefined;
    setTupleToUserset(value?: TupleToUserset): Child;
    hasTupleToUserset(): boolean;
    clearTupleToUserset(): Child;

    getUsersetRewrite(): UsersetRewrite | undefined;
    setUsersetRewrite(value?: UsersetRewrite): Child;
    hasUsersetRewrite(): boolean;
    clearUsersetRewrite(): Child;

    getChildTypeCase(): Child.ChildTypeCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Child.AsObject;
    static toObject(includeInstance: boolean, msg: Child): Child.AsObject;
    static serializeBinaryToWriter(message: Child, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Child;
    static deserializeBinaryFromReader(message: Child, reader: jspb.BinaryReader): Child;
  }

  export namespace Child {
    export type AsObject = {
      pb_this?: SetOperation.Child.This.AsObject,
      computedUserset?: ComputedUserset.AsObject,
      tupleToUserset?: TupleToUserset.AsObject,
      usersetRewrite?: UsersetRewrite.AsObject,
    }

    export class This extends jspb.Message {
      serializeBinary(): Uint8Array;
      toObject(includeInstance?: boolean): This.AsObject;
      static toObject(includeInstance: boolean, msg: This): This.AsObject;
      static serializeBinaryToWriter(message: This, writer: jspb.BinaryWriter): void;
      static deserializeBinary(bytes: Uint8Array): This;
      static deserializeBinaryFromReader(message: This, reader: jspb.BinaryReader): This;
    }

    export namespace This {
      export type AsObject = {
      }
    }


    export enum ChildTypeCase { 
      CHILD_TYPE_NOT_SET = 0,
      _THIS = 1,
      COMPUTED_USERSET = 2,
      TUPLE_TO_USERSET = 3,
      USERSET_REWRITE = 4,
    }
  }

}

export class TupleToUserset extends jspb.Message {
  getTupleset(): TupleToUserset.Tupleset | undefined;
  setTupleset(value?: TupleToUserset.Tupleset): TupleToUserset;
  hasTupleset(): boolean;
  clearTupleset(): TupleToUserset;

  getComputedUserset(): ComputedUserset | undefined;
  setComputedUserset(value?: ComputedUserset): TupleToUserset;
  hasComputedUserset(): boolean;
  clearComputedUserset(): TupleToUserset;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TupleToUserset.AsObject;
  static toObject(includeInstance: boolean, msg: TupleToUserset): TupleToUserset.AsObject;
  static serializeBinaryToWriter(message: TupleToUserset, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TupleToUserset;
  static deserializeBinaryFromReader(message: TupleToUserset, reader: jspb.BinaryReader): TupleToUserset;
}

export namespace TupleToUserset {
  export type AsObject = {
    tupleset?: TupleToUserset.Tupleset.AsObject,
    computedUserset?: ComputedUserset.AsObject,
  }

  export class Tupleset extends jspb.Message {
    getRelation(): string;
    setRelation(value: string): Tupleset;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Tupleset.AsObject;
    static toObject(includeInstance: boolean, msg: Tupleset): Tupleset.AsObject;
    static serializeBinaryToWriter(message: Tupleset, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Tupleset;
    static deserializeBinaryFromReader(message: Tupleset, reader: jspb.BinaryReader): Tupleset;
  }

  export namespace Tupleset {
    export type AsObject = {
      relation: string,
    }
  }

}

export class ComputedUserset extends jspb.Message {
  getObject(): ComputedUserset.Object;
  setObject(value: ComputedUserset.Object): ComputedUserset;

  getRelation(): string;
  setRelation(value: string): ComputedUserset;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ComputedUserset.AsObject;
  static toObject(includeInstance: boolean, msg: ComputedUserset): ComputedUserset.AsObject;
  static serializeBinaryToWriter(message: ComputedUserset, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ComputedUserset;
  static deserializeBinaryFromReader(message: ComputedUserset, reader: jspb.BinaryReader): ComputedUserset;
}

export namespace ComputedUserset {
  export type AsObject = {
    object: ComputedUserset.Object,
    relation: string,
  }

  export enum Object { 
    TUPLE_OBJECT = 0,
    TUPLE_USERSET_OBJECT = 1,
  }
}

