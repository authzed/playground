import Parsimmon, { Parser } from 'parsimmon';

const regex = Parsimmon.regex;
const string = Parsimmon.string;
const seq = Parsimmon.seq;
const optWhitespace = Parsimmon.optWhitespace;

const singleLineComment = regex(/\/\/.*/).then(optWhitespace.atMost(1));
const multiLineComment = regex(/\/\*((((?!\*\/).)|\r|\n)*)\*\//).then(
  optWhitespace.atMost(1)
);

const comment = singleLineComment.or(multiLineComment);
const whitespace = optWhitespace.then(comment.atLeast(0));
const lexeme = function (p: any) {
  return p.skip(whitespace);
};

const reserved = [
  'in',
  'as',
  'break',
  'const',
  'continue',
  'else',
  'for',
  'function',
  'if',
  'import',
  'let',
  'loop',
  'package',
  'namespace',
  'return',
  'var',
  'void',
  'while',
];

const identifier = lexeme(regex(/[a-zA-Z_][0-9a-zA-Z_+]*/));

const questionMark = lexeme(string('?'));
const colon = lexeme(string(':'));
const orToken = lexeme(string('||'));
const andToken = lexeme(string('&&'));
const bang = lexeme(string('!'));
const dot = lexeme(string('.'));
const dash = lexeme(string('-'));
const lbracket = lexeme(string('['));
const rbracket = lexeme(string(']'));
const lbrace = lexeme(string('{'));
const rbrace = lexeme(string('}'));
const lparen = lexeme(string('('));
const rparen = lexeme(string(')'));
const comma = lexeme(string(','));

// Based on: https://github.com/google/cel-spec/blob/master/doc/langdef.md#syntax

const numberLiteral = lexeme(regex(/[+-]?([0-9]*[.])?[0-9]+(u?)(e[0-9]+)?/));
const boolLiteral = lexeme(string('true')).or(lexeme(string('false')));
const nullLiteral = lexeme(string('null'));

// STRING_LIT     ::= [rR]? ( "    ~( " | NEWLINE )*  "
// | '    ~( ' | NEWLINE )*  '
// | """  ~"""*              """
// | '''  ~'''*              '''
// )
const regexPrefix = lexeme(string('r')).or(lexeme(string('R')));
const singleQuotedString = lexeme(regex(/'((?:\\.|.)*?)'/));
const doubleQuotedString = lexeme(regex(/"((?:\\.|.)*?)"/));
const multilineString = lexeme(regex(/"""((((?!""").)|\r|\n)*)"""/)).or(
  lexeme(regex(/'''((((?!''').)|\r|\n)*)'''/))
);

const stringLiteral = seq(
  regexPrefix.atMost(1),
  multilineString.or(singleQuotedString.or(doubleQuotedString))
);

// BYTES_LIT      ::= [bB] STRING_LIT
const bytesPrefix = lexeme(string('b')).or(lexeme(string('B')));
const bytesLiteral = seq(bytesPrefix, stringLiteral);

// LITERAL        ::= INT_LIT | UINT_LIT | FLOAT_LIT | STRING_LIT | BYTES_LIT | BOOL_LIT | NULL_LIT
const literal = numberLiteral
  .or(stringLiteral)
  .or(boolLiteral)
  .or(nullLiteral)
  .or(bytesLiteral);

const expression = Parsimmon.lazy(() => {
  return celExpression;
});

// MapInits       = Expr ":" Expr {"," Expr ":" Expr} ;
const mapInits = seq(
  expression,
  colon,
  expression,
  seq(comma, expression, colon, expression).atLeast(0)
);

// FieldInits     = IDENT ":" Expr {"," IDENT ":" Expr} ;
const fieldInits = seq(
  identifier,
  colon,
  expression,
  seq(comma, identifier, colon, expression).atLeast(0)
);

// Primary        = ["."] IDENT ["(" [ExprList] ")"]
// | "(" Expr ")"
// | "[" [ExprList] [","] "]"
// | "{" [MapInits] [","] "}"
// | ["."] IDENT { "." IDENT } "{" [FieldInits] [","] "}"
// | LITERAL
// NOTE: some skipped because not necessary here with the reordering below of member.
const primary = literal
  .or(seq(lparen, expression, rparen))
  .or(
    seq(
      lbracket,
      Parsimmon.lazy(() => {
        return exprList;
      }),
      rbracket
    )
  )
  .or(seq(lbrace, mapInits, rbrace))
  .or(identifier);

// ExprList       = Expr {"," Expr} ;
const exprList = expression.then(seq(comma, expression).atLeast(0));

// Member         = Primary | Member "." IDENT ["(" [ExprList] ")"] | Member "[" Expr "]"
// NOTE: reordered here to allow for parsing by Parsimmon
const member: Parser<any> = seq(
  primary.then(
    seq(
      dot,
      identifier,
      seq(lparen, exprList.atMost(1), rparen)
        .or(seq(lbrace, fieldInits, rbrace))
        .atLeast(0)
    )
      .or(seq(lbracket, expression, rbracket))
      .atLeast(0)
  )
);

// Unary          = Member | "!" {"!"} Member | "-" {"-"} Member
const unary: Parser<any> = seq(
  member.or(bang.atLeast(1).then(member)).or(dash.atLeast(1).then(member))
);

// Multiplication = [Multiplication ("*" | "/" | "%")] Unary ;
// NOTE: reordered here to allow for parsing by Parsimmon
const multiplicationOp = lexeme(string('*'))
  .or(lexeme(string('/')))
  .or(lexeme(string('%')));
const multiplication: Parser<any> = seq(
  unary,
  seq(
    multiplicationOp,
    Parsimmon.lazy(() => {
      return multiplication;
    })
  ).atMost(1)
);

// Addition       = [Addition ("+" | "-")] Multiplication ;
// NOTE: reordered here to allow for parsing by Parsimmon
const additionOp = lexeme(string('+')).or(lexeme(string('-')));
const addition: Parser<any> = seq(
  multiplication,
  seq(
    additionOp,
    Parsimmon.lazy(() => {
      return addition;
    })
  ).atMost(1)
);

// Relop          = "<" | "<=" | ">=" | ">" | "==" | "!=" | "in" ;
const relOp = lexeme(string('<'))
  .or(lexeme(string('<=')))
  .or(lexeme(string('>=')))
  .or(lexeme(string('>')))
  .or(lexeme(string('==')))
  .or(lexeme(string('!=')))
  .or(lexeme(string('in')));

// Relation       = [Relation Relop] Addition ;
// NOTE: reordered here to allow for parsing by Parsimmon
const relation: Parser<any> = seq(
  addition,
  seq(
    relOp,
    Parsimmon.lazy(() => {
      return relation;
    })
  ).atMost(1)
);

// ConditionalAnd = [ConditionalAnd "&&"] Relation ;
// NOTE: reordered here to allow for parsing by Parsimmon
const conditionalAnd: Parser<any> = seq(
  relation,
  seq(
    andToken,
    Parsimmon.lazy(() => {
      return conditionalAnd;
    })
  ).atMost(1)
);

// ConditionalOr  = [ConditionalOr "||"] ConditionalAnd ;
// NOTE: reordered here to allow for parsing by Parsimmon
const conditionalOr: Parser<any> = seq(
  conditionalAnd,
  seq(
    orToken,
    Parsimmon.lazy(() => {
      return conditionalOr;
    })
  ).atMost(1)
);

// Expr = ConditionalOr ["?" ConditionalOr ":" Expr] ;
export const celExpression: Parser<any> = conditionalOr.then(
  seq(
    questionMark,
    conditionalOr,
    colon,
    Parsimmon.lazy(() => {
      return celExpression;
    })
  ).atMost(1)
);

export const parseCELExpression = (value: string) => {
  const result = whitespace.then(celExpression).parse(value);
  return result.status;
};
