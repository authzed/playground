/**
 * @fileoverview gRPC-Web generated client stub for authzed.api.v0
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck


import * as grpcWeb from 'grpc-web';

import * as authzed_api_v0_watch_service_pb from '../../../authzed/api/v0/watch_service_pb';


export class WatchServiceClient {
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

  methodInfoWatch = new grpcWeb.MethodDescriptor(
    '/authzed.api.v0.WatchService/Watch',
    grpcWeb.MethodType.SERVER_STREAMING,
    authzed_api_v0_watch_service_pb.WatchRequest,
    authzed_api_v0_watch_service_pb.WatchResponse,
    (request: authzed_api_v0_watch_service_pb.WatchRequest) => {
      return request.serializeBinary();
    },
    authzed_api_v0_watch_service_pb.WatchResponse.deserializeBinary
  );

  watch(
    request: authzed_api_v0_watch_service_pb.WatchRequest,
    metadata?: grpcWeb.Metadata) {
    return this.client_.serverStreaming(
      this.hostname_ +
        '/authzed.api.v0.WatchService/Watch',
      request,
      metadata || {},
      this.methodInfoWatch);
  }

}

