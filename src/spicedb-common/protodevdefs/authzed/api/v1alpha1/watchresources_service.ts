// @generated by protobuf-ts 2.9.1 with parameter long_type_string,generate_dependencies
// @generated from protobuf file "authzed/api/v1alpha1/watchresources_service.proto" (package "authzed.api.v1alpha1", syntax proto3)
// tslint:disable
import { ServiceType } from "@protobuf-ts/runtime-rpc";
import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { IBinaryWriter } from "@protobuf-ts/runtime";
import { WireType } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { IBinaryReader } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import type { PartialMessage } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MESSAGE_TYPE } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
import { ObjectReference } from "../v1/core";
import { SubjectReference } from "../v1/core";
import { ZedToken } from "../v1/core";
/**
 * WatchResourcesRequest starts a watch for specific permission updates
 * for the given resource and subject types.
 *
 * @generated from protobuf message authzed.api.v1alpha1.WatchResourcesRequest
 */
export interface WatchResourcesRequest {
    /**
     * resource_object_type is the type of resource object for which we will
     * watch for changes.
     *
     * @generated from protobuf field: string resource_object_type = 1;
     */
    resourceObjectType: string;
    /**
     * permission is the name of the permission or relation for which we will
     * watch for changes.
     *
     * @generated from protobuf field: string permission = 2;
     */
    permission: string;
    /**
     * subject_object_type is the type of the subject resource for which we will
     * watch for changes.
     *
     * @generated from protobuf field: string subject_object_type = 3;
     */
    subjectObjectType: string;
    /**
     * optional_subject_relation allows you to specify a group of subjects to watch
     * for a given subject type.
     *
     * @generated from protobuf field: string optional_subject_relation = 4;
     */
    optionalSubjectRelation: string;
    /**
     * @generated from protobuf field: authzed.api.v1.ZedToken optional_start_cursor = 5;
     */
    optionalStartCursor?: ZedToken;
}
/**
 * PermissionUpdate represents a single permission update for a specific
 * subject's permissions.
 *
 * @generated from protobuf message authzed.api.v1alpha1.PermissionUpdate
 */
export interface PermissionUpdate {
    /**
     * subject defines the subject resource whose permissions have changed.
     *
     * @generated from protobuf field: authzed.api.v1.SubjectReference subject = 1;
     */
    subject?: SubjectReference;
    /**
     * resource defines the specific object in the system.
     *
     * @generated from protobuf field: authzed.api.v1.ObjectReference resource = 2;
     */
    resource?: ObjectReference;
    /**
     * @generated from protobuf field: string relation = 3;
     */
    relation: string;
    /**
     * @generated from protobuf field: authzed.api.v1alpha1.PermissionUpdate.Permissionship updated_permission = 4;
     */
    updatedPermission: PermissionUpdate_Permissionship;
}
/**
 * todo: work this into the v1 core API at some point since it's used
 * across services.
 *
 * @generated from protobuf enum authzed.api.v1alpha1.PermissionUpdate.Permissionship
 */
export enum PermissionUpdate_Permissionship {
    /**
     * @generated from protobuf enum value: PERMISSIONSHIP_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: PERMISSIONSHIP_NO_PERMISSION = 1;
     */
    NO_PERMISSION = 1,
    /**
     * @generated from protobuf enum value: PERMISSIONSHIP_HAS_PERMISSION = 2;
     */
    HAS_PERMISSION = 2
}
/**
 * WatchResourcesResponse enumerates the list of permission updates that have
 * occurred as a result of one or more relationship updates.
 *
 * @generated from protobuf message authzed.api.v1alpha1.WatchResourcesResponse
 */
export interface WatchResourcesResponse {
    /**
     * @generated from protobuf field: repeated authzed.api.v1alpha1.PermissionUpdate updates = 1;
     */
    updates: PermissionUpdate[];
    /**
     * @generated from protobuf field: authzed.api.v1.ZedToken changes_through = 2;
     */
    changesThrough?: ZedToken;
}
// @generated message type with reflection information, may provide speed optimized methods
class WatchResourcesRequest$Type extends MessageType<WatchResourcesRequest> {
    constructor() {
        super("authzed.api.v1alpha1.WatchResourcesRequest", [
            { no: 1, name: "resource_object_type", kind: "scalar", T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { string: { maxBytes: "128", pattern: "^([a-z][a-z0-9_]{1,61}[a-z0-9]/)*[a-z][a-z0-9_]{1,62}[a-z0-9]$" } } } },
            { no: 2, name: "permission", kind: "scalar", T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { string: { maxBytes: "64", pattern: "^[a-z][a-z0-9_]{1,62}[a-z0-9]$" } } } },
            { no: 3, name: "subject_object_type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "optional_subject_relation", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "optional_start_cursor", kind: "message", T: () => ZedToken }
        ]);
    }
    create(value?: PartialMessage<WatchResourcesRequest>): WatchResourcesRequest {
        const message = { resourceObjectType: "", permission: "", subjectObjectType: "", optionalSubjectRelation: "" };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<WatchResourcesRequest>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: WatchResourcesRequest): WatchResourcesRequest {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string resource_object_type */ 1:
                    message.resourceObjectType = reader.string();
                    break;
                case /* string permission */ 2:
                    message.permission = reader.string();
                    break;
                case /* string subject_object_type */ 3:
                    message.subjectObjectType = reader.string();
                    break;
                case /* string optional_subject_relation */ 4:
                    message.optionalSubjectRelation = reader.string();
                    break;
                case /* authzed.api.v1.ZedToken optional_start_cursor */ 5:
                    message.optionalStartCursor = ZedToken.internalBinaryRead(reader, reader.uint32(), options, message.optionalStartCursor);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: WatchResourcesRequest, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string resource_object_type = 1; */
        if (message.resourceObjectType !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.resourceObjectType);
        /* string permission = 2; */
        if (message.permission !== "")
            writer.tag(2, WireType.LengthDelimited).string(message.permission);
        /* string subject_object_type = 3; */
        if (message.subjectObjectType !== "")
            writer.tag(3, WireType.LengthDelimited).string(message.subjectObjectType);
        /* string optional_subject_relation = 4; */
        if (message.optionalSubjectRelation !== "")
            writer.tag(4, WireType.LengthDelimited).string(message.optionalSubjectRelation);
        /* authzed.api.v1.ZedToken optional_start_cursor = 5; */
        if (message.optionalStartCursor)
            ZedToken.internalBinaryWrite(message.optionalStartCursor, writer.tag(5, WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1alpha1.WatchResourcesRequest
 */
export const WatchResourcesRequest = new WatchResourcesRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PermissionUpdate$Type extends MessageType<PermissionUpdate> {
    constructor() {
        super("authzed.api.v1alpha1.PermissionUpdate", [
            { no: 1, name: "subject", kind: "message", T: () => SubjectReference },
            { no: 2, name: "resource", kind: "message", T: () => ObjectReference },
            { no: 3, name: "relation", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "updated_permission", kind: "enum", T: () => ["authzed.api.v1alpha1.PermissionUpdate.Permissionship", PermissionUpdate_Permissionship, "PERMISSIONSHIP_"] }
        ]);
    }
    create(value?: PartialMessage<PermissionUpdate>): PermissionUpdate {
        const message = { relation: "", updatedPermission: 0 };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<PermissionUpdate>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: PermissionUpdate): PermissionUpdate {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* authzed.api.v1.SubjectReference subject */ 1:
                    message.subject = SubjectReference.internalBinaryRead(reader, reader.uint32(), options, message.subject);
                    break;
                case /* authzed.api.v1.ObjectReference resource */ 2:
                    message.resource = ObjectReference.internalBinaryRead(reader, reader.uint32(), options, message.resource);
                    break;
                case /* string relation */ 3:
                    message.relation = reader.string();
                    break;
                case /* authzed.api.v1alpha1.PermissionUpdate.Permissionship updated_permission */ 4:
                    message.updatedPermission = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: PermissionUpdate, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* authzed.api.v1.SubjectReference subject = 1; */
        if (message.subject)
            SubjectReference.internalBinaryWrite(message.subject, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
        /* authzed.api.v1.ObjectReference resource = 2; */
        if (message.resource)
            ObjectReference.internalBinaryWrite(message.resource, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
        /* string relation = 3; */
        if (message.relation !== "")
            writer.tag(3, WireType.LengthDelimited).string(message.relation);
        /* authzed.api.v1alpha1.PermissionUpdate.Permissionship updated_permission = 4; */
        if (message.updatedPermission !== 0)
            writer.tag(4, WireType.Varint).int32(message.updatedPermission);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1alpha1.PermissionUpdate
 */
export const PermissionUpdate = new PermissionUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class WatchResourcesResponse$Type extends MessageType<WatchResourcesResponse> {
    constructor() {
        super("authzed.api.v1alpha1.WatchResourcesResponse", [
            { no: 1, name: "updates", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => PermissionUpdate },
            { no: 2, name: "changes_through", kind: "message", T: () => ZedToken }
        ]);
    }
    create(value?: PartialMessage<WatchResourcesResponse>): WatchResourcesResponse {
        const message = { updates: [] };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<WatchResourcesResponse>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: WatchResourcesResponse): WatchResourcesResponse {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated authzed.api.v1alpha1.PermissionUpdate updates */ 1:
                    message.updates.push(PermissionUpdate.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* authzed.api.v1.ZedToken changes_through */ 2:
                    message.changesThrough = ZedToken.internalBinaryRead(reader, reader.uint32(), options, message.changesThrough);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: WatchResourcesResponse, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* repeated authzed.api.v1alpha1.PermissionUpdate updates = 1; */
        for (let i = 0; i < message.updates.length; i++)
            PermissionUpdate.internalBinaryWrite(message.updates[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
        /* authzed.api.v1.ZedToken changes_through = 2; */
        if (message.changesThrough)
            ZedToken.internalBinaryWrite(message.changesThrough, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1alpha1.WatchResourcesResponse
 */
export const WatchResourcesResponse = new WatchResourcesResponse$Type();
/**
 * @generated ServiceType for protobuf service authzed.api.v1alpha1.WatchResourcesService
 */
export const WatchResourcesService = new ServiceType("authzed.api.v1alpha1.WatchResourcesService", [
    { name: "WatchResources", serverStreaming: true, options: { "google.api.http": { post: "/v1alpha1/lookupwatch", body: "*" } }, I: WatchResourcesRequest, O: WatchResourcesResponse }
]);
