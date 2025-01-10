/**
 * @fileoverview gRPC-Web generated client stub for authzed.api.v0
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck


import * as grpcWeb from 'grpc-web';

import * as authzed_api_v0_acl_service_pb from '../../../authzed/api/v0/acl_service_pb';


export class ACLServiceClient {
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

  methodInfoRead = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.ACLService/Read',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_acl_service_pb.ReadRequest,
    authzed_api_v0_acl_service_pb.ReadResponse,
    (request: authzed_api_v0_acl_service_pb.ReadRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_acl_service_pb.ReadResponse.deserializeBinary
  );

  read(
    request: authzed_api_v0_acl_service_pb.ReadRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_acl_service_pb.ReadResponse>;

  read(
    request: authzed_api_v0_acl_service_pb.ReadRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.ReadResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_acl_service_pb.ReadResponse>;

  read(
    request: authzed_api_v0_acl_service_pb.ReadRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.ReadResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.ACLService/Read',
        request,
        metadata || {},
        this.methodInfoRead,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.ACLService/Read',
    request,
    metadata || {},
    this.methodInfoRead);
  }

  methodInfoWrite = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.ACLService/Write',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_acl_service_pb.WriteRequest,
    authzed_api_v0_acl_service_pb.WriteResponse,
    (request: authzed_api_v0_acl_service_pb.WriteRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_acl_service_pb.WriteResponse.deserializeBinary
  );

  write(
    request: authzed_api_v0_acl_service_pb.WriteRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_acl_service_pb.WriteResponse>;

  write(
    request: authzed_api_v0_acl_service_pb.WriteRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.WriteResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_acl_service_pb.WriteResponse>;

  write(
    request: authzed_api_v0_acl_service_pb.WriteRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.WriteResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.ACLService/Write',
        request,
        metadata || {},
        this.methodInfoWrite,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.ACLService/Write',
    request,
    metadata || {},
    this.methodInfoWrite);
  }

  methodInfoCheck = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.ACLService/Check',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_acl_service_pb.CheckRequest,
    authzed_api_v0_acl_service_pb.CheckResponse,
    (request: authzed_api_v0_acl_service_pb.CheckRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_acl_service_pb.CheckResponse.deserializeBinary
  );

  check(
    request: authzed_api_v0_acl_service_pb.CheckRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_acl_service_pb.CheckResponse>;

  check(
    request: authzed_api_v0_acl_service_pb.CheckRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.CheckResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_acl_service_pb.CheckResponse>;

  check(
    request: authzed_api_v0_acl_service_pb.CheckRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.CheckResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.ACLService/Check',
        request,
        metadata || {},
        this.methodInfoCheck,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.ACLService/Check',
    request,
    metadata || {},
    this.methodInfoCheck);
  }

  methodInfoContentChangeCheck = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.ACLService/ContentChangeCheck',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_acl_service_pb.ContentChangeCheckRequest,
    authzed_api_v0_acl_service_pb.CheckResponse,
    (request: authzed_api_v0_acl_service_pb.ContentChangeCheckRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_acl_service_pb.CheckResponse.deserializeBinary
  );

  contentChangeCheck(
    request: authzed_api_v0_acl_service_pb.ContentChangeCheckRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_acl_service_pb.CheckResponse>;

  contentChangeCheck(
    request: authzed_api_v0_acl_service_pb.ContentChangeCheckRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.CheckResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_acl_service_pb.CheckResponse>;

  contentChangeCheck(
    request: authzed_api_v0_acl_service_pb.ContentChangeCheckRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.CheckResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.ACLService/ContentChangeCheck',
        request,
        metadata || {},
        this.methodInfoContentChangeCheck,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.ACLService/ContentChangeCheck',
    request,
    metadata || {},
    this.methodInfoContentChangeCheck);
  }

  methodInfoExpand = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.ACLService/Expand',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_acl_service_pb.ExpandRequest,
    authzed_api_v0_acl_service_pb.ExpandResponse,
    (request: authzed_api_v0_acl_service_pb.ExpandRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_acl_service_pb.ExpandResponse.deserializeBinary
  );

  expand(
    request: authzed_api_v0_acl_service_pb.ExpandRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_acl_service_pb.ExpandResponse>;

  expand(
    request: authzed_api_v0_acl_service_pb.ExpandRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.ExpandResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_acl_service_pb.ExpandResponse>;

  expand(
    request: authzed_api_v0_acl_service_pb.ExpandRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.ExpandResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.ACLService/Expand',
        request,
        metadata || {},
        this.methodInfoExpand,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.ACLService/Expand',
    request,
    metadata || {},
    this.methodInfoExpand);
  }

  methodInfoLookup = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.ACLService/Lookup',
    grpcWeb.MethodType.UNARY,
    authzed_api_v0_acl_service_pb.LookupRequest,
    authzed_api_v0_acl_service_pb.LookupResponse,
    (request: authzed_api_v0_acl_service_pb.LookupRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_acl_service_pb.LookupResponse.deserializeBinary
  );

  lookup(
    request: authzed_api_v0_acl_service_pb.LookupRequest,
    metadata: grpcWeb.Metadata | null): Promise<authzed_api_v0_acl_service_pb.LookupResponse>;

  lookup(
    request: authzed_api_v0_acl_service_pb.LookupRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.LookupResponse) => void): grpcWeb.ClientReadableStream<authzed_api_v0_acl_service_pb.LookupResponse>;

  lookup(
    request: authzed_api_v0_acl_service_pb.LookupRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: authzed_api_v0_acl_service_pb.LookupResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/authzed.api.v0.ACLService/Lookup',
        request,
        metadata || {},
        this.methodInfoLookup,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/authzed.api.v0.ACLService/Lookup',
    request,
    metadata || {},
    this.methodInfoLookup);
  }

}

