import { RelationTuple as Relationship } from "@/spicedb-common/protodefs/core/v1/core_pb";

export interface NodeTooltipProps {
  namespace: string;
  objectId: string;
  relationships: Relationship[];
}

export interface EdgeTooltipProps {
  relation: string;
  subjectRelation?: string;
  caveat?: string;
  expiration?: string;
}

/**
 * NodeTooltip displays relationships involving a node
 */
export function NodeTooltip({ namespace, objectId, relationships }: NodeTooltipProps) {
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-md">
      <div className="font-semibold mb-2 border-b border-gray-700 pb-2">
        {namespace}:{objectId}
      </div>
      <div className="space-y-1">
        {relationships.length === 0 ? (
          <div className="text-gray-400">No relationships</div>
        ) : (
          <>
            <div className="text-gray-400 mb-1">Relationships:</div>
            {relationships.map((rel, idx) => {
              const resource = rel.resourceAndRelation;
              const subject = rel.subject;
              if (!resource || !subject) return null;

              const resourceStr = `${resource.namespace}:${resource.objectId}#${resource.relation}`;
              const subjectStr = subject.relation
                ? `${subject.namespace}:${subject.objectId}#${subject.relation}`
                : `${subject.namespace}:${subject.objectId}`;

              return (
                <div key={idx} className="font-mono text-xs break-all">
                  {resourceStr}@{subjectStr}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * EdgeTooltip displays relationship details for an edge
 */
export function EdgeTooltip({ relation, subjectRelation, caveat, expiration }: EdgeTooltipProps) {
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Relation:</span>{" "}
          <span className="font-semibold">{relation}</span>
        </div>
        {subjectRelation && (
          <div>
            <span className="text-gray-400">Subject Relation:</span>{" "}
            <span className="font-semibold">{subjectRelation}</span>
          </div>
        )}
        {caveat && (
          <div>
            <span className="text-gray-400">Caveat:</span>{" "}
            <span className="font-semibold">{caveat}</span>
          </div>
        )}
        {expiration && (
          <div>
            <span className="text-gray-400">Expiration:</span>{" "}
            <span className="font-semibold">{expiration}</span>
          </div>
        )}
      </div>
    </div>
  );
}
