import * as jspb from 'google-protobuf'

import * as validate_validate_pb from '../../../validate/validate_pb';


export class RelationTuple extends jspb.Message {
  getObjectAndRelation(): ObjectAndRelation | undefined;
  setObjectAndRelation(value?: ObjectAndRelation): RelationTuple;
  hasObjectAndRelation(): boolean;
  clearObjectAndRelation(): RelationTuple;

  getUser(): User | undefined;
  setUser(value?: User): RelationTuple;
  hasUser(): boolean;
  clearUser(): RelationTuple;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RelationTuple.AsObject;
  static toObject(includeInstance: boolean, msg: RelationTuple): RelationTuple.AsObject;
  static serializeBinaryToWriter(message: RelationTuple, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RelationTuple;
  static deserializeBinaryFromReader(message: RelationTuple, reader: jspb.BinaryReader): RelationTuple;
}

export namespace RelationTuple {
  export type AsObject = {
    objectAndRelation?: ObjectAndRelation.AsObject,
    user?: User.AsObject,
  }
}

export class ObjectAndRelation extends jspb.Message {
  getNamespace(): string;
  setNamespace(value: string): ObjectAndRelation;

  getObjectId(): string;
  setObjectId(value: string): ObjectAndRelation;

  getRelation(): string;
  setRelation(value: string): ObjectAndRelation;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ObjectAndRelation.AsObject;
  static toObject(includeInstance: boolean, msg: ObjectAndRelation): ObjectAndRelation.AsObject;
  static serializeBinaryToWriter(message: ObjectAndRelation, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ObjectAndRelation;
  static deserializeBinaryFromReader(message: ObjectAndRelation, reader: jspb.BinaryReader): ObjectAndRelation;
}

export namespace ObjectAndRelation {
  export type AsObject = {
    namespace: string,
    objectId: string,
    relation: string,
  }
}

export class RelationReference extends jspb.Message {
  getNamespace(): string;
  setNamespace(value: string): RelationReference;

  getRelation(): string;
  setRelation(value: string): RelationReference;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RelationReference.AsObject;
  static toObject(includeInstance: boolean, msg: RelationReference): RelationReference.AsObject;
  static serializeBinaryToWriter(message: RelationReference, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RelationReference;
  static deserializeBinaryFromReader(message: RelationReference, reader: jspb.BinaryReader): RelationReference;
}

export namespace RelationReference {
  export type AsObject = {
    namespace: string,
    relation: string,
  }
}

export class User extends jspb.Message {
  getUserset(): ObjectAndRelation | undefined;
  setUserset(value?: ObjectAndRelation): User;
  hasUserset(): boolean;
  clearUserset(): User;

  getUserOneofCase(): User.UserOneofCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): User.AsObject;
  static toObject(includeInstance: boolean, msg: User): User.AsObject;
  static serializeBinaryToWriter(message: User, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): User;
  static deserializeBinaryFromReader(message: User, reader: jspb.BinaryReader): User;
}

export namespace User {
  export type AsObject = {
    userset?: ObjectAndRelation.AsObject,
  }

  export enum UserOneofCase { 
    USER_ONEOF_NOT_SET = 0,
    USERSET = 2,
  }
}

export class Zookie extends jspb.Message {
  getToken(): string;
  setToken(value: string): Zookie;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Zookie.AsObject;
  static toObject(includeInstance: boolean, msg: Zookie): Zookie.AsObject;
  static serializeBinaryToWriter(message: Zookie, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Zookie;
  static deserializeBinaryFromReader(message: Zookie, reader: jspb.BinaryReader): Zookie;
}

export namespace Zookie {
  export type AsObject = {
    token: string,
  }
}

export class RelationTupleUpdate extends jspb.Message {
  getOperation(): RelationTupleUpdate.Operation;
  setOperation(value: RelationTupleUpdate.Operation): RelationTupleUpdate;

  getTuple(): RelationTuple | undefined;
  setTuple(value?: RelationTuple): RelationTupleUpdate;
  hasTuple(): boolean;
  clearTuple(): RelationTupleUpdate;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RelationTupleUpdate.AsObject;
  static toObject(includeInstance: boolean, msg: RelationTupleUpdate): RelationTupleUpdate.AsObject;
  static serializeBinaryToWriter(message: RelationTupleUpdate, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RelationTupleUpdate;
  static deserializeBinaryFromReader(message: RelationTupleUpdate, reader: jspb.BinaryReader): RelationTupleUpdate;
}

export namespace RelationTupleUpdate {
  export type AsObject = {
    operation: RelationTupleUpdate.Operation,
    tuple?: RelationTuple.AsObject,
  }

  export enum Operation { 
    UNKNOWN = 0,
    CREATE = 1,
    TOUCH = 2,
    DELETE = 3,
  }
}

export class RelationTupleTreeNode extends jspb.Message {
  getIntermediateNode(): SetOperationUserset | undefined;
  setIntermediateNode(value?: SetOperationUserset): RelationTupleTreeNode;
  hasIntermediateNode(): boolean;
  clearIntermediateNode(): RelationTupleTreeNode;

  getLeafNode(): DirectUserset | undefined;
  setLeafNode(value?: DirectUserset): RelationTupleTreeNode;
  hasLeafNode(): boolean;
  clearLeafNode(): RelationTupleTreeNode;

  getExpanded(): ObjectAndRelation | undefined;
  setExpanded(value?: ObjectAndRelation): RelationTupleTreeNode;
  hasExpanded(): boolean;
  clearExpanded(): RelationTupleTreeNode;

  getNodeTypeCase(): RelationTupleTreeNode.NodeTypeCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RelationTupleTreeNode.AsObject;
  static toObject(includeInstance: boolean, msg: RelationTupleTreeNode): RelationTupleTreeNode.AsObject;
  static serializeBinaryToWriter(message: RelationTupleTreeNode, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RelationTupleTreeNode;
  static deserializeBinaryFromReader(message: RelationTupleTreeNode, reader: jspb.BinaryReader): RelationTupleTreeNode;
}

export namespace RelationTupleTreeNode {
  export type AsObject = {
    intermediateNode?: SetOperationUserset.AsObject,
    leafNode?: DirectUserset.AsObject,
    expanded?: ObjectAndRelation.AsObject,
  }

  export enum NodeTypeCase { 
    NODE_TYPE_NOT_SET = 0,
    INTERMEDIATE_NODE = 1,
    LEAF_NODE = 2,
  }
}

export class SetOperationUserset extends jspb.Message {
  getOperation(): SetOperationUserset.Operation;
  setOperation(value: SetOperationUserset.Operation): SetOperationUserset;

  getChildNodesList(): Array<RelationTupleTreeNode>;
  setChildNodesList(value: Array<RelationTupleTreeNode>): SetOperationUserset;
  clearChildNodesList(): SetOperationUserset;
  addChildNodes(value?: RelationTupleTreeNode, index?: number): RelationTupleTreeNode;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SetOperationUserset.AsObject;
  static toObject(includeInstance: boolean, msg: SetOperationUserset): SetOperationUserset.AsObject;
  static serializeBinaryToWriter(message: SetOperationUserset, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SetOperationUserset;
  static deserializeBinaryFromReader(message: SetOperationUserset, reader: jspb.BinaryReader): SetOperationUserset;
}

export namespace SetOperationUserset {
  export type AsObject = {
    operation: SetOperationUserset.Operation,
    childNodesList: Array<RelationTupleTreeNode.AsObject>,
  }

  export enum Operation { 
    INVALID = 0,
    UNION = 1,
    INTERSECTION = 2,
    EXCLUSION = 3,
  }
}

export class DirectUserset extends jspb.Message {
  getUsersList(): Array<User>;
  setUsersList(value: Array<User>): DirectUserset;
  clearUsersList(): DirectUserset;
  addUsers(value?: User, index?: number): User;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DirectUserset.AsObject;
  static toObject(includeInstance: boolean, msg: DirectUserset): DirectUserset.AsObject;
  static serializeBinaryToWriter(message: DirectUserset, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DirectUserset;
  static deserializeBinaryFromReader(message: DirectUserset, reader: jspb.BinaryReader): DirectUserset;
}

export namespace DirectUserset {
  export type AsObject = {
    usersList: Array<User.AsObject>,
  }
}

