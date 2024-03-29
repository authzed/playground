import * as jspb from 'google-protobuf'

import * as authzed_api_v0_core_pb from '../../../authzed/api/v0/core_pb';
import * as authzed_api_v0_namespace_pb from '../../../authzed/api/v0/namespace_pb';


export class FormatSchemaRequest extends jspb.Message {
  getSchema(): string;
  setSchema(value: string): FormatSchemaRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FormatSchemaRequest.AsObject;
  static toObject(includeInstance: boolean, msg: FormatSchemaRequest): FormatSchemaRequest.AsObject;
  static serializeBinaryToWriter(message: FormatSchemaRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FormatSchemaRequest;
  static deserializeBinaryFromReader(message: FormatSchemaRequest, reader: jspb.BinaryReader): FormatSchemaRequest;
}

export namespace FormatSchemaRequest {
  export type AsObject = {
    schema: string,
  }
}

export class FormatSchemaResponse extends jspb.Message {
  getError(): DeveloperError | undefined;
  setError(value?: DeveloperError): FormatSchemaResponse;
  hasError(): boolean;
  clearError(): FormatSchemaResponse;

  getFormattedSchema(): string;
  setFormattedSchema(value: string): FormatSchemaResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FormatSchemaResponse.AsObject;
  static toObject(includeInstance: boolean, msg: FormatSchemaResponse): FormatSchemaResponse.AsObject;
  static serializeBinaryToWriter(message: FormatSchemaResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FormatSchemaResponse;
  static deserializeBinaryFromReader(message: FormatSchemaResponse, reader: jspb.BinaryReader): FormatSchemaResponse;
}

export namespace FormatSchemaResponse {
  export type AsObject = {
    error?: DeveloperError.AsObject,
    formattedSchema: string,
  }
}

export class UpgradeSchemaRequest extends jspb.Message {
  getNamespaceConfigsList(): Array<string>;
  setNamespaceConfigsList(value: Array<string>): UpgradeSchemaRequest;
  clearNamespaceConfigsList(): UpgradeSchemaRequest;
  addNamespaceConfigs(value: string, index?: number): UpgradeSchemaRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpgradeSchemaRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpgradeSchemaRequest): UpgradeSchemaRequest.AsObject;
  static serializeBinaryToWriter(message: UpgradeSchemaRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpgradeSchemaRequest;
  static deserializeBinaryFromReader(message: UpgradeSchemaRequest, reader: jspb.BinaryReader): UpgradeSchemaRequest;
}

export namespace UpgradeSchemaRequest {
  export type AsObject = {
    namespaceConfigsList: Array<string>,
  }
}

export class UpgradeSchemaResponse extends jspb.Message {
  getError(): DeveloperError | undefined;
  setError(value?: DeveloperError): UpgradeSchemaResponse;
  hasError(): boolean;
  clearError(): UpgradeSchemaResponse;

  getUpgradedSchema(): string;
  setUpgradedSchema(value: string): UpgradeSchemaResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpgradeSchemaResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpgradeSchemaResponse): UpgradeSchemaResponse.AsObject;
  static serializeBinaryToWriter(message: UpgradeSchemaResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpgradeSchemaResponse;
  static deserializeBinaryFromReader(message: UpgradeSchemaResponse, reader: jspb.BinaryReader): UpgradeSchemaResponse;
}

export namespace UpgradeSchemaResponse {
  export type AsObject = {
    error?: DeveloperError.AsObject,
    upgradedSchema: string,
  }
}

export class ShareRequest extends jspb.Message {
  getSchema(): string;
  setSchema(value: string): ShareRequest;

  getRelationshipsYaml(): string;
  setRelationshipsYaml(value: string): ShareRequest;

  getValidationYaml(): string;
  setValidationYaml(value: string): ShareRequest;

  getAssertionsYaml(): string;
  setAssertionsYaml(value: string): ShareRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ShareRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ShareRequest): ShareRequest.AsObject;
  static serializeBinaryToWriter(message: ShareRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ShareRequest;
  static deserializeBinaryFromReader(message: ShareRequest, reader: jspb.BinaryReader): ShareRequest;
}

export namespace ShareRequest {
  export type AsObject = {
    schema: string,
    relationshipsYaml: string,
    validationYaml: string,
    assertionsYaml: string,
  }
}

export class ShareResponse extends jspb.Message {
  getShareReference(): string;
  setShareReference(value: string): ShareResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ShareResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ShareResponse): ShareResponse.AsObject;
  static serializeBinaryToWriter(message: ShareResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ShareResponse;
  static deserializeBinaryFromReader(message: ShareResponse, reader: jspb.BinaryReader): ShareResponse;
}

export namespace ShareResponse {
  export type AsObject = {
    shareReference: string,
  }
}

export class LookupShareRequest extends jspb.Message {
  getShareReference(): string;
  setShareReference(value: string): LookupShareRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LookupShareRequest.AsObject;
  static toObject(includeInstance: boolean, msg: LookupShareRequest): LookupShareRequest.AsObject;
  static serializeBinaryToWriter(message: LookupShareRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LookupShareRequest;
  static deserializeBinaryFromReader(message: LookupShareRequest, reader: jspb.BinaryReader): LookupShareRequest;
}

export namespace LookupShareRequest {
  export type AsObject = {
    shareReference: string,
  }
}

export class LookupShareResponse extends jspb.Message {
  getStatus(): LookupShareResponse.LookupStatus;
  setStatus(value: LookupShareResponse.LookupStatus): LookupShareResponse;

  getSchema(): string;
  setSchema(value: string): LookupShareResponse;

  getRelationshipsYaml(): string;
  setRelationshipsYaml(value: string): LookupShareResponse;

  getValidationYaml(): string;
  setValidationYaml(value: string): LookupShareResponse;

  getAssertionsYaml(): string;
  setAssertionsYaml(value: string): LookupShareResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LookupShareResponse.AsObject;
  static toObject(includeInstance: boolean, msg: LookupShareResponse): LookupShareResponse.AsObject;
  static serializeBinaryToWriter(message: LookupShareResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LookupShareResponse;
  static deserializeBinaryFromReader(message: LookupShareResponse, reader: jspb.BinaryReader): LookupShareResponse;
}

export namespace LookupShareResponse {
  export type AsObject = {
    status: LookupShareResponse.LookupStatus,
    schema: string,
    relationshipsYaml: string,
    validationYaml: string,
    assertionsYaml: string,
  }

  export enum LookupStatus { 
    UNKNOWN_REFERENCE = 0,
    FAILED_TO_LOOKUP = 1,
    VALID_REFERENCE = 2,
    UPGRADED_REFERENCE = 3,
  }
}

export class RequestContext extends jspb.Message {
  getSchema(): string;
  setSchema(value: string): RequestContext;

  getRelationshipsList(): Array<authzed_api_v0_core_pb.RelationTuple>;
  setRelationshipsList(value: Array<authzed_api_v0_core_pb.RelationTuple>): RequestContext;
  clearRelationshipsList(): RequestContext;
  addRelationships(value?: authzed_api_v0_core_pb.RelationTuple, index?: number): authzed_api_v0_core_pb.RelationTuple;

  getLegacyNsConfigsList(): Array<authzed_api_v0_namespace_pb.NamespaceDefinition>;
  setLegacyNsConfigsList(value: Array<authzed_api_v0_namespace_pb.NamespaceDefinition>): RequestContext;
  clearLegacyNsConfigsList(): RequestContext;
  addLegacyNsConfigs(value?: authzed_api_v0_namespace_pb.NamespaceDefinition, index?: number): authzed_api_v0_namespace_pb.NamespaceDefinition;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RequestContext.AsObject;
  static toObject(includeInstance: boolean, msg: RequestContext): RequestContext.AsObject;
  static serializeBinaryToWriter(message: RequestContext, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RequestContext;
  static deserializeBinaryFromReader(message: RequestContext, reader: jspb.BinaryReader): RequestContext;
}

export namespace RequestContext {
  export type AsObject = {
    schema: string,
    relationshipsList: Array<authzed_api_v0_core_pb.RelationTuple.AsObject>,
    legacyNsConfigsList: Array<authzed_api_v0_namespace_pb.NamespaceDefinition.AsObject>,
  }
}

export class EditCheckRequest extends jspb.Message {
  getContext(): RequestContext | undefined;
  setContext(value?: RequestContext): EditCheckRequest;
  hasContext(): boolean;
  clearContext(): EditCheckRequest;

  getCheckRelationshipsList(): Array<authzed_api_v0_core_pb.RelationTuple>;
  setCheckRelationshipsList(value: Array<authzed_api_v0_core_pb.RelationTuple>): EditCheckRequest;
  clearCheckRelationshipsList(): EditCheckRequest;
  addCheckRelationships(value?: authzed_api_v0_core_pb.RelationTuple, index?: number): authzed_api_v0_core_pb.RelationTuple;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditCheckRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EditCheckRequest): EditCheckRequest.AsObject;
  static serializeBinaryToWriter(message: EditCheckRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditCheckRequest;
  static deserializeBinaryFromReader(message: EditCheckRequest, reader: jspb.BinaryReader): EditCheckRequest;
}

export namespace EditCheckRequest {
  export type AsObject = {
    context?: RequestContext.AsObject,
    checkRelationshipsList: Array<authzed_api_v0_core_pb.RelationTuple.AsObject>,
  }
}

export class EditCheckResult extends jspb.Message {
  getRelationship(): authzed_api_v0_core_pb.RelationTuple | undefined;
  setRelationship(value?: authzed_api_v0_core_pb.RelationTuple): EditCheckResult;
  hasRelationship(): boolean;
  clearRelationship(): EditCheckResult;

  getIsMember(): boolean;
  setIsMember(value: boolean): EditCheckResult;

  getError(): DeveloperError | undefined;
  setError(value?: DeveloperError): EditCheckResult;
  hasError(): boolean;
  clearError(): EditCheckResult;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditCheckResult.AsObject;
  static toObject(includeInstance: boolean, msg: EditCheckResult): EditCheckResult.AsObject;
  static serializeBinaryToWriter(message: EditCheckResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditCheckResult;
  static deserializeBinaryFromReader(message: EditCheckResult, reader: jspb.BinaryReader): EditCheckResult;
}

export namespace EditCheckResult {
  export type AsObject = {
    relationship?: authzed_api_v0_core_pb.RelationTuple.AsObject,
    isMember: boolean,
    error?: DeveloperError.AsObject,
  }
}

export class EditCheckResponse extends jspb.Message {
  getRequestErrorsList(): Array<DeveloperError>;
  setRequestErrorsList(value: Array<DeveloperError>): EditCheckResponse;
  clearRequestErrorsList(): EditCheckResponse;
  addRequestErrors(value?: DeveloperError, index?: number): DeveloperError;

  getCheckResultsList(): Array<EditCheckResult>;
  setCheckResultsList(value: Array<EditCheckResult>): EditCheckResponse;
  clearCheckResultsList(): EditCheckResponse;
  addCheckResults(value?: EditCheckResult, index?: number): EditCheckResult;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditCheckResponse.AsObject;
  static toObject(includeInstance: boolean, msg: EditCheckResponse): EditCheckResponse.AsObject;
  static serializeBinaryToWriter(message: EditCheckResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditCheckResponse;
  static deserializeBinaryFromReader(message: EditCheckResponse, reader: jspb.BinaryReader): EditCheckResponse;
}

export namespace EditCheckResponse {
  export type AsObject = {
    requestErrorsList: Array<DeveloperError.AsObject>,
    checkResultsList: Array<EditCheckResult.AsObject>,
  }
}

export class ValidateRequest extends jspb.Message {
  getContext(): RequestContext | undefined;
  setContext(value?: RequestContext): ValidateRequest;
  hasContext(): boolean;
  clearContext(): ValidateRequest;

  getValidationYaml(): string;
  setValidationYaml(value: string): ValidateRequest;

  getUpdateValidationYaml(): boolean;
  setUpdateValidationYaml(value: boolean): ValidateRequest;

  getAssertionsYaml(): string;
  setAssertionsYaml(value: string): ValidateRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ValidateRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ValidateRequest): ValidateRequest.AsObject;
  static serializeBinaryToWriter(message: ValidateRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ValidateRequest;
  static deserializeBinaryFromReader(message: ValidateRequest, reader: jspb.BinaryReader): ValidateRequest;
}

export namespace ValidateRequest {
  export type AsObject = {
    context?: RequestContext.AsObject,
    validationYaml: string,
    updateValidationYaml: boolean,
    assertionsYaml: string,
  }
}

export class ValidateResponse extends jspb.Message {
  getRequestErrorsList(): Array<DeveloperError>;
  setRequestErrorsList(value: Array<DeveloperError>): ValidateResponse;
  clearRequestErrorsList(): ValidateResponse;
  addRequestErrors(value?: DeveloperError, index?: number): DeveloperError;

  getValidationErrorsList(): Array<DeveloperError>;
  setValidationErrorsList(value: Array<DeveloperError>): ValidateResponse;
  clearValidationErrorsList(): ValidateResponse;
  addValidationErrors(value?: DeveloperError, index?: number): DeveloperError;

  getUpdatedValidationYaml(): string;
  setUpdatedValidationYaml(value: string): ValidateResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ValidateResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ValidateResponse): ValidateResponse.AsObject;
  static serializeBinaryToWriter(message: ValidateResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ValidateResponse;
  static deserializeBinaryFromReader(message: ValidateResponse, reader: jspb.BinaryReader): ValidateResponse;
}

export namespace ValidateResponse {
  export type AsObject = {
    requestErrorsList: Array<DeveloperError.AsObject>,
    validationErrorsList: Array<DeveloperError.AsObject>,
    updatedValidationYaml: string,
  }
}

export class DeveloperError extends jspb.Message {
  getMessage(): string;
  setMessage(value: string): DeveloperError;

  getLine(): number;
  setLine(value: number): DeveloperError;

  getColumn(): number;
  setColumn(value: number): DeveloperError;

  getSource(): DeveloperError.Source;
  setSource(value: DeveloperError.Source): DeveloperError;

  getKind(): DeveloperError.ErrorKind;
  setKind(value: DeveloperError.ErrorKind): DeveloperError;

  getPathList(): Array<string>;
  setPathList(value: Array<string>): DeveloperError;
  clearPathList(): DeveloperError;
  addPath(value: string, index?: number): DeveloperError;

  getContext(): string;
  setContext(value: string): DeveloperError;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeveloperError.AsObject;
  static toObject(includeInstance: boolean, msg: DeveloperError): DeveloperError.AsObject;
  static serializeBinaryToWriter(message: DeveloperError, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeveloperError;
  static deserializeBinaryFromReader(message: DeveloperError, reader: jspb.BinaryReader): DeveloperError;
}

export namespace DeveloperError {
  export type AsObject = {
    message: string,
    line: number,
    column: number,
    source: DeveloperError.Source,
    kind: DeveloperError.ErrorKind,
    pathList: Array<string>,
    context: string,
  }

  export enum Source { 
    UNKNOWN_SOURCE = 0,
    SCHEMA = 1,
    RELATIONSHIP = 2,
    VALIDATION_YAML = 3,
    CHECK_WATCH = 4,
    ASSERTION = 5,
  }

  export enum ErrorKind { 
    UNKNOWN_KIND = 0,
    PARSE_ERROR = 1,
    SCHEMA_ISSUE = 2,
    DUPLICATE_RELATIONSHIP = 3,
    MISSING_EXPECTED_RELATIONSHIP = 4,
    EXTRA_RELATIONSHIP_FOUND = 5,
    UNKNOWN_OBJECT_TYPE = 6,
    UNKNOWN_RELATION = 7,
    MAXIMUM_RECURSION = 8,
    ASSERTION_FAILED = 9,
  }
}

