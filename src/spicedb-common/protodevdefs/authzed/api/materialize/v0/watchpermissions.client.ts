// @generated by protobuf-ts 2.9.1 with parameter long_type_string,generate_dependencies
// @generated from protobuf file "authzed/api/materialize/v0/watchpermissions.proto" (package "authzed.api.materialize.v0", syntax proto3)
// tslint:disable
import type { RpcTransport } from "@protobuf-ts/runtime-rpc";
import type { ServiceInfo } from "@protobuf-ts/runtime-rpc";
import { WatchPermissionsService } from "./watchpermissions";
import { stackIntercept } from "@protobuf-ts/runtime-rpc";
import type { WatchPermissionsResponse } from "./watchpermissions";
import type { WatchPermissionsRequest } from "./watchpermissions";
import type { ServerStreamingCall } from "@protobuf-ts/runtime-rpc";
import type { RpcOptions } from "@protobuf-ts/runtime-rpc";
/**
 * @generated from protobuf service authzed.api.materialize.v0.WatchPermissionsService
 */
export interface IWatchPermissionsServiceClient {
    /**
     * WatchPermissions returns a stream of PermissionChange events for the given permissions.
     *
     * WatchPermissions is a long-running RPC, and will stream events until the client
     * closes the connection or the server terminates the stream. The consumer is responsible of
     * keeping track of the last seen revision and resuming the stream from that point in the event
     * of disconnection or client-side restarts.
     *
     * The API does not offer a sharding mechanism and thus there should only be one consumer per target system.
     * Implementing an active-active HA consumer setup over the same target system will require coordinating which
     * revisions have been consumed in order to prevent transitioning to an inconsistent state.
     *
     * Usage of WatchPermissions requires to be explicitly enabled on the service, including the permissions to be
     * watched. It requires more resources and is less performant than WatchPermissionsSets. It's usage
     * is only recommended when performing the set intersections of WatchPermissionSets in the client side is not viable
     * or there is a strict application requirement to use consume the computed permissions.
     *
     * @generated from protobuf rpc: WatchPermissions(authzed.api.materialize.v0.WatchPermissionsRequest) returns (stream authzed.api.materialize.v0.WatchPermissionsResponse);
     */
    watchPermissions(input: WatchPermissionsRequest, options?: RpcOptions): ServerStreamingCall<WatchPermissionsRequest, WatchPermissionsResponse>;
}
/**
 * @generated from protobuf service authzed.api.materialize.v0.WatchPermissionsService
 */
export class WatchPermissionsServiceClient implements IWatchPermissionsServiceClient, ServiceInfo {
    typeName = WatchPermissionsService.typeName;
    methods = WatchPermissionsService.methods;
    options = WatchPermissionsService.options;
    constructor(private readonly _transport: RpcTransport) {
    }
    /**
     * WatchPermissions returns a stream of PermissionChange events for the given permissions.
     *
     * WatchPermissions is a long-running RPC, and will stream events until the client
     * closes the connection or the server terminates the stream. The consumer is responsible of
     * keeping track of the last seen revision and resuming the stream from that point in the event
     * of disconnection or client-side restarts.
     *
     * The API does not offer a sharding mechanism and thus there should only be one consumer per target system.
     * Implementing an active-active HA consumer setup over the same target system will require coordinating which
     * revisions have been consumed in order to prevent transitioning to an inconsistent state.
     *
     * Usage of WatchPermissions requires to be explicitly enabled on the service, including the permissions to be
     * watched. It requires more resources and is less performant than WatchPermissionsSets. It's usage
     * is only recommended when performing the set intersections of WatchPermissionSets in the client side is not viable
     * or there is a strict application requirement to use consume the computed permissions.
     *
     * @generated from protobuf rpc: WatchPermissions(authzed.api.materialize.v0.WatchPermissionsRequest) returns (stream authzed.api.materialize.v0.WatchPermissionsResponse);
     */
    watchPermissions(input: WatchPermissionsRequest, options?: RpcOptions): ServerStreamingCall<WatchPermissionsRequest, WatchPermissionsResponse> {
        const method = this.methods[0], opt = this._transport.mergeOptions(options);
        return stackIntercept<WatchPermissionsRequest, WatchPermissionsResponse>("serverStreaming", this._transport, method, opt, input);
    }
}
