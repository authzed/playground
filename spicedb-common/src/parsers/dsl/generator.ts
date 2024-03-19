import {
  getCaveatExpression,
  ObjectOrCaveatDefinition,
  ParsedCaveatParameter,
  ParsedCaveatParameterTypeRef,
  ParsedExpression,
  ParsedPermission,
  ParsedRelation,
  ParsedSchema,
  parseSchema,
  TypeExpr,
  TypeRef,
} from "./dsl";

/**
 * rewriteSchema rewrites the given schema by prefixing all type refs and type defs with the specified
 * prefix. Returns undefined if the schema could not be parsed and returns the original string if everything
 * has already been prefixed properly.
 */
export function rewriteSchema(
  schema: string,
  prefixSlug: string
): string | undefined {
  const parsed = parseSchema(schema);
  if (!parsed) {
    return undefined;
  }

  let hasChanges = false;
  const path = (existing: string) => {
    const parts = existing.split("/", 2);
    if (parts.length === 2 && parts[0] === prefixSlug) {
      return existing;
    }

    hasChanges = true;
    return parts.length === 1
      ? `${prefixSlug}/${existing}`
      : `${prefixSlug}/${parts[1]}`;
  };

  parsed.definitions.forEach((def: ObjectOrCaveatDefinition) => {
    def.name = path(def.name);

    switch (def.kind) {
      case "objectDef":
        def.relations.forEach((rel: ParsedRelation) => {
          rel.allowedTypes.types.forEach((typeRef: TypeRef) => {
            typeRef.path = path(typeRef.path);
            if (typeRef.withCaveat) {
              typeRef.withCaveat.path = path(typeRef.withCaveat.path);
            }
          });
        });
        break;
    }
  });

  return hasChanges ? generateSchema(parsed) : schema;
}

/**
 * checkSchema performs basic checks on the schema, returning an error message for
 * a problem found, if any.
 */
export function checkSchema(schema: string): string | undefined {
  const parsed = parseSchema(schema);
  if (!parsed) {
    return undefined;
  }

  const seenDefinitions = new Set<string>();
  for (const def of parsed.definitions) {
    if (seenDefinitions.has(def.name)) {
      return `definition is redefined: ${def.name}`;
    }

    seenDefinitions.add(def.name);
  }

  return undefined;
}

function generateSchema(parsed: ParsedSchema): string {
  return parsed.definitions
    .map((def: ObjectOrCaveatDefinition) => {
      switch (def.kind) {
        case "objectDef":
          return `definition ${def.name} {
            ${def.relations
              .map(generateRelation)
              .map((s: string) => `  ${s}`)
              .join("\n")}
            ${def.permissions
              .map(generatePermission)
              .map((s: string) => `  ${s}`)
              .join("\n")}
            }`;

        case "caveatDef":
          return `caveat ${def.name}(${def.parameters
            .map(generateCaveatParameter)
            .join(", ")}) {
              ${getCaveatExpression(def.expression, parsed)}
            }`;
      }

      throw new Error("unknown definition kind in generateSchema");
    })
    .join("\n\n")
    .trim();
}

function generateCaveatParameter(parsed: ParsedCaveatParameter) {
  return `${parsed.name} ${generateCaveatParameterType(parsed.type)}`;
}

function generateCaveatParameterType(parsed: ParsedCaveatParameterTypeRef) {
  let paramType = parsed.name;
  if (parsed.generics.length > 0) {
    paramType += `<${parsed.generics
      .map(generateCaveatParameterType)
      .join(", ")}>`;
  }

  return paramType;
}

function generateRelation(parsed: ParsedRelation): string {
  return `relation ${parsed.name}: ${generateTypeRefs(parsed.allowedTypes)};`;
}

function generateTypeRefs(parsed: TypeExpr): string {
  return parsed.types
    .map((typeref: TypeRef) => {
      const withCaveat = typeref.withCaveat
        ? ` with ${typeref.withCaveat.path}`
        : "";

      if (typeref.relationName) {
        return `${typeref.path}#${typeref.relationName}${withCaveat}`;
      }

      if (typeref.wildcard) {
        return `${typeref.path}:*${withCaveat}`;
      }

      return `${typeref.path}${withCaveat}`;
    })
    .join(" | ");
}

function generatePermission(parsed: ParsedPermission): string {
  return `permission ${parsed.name} = ${generateExpr(parsed.expr)};`;
}

const OPERATOR = {
  union: "+",
  intersection: "&",
  exclusion: "-",
};

function generateExpr(parsed: ParsedExpression): string {
  switch (parsed.kind) {
    case "arrow":
      return `${parsed.sourceRelation.relationName}->${parsed.targetRelationOrPermission}`;

    case "binary":
      return `(${generateExpr(parsed.left)} ${
        OPERATOR[parsed.operator]
      } ${generateExpr(parsed.right)})`;

    case "relationref":
      return parsed.relationName;

    case "nil":
      return "nil";
  }

  throw Error("unknown expr type in generate expr");
}
