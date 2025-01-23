import { RelationTuple as Relationship } from "../../protodefs/core/v1/core";
import { VisEdge, VisNode } from "../../../playground-ui/VisNetworkGraph";
import { emphasize } from "@material-ui/core/styles";
import { schemeCategory10 } from "d3-scale-chromatic";
import {
  ParsedArrowExpression,
  ParsedBinaryExpression,
  ParsedExpression,
  ParsedRelationRefExpression,
  ParsedSchema,
  TextRange,
  TypeRef,
} from "../../parsers/dsl/dsl";
import {
  PermissionHandle,
  RelationHandle,
  RelationLink,
  RelationOrPermissionHandle,
  TypeHandle,
  TypeSet,
} from "./typeset";

export interface ActiveInfo {
  isSchema?: boolean;
  position: {
    lineNumber: number;
    column: number;
  };
}

export type LocalNode = VisNode & WithSourceInfo;
export type LocalEdge = VisEdge & WithSourceInfo;

export const RELATIONSHIP_TABLE_CLASS_NAME = "relationship-table";

export const COLORS = {
  tenant: "#aaaaaa11",
  type: "#8787ff",
  relation: "#ffa887",
  typetorelation: "#ffa88722",
  permission: "#1acc92",
  typetopermission: "#1acc9222",
  userset: "#ab00a4",
  highlight: (color: string) => emphasize(color, 0.4),
  dataref: "#fff",
};

const REWRITE_COLORS = {
  union: "green",
  intersection: "orange",
  exclusion: "red",
};

const REWRITE_OPS = {
  union: "+",
  intersection: "&",
  exclusion: "-",
};

const exprId = (expr: ParsedExpression) => {
  return `${expr.range.startIndex.line}${expr.range.startIndex.column}${expr.range.endIndex.offset}`;
};

const NodeIDs = {
  Root: `root`,
  ObjectType: (ref: TypeHandle) => `ns-${ref.index}`,
  Relation: (ref: RelationHandle) => `rel-${ref.index}-${ref.parentType.index}`,
  Permission: (ref: PermissionHandle) =>
    `perm-${ref.index}-${ref.parentType.index}`,
  RelationOrPermission: (ref: RelationOrPermissionHandle) => {
    switch (ref.kind) {
      case "relation":
        return NodeIDs.Relation(ref as RelationHandle);

      default:
        return NodeIDs.Permission(ref as PermissionHandle);
    }
  },
  Binary: (ref: ParsedBinaryExpression) => `binary-${exprId(ref)}`,
  Arrow: (ref: ParsedArrowExpression) => `arrow-${exprId(ref)}`,
};

const EdgeIDs = {
  TypeToRoot: (ref: TypeHandle) =>
    `${NodeIDs.ObjectType(ref)}->${NodeIDs.Root}`,
  TypeToRelation: (ref: RelationHandle) =>
    `${NodeIDs.ObjectType(ref.parentType)}->${NodeIDs.Relation(ref)}`,
  TypeToPermission: (ref: PermissionHandle) =>
    `${NodeIDs.ObjectType(ref.parentType)}->${NodeIDs.Permission(ref)}`,
  ReferencedRelationOrPermission: (
    startNodeID: string,
    ref: RelationOrPermissionHandle,
  ) => `${startNodeID}->${NodeIDs.RelationOrPermission(ref)}`,
  RelationToDataType: (ref: RelationHandle, typeRef: TypeHandle) =>
    `${NodeIDs.Relation(ref)}-->${NodeIDs.ObjectType(typeRef)}`,
  ExpressionChild: (exprNodeID: string, parentNodeID: string) =>
    `${parentNodeID}-e->${exprNodeID}`,
  ArrowRelationOutward: (
    expr: ParsedArrowExpression,
    target: RelationOrPermissionHandle,
  ) => `${NodeIDs.Arrow(expr)}->${NodeIDs.RelationOrPermission(target)}}`,
};

interface SourceInfo {
  parserRange: TextRange | undefined;
}

interface WithSourceInfo {
  sourceInfo: SourceInfo | undefined;
}

/**
 * findActive finds the items (node or edges) that are active given the current active position
 * information from the editor.
 */
export function findActive<T extends WithSourceInfo>(
  items: T[],
  active: ActiveInfo | undefined,
): T[] | undefined {
  if (!active?.isSchema) {
    return undefined;
  }

  return items.filter((item: T) => {
    if (item.sourceInfo?.parserRange === undefined) {
      return false;
    }

    if (
      item.sourceInfo.parserRange.endIndex.line <= active.position.lineNumber ||
      item.sourceInfo.parserRange.startIndex.line > active.position.lineNumber
    ) {
      return false;
    }

    if (
      item.sourceInfo.parserRange.startIndex.line === active.position.lineNumber
    ) {
      if (
        item.sourceInfo.parserRange.startIndex.column >= active.position.column
      ) {
        return false;
      }
    }

    if (
      item.sourceInfo.parserRange.endIndex.line === active.position.lineNumber
    ) {
      if (
        item.sourceInfo.parserRange.endIndex.column <= active.position.column
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * generateTenantGraph generates the VisJs Network graph for the tenant.
 * @param schema The schema for the tenant.
 * @param relationships The existing relationships in the testing environment. If specified, will be used for edge inference.
 * @returns The graph for subsequent calls.
 */
export function generateTenantGraph(
  schema: ParsedSchema | undefined,
  relationships: Relationship[] | undefined,
) {
  if (schema === undefined) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const nodes: LocalNode[] = [];
  const edges: LocalEdge[] = [];

  let pathCounter = 0;
  const getTuplesetPathColor = (): string => {
    const color = schemeCategory10[pathCounter % schemeCategory10.length];
    pathCounter++;
    return color;
  };

  const typeSet = new TypeSet(schema, relationships);

  // Generate the subgraph per namespace.
  typeSet.forEachType((type: TypeHandle) => {
    const { nodes: defNodes, edges: defEdges } = generateTypeSubgraph(
      type,
      typeSet,
      getTuplesetPathColor,
    );
    nodes.push(...defNodes);
    edges.push(...defEdges);
  });

  // Add the tenant node.
  /*
    nodes.push({
        id: NodeIDs.Root,
        label: 'Permissions System',
        group: 'tenant',
        shape: 'star',
        color: COLORS.tenant,
        sourceInfo: undefined
    });
    */

  // Filter out any duplicate nodes or edges to prevent errors from being raised
  // by the visualizer.
  const seenNodeIDs = new Set<string | number>();
  const seenEdgeIDs = new Set<string>();

  return {
    nodes: nodes.filter((node: LocalNode) => {
      if (seenNodeIDs.has(node.id)) {
        return false;
      }
      seenNodeIDs.add(node.id);
      return true;
    }),
    edges: edges.filter((edge: LocalEdge) => {
      if (seenEdgeIDs.has(edge.id)) {
        return false;
      }
      seenEdgeIDs.add(edge.id);
      return true;
    }),
  };
}

function generateTypeSubgraph(
  typeHandle: TypeHandle,
  typeSet: TypeSet,
  getTuplesetPathColor: () => string,
) {
  const nodes: LocalNode[] = [];
  const edges: LocalEdge[] = [];

  // Add nodes for each relation.
  Object.values(typeHandle.relations).forEach(
    (relationHandle: RelationHandle) => {
      // Add the relation node.
      nodes.push({
        id: NodeIDs.Relation(relationHandle),
        label: relationHandle.relation.name,
        group: "relation",
        shape: "diamond",
        color: {
          background: COLORS.relation,
          border: COLORS.relation,
        },
        sourceInfo: {
          parserRange: relationHandle.relation.range,
        },
      });

      // Connect the relation to the type.
      edges.push({
        id: EdgeIDs.TypeToRelation(relationHandle),
        from: NodeIDs.ObjectType(relationHandle.parentType),
        to: NodeIDs.Relation(relationHandle),
        color: { color: COLORS.typetorelation },
        sourceInfo: {
          parserRange: relationHandle.relation.range,
        },
      });

      // Connect the relation via data edges to any data referenced namespaces.
      const links = typeSet.lookupRelationLinks(relationHandle);
      links.forEach((link: RelationLink) => {
        const referencedType = link.subjectType;
        const tableContents = link.relationships
          .map((rel: Relationship) => {
            // NOTE: VisJS is doing the sanitizing of the input here. This was verified
            // manually by jschorr.
            return `<tr>
                    <td><code>${rel.resourceAndRelation?.namespace}</code></td>
                    <td><code>:</code></td>
                    <td><code>${rel.resourceAndRelation?.objectId}</code></td>
                    <td><code>#</code></td>
                    <td><code>${rel.resourceAndRelation?.relation}</code></td>
                    <td><code>@</code></td>
                    <td><code>${rel.subject?.namespace}</code></td>
                    <td><code>:</code></td>
                    <td><code>${rel.subject?.objectId}</code></td>
                    <td class="${
                      link.subjectRelation?.kind === "permission"
                        ? "target-permission"
                        : "target-relation"
                    }"><code>${
                      rel.subject?.relation === "..."
                        ? ""
                        : `#${rel.subject?.relation}`
                    }</code></td>
                        ${
                          rel.caveat?.caveatName
                            ? `<td><code>[${rel.caveat.caveatName}]</code></td>`
                            : ""
                        }
                </tr>`;
          })
          .join("");

        const relationshipListStr = `<table class="${RELATIONSHIP_TABLE_CLASS_NAME}">${tableContents}</table>`;
        edges.push({
          id: EdgeIDs.RelationToDataType(relationHandle, referencedType),
          to: link.subjectRelation
            ? NodeIDs.RelationOrPermission(link.subjectRelation)
            : NodeIDs.ObjectType(referencedType),
          from: NodeIDs.Relation(relationHandle),
          color: { color: COLORS.dataref },
          dashes: [1, 5],
          arrows: {
            to: { enabled: true },
          },
          title: `Relationships defined from ${relationHandle.relation.name} to ${referencedType.definition.name}:<br>${relationshipListStr}`,
          sourceInfo: {
            parserRange: undefined,
          },
        });
      });
    },
  );

  // Add nodes for each permission.
  Object.values(typeHandle.permissions).forEach(
    (permissionHandle: PermissionHandle) => {
      // Add the permission node.
      nodes.push({
        id: NodeIDs.Permission(permissionHandle),
        label: permissionHandle.permission.name,
        group: "permission",
        shape: "diamond",
        color: {
          background: "transparent",
          border: COLORS.permission,
        },
        sourceInfo: {
          parserRange: permissionHandle.permission.range,
        },
      });

      // Add nodes and edges representing the permission's expression.
      const { nodes: exNodes, edges: exEdges } = generateExpressionGraph(
        permissionHandle.permission.expr,
        NodeIDs.Permission(permissionHandle),
        typeHandle,
        typeSet,
        getTuplesetPathColor,
      );
      nodes.push(...exNodes);
      edges.push(...exEdges);

      // Connect the permission to the type.
      edges.push({
        id: EdgeIDs.TypeToPermission(permissionHandle),
        from: NodeIDs.ObjectType(permissionHandle.parentType),
        to: NodeIDs.Permission(permissionHandle),
        color: { color: COLORS.typetopermission },
        sourceInfo: {
          parserRange: permissionHandle.permission.range,
        },
      });
    },
  );

  // Add the type's node.
  nodes.push({
    id: NodeIDs.ObjectType(typeHandle),
    label: typeHandle.definition.name,
    group: "objecttype",
    color: COLORS.type,
    title: `definition ${typeHandle.definition.name}`,
    sourceInfo: {
      parserRange: typeHandle.definition.range,
    },
  });

  // Connect the the type to the tenant.
  /*edges.push({
        id: EdgeIDs.TypeToRoot(typeHandle),
        from: NodeIDs.Root,
        to: NodeIDs.ObjectType(typeHandle),
        sourceInfo: undefined
    });*/

  return {
    nodes,
    edges,
  };
}

function generateExpressionGraph(
  expression: ParsedExpression,
  parentNodeID: string,
  typeHandle: TypeHandle,
  typeSet: TypeSet,
  getTuplesetPathColor: () => string,
) {
  const nodes: LocalNode[] = [];
  const edges: LocalEdge[] = [];

  switch (expression.kind) {
    case "relationref": {
      const found = typeHandle.lookupRelationOrPermission(
        expression.relationName,
      );
      if (found) {
        edges.push({
          id: EdgeIDs.ReferencedRelationOrPermission(parentNodeID, found),
          from: parentNodeID,
          to: NodeIDs.RelationOrPermission(found),
          arrows: {
            to: { enabled: true },
          },
          title: `include subjects found in ${expression.relationName}`,
          sourceInfo: {
            parserRange: expression.range,
          },
        });
      }

      break;
    }

    case "arrow": {
      const resolved = typeHandle.lookupRelation(
        expression.sourceRelation.relationName,
      );
      if (resolved !== undefined) {
        const arrowColor = getTuplesetPathColor();
        edges.push({
          id: EdgeIDs.ExpressionChild(NodeIDs.Arrow(expression), parentNodeID),
          from: parentNodeID,
          to: NodeIDs.RelationOrPermission(resolved),
          dashes: [2, 10],
          arrows: {
            to: { enabled: true },
          },
          color: {
            color: arrowColor,
          },
          title: `Walk relationships found in ${expression.sourceRelation.relationName}...`,
          sourceInfo: {
            parserRange: expression.range,
          },
        });

        resolved.relation.allowedTypes.types.forEach((typeRef: TypeRef) => {
          const resolvedType = typeSet.lookupType(typeRef.path);
          if (resolvedType === undefined) {
            return;
          }

          const resolvdRelOrPerm = resolvedType.lookupRelationOrPermission(
            expression.targetRelationOrPermission,
          );
          if (resolvdRelOrPerm === undefined) {
            return;
          }

          edges.push({
            id: EdgeIDs.ArrowRelationOutward(expression, resolvdRelOrPerm),
            from: NodeIDs.RelationOrPermission(resolved),
            to: NodeIDs.RelationOrPermission(resolvdRelOrPerm),
            dashes: true,
            arrows: {
              to: { enabled: true },
            },
            color: {
              color: arrowColor,
            },
            title: `...to relationships found in ${expression.targetRelationOrPermission}`,
            sourceInfo: {
              parserRange: expression.range,
            },
          });
        });
      }
      break;
    }

    case "binary": {
      const unionedRelations = collectUnionedRelations(
        expression,
        parentNodeID,
        typeHandle,
        typeSet,
        getTuplesetPathColor,
      );
      if (unionedRelations) {
        const { relations, nodes: urNodes, edges: urEdges } = unionedRelations;
        relations.forEach((expr: ParsedRelationRefExpression) => {
          const referenced = typeHandle.lookupRelationOrPermission(
            expr.relationName,
          );
          if (referenced) {
            edges.push({
              id: EdgeIDs.ExpressionChild(
                NodeIDs.RelationOrPermission(referenced),
                parentNodeID,
              ),
              from: parentNodeID,
              to: NodeIDs.RelationOrPermission(referenced),
              arrows: {
                to: { enabled: true },
              },
              sourceInfo: {
                parserRange: expr.range,
              },
            });
          }
        });

        nodes.push(...urNodes);
        edges.push(...urEdges);
      } else {
        nodes.push({
          id: NodeIDs.Binary(expression),
          label: REWRITE_OPS[expression.operator],
          group: "expr",
          color: {
            background: "transparent",
            border: REWRITE_COLORS[expression.operator],
          },
          sourceInfo: {
            parserRange: expression.range,
          },
        });

        edges.push({
          id: EdgeIDs.ExpressionChild(NodeIDs.Binary(expression), parentNodeID),
          from: parentNodeID,
          to: NodeIDs.Binary(expression),
          arrows: {
            to: { enabled: true },
          },
          sourceInfo: {
            parserRange: expression.range,
          },
        });

        const { nodes: lNodes, edges: lEdges } = generateExpressionGraph(
          expression.left,
          NodeIDs.Binary(expression),
          typeHandle,
          typeSet,
          getTuplesetPathColor,
        );
        const { nodes: rNodes, edges: rEdges } = generateExpressionGraph(
          expression.right,
          NodeIDs.Binary(expression),
          typeHandle,
          typeSet,
          getTuplesetPathColor,
        );
        nodes.push(...lNodes);
        nodes.push(...rNodes);

        edges.push(...lEdges);
        edges.push(...rEdges);
      }
      break;
    }
  }

  return {
    nodes: nodes,
    edges: edges,
  };
}

function collectUnionedRelations(
  expr: ParsedExpression,
  parentNodeID: string,
  typeHandle: TypeHandle,
  typeSet: TypeSet,
  getTuplesetPathColor: () => string,
):
  | {
      relations: ParsedRelationRefExpression[];
      nodes: LocalNode[];
      edges: LocalEdge[];
    }
  | undefined {
  switch (expr.kind) {
    case "binary": {
      if (expr.operator !== "union") {
        return undefined;
      }

      const left = collectUnionedRelations(
        expr.left,
        parentNodeID,
        typeHandle,
        typeSet,
        getTuplesetPathColor,
      );
      if (left === undefined) {
        return undefined;
      }

      const right = collectUnionedRelations(
        expr.right,
        parentNodeID,
        typeHandle,
        typeSet,
        getTuplesetPathColor,
      );
      if (right === undefined) {
        return undefined;
      }

      return {
        relations: [...left.relations, ...right.relations],
        nodes: [...left.nodes, ...right.nodes],
        edges: [...left.edges, ...right.edges],
      };
    }

    case "namedarrow":
    // fallthrough

    case "arrow": {
      const { nodes, edges } = generateExpressionGraph(
        expr,
        parentNodeID,
        typeHandle,
        typeSet,
        getTuplesetPathColor,
      );
      return {
        relations: [],
        nodes: nodes,
        edges: edges,
      };
    }

    case "nil":
      return undefined;

    default:
      return { relations: [expr], nodes: [], edges: [] };
  }
}
