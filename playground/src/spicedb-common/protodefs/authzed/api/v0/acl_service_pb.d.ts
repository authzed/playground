import * as jspb from 'google-protobuf'

import * as validate_validate_pb from '../../../validate/validate_pb';
import * as authzed_api_v0_core_pb from '../../../authzed/api/v0/core_pb';


export class RelationTupleFilter extends jspb.Message {
  getNamespace(): string;
  setNamespace(value: string): RelationTupleFilter;

  getObjectId(): string;
  setObjectId(value: string): RelationTupleFilter;

  getRelation(): string;
  setRelation(value: string): RelationTupleFilter;

  getUserset(): authzed_api_v0_core_pb.ObjectAndRelation | undefined;
  setUserset(value?: authzed_api_v0_core_pb.ObjectAndRelation): RelationTupleFilter;
  hasUserset(): boolean;
  clearUserset(): RelationTupleFilter;

  getFiltersList(): Array<RelationTupleFilter.Filter>;
  setFiltersList(value: Array<RelationTupleFilter.Filter>): RelationTupleFilter;
  clearFiltersList(): RelationTupleFilter;
  addFilters(value: RelationTupleFilter.Filter, index?: number): RelationTupleFilter;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RelationTupleFilter.AsObject;
  static toObject(includeInstance: boolean, msg: RelationTupleFilter): RelationTupleFilter.AsObject;
  static serializeBinaryToWriter(message: RelationTupleFilter, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RelationTupleFilter;
  static deserializeBinaryFromReader(message: RelationTupleFilter, reader: jspb.BinaryReader): RelationTupleFilter;
}

export namespace RelationTupleFilter {
  export type AsObject = {
    namespace: string,
    objectId: string,
    relation: string,
    userset?: authzed_api_v0_core_pb.ObjectAndRelation.AsObject,
    filtersList: Array<RelationTupleFilter.Filter>,
  }

  export enum Filter { 
    UNKNOWN = 0,
    OBJECT_ID = 1,
    RELATION = 2,
    USERSET = 4,
  }
}

export class ReadRequest extends jspb.Message {
  getTuplesetsList(): Array<RelationTupleFilter>;
  setTuplesetsList(value: Array<RelationTupleFilter>): ReadRequest;
  clearTuplesetsList(): ReadRequest;
  addTuplesets(value?: RelationTupleFilter, index?: number): RelationTupleFilter;

  getAtRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setAtRevision(value?: authzed_api_v0_core_pb.Zookie): ReadRequest;
  hasAtRevision(): boolean;
  clearAtRevision(): ReadRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ReadRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ReadRequest): ReadRequest.AsObject;
  static serializeBinaryToWriter(message: ReadRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ReadRequest;
  static deserializeBinaryFromReader(message: ReadRequest, reader: jspb.BinaryReader): ReadRequest;
}

export namespace ReadRequest {
  export type AsObject = {
    tuplesetsList: Array<RelationTupleFilter.AsObject>,
    atRevision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class ReadResponse extends jspb.Message {
  getTuplesetsList(): Array<ReadResponse.Tupleset>;
  setTuplesetsList(value: Array<ReadResponse.Tupleset>): ReadResponse;
  clearTuplesetsList(): ReadResponse;
  addTuplesets(value?: ReadResponse.Tupleset, index?: number): ReadResponse.Tupleset;

  getRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setRevision(value?: authzed_api_v0_core_pb.Zookie): ReadResponse;
  hasRevision(): boolean;
  clearRevision(): ReadResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ReadResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ReadResponse): ReadResponse.AsObject;
  static serializeBinaryToWriter(message: ReadResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ReadResponse;
  static deserializeBinaryFromReader(message: ReadResponse, reader: jspb.BinaryReader): ReadResponse;
}

export namespace ReadResponse {
  export type AsObject = {
    tuplesetsList: Array<ReadResponse.Tupleset.AsObject>,
    revision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }

  export class Tupleset extends jspb.Message {
    getTuplesList(): Array<authzed_api_v0_core_pb.RelationTuple>;
    setTuplesList(value: Array<authzed_api_v0_core_pb.RelationTuple>): Tupleset;
    clearTuplesList(): Tupleset;
    addTuples(value?: authzed_api_v0_core_pb.RelationTuple, index?: number): authzed_api_v0_core_pb.RelationTuple;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Tupleset.AsObject;
    static toObject(includeInstance: boolean, msg: Tupleset): Tupleset.AsObject;
    static serializeBinaryToWriter(message: Tupleset, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Tupleset;
    static deserializeBinaryFromReader(message: Tupleset, reader: jspb.BinaryReader): Tupleset;
  }

  export namespace Tupleset {
    export type AsObject = {
      tuplesList: Array<authzed_api_v0_core_pb.RelationTuple.AsObject>,
    }
  }

}

export class WriteRequest extends jspb.Message {
  getWriteConditionsList(): Array<authzed_api_v0_core_pb.RelationTuple>;
  setWriteConditionsList(value: Array<authzed_api_v0_core_pb.RelationTuple>): WriteRequest;
  clearWriteConditionsList(): WriteRequest;
  addWriteConditions(value?: authzed_api_v0_core_pb.RelationTuple, index?: number): authzed_api_v0_core_pb.RelationTuple;

  getUpdatesList(): Array<authzed_api_v0_core_pb.RelationTupleUpdate>;
  setUpdatesList(value: Array<authzed_api_v0_core_pb.RelationTupleUpdate>): WriteRequest;
  clearUpdatesList(): WriteRequest;
  addUpdates(value?: authzed_api_v0_core_pb.RelationTupleUpdate, index?: number): authzed_api_v0_core_pb.RelationTupleUpdate;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): WriteRequest.AsObject;
  static toObject(includeInstance: boolean, msg: WriteRequest): WriteRequest.AsObject;
  static serializeBinaryToWriter(message: WriteRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): WriteRequest;
  static deserializeBinaryFromReader(message: WriteRequest, reader: jspb.BinaryReader): WriteRequest;
}

export namespace WriteRequest {
  export type AsObject = {
    writeConditionsList: Array<authzed_api_v0_core_pb.RelationTuple.AsObject>,
    updatesList: Array<authzed_api_v0_core_pb.RelationTupleUpdate.AsObject>,
  }
}

export class WriteResponse extends jspb.Message {
  getRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setRevision(value?: authzed_api_v0_core_pb.Zookie): WriteResponse;
  hasRevision(): boolean;
  clearRevision(): WriteResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): WriteResponse.AsObject;
  static toObject(includeInstance: boolean, msg: WriteResponse): WriteResponse.AsObject;
  static serializeBinaryToWriter(message: WriteResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): WriteResponse;
  static deserializeBinaryFromReader(message: WriteResponse, reader: jspb.BinaryReader): WriteResponse;
}

export namespace WriteResponse {
  export type AsObject = {
    revision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class CheckRequest extends jspb.Message {
  getTestUserset(): authzed_api_v0_core_pb.ObjectAndRelation | undefined;
  setTestUserset(value?: authzed_api_v0_core_pb.ObjectAndRelation): CheckRequest;
  hasTestUserset(): boolean;
  clearTestUserset(): CheckRequest;

  getUser(): authzed_api_v0_core_pb.User | undefined;
  setUser(value?: authzed_api_v0_core_pb.User): CheckRequest;
  hasUser(): boolean;
  clearUser(): CheckRequest;

  getAtRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setAtRevision(value?: authzed_api_v0_core_pb.Zookie): CheckRequest;
  hasAtRevision(): boolean;
  clearAtRevision(): CheckRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CheckRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CheckRequest): CheckRequest.AsObject;
  static serializeBinaryToWriter(message: CheckRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CheckRequest;
  static deserializeBinaryFromReader(message: CheckRequest, reader: jspb.BinaryReader): CheckRequest;
}

export namespace CheckRequest {
  export type AsObject = {
    testUserset?: authzed_api_v0_core_pb.ObjectAndRelation.AsObject,
    user?: authzed_api_v0_core_pb.User.AsObject,
    atRevision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class ContentChangeCheckRequest extends jspb.Message {
  getTestUserset(): authzed_api_v0_core_pb.ObjectAndRelation | undefined;
  setTestUserset(value?: authzed_api_v0_core_pb.ObjectAndRelation): ContentChangeCheckRequest;
  hasTestUserset(): boolean;
  clearTestUserset(): ContentChangeCheckRequest;

  getUser(): authzed_api_v0_core_pb.User | undefined;
  setUser(value?: authzed_api_v0_core_pb.User): ContentChangeCheckRequest;
  hasUser(): boolean;
  clearUser(): ContentChangeCheckRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ContentChangeCheckRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ContentChangeCheckRequest): ContentChangeCheckRequest.AsObject;
  static serializeBinaryToWriter(message: ContentChangeCheckRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ContentChangeCheckRequest;
  static deserializeBinaryFromReader(message: ContentChangeCheckRequest, reader: jspb.BinaryReader): ContentChangeCheckRequest;
}

export namespace ContentChangeCheckRequest {
  export type AsObject = {
    testUserset?: authzed_api_v0_core_pb.ObjectAndRelation.AsObject,
    user?: authzed_api_v0_core_pb.User.AsObject,
  }
}

export class CheckResponse extends jspb.Message {
  getIsMember(): boolean;
  setIsMember(value: boolean): CheckResponse;

  getRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setRevision(value?: authzed_api_v0_core_pb.Zookie): CheckResponse;
  hasRevision(): boolean;
  clearRevision(): CheckResponse;

  getMembership(): CheckResponse.Membership;
  setMembership(value: CheckResponse.Membership): CheckResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CheckResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CheckResponse): CheckResponse.AsObject;
  static serializeBinaryToWriter(message: CheckResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CheckResponse;
  static deserializeBinaryFromReader(message: CheckResponse, reader: jspb.BinaryReader): CheckResponse;
}

export namespace CheckResponse {
  export type AsObject = {
    isMember: boolean,
    revision?: authzed_api_v0_core_pb.Zookie.AsObject,
    membership: CheckResponse.Membership,
  }

  export enum Membership { 
    UNKNOWN = 0,
    NOT_MEMBER = 1,
    MEMBER = 2,
  }
}

export class ExpandRequest extends jspb.Message {
  getUserset(): authzed_api_v0_core_pb.ObjectAndRelation | undefined;
  setUserset(value?: authzed_api_v0_core_pb.ObjectAndRelation): ExpandRequest;
  hasUserset(): boolean;
  clearUserset(): ExpandRequest;

  getAtRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setAtRevision(value?: authzed_api_v0_core_pb.Zookie): ExpandRequest;
  hasAtRevision(): boolean;
  clearAtRevision(): ExpandRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExpandRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ExpandRequest): ExpandRequest.AsObject;
  static serializeBinaryToWriter(message: ExpandRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExpandRequest;
  static deserializeBinaryFromReader(message: ExpandRequest, reader: jspb.BinaryReader): ExpandRequest;
}

export namespace ExpandRequest {
  export type AsObject = {
    userset?: authzed_api_v0_core_pb.ObjectAndRelation.AsObject,
    atRevision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class ExpandResponse extends jspb.Message {
  getTreeNode(): authzed_api_v0_core_pb.RelationTupleTreeNode | undefined;
  setTreeNode(value?: authzed_api_v0_core_pb.RelationTupleTreeNode): ExpandResponse;
  hasTreeNode(): boolean;
  clearTreeNode(): ExpandResponse;

  getRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setRevision(value?: authzed_api_v0_core_pb.Zookie): ExpandResponse;
  hasRevision(): boolean;
  clearRevision(): ExpandResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExpandResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ExpandResponse): ExpandResponse.AsObject;
  static serializeBinaryToWriter(message: ExpandResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExpandResponse;
  static deserializeBinaryFromReader(message: ExpandResponse, reader: jspb.BinaryReader): ExpandResponse;
}

export namespace ExpandResponse {
  export type AsObject = {
    treeNode?: authzed_api_v0_core_pb.RelationTupleTreeNode.AsObject,
    revision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class LookupRequest extends jspb.Message {
  getObjectRelation(): authzed_api_v0_core_pb.RelationReference | undefined;
  setObjectRelation(value?: authzed_api_v0_core_pb.RelationReference): LookupRequest;
  hasObjectRelation(): boolean;
  clearObjectRelation(): LookupRequest;

  getUser(): authzed_api_v0_core_pb.ObjectAndRelation | undefined;
  setUser(value?: authzed_api_v0_core_pb.ObjectAndRelation): LookupRequest;
  hasUser(): boolean;
  clearUser(): LookupRequest;

  getAtRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setAtRevision(value?: authzed_api_v0_core_pb.Zookie): LookupRequest;
  hasAtRevision(): boolean;
  clearAtRevision(): LookupRequest;

  getPageReference(): string;
  setPageReference(value: string): LookupRequest;

  getLimit(): number;
  setLimit(value: number): LookupRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LookupRequest.AsObject;
  static toObject(includeInstance: boolean, msg: LookupRequest): LookupRequest.AsObject;
  static serializeBinaryToWriter(message: LookupRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LookupRequest;
  static deserializeBinaryFromReader(message: LookupRequest, reader: jspb.BinaryReader): LookupRequest;
}

export namespace LookupRequest {
  export type AsObject = {
    objectRelation?: authzed_api_v0_core_pb.RelationReference.AsObject,
    user?: authzed_api_v0_core_pb.ObjectAndRelation.AsObject,
    atRevision?: authzed_api_v0_core_pb.Zookie.AsObject,
    pageReference: string,
    limit: number,
  }
}

export class LookupResponse extends jspb.Message {
  getResolvedObjectIdsList(): Array<string>;
  setResolvedObjectIdsList(value: Array<string>): LookupResponse;
  clearResolvedObjectIdsList(): LookupResponse;
  addResolvedObjectIds(value: string, index?: number): LookupResponse;

  getNextPageReference(): string;
  setNextPageReference(value: string): LookupResponse;

  getRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setRevision(value?: authzed_api_v0_core_pb.Zookie): LookupResponse;
  hasRevision(): boolean;
  clearRevision(): LookupResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LookupResponse.AsObject;
  static toObject(includeInstance: boolean, msg: LookupResponse): LookupResponse.AsObject;
  static serializeBinaryToWriter(message: LookupResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LookupResponse;
  static deserializeBinaryFromReader(message: LookupResponse, reader: jspb.BinaryReader): LookupResponse;
}

export namespace LookupResponse {
  export type AsObject = {
    resolvedObjectIdsList: Array<string>,
    nextPageReference: string,
    revision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

