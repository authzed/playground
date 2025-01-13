// @generated by protobuf-ts 2.9.1 with parameter long_type_string,generate_dependencies
// @generated from protobuf file "authzed/api/v1/watch_service.proto" (package "authzed.api.v1", syntax proto3)
// tslint:disable
import type { RpcTransport } from "@protobuf-ts/runtime-rpc";
import type { ServiceInfo } from "@protobuf-ts/runtime-rpc";
import { WatchService } from "./watch_service";
import { stackIntercept } from "@protobuf-ts/runtime-rpc";
import type { WatchResponse } from "./watch_service";
import type { WatchRequest } from "./watch_service";
import type { ServerStreamingCall } from "@protobuf-ts/runtime-rpc";
import type { RpcOptions } from "@protobuf-ts/runtime-rpc";
/**
 * @generated from protobuf service authzed.api.v1.WatchService
 */
export interface IWatchServiceClient {
    /**
     * @generated from protobuf rpc: Watch(authzed.api.v1.WatchRequest) returns (stream authzed.api.v1.WatchResponse);
     */
    watch(input: WatchRequest, options?: RpcOptions): ServerStreamingCall<WatchRequest, WatchResponse>;
}
/**
 * @generated from protobuf service authzed.api.v1.WatchService
 */
export class WatchServiceClient implements IWatchServiceClient, ServiceInfo {
    typeName = WatchService.typeName;
    methods = WatchService.methods;
    options = WatchService.options;
    constructor(private readonly _transport: RpcTransport) {
    }
    /**
     * @generated from protobuf rpc: Watch(authzed.api.v1.WatchRequest) returns (stream authzed.api.v1.WatchResponse);
     */
    watch(input: WatchRequest, options?: RpcOptions): ServerStreamingCall<WatchRequest, WatchResponse> {
        const method = this.methods[0], opt = this._transport.mergeOptions(options);
        return stackIntercept<WatchRequest, WatchResponse>("serverStreaming", this._transport, method, opt, input);
    }
}
