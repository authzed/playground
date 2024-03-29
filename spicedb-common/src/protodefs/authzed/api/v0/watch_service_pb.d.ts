import * as jspb from 'google-protobuf'

import * as validate_validate_pb from '../../../validate/validate_pb';
import * as authzed_api_v0_core_pb from '../../../authzed/api/v0/core_pb';


export class WatchRequest extends jspb.Message {
  getNamespacesList(): Array<string>;
  setNamespacesList(value: Array<string>): WatchRequest;
  clearNamespacesList(): WatchRequest;
  addNamespaces(value: string, index?: number): WatchRequest;

  getStartRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setStartRevision(value?: authzed_api_v0_core_pb.Zookie): WatchRequest;
  hasStartRevision(): boolean;
  clearStartRevision(): WatchRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): WatchRequest.AsObject;
  static toObject(includeInstance: boolean, msg: WatchRequest): WatchRequest.AsObject;
  static serializeBinaryToWriter(message: WatchRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): WatchRequest;
  static deserializeBinaryFromReader(message: WatchRequest, reader: jspb.BinaryReader): WatchRequest;
}

export namespace WatchRequest {
  export type AsObject = {
    namespacesList: Array<string>,
    startRevision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class WatchResponse extends jspb.Message {
  getUpdatesList(): Array<authzed_api_v0_core_pb.RelationTupleUpdate>;
  setUpdatesList(value: Array<authzed_api_v0_core_pb.RelationTupleUpdate>): WatchResponse;
  clearUpdatesList(): WatchResponse;
  addUpdates(value?: authzed_api_v0_core_pb.RelationTupleUpdate, index?: number): authzed_api_v0_core_pb.RelationTupleUpdate;

  getEndRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setEndRevision(value?: authzed_api_v0_core_pb.Zookie): WatchResponse;
  hasEndRevision(): boolean;
  clearEndRevision(): WatchResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): WatchResponse.AsObject;
  static toObject(includeInstance: boolean, msg: WatchResponse): WatchResponse.AsObject;
  static serializeBinaryToWriter(message: WatchResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): WatchResponse;
  static deserializeBinaryFromReader(message: WatchResponse, reader: jspb.BinaryReader): WatchResponse;
}

export namespace WatchResponse {
  export type AsObject = {
    updatesList: Array<authzed_api_v0_core_pb.RelationTupleUpdate.AsObject>,
    endRevision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

