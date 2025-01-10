import * as jspb from 'google-protobuf'

import * as validate_validate_pb from '../../../validate/validate_pb';
import * as authzed_api_v0_core_pb from '../../../authzed/api/v0/core_pb';
import * as authzed_api_v0_namespace_pb from '../../../authzed/api/v0/namespace_pb';


export class ReadConfigRequest extends jspb.Message {
  getNamespace(): string;
  setNamespace(value: string): ReadConfigRequest;

  getAtRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setAtRevision(value?: authzed_api_v0_core_pb.Zookie): ReadConfigRequest;
  hasAtRevision(): boolean;
  clearAtRevision(): ReadConfigRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ReadConfigRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ReadConfigRequest): ReadConfigRequest.AsObject;
  static serializeBinaryToWriter(message: ReadConfigRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ReadConfigRequest;
  static deserializeBinaryFromReader(message: ReadConfigRequest, reader: jspb.BinaryReader): ReadConfigRequest;
}

export namespace ReadConfigRequest {
  export type AsObject = {
    namespace: string,
    atRevision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class ReadConfigResponse extends jspb.Message {
  getNamespace(): string;
  setNamespace(value: string): ReadConfigResponse;

  getConfig(): authzed_api_v0_namespace_pb.NamespaceDefinition | undefined;
  setConfig(value?: authzed_api_v0_namespace_pb.NamespaceDefinition): ReadConfigResponse;
  hasConfig(): boolean;
  clearConfig(): ReadConfigResponse;

  getRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setRevision(value?: authzed_api_v0_core_pb.Zookie): ReadConfigResponse;
  hasRevision(): boolean;
  clearRevision(): ReadConfigResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ReadConfigResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ReadConfigResponse): ReadConfigResponse.AsObject;
  static serializeBinaryToWriter(message: ReadConfigResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ReadConfigResponse;
  static deserializeBinaryFromReader(message: ReadConfigResponse, reader: jspb.BinaryReader): ReadConfigResponse;
}

export namespace ReadConfigResponse {
  export type AsObject = {
    namespace: string,
    config?: authzed_api_v0_namespace_pb.NamespaceDefinition.AsObject,
    revision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class WriteConfigRequest extends jspb.Message {
  getConfigsList(): Array<authzed_api_v0_namespace_pb.NamespaceDefinition>;
  setConfigsList(value: Array<authzed_api_v0_namespace_pb.NamespaceDefinition>): WriteConfigRequest;
  clearConfigsList(): WriteConfigRequest;
  addConfigs(value?: authzed_api_v0_namespace_pb.NamespaceDefinition, index?: number): authzed_api_v0_namespace_pb.NamespaceDefinition;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): WriteConfigRequest.AsObject;
  static toObject(includeInstance: boolean, msg: WriteConfigRequest): WriteConfigRequest.AsObject;
  static serializeBinaryToWriter(message: WriteConfigRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): WriteConfigRequest;
  static deserializeBinaryFromReader(message: WriteConfigRequest, reader: jspb.BinaryReader): WriteConfigRequest;
}

export namespace WriteConfigRequest {
  export type AsObject = {
    configsList: Array<authzed_api_v0_namespace_pb.NamespaceDefinition.AsObject>,
  }
}

export class WriteConfigResponse extends jspb.Message {
  getRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setRevision(value?: authzed_api_v0_core_pb.Zookie): WriteConfigResponse;
  hasRevision(): boolean;
  clearRevision(): WriteConfigResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): WriteConfigResponse.AsObject;
  static toObject(includeInstance: boolean, msg: WriteConfigResponse): WriteConfigResponse.AsObject;
  static serializeBinaryToWriter(message: WriteConfigResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): WriteConfigResponse;
  static deserializeBinaryFromReader(message: WriteConfigResponse, reader: jspb.BinaryReader): WriteConfigResponse;
}

export namespace WriteConfigResponse {
  export type AsObject = {
    revision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

export class DeleteConfigsRequest extends jspb.Message {
  getNamespacesList(): Array<string>;
  setNamespacesList(value: Array<string>): DeleteConfigsRequest;
  clearNamespacesList(): DeleteConfigsRequest;
  addNamespaces(value: string, index?: number): DeleteConfigsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteConfigsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteConfigsRequest): DeleteConfigsRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteConfigsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteConfigsRequest;
  static deserializeBinaryFromReader(message: DeleteConfigsRequest, reader: jspb.BinaryReader): DeleteConfigsRequest;
}

export namespace DeleteConfigsRequest {
  export type AsObject = {
    namespacesList: Array<string>,
  }
}

export class DeleteConfigsResponse extends jspb.Message {
  getRevision(): authzed_api_v0_core_pb.Zookie | undefined;
  setRevision(value?: authzed_api_v0_core_pb.Zookie): DeleteConfigsResponse;
  hasRevision(): boolean;
  clearRevision(): DeleteConfigsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteConfigsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteConfigsResponse): DeleteConfigsResponse.AsObject;
  static serializeBinaryToWriter(message: DeleteConfigsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteConfigsResponse;
  static deserializeBinaryFromReader(message: DeleteConfigsResponse, reader: jspb.BinaryReader): DeleteConfigsResponse;
}

export namespace DeleteConfigsResponse {
  export type AsObject = {
    revision?: authzed_api_v0_core_pb.Zookie.AsObject,
  }
}

