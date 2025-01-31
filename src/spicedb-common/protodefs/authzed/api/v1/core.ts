// @generated by protobuf-ts 2.9.1 with parameter long_type_string,generate_dependencies,optimize_code_size
// @generated from protobuf file "authzed/api/v1/core.proto" (package "authzed.api.v1", syntax proto3)
// tslint:disable
import { MessageType } from "@protobuf-ts/runtime";
import { Struct } from "../../../google/protobuf/struct";
/**
 * Relationship specifies how a resource relates to a subject. Relationships
 * form the data for the graph over which all permissions questions are
 * answered.
 *
 * @generated from protobuf message authzed.api.v1.Relationship
 */
export interface Relationship {
    /**
     * resource is the resource to which the subject is related, in some manner
     *
     * @generated from protobuf field: authzed.api.v1.ObjectReference resource = 1;
     */
    resource?: ObjectReference;
    /**
     * relation is how the resource and subject are related.
     *
     * @generated from protobuf field: string relation = 2;
     */
    relation: string;
    /**
     * subject is the subject to which the resource is related, in some manner.
     *
     * @generated from protobuf field: authzed.api.v1.SubjectReference subject = 3;
     */
    subject?: SubjectReference;
    /**
     * optional_caveat is a reference to a the caveat that must be enforced over the relationship
     *
     * @generated from protobuf field: authzed.api.v1.ContextualizedCaveat optional_caveat = 4;
     */
    optionalCaveat?: ContextualizedCaveat;
}
/**
 * *
 * ContextualizedCaveat represents a reference to a caveat to be used by caveated relationships.
 * The context consists of key-value pairs that will be injected at evaluation time.
 * The keys must match the arguments defined on the caveat in the schema.
 *
 * @generated from protobuf message authzed.api.v1.ContextualizedCaveat
 */
export interface ContextualizedCaveat {
    /**
     * * caveat_name is the name of the caveat expression to use, as defined in the schema *
     *
     * @generated from protobuf field: string caveat_name = 1;
     */
    caveatName: string;
    /**
     * * context consists of any named values that are defined at write time for the caveat expression *
     *
     * @generated from protobuf field: google.protobuf.Struct context = 2;
     */
    context?: Struct;
}
/**
 * SubjectReference is used for referring to the subject portion of a
 * Relationship. The relation component is optional and is used for defining a
 * sub-relation on the subject, e.g. group:123#members
 *
 * @generated from protobuf message authzed.api.v1.SubjectReference
 */
export interface SubjectReference {
    /**
     * @generated from protobuf field: authzed.api.v1.ObjectReference object = 1;
     */
    object?: ObjectReference;
    /**
     * @generated from protobuf field: string optional_relation = 2;
     */
    optionalRelation: string;
}
/**
 * ObjectReference is used to refer to a specific object in the system.
 *
 * @generated from protobuf message authzed.api.v1.ObjectReference
 */
export interface ObjectReference {
    /**
     * @generated from protobuf field: string object_type = 1;
     */
    objectType: string;
    /**
     * @generated from protobuf field: string object_id = 2;
     */
    objectId: string;
}
/**
 * ZedToken is used to provide causality metadata between Write and Check
 * requests.
 *
 * See the authzed.api.v1.Consistency message for more information.
 *
 * @generated from protobuf message authzed.api.v1.ZedToken
 */
export interface ZedToken {
    /**
     * @generated from protobuf field: string token = 1;
     */
    token: string;
}
/**
 * RelationshipUpdate is used for mutating a single relationship within the
 * service.
 *
 * CREATE will create the relationship only if it doesn't exist, and error
 * otherwise.
 *
 * TOUCH will upsert the relationship, and will not error if it
 * already exists.
 *
 * DELETE will delete the relationship. If the relationship does not exist,
 * this operation will no-op.
 *
 * @generated from protobuf message authzed.api.v1.RelationshipUpdate
 */
export interface RelationshipUpdate {
    /**
     * @generated from protobuf field: authzed.api.v1.RelationshipUpdate.Operation operation = 1;
     */
    operation: RelationshipUpdate_Operation;
    /**
     * @generated from protobuf field: authzed.api.v1.Relationship relationship = 2;
     */
    relationship?: Relationship;
}
/**
 * @generated from protobuf enum authzed.api.v1.RelationshipUpdate.Operation
 */
export enum RelationshipUpdate_Operation {
    /**
     * @generated from protobuf enum value: OPERATION_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: OPERATION_CREATE = 1;
     */
    CREATE = 1,
    /**
     * @generated from protobuf enum value: OPERATION_TOUCH = 2;
     */
    TOUCH = 2,
    /**
     * @generated from protobuf enum value: OPERATION_DELETE = 3;
     */
    DELETE = 3
}
/**
 * PermissionRelationshipTree is used for representing a tree of a resource and
 * its permission relationships with other objects.
 *
 * @generated from protobuf message authzed.api.v1.PermissionRelationshipTree
 */
export interface PermissionRelationshipTree {
    /**
     * @generated from protobuf oneof: tree_type
     */
    treeType: {
        oneofKind: "intermediate";
        /**
         * @generated from protobuf field: authzed.api.v1.AlgebraicSubjectSet intermediate = 1;
         */
        intermediate: AlgebraicSubjectSet;
    } | {
        oneofKind: "leaf";
        /**
         * @generated from protobuf field: authzed.api.v1.DirectSubjectSet leaf = 2;
         */
        leaf: DirectSubjectSet;
    } | {
        oneofKind: undefined;
    };
    /**
     * @generated from protobuf field: authzed.api.v1.ObjectReference expanded_object = 3;
     */
    expandedObject?: ObjectReference;
    /**
     * @generated from protobuf field: string expanded_relation = 4;
     */
    expandedRelation: string;
}
/**
 * AlgebraicSubjectSet is a subject set which is computed based on applying the
 * specified operation to the operands according to the algebra of sets.
 *
 * UNION is a logical set containing the subject members from all operands.
 *
 * INTERSECTION is a logical set containing only the subject members which are
 * present in all operands.
 *
 * EXCLUSION is a logical set containing only the subject members which are
 * present in the first operand, and none of the other operands.
 *
 * @generated from protobuf message authzed.api.v1.AlgebraicSubjectSet
 */
export interface AlgebraicSubjectSet {
    /**
     * @generated from protobuf field: authzed.api.v1.AlgebraicSubjectSet.Operation operation = 1;
     */
    operation: AlgebraicSubjectSet_Operation;
    /**
     * @generated from protobuf field: repeated authzed.api.v1.PermissionRelationshipTree children = 2;
     */
    children: PermissionRelationshipTree[];
}
/**
 * @generated from protobuf enum authzed.api.v1.AlgebraicSubjectSet.Operation
 */
export enum AlgebraicSubjectSet_Operation {
    /**
     * @generated from protobuf enum value: OPERATION_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: OPERATION_UNION = 1;
     */
    UNION = 1,
    /**
     * @generated from protobuf enum value: OPERATION_INTERSECTION = 2;
     */
    INTERSECTION = 2,
    /**
     * @generated from protobuf enum value: OPERATION_EXCLUSION = 3;
     */
    EXCLUSION = 3
}
/**
 * DirectSubjectSet is a subject set which is simply a collection of subjects.
 *
 * @generated from protobuf message authzed.api.v1.DirectSubjectSet
 */
export interface DirectSubjectSet {
    /**
     * @generated from protobuf field: repeated authzed.api.v1.SubjectReference subjects = 1;
     */
    subjects: SubjectReference[];
}
/**
 * PartialCaveatInfo carries information necessary for the client to take action
 * in the event a response contains a partially evaluated caveat
 *
 * @generated from protobuf message authzed.api.v1.PartialCaveatInfo
 */
export interface PartialCaveatInfo {
    /**
     * missing_required_context is a list of one or more fields that were missing and prevented caveats
     * from being fully evaluated
     *
     * @generated from protobuf field: repeated string missing_required_context = 1;
     */
    missingRequiredContext: string[];
}
// @generated message type with reflection information, may provide speed optimized methods
class Relationship$Type extends MessageType<Relationship> {
    constructor() {
        super("authzed.api.v1.Relationship", [
            { no: 1, name: "resource", kind: "message", T: () => ObjectReference, options: { "validate.rules": { message: { required: true } } } },
            { no: 2, name: "relation", kind: "scalar", T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { string: { maxBytes: "64", pattern: "^[a-z][a-z0-9_]{1,62}[a-z0-9]$" } } } },
            { no: 3, name: "subject", kind: "message", T: () => SubjectReference, options: { "validate.rules": { message: { required: true } } } },
            { no: 4, name: "optional_caveat", kind: "message", T: () => ContextualizedCaveat, options: { "validate.rules": { message: { required: false } } } }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.Relationship
 */
export const Relationship = new Relationship$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ContextualizedCaveat$Type extends MessageType<ContextualizedCaveat> {
    constructor() {
        super("authzed.api.v1.ContextualizedCaveat", [
            { no: 1, name: "caveat_name", kind: "scalar", T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { string: { maxBytes: "128", pattern: "^([a-zA-Z0-9_][a-zA-Z0-9/_|-]{0,127})$" } } } },
            { no: 2, name: "context", kind: "message", T: () => Struct, options: { "validate.rules": { message: { required: false } } } }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.ContextualizedCaveat
 */
export const ContextualizedCaveat = new ContextualizedCaveat$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SubjectReference$Type extends MessageType<SubjectReference> {
    constructor() {
        super("authzed.api.v1.SubjectReference", [
            { no: 1, name: "object", kind: "message", T: () => ObjectReference, options: { "validate.rules": { message: { required: true } } } },
            { no: 2, name: "optional_relation", kind: "scalar", T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { string: { maxBytes: "64", pattern: "^([a-z][a-z0-9_]{1,62}[a-z0-9])?$" } } } }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.SubjectReference
 */
export const SubjectReference = new SubjectReference$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ObjectReference$Type extends MessageType<ObjectReference> {
    constructor() {
        super("authzed.api.v1.ObjectReference", [
            { no: 1, name: "object_type", kind: "scalar", T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { string: { maxBytes: "128", pattern: "^([a-z][a-z0-9_]{1,61}[a-z0-9]/)?[a-z][a-z0-9_]{1,62}[a-z0-9]$" } } } },
            { no: 2, name: "object_id", kind: "scalar", T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { string: { maxBytes: "128", pattern: "^(([a-zA-Z0-9_][a-zA-Z0-9/_|-]{0,127})|\\*)$" } } } }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.ObjectReference
 */
export const ObjectReference = new ObjectReference$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ZedToken$Type extends MessageType<ZedToken> {
    constructor() {
        super("authzed.api.v1.ZedToken", [
            { no: 1, name: "token", kind: "scalar", T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { string: { minBytes: "1" } } } }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.ZedToken
 */
export const ZedToken = new ZedToken$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RelationshipUpdate$Type extends MessageType<RelationshipUpdate> {
    constructor() {
        super("authzed.api.v1.RelationshipUpdate", [
            { no: 1, name: "operation", kind: "enum", T: () => ["authzed.api.v1.RelationshipUpdate.Operation", RelationshipUpdate_Operation, "OPERATION_"], options: { "validate.rules": { enum: { definedOnly: true, notIn: [0] } } } },
            { no: 2, name: "relationship", kind: "message", T: () => Relationship, options: { "validate.rules": { message: { required: true } } } }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.RelationshipUpdate
 */
export const RelationshipUpdate = new RelationshipUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PermissionRelationshipTree$Type extends MessageType<PermissionRelationshipTree> {
    constructor() {
        super("authzed.api.v1.PermissionRelationshipTree", [
            { no: 1, name: "intermediate", kind: "message", oneof: "treeType", T: () => AlgebraicSubjectSet },
            { no: 2, name: "leaf", kind: "message", oneof: "treeType", T: () => DirectSubjectSet },
            { no: 3, name: "expanded_object", kind: "message", T: () => ObjectReference },
            { no: 4, name: "expanded_relation", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.PermissionRelationshipTree
 */
export const PermissionRelationshipTree = new PermissionRelationshipTree$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AlgebraicSubjectSet$Type extends MessageType<AlgebraicSubjectSet> {
    constructor() {
        super("authzed.api.v1.AlgebraicSubjectSet", [
            { no: 1, name: "operation", kind: "enum", T: () => ["authzed.api.v1.AlgebraicSubjectSet.Operation", AlgebraicSubjectSet_Operation, "OPERATION_"], options: { "validate.rules": { enum: { definedOnly: true, notIn: [0] } } } },
            { no: 2, name: "children", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => PermissionRelationshipTree, options: { "validate.rules": { repeated: { items: { message: { required: true } } } } } }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.AlgebraicSubjectSet
 */
export const AlgebraicSubjectSet = new AlgebraicSubjectSet$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DirectSubjectSet$Type extends MessageType<DirectSubjectSet> {
    constructor() {
        super("authzed.api.v1.DirectSubjectSet", [
            { no: 1, name: "subjects", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => SubjectReference }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.DirectSubjectSet
 */
export const DirectSubjectSet = new DirectSubjectSet$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PartialCaveatInfo$Type extends MessageType<PartialCaveatInfo> {
    constructor() {
        super("authzed.api.v1.PartialCaveatInfo", [
            { no: 1, name: "missing_required_context", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/, options: { "validate.rules": { repeated: { minItems: "1" } } } }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message authzed.api.v1.PartialCaveatInfo
 */
export const PartialCaveatInfo = new PartialCaveatInfo$Type();
