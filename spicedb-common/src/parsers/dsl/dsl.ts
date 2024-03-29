import Parsimmon from 'parsimmon';
import { celExpression } from '../cel/cel';

/**
 * ParseResult is the result of a direct parse.
 */
export interface ParseResult {
  /**
   * error is the parsing error found, if any.
   */
  error: ParseError | undefined;

  /**
   * schema is the fully parsed schema, if no error.
   */
  schema: ParsedSchema | undefined;
}

/**
 * ParseError represents an error raised by the parser.
 */
export interface ParseError {
  /**
   * message is the human-readable error message.
   */
  message: string;

  /**
   * index is the location of the parse error.
   */
  index: Index;

  /**
   * expected is the set of expected regular expression(s) at the index.
   */
  expected: string[];
}

/**
 * parseSchema parses a DSL schema, returning relevant semantic information
 * or undefined if the parse failed.
 */
export const parseSchema = (value: string): ParsedSchema | undefined => {
  const parsed = parse(value);
  if (parsed.error) {
    return undefined;
  }

  return parsed.schema as ParsedSchema;
};

/**
 * ObjectOrCaveatDefinition are the types of definitions found at the root of a schema.
 */
export type ObjectOrCaveatDefinition =
  | ParsedObjectDefinition
  | ParsedCaveatDefinition;

/**
 * parse performs a parse on the schema string, returning the full parse result.
 */
export function parse(input: string): ParseResult {
  const result = whitespace.then(definitionOrCaveat.atLeast(0)).parse(input);
  return {
    error: !result.status
      ? {
          message: Parsimmon.formatError(input, result),
          index: result.index,
          expected: result.expected,
        }
      : undefined,
    schema: result.status
      ? {
          kind: 'schema',
          stringValue: input,
          definitions: (result as Parsimmon.Success<ObjectOrCaveatDefinition[]>)
            .value,
        }
      : undefined,
  };
}

/**
 * getCaveatExpression returns the string form of the caveat expression for a particular parsed
 * caveat expression within a schema.
 */
export function getCaveatExpression(
  expr: ParsedCaveatExpression,
  parsed: ParsedSchema
): string {
  return parsed.stringValue.substring(
    expr.range.startIndex.offset,
    expr.range.endIndex.offset
  );
}

/**
 * flatMapExpression runs a flat mapping operation over an expression tree, returning any found results.
 */
export function flatMapExpression<T>(
  expr: ParsedExpression,
  walker: ExprWalker<T>
): T[] {
  switch (expr.kind) {
    case 'arrow':
      const arrowResult = walker(expr);
      const childResults = flatMapExpression<T>(expr.sourceRelation, walker);
      return arrowResult ? [...childResults, arrowResult] : childResults;

    case 'nil':
      const nilResult = walker(expr);
      return nilResult ? [nilResult] : [];

    case 'relationref':
      const result = walker(expr);
      return result ? [result] : [];

    case 'binary':
      const binResult = walker(expr);
      const leftResults = flatMapExpression<T>(expr.left, walker);
      const rightResults = flatMapExpression<T>(expr.right, walker);
      return binResult
        ? [...leftResults, ...rightResults, binResult]
        : [...leftResults, ...rightResults];
  }
}

/**
 * ReferenceNode is the node returned by findReferenceNode, along with its parent definition,
 * if any.
 */
export interface ReferenceNode {
  node: ParsedRelationRefExpression | TypeRef | undefined;
  def: ObjectOrCaveatDefinition;
}

/**
 * findReferenceNode walks the parse tree to find the node matching the given line number and
 * column position.
 */
export function findReferenceNode(
  schema: ParsedSchema,
  lineNumber: number,
  columnPosition: number
): ReferenceNode | undefined {
  const found = schema.definitions
    .map((def: ObjectOrCaveatDefinition) => {
      if (!rangeContains(def, lineNumber, columnPosition)) {
        return undefined;
      }

      if (def.kind === 'objectDef') {
        return findReferenceNodeInDef(def, lineNumber, columnPosition);
      }
      return undefined;
    })
    .filter((f: ReferenceNode | undefined) => !!f);
  return found.length > 0 ? found[0] : undefined;
}

/**
 * mapParsedSchema runs the given mapper function on every node in the parse tree (except the
 * contents of a caveat, which are considered "opaque").
 */
export function mapParsedSchema(
  schema: ParsedSchema | undefined,
  mapper: (node: ParsedNode) => void
) {
  if (schema === undefined) {
    return;
  }

  schema.definitions.forEach((def: ObjectOrCaveatDefinition) => {
    mapParseNodes(def, mapper);
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Parser node types
////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ParsedSchema {
  kind: 'schema';
  stringValue: string;
  definitions: ObjectOrCaveatDefinition[];
}

export interface ParsedCaveatDefinition {
  kind: 'caveatDef';
  name: string;
  parameters: ParsedCaveatParameter[];
  expression: ParsedCaveatExpression;
  range: TextRange;
}

export interface ParsedCaveatExpression {
  kind: 'caveatExpr';
  range: TextRange;
}

export interface ParsedCaveatParameter {
  kind: 'caveatParameter';
  name: string;
  type: ParsedCaveatParameterTypeRef;
  range: TextRange;
}

export interface ParsedCaveatParameterTypeRef {
  kind: 'caveatParameterTypeExpr';
  name: string;
  generics: ParsedCaveatParameterTypeRef[];
  range: TextRange;
}

export interface ParsedObjectDefinition {
  kind: 'objectDef';
  name: string;
  relations: ParsedRelation[];
  permissions: ParsedPermission[];
  range: TextRange;
}

export interface ParsedRelation {
  kind: 'relation';
  name: string;
  allowedTypes: TypeExpr;
  range: TextRange;
}

export type ParsedExpression =
  | ParsedBinaryExpression
  | ParsedRelationRefExpression
  | ParsedArrowExpression
  | ParsedNilExpression;

export interface ParsedArrowExpression {
  kind: 'arrow';
  sourceRelation: ParsedRelationRefExpression;
  targetRelationOrPermission: string;
  range: TextRange;
}

export interface ParsedRelationRefExpression {
  kind: 'relationref';
  relationName: string;
  range: TextRange;
}

export interface ParsedNilExpression {
  kind: 'nil';
  isNil: true;
  range: TextRange;
}

export interface ParsedBinaryExpression {
  kind: 'binary';
  operator: 'union' | 'intersection' | 'exclusion';
  left: ParsedExpression;
  right: ParsedExpression;
  range: TextRange;
}

export interface ParsedPermission {
  kind: 'permission';
  name: string;
  expr: ParsedExpression;
  range: TextRange;
}

export type RelationOrPermission = ParsedRelation | ParsedPermission;

export interface TypeRef {
  kind: 'typeref';
  path: string;
  relationName: string | undefined;
  wildcard: boolean;
  withCaveat: WithCaveat | undefined;
  range: TextRange;
}

export interface WithCaveat {
  kind: 'withcaveat';
  path: string;
  range: TextRange;
}

export interface TypeExpr {
  kind: 'typeexpr';
  types: TypeRef[];
  range: TextRange;
}

export type ParsedNode =
  | ParsedCaveatDefinition
  | ParsedCaveatParameter
  | ParsedCaveatParameterTypeRef
  | ParsedCaveatExpression
  | ParsedObjectDefinition
  | ParsedRelation
  | ParsedPermission
  | ParsedExpression
  | TypeRef
  | TypeExpr
  | WithCaveat;

export interface Index {
  offset: number;
  line: number;
  column: number;
}

export interface TextRange {
  startIndex: Index;
  endIndex: Index;
}

export type ExprWalker<T> = (expr: ParsedExpression) => T | undefined;

////////////////////////////////////////////////////////////////////////////////////////////////////
// Parser and utility methods below
////////////////////////////////////////////////////////////////////////////////////////////////////

const regex = Parsimmon.regex;
const string = Parsimmon.string;
const seq = Parsimmon.seq;
const seqMap = Parsimmon.seqMap;
const alt = Parsimmon.alt;
const optWhitespace = Parsimmon.optWhitespace;
const newline = Parsimmon.newline;

const singleLineComment = regex(/\/\/.*/).then(optWhitespace.atMost(1));
const multiLineComment = regex(/\/\*((((?!\*\/).)|\r|\n)*)\*\//).then(
  optWhitespace.atMost(1)
);

const comment = singleLineComment.or(multiLineComment);
const whitespace = optWhitespace.then(comment.atLeast(0));
const lexeme = function (p: any) {
  return p.skip(whitespace);
};

const identifier = lexeme(regex(/[a-zA-Z_][0-9a-zA-Z_+]*/));
const path = lexeme(
  regex(/([a-zA-Z_][0-9a-zA-Z_+-]*\/)*[a-zA-Z_][0-9a-zA-Z_+-]*/)
);
const colon = lexeme(regex(/:/));
const equal = lexeme(regex(/=/));
const semicolon = lexeme(regex(/;/));
const pipe = lexeme(regex(/\|/));

const lbrace = lexeme(string('{'));
const rbrace = lexeme(string('}'));
const lparen = lexeme(string('('));
const rparen = lexeme(string(')'));
const lcaret = lexeme(string('<'));
const rcaret = lexeme(string('>'));
const arrow = lexeme(string('->'));
const hash = lexeme(string('#'));
const comma = lexeme(string(','));

const terminator: any = newline.or(semicolon);

// Type reference and expression.
const withCaveat: any = Parsimmon.seqMap(
  Parsimmon.index,
  seq(lexeme(string('with')), path),
  Parsimmon.index,
  function (startIndex, data, endIndex) {
    return {
      kind: 'withcaveat',
      path: data[1],
      range: { startIndex: startIndex, endIndex: endIndex },
    };
  }
);

const typeRef: any = Parsimmon.seqMap(
  Parsimmon.index,
  seq(
    seq(path, colon, lexeme(string('*'))).or(
      seq(path, hash.then(identifier).atMost(1))
    ),
    withCaveat.atMost(1)
  ),
  Parsimmon.index,
  function (startIndex, data, endIndex) {
    const isWildcard = data[0][2] === '*';
    return {
      kind: 'typeref',
      path: data[0][0],
      relationName: isWildcard ? undefined : data[0][1][0],
      wildcard: isWildcard,
      withCaveat: (data[1] as any[]).length > 0 ? data[1][0] : undefined,
      range: { startIndex: startIndex, endIndex: endIndex },
    };
  }
);

const typeExpr: any = Parsimmon.lazy(() => {
  return Parsimmon.seqMap(
    Parsimmon.index,
    seq(typeRef, pipedTypeExpr.atLeast(0)),
    Parsimmon.index,
    function (startIndex, data, endIndex) {
      const remaining: any[] = data[1];
      return {
        kind: 'typeexpr',
        types: [data[0], ...remaining],
        range: { startIndex: startIndex, endIndex: endIndex },
      };
    }
  );
});

const pipedTypeExpr: any = pipe.then(typeRef);

// Permission expression.
// Based on: https://github.com/jneen/parsimmon/blob/93648e20f40c5c0335ac6506b39b0ca58b87b1d9/examples/math.js#L29
const relationReference: any = Parsimmon.lazy(() => {
  return Parsimmon.seqMap(
    Parsimmon.index,
    seq(identifier),
    Parsimmon.index,
    function (startIndex, data, endIndex) {
      return {
        kind: 'relationref',
        relationName: data[0],
        range: { startIndex: startIndex, endIndex: endIndex },
      };
    }
  );
});

const arrowExpr: any = Parsimmon.lazy(() => {
  return Parsimmon.seqMap(
    Parsimmon.index,
    seq(relationReference, arrow, identifier),
    Parsimmon.index,
    function (startIndex, data, endIndex) {
      return {
        kind: 'arrow',
        sourceRelation: data[0],
        targetRelationOrPermission: data[2],
        range: { startIndex: startIndex, endIndex: endIndex },
      };
    }
  );
});

const nilExpr: any = Parsimmon.lazy(() => {
  return Parsimmon.seqMap(
    Parsimmon.index,
    string('nil'),
    Parsimmon.index,
    function (startIndex, data, endIndex) {
      return {
        kind: 'nil',
        isNil: true,
        range: { startIndex: startIndex, endIndex: endIndex },
      };
    }
  );
});

const parensExpr: any = Parsimmon.lazy(() =>
  string('(')
    .then(expr)
    .skip(string(')'))
    .or(arrowExpr)
    .or(nilExpr)
    .or(relationReference)
);

function BINARY_LEFT(operatorsParser: any, nextParser: any) {
  return seqMap(
    nextParser,
    seq(operatorsParser, nextParser).many(),
    (first: any, rest: any) => {
      return rest.reduce((acc: any, ch: any) => {
        let [op, another] = ch;
        return {
          kind: 'binary',
          operator: op,
          left: acc,
          right: another,
          range: {
            startIndex: acc.range.startIndex,
            endIndex: another.range.endIndex,
          },
        };
      }, first);
    }
  );
}

function operators(ops: Record<string, string>) {
  const keys = Object.keys(ops).sort();
  const ps = keys.map((k) => string(ops[k]).trim(optWhitespace).result(k));
  return alt.apply(null, ps);
}

const table = [
  { type: BINARY_LEFT, ops: operators({ union: '+' }) },
  { type: BINARY_LEFT, ops: operators({ intersection: '&' }) },
  { type: BINARY_LEFT, ops: operators({ exclusion: '-' }) },
];

const tableParser: any = table.reduce(
  (acc: any, level: any) => level.type(level.ops, acc),
  parensExpr
);

const expr = tableParser.trim(whitespace);

// Definitions members.
const permission: any = Parsimmon.seqMap(
  Parsimmon.index,
  seq(
    lexeme(string('permission')),
    identifier,
    equal.then(expr).skip(terminator.atMost(1))
  ),
  Parsimmon.index,
  function (startIndex, data, endIndex) {
    return {
      kind: 'permission',
      name: data[1],
      expr: data[2],
      range: { startIndex: startIndex, endIndex: endIndex },
    };
  }
);

const relation: any = Parsimmon.seqMap(
  Parsimmon.index,
  seq(
    lexeme(string('relation')),
    identifier,
    colon.then(typeExpr).skip(terminator.atMost(1))
  ),
  Parsimmon.index,
  function (startIndex, data, endIndex) {
    return {
      kind: 'relation',
      name: data[1],
      allowedTypes: data[2],
      range: { startIndex: startIndex, endIndex: endIndex },
    };
  }
);

const relationOrPermission = relation.or(permission);

// Object Definitions.
const definition: any = Parsimmon.seqMap(
  Parsimmon.index,
  seq(
    lexeme(string('definition')),
    path,
    lbrace.then(relationOrPermission.atLeast(0)).skip(rbrace)
  ),
  Parsimmon.index,
  function (startIndex, data, endIndex) {
    const rp = data[2] as RelationOrPermission[];
    return {
      kind: 'objectDef',
      name: data[1],
      relations: rp.filter(
        (relOrPerm: RelationOrPermission) => 'allowedTypes' in relOrPerm
      ),
      permissions: rp.filter(
        (relOrPerm: RelationOrPermission) => !('allowedTypes' in relOrPerm)
      ),
      range: { startIndex: startIndex, endIndex: endIndex },
    };
  }
);

// Caveats.
const caveatParameterTypeExpr: any = Parsimmon.lazy(() => {
  return Parsimmon.seqMap(
    Parsimmon.index,
    seq(
      identifier,
      lcaret.then(caveatParameterTypeExpr).skip(rcaret).atMost(1)
    ),
    Parsimmon.index,
    function (startIndex, data, endIndex) {
      return {
        kind: 'caveatParameterTypeExpr',
        name: data[0],
        generics: data[1],
        range: { startIndex: startIndex, endIndex: endIndex },
      };
    }
  );
});

const caveatParameter: any = Parsimmon.lazy(() => {
  return Parsimmon.seqMap(
    Parsimmon.index,
    seq(identifier, caveatParameterTypeExpr),
    Parsimmon.index,
    function (startIndex, data, endIndex) {
      return {
        kind: 'caveatParameter',
        name: data[0],
        type: data[1],
        range: { startIndex: startIndex, endIndex: endIndex },
      };
    }
  );
});

const caveatParameters: any = Parsimmon.lazy(() => {
  return Parsimmon.seqMap(
    Parsimmon.index,
    seq(lparen, caveatParameter, commaedParameter.atLeast(0), rparen),
    Parsimmon.index,
    function (startIndex, data, endIndex) {
      const remaining: any[] = data[2];
      return {
        kind: 'caveatParameters',
        parameters: [data[1], ...remaining],
        range: { startIndex: startIndex, endIndex: endIndex },
      };
    }
  );
});

const commaedParameter: any = comma.then(caveatParameter);

const caveatExpression: any = Parsimmon.seqMap(
  Parsimmon.index,
  seq(celExpression),
  Parsimmon.index,
  function (startIndex, data, endIndex) {
    return {
      kind: 'caveatExpr',
      range: { startIndex: startIndex, endIndex: endIndex },
    };
  }
);

const caveat: any = Parsimmon.seqMap(
  Parsimmon.index,
  seq(
    lexeme(string('caveat')),
    path,
    caveatParameters,
    lbrace,
    caveatExpression,
    rbrace
  ),
  Parsimmon.index,
  function (startIndex, data, endIndex) {
    return {
      kind: 'caveatDef',
      name: data[1],
      parameters: (data[2] as any).parameters,
      expression: data[4],
      range: { startIndex: startIndex, endIndex: endIndex },
    };
  }
);

const definitionOrCaveat = definition.or(caveat);

function findReferenceNodeInDef(
  def: ParsedObjectDefinition,
  lineNumber: number,
  columnPosition: number
): ReferenceNode | undefined {
  const pFound = def.permissions
    .map((permission: ParsedPermission) => {
      if (!rangeContains(permission, lineNumber, columnPosition)) {
        return undefined;
      }

      return findReferenceNodeInPermission(
        permission,
        lineNumber,
        columnPosition
      );
    })
    .filter((f: ParsedRelationRefExpression | TypeRef | undefined) => !!f);

  if (pFound.length > 0) {
    return { node: pFound[0], def: def };
  }

  const rFound = def.relations
    .map((relation: ParsedRelation) => {
      if (!rangeContains(relation, lineNumber, columnPosition)) {
        return undefined;
      }

      return findReferenceNodeInRelation(relation, lineNumber, columnPosition);
    })
    .filter((f: ParsedRelationRefExpression | TypeRef | undefined) => !!f);
  if (rFound.length > 0) {
    return { node: rFound[0], def: def };
  }

  return undefined;
}

function findReferenceNodeInPermission(
  permission: ParsedPermission,
  lineNumber: number,
  columnPosition: number
): ParsedRelationRefExpression | TypeRef | undefined {
  const found = flatMapExpression(permission.expr, (expr: ParsedExpression) => {
    if (expr.range && !rangeContains(expr, lineNumber, columnPosition)) {
      return undefined;
    }

    switch (expr.kind) {
      case 'relationref':
        return expr;
    }

    return undefined;
  });

  return found.length > 0 ? found[0] : undefined;
}

function findReferenceNodeInRelation(
  relation: ParsedRelation,
  lineNumber: number,
  columnPosition: number
): ParsedRelationRefExpression | TypeRef | undefined {
  const found = relation.allowedTypes.types
    .map((typeRef: TypeRef) => {
      if (!rangeContains(typeRef, lineNumber, columnPosition)) {
        return undefined;
      }

      return typeRef;
    })
    .filter((f: ParsedRelationRefExpression | TypeRef | undefined) => !!f);

  return found.length > 0 ? found[0] : undefined;
}

function mapParseNodes(
  node: ParsedNode | undefined,
  mapper: (node: ParsedNode) => void
) {
  if (node === undefined) {
    return;
  }

  mapper(node);

  switch (node.kind) {
    case 'objectDef':
      node.relations.forEach((rel: ParsedRelation) => {
        mapParseNodes(rel, mapper);
      });
      node.permissions.forEach((perm: ParsedPermission) => {
        mapParseNodes(perm, mapper);
      });
      break;

    case 'caveatDef':
      node.parameters.forEach((param: ParsedCaveatParameter) => {
        mapParseNodes(param, mapper);
      });
      mapParseNodes(node.expression, mapper);
      break;

    case 'caveatParameter':
      mapParseNodes(node.type, mapper);
      break;

    case 'caveatParameterTypeExpr':
      node.generics.forEach((n) => mapParseNodes(n, mapper));
      break;

    case 'relation':
      mapParseNodes(node.allowedTypes, mapper);
      break;

    case 'permission':
      flatMapExpression(node.expr, mapper);
      break;

    case 'typeexpr':
      node.types.forEach((n) => mapParseNodes(n, mapper));
      break;

    case 'typeref':
      mapParseNodes(node.withCaveat, mapper);
      break;
  }
}

function rangeContains(
  withRange: { range: TextRange },
  lineNumber: number,
  columnPosition: number
): boolean {
  if (
    withRange.range.startIndex.line > lineNumber ||
    withRange.range.endIndex.line < lineNumber
  ) {
    return false;
  }

  if (withRange.range.startIndex.line === lineNumber) {
    if (withRange.range.startIndex.column > columnPosition) {
      return false;
    }
  }

  if (withRange.range.endIndex.line === lineNumber) {
    if (withRange.range.endIndex.column < columnPosition) {
      return false;
    }
  }

  return true;
}
