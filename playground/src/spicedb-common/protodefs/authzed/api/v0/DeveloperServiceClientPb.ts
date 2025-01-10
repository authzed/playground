/**
 * @fileoverview gRPC-Web generated client stub for authzed.api.v0
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck


import * as grpcWeb from 'grpc-web';

import * as authzed_api_v0_developer_pb from '../../../authzed/api/v0/developer_pb';


export class DeveloperServiceClient {
  client_: grpcWeb.AbstractClientBase;
  hostname_: string;
  credentials_: null | { [index: string]: string; };
  options_: null | { [index: string]: any; };

  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; }) {
    if (!options) options = {};
    if (!credentials) credentials = {};
    options['format'] = 'text';

    this.client_ = new grpcWeb.GrpcWebClientBase(options);
    this.hostname_ = hostname;
    this.credentials_ = credentials;
    this.options_ = options;
  }

  methodInfoEditCheck = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.DeveloperService/EditCheck',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_developer_pb.EditCheckRequest,
    authzed_api_v0_developer_pb.EditCheckResponse,
    (request: authzed_api_v0_developer_pb.EditCheckRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_developer_pb.EditCheckResponse.deserializeBinary
  );

  editCheck(
    request: authzed_api_v0_developer_pb.EditCheckRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_developer_pb.EditCheckResponse>;

  editCheck(
    request: authzed_api_v0_developer_pb.EditCheckRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.EditCheckResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_developer_pb.EditCheckResponse>;

  editCheck(
    request: authzed_api_v0_developer_pb.EditCheckRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.EditCheckResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.DeveloperService/EditCheck',
        request,
        metadata || {},
        this.methodInfoEditCheck,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.DeveloperService/EditCheck',
    request,
    metadata || {},
    this.methodInfoEditCheck);
  }

  methodInfoValidate = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.DeveloperService/Validate',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_developer_pb.ValidateRequest,
    authzed_api_v0_developer_pb.ValidateResponse,
    (request: authzed_api_v0_developer_pb.ValidateRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_developer_pb.ValidateResponse.deserializeBinary
  );

  validate(
    request: authzed_api_v0_developer_pb.ValidateRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_developer_pb.ValidateResponse>;

  validate(
    request: authzed_api_v0_developer_pb.ValidateRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.ValidateResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_developer_pb.ValidateResponse>;

  validate(
    request: authzed_api_v0_developer_pb.ValidateRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.ValidateResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.DeveloperService/Validate',
        request,
        metadata || {},
        this.methodInfoValidate,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.DeveloperService/Validate',
    request,
    metadata || {},
    this.methodInfoValidate);
  }

  methodInfoShare = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.DeveloperService/Share',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_developer_pb.ShareRequest,
    authzed_api_v0_developer_pb.ShareResponse,
    (request: authzed_api_v0_developer_pb.ShareRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_developer_pb.ShareResponse.deserializeBinary
  );

  share(
    request: authzed_api_v0_developer_pb.ShareRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_developer_pb.ShareResponse>;

  share(
    request: authzed_api_v0_developer_pb.ShareRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.ShareResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_developer_pb.ShareResponse>;

  share(
    request: authzed_api_v0_developer_pb.ShareRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.ShareResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.DeveloperService/Share',
        request,
        metadata || {},
        this.methodInfoShare,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.DeveloperService/Share',
    request,
    metadata || {},
    this.methodInfoShare);
  }

  methodInfoLookupShared = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.DeveloperService/LookupShared',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_developer_pb.LookupShareRequest,
    authzed_api_v0_developer_pb.LookupShareResponse,
    (request: authzed_api_v0_developer_pb.LookupShareRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_developer_pb.LookupShareResponse.deserializeBinary
  );

  lookupShared(
    request: authzed_api_v0_developer_pb.LookupShareRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_developer_pb.LookupShareResponse>;

  lookupShared(
    request: authzed_api_v0_developer_pb.LookupShareRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.LookupShareResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_developer_pb.LookupShareResponse>;

  lookupShared(
    request: authzed_api_v0_developer_pb.LookupShareRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.LookupShareResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.DeveloperService/LookupShared',
        request,
        metadata || {},
        this.methodInfoLookupShared,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.DeveloperService/LookupShared',
    request,
    metadata || {},
    this.methodInfoLookupShared);
  }

  methodInfoUpgradeSchema = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.DeveloperService/UpgradeSchema',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_developer_pb.UpgradeSchemaRequest,
    authzed_api_v0_developer_pb.UpgradeSchemaResponse,
    (request: authzed_api_v0_developer_pb.UpgradeSchemaRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_developer_pb.UpgradeSchemaResponse.deserializeBinary
  );

  upgradeSchema(
    request: authzed_api_v0_developer_pb.UpgradeSchemaRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_developer_pb.UpgradeSchemaResponse>;

  upgradeSchema(
    request: authzed_api_v0_developer_pb.UpgradeSchemaRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.UpgradeSchemaResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_developer_pb.UpgradeSchemaResponse>;

  upgradeSchema(
    request: authzed_api_v0_developer_pb.UpgradeSchemaRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.UpgradeSchemaResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.DeveloperService/UpgradeSchema',
        request,
        metadata || {},
        this.methodInfoUpgradeSchema,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.DeveloperService/UpgradeSchema',
    request,
    metadata || {},
    this.methodInfoUpgradeSchema);
  }

  methodInfoFormatSchema = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.DeveloperService/FormatSchema',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_developer_pb.FormatSchemaRequest,
    authzed_api_v0_developer_pb.FormatSchemaResponse,
    (request: authzed_api_v0_developer_pb.FormatSchemaRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_developer_pb.FormatSchemaResponse.deserializeBinary
  );

  formatSchema(
    request: authzed_api_v0_developer_pb.FormatSchemaRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_developer_pb.FormatSchemaResponse>;

  formatSchema(
    request: authzed_api_v0_developer_pb.FormatSchemaRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.FormatSchemaResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_developer_pb.FormatSchemaResponse>;

  formatSchema(
    request: authzed_api_v0_developer_pb.FormatSchemaRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_developer_pb.FormatSchemaResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.DeveloperService/FormatSchema',
        request,
        metadata || {},
        this.methodInfoFormatSchema,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.DeveloperService/FormatSchema',
    request,
    metadata || {},
    this.methodInfoFormatSchema);
  }

}

