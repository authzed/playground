import {
    interpolateBlues,
    interpolateGreens,
    interpolateOranges, interpolatePurples, interpolateRdPu, interpolateReds, interpolateYlGn,
    interpolateYlOrBr
} from 'd3-scale-chromatic';
import { useMemo } from "react";
import { RelationTuple as Relationship } from "../protodefs/core/v1/core";

/**
 * RelationshipsService represents a service for looking up context-sensitive information
 * from the relationships defined.
 */
export interface RelationshipsService {
    /**
     * relationships are the parsed and valid relationships.
     */
    relationships: Relationship[]

    /**
     * resourceTypes is the set of object types used for resources.
     */
    resourceTypes: string[]

    /**
     * resources is the set of resources defined, without relations, in the form
     * `namespacename:objectid`.
     */
    resources: string[]

    /**
     * subjects is the set of subjects defined in the form `namespacename:objectid`.
     * If the subject has a relation, it is added as a distinct entry of the form
     * `namespacename:objectid#relation`.
     */
    subjects: string[]

    /**
     * subjectTypes is the set of object types used for subjects.
     */
    subjectTypes: string[]

    /**
     * getObjectIds returns the set of IDs for objects used as resources or subjects
     * for the given object type.
     */
    getObjectIds: (objectType: string) => string[] | undefined

    /**
     * getTypeColor returns a unique color for the given object type.
     */
    getTypeColor: (objectType: string) => string | undefined

    /**
     * getObjectColor returns a color (derived from that for the given object type) for
     * the object ID.
     */
    getObjectColor: (objectType: string, objectId: string) => string | undefined
}

const filter = (values: (string | null | undefined)[]): string[] => {
    const filtered = values.filter((v: string | null | undefined) => !!v);
    const set = new Set(filtered);
    const deduped: string[] = [];
    set.forEach((value: string | null | undefined) => {
        deduped.push(value!);
    });
    return deduped;
}

const colorSchemes = [
    interpolatePurples,
    interpolateBlues,
    interpolateGreens,
    interpolateOranges,
    interpolateReds,
    interpolateYlOrBr,
    interpolateRdPu,
    interpolateYlGn,
]

/**
 * useRelationshipsService is a service which provides easy lookup of resources, subjects and actions
 * based on entered test relationships.
 * @param relationshipsString The encoded string of test relationships.
 */
export function useRelationshipsService(relationships: Relationship[]): RelationshipsService {
    return useMemo(() => {
        const buildingObjectsByType: Map<string, Set<string>> = new Map<string, Set<string>>();

        const addObject = (objectType: string, objectId: string) => {
            if (!buildingObjectsByType.has(objectType)) {
                buildingObjectsByType.set(objectType, new Set<string>())
            }

            buildingObjectsByType.get(objectType)?.add(objectId);
        };

        const resources = filter(relationships.map((rt: Relationship) => {
            const onr = rt.resourceAndRelation
            if (onr === undefined) {
                return null;
            }

            addObject(onr.namespace, onr.objectId);
            return `${onr.namespace}:${onr.objectId}`;
        }));

        const resourceTypes = filter(relationships.map((rt: Relationship) => {
            const onr = rt.resourceAndRelation;
            if (onr === undefined) {
                return null;
            }

            return onr.namespace;
        }));

        const subjects = filter(relationships.map((rt: Relationship) => {
            const subject =  rt.subject;
            if (subject === undefined) {
                return null;
            }

            addObject(subject.namespace, subject.objectId);
            if (subject.relation === '...') {
                return `${subject.namespace}:${subject.objectId}`;
            }
            return `${subject.namespace}:${subject.objectId}#${subject.relation}`;
        }));

        const subjectTypes = filter(relationships.map((rt: Relationship) => {
            const subject =  rt.subject;
            if (subject === undefined) {
                return null;
            }

            return subject.namespace;
        }));


        const calculateColor = (colorSet: (n: number) => string, valueSet: string[], value: string) => {
            if (valueSet.indexOf(value) < 0) {
                return undefined;
            }
            return colorSet(1 - (valueSet.indexOf(value) / 9));
        };

        const possibleObjectTypes = [
            ...resourceTypes,
            ...subjectTypes,
        ];

        const objectTypes = Array.from(new Set(possibleObjectTypes));

        const objectsByType: Record<string, string[]> = {};
        buildingObjectsByType.forEach((idSet: Set<string>, objectType: string) => {
            const arr = Array.from(idSet);
            arr.sort();
            objectsByType[objectType] = arr;
        });

        return {
            relationships: relationships,
            resources: resources,
            resourceTypes: resourceTypes,
            subjectTypes: subjectTypes,
            subjects: subjects,
            getObjectIds: (objectType: string) => {
                const resourceIDs = (relationships
                    .filter((rel: Relationship) => rel.resourceAndRelation?.namespace === objectType)
                    .map((rel: Relationship) => rel.resourceAndRelation?.objectId ?? '')
                    .filter((value: string) => !!value)
                );
                const subjectIDs = (relationships
                    .filter((rel: Relationship) => rel.subject?.namespace === objectType)
                    .map((rel: Relationship) => rel.subject?.objectId ?? '')
                    .filter((value: string) => !!value)
                );
                return Array.from(new Set<string>([...resourceIDs, ...subjectIDs]))
            },
            getObjectColor: (objectType: string, objectId: string): string | undefined => {
                const index = objectTypes.indexOf(objectType);
                const scheme = colorSchemes[index % colorSchemes.length];
                if (!scheme) {
                    return undefined;
                }
                return calculateColor(scheme, objectsByType[objectType] ?? [], objectId);
            },
            getTypeColor: (objectType: string): string | undefined => {
                const index = objectTypes.indexOf(objectType);
                const scheme = colorSchemes[index % colorSchemes.length];
                if (!scheme) {
                    return undefined;
                }
                return scheme(0.65);
            },
        };
    }, [relationships]);
}
