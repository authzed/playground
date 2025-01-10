import {
  ParsedArrowExpression,
  ParsedBinaryExpression,
  ParsedCaveatDefinition,
  ParsedNamedArrowExpression,
  ParsedNilExpression,
  ParsedObjectDefinition,
  ParsedRelationRefExpression,
  parseSchema,
} from './dsl';

describe('parsing', () => {
  it('parses empty schema', () => {
    const schema = ``;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(0);
  });

  it('parses empty definition', () => {
    const schema = `definition foo {}`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);
    expect(parsed?.definitions[0].name).toEqual('foo');
  });

  it('parses empty definition with multiple path segements', () => {
    const schema = `definition foo/bar/baz {}`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);
    expect(parsed?.definitions[0].name).toEqual('foo/bar/baz');
  });

  it('parses basic caveat', () => {
    const schema = `caveat foo (someParam string, anotherParam int) { someParam == 42 }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);
    expect(parsed?.definitions[0].name).toEqual('foo');

    const definition = parsed?.definitions[0] as ParsedCaveatDefinition;
    expect(definition.parameters.map((p) => p.name)).toEqual([
      'someParam',
      'anotherParam',
    ]);
  });

  it('parses caveat with generic parameter type', () => {
    const schema = `caveat foo (someParam string, anotherParam map<int>) {
      someParam == 'hi' 
    }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);
    expect(parsed?.definitions[0].name).toEqual('foo');

    const definition = parsed?.definitions[0] as ParsedCaveatDefinition;
    expect(definition.parameters.map((p) => p.name)).toEqual([
      'someParam',
      'anotherParam',
    ]);
  });

  it('parses empty definition with path', () => {
    const schema = `definition foo/bar {}`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);
    expect(parsed?.definitions[0].name).toEqual('foo/bar');
  });

  it('parses multiple definitions', () => {
    const schema = `definition foo {}
        
        definition bar {}`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(2);
    expect(parsed?.definitions[0].name).toEqual('foo');
    expect(parsed?.definitions[1].name).toEqual('bar');
  });

  it('parses definition with relation', () => {
    const schema = `definition foo {
            relation barrel: something;
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(1);

    const relation = definition.relations[0]!;
    expect(relation.name).toEqual('barrel');
    expect(relation.allowedTypes.types.length).toEqual(1);
    expect(relation.allowedTypes.types[0].path).toEqual('something');
  });

  it('parses definition with caveated relation', () => {
    const schema = `definition foo {
            relation barrel: something with somecaveat;
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(1);

    const relation = definition.relations[0]!;
    expect(relation.name).toEqual('barrel');
    expect(relation.allowedTypes.types.length).toEqual(1);
    expect(relation.allowedTypes.types[0].path).toEqual('something');

    expect(relation.allowedTypes.types[0].withCaveat?.path).toEqual(
      'somecaveat'
    );
  });

  it('parses definition with prefixed caveated relation', () => {
    const schema = `definition foo {
            relation barrel: something with test/somecaveat;
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(1);

    const relation = definition.relations[0]!;
    expect(relation.name).toEqual('barrel');
    expect(relation.allowedTypes.types.length).toEqual(1);
    expect(relation.allowedTypes.types[0].path).toEqual('something');

    expect(relation.allowedTypes.types[0].withCaveat?.path).toEqual(
      'test/somecaveat'
    );
  });

  it('parses definition with subject wildcard type', () => {
    const schema = `definition foo {
            relation barrel: something:*;
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(1);

    const relation = definition.relations[0]!;
    expect(relation.name).toEqual('barrel');
    expect(relation.allowedTypes.types.length).toEqual(1);
    expect(relation.allowedTypes.types[0].path).toEqual('something');
    expect(relation.allowedTypes.types[0].relationName).toEqual(undefined);
    expect(relation.allowedTypes.types[0].wildcard).toEqual(true);
  });

  it('parses definition with subject rel type', () => {
    const schema = `definition foo {
            relation barrel: something#foo;
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(1);

    const relation = definition.relations[0]!;
    expect(relation.name).toEqual('barrel');
    expect(relation.allowedTypes.types.length).toEqual(1);
    expect(relation.allowedTypes.types[0].path).toEqual('something');
    expect(relation.allowedTypes.types[0].relationName).toEqual('foo');
  });

  it('parses definition with relation with multiple types', () => {
    const schema = `definition foo {
            relation barrel: something | somethingelse | thirdtype;
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(1);

    const relation = definition.relations[0]!;
    expect(relation.name).toEqual('barrel');
    expect(relation.allowedTypes.types.length).toEqual(3);
    expect(relation.allowedTypes.types[0].path).toEqual('something');
    expect(relation.allowedTypes.types[1].path).toEqual('somethingelse');
    expect(relation.allowedTypes.types[2].path).toEqual('thirdtype');
  });

  it('parses definition with multiple relations', () => {
    const schema = `definition foo {
            relation first: something
            relation second: somethingelse
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(2);

    const first = definition.relations[0]!;
    expect(first.name).toEqual('first');
    expect(first.allowedTypes.types.length).toEqual(1);
    expect(first.allowedTypes.types[0].path).toEqual('something');

    const second = definition.relations[1]!;
    expect(second.name).toEqual('second');
    expect(second.allowedTypes.types.length).toEqual(1);
    expect(second.allowedTypes.types[0].path).toEqual('somethingelse');
  });

  it('parses definition with a permission', () => {
    const schema = `definition foo {
          permission first = someexpr;
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(0);
    expect(definition.permissions.length).toEqual(1);

    const permission = definition.permissions[0]!;
    expect(permission.name).toEqual('first');
  });

  it('parses definition with associativity matching the schema parser in Go', () => {
    const schema = `definition foo {
          permission first = a - b + c
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(0);
    expect(definition.permissions.length).toEqual(1);

    const permission = definition.permissions[0]!;
    expect(permission.name).toEqual('first');

    const binExpr = permission.expr as ParsedBinaryExpression;
    expect(binExpr.operator).toEqual('exclusion');

    const leftExpr = binExpr.left as ParsedRelationRefExpression;
    expect(leftExpr.relationName).toEqual('a');
  });

  it('parses definition with a complex permission', () => {
    const schema = `definition foo {
          permission first = ((a - b) + nil) & d;
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(0);
    expect(definition.permissions.length).toEqual(1);

    const permission = definition.permissions[0]!;
    expect(permission.name).toEqual('first');

    const binExpr = permission.expr as ParsedBinaryExpression;
    expect(binExpr.operator).toEqual('intersection');

    const leftExpr = binExpr.left as ParsedBinaryExpression;
    expect(leftExpr.operator).toEqual('union');

    const leftLeftExpr = leftExpr.left as ParsedBinaryExpression;

    const leftLeftLeftExpr = leftLeftExpr.left as ParsedRelationRefExpression;
    expect(leftLeftLeftExpr.relationName).toEqual('a');

    const rightLeftLeftExpr = leftLeftExpr.right as ParsedRelationRefExpression;
    expect(rightLeftLeftExpr.relationName).toEqual('b');

    const rightLeftExpr = leftExpr.right as ParsedNilExpression;
    expect(rightLeftExpr.isNil).toEqual(true);

    const rightExpr = binExpr.right as ParsedRelationRefExpression;
    expect(rightExpr.relationName).toEqual('d');
  });

  it('parses definition with multiple permissions', () => {
    const schema = `definition foo {
          permission first = firstrel
          permission second = secondrel
        }`;
    const parsed = parseSchema(schema);

    expect(parsed?.definitions?.length).toEqual(1);

    const definition = parsed?.definitions[0]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('foo');
    expect(definition.relations.length).toEqual(0);
    expect(definition.permissions.length).toEqual(2);

    const first = definition.permissions[0]!;
    expect(first.name).toEqual('first');

    const firstExpr = first.expr as ParsedRelationRefExpression;
    expect(firstExpr.relationName).toEqual('firstrel');

    const second = definition.permissions[1]!;
    expect(second.name).toEqual('second');

    const secondExpr = second.expr as ParsedRelationRefExpression;
    expect(secondExpr.relationName).toEqual('secondrel');
  });

  it('full', () => {
    const schema = `definition user {}

        caveat somecaveat(somecondition int) {
          somecondition == 42
        }    

        /**
         * a document
         */
        definition document {
          relation writer: user
          relation reader: user | user with somecaveat

          permission writer = writer
          permission read = reader + writer // has both
        }`;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(3);
  });

  it('full with wildcard', () => {
    const schema = `definition user {}
        
        /**
         * a document
         */
        definition document {
          relation writer: user
          relation reader: user:*

          permission writer = writer
          permission read = reader + writer // has both
        }`;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
    const documentDef = parsed?.definitions.find(
      (def) => def.name === 'document'
    ) as ParsedObjectDefinition;
    expect(documentDef?.relations.length).toEqual(2);
    expect(documentDef?.permissions.length).toEqual(2);
  });

  it('full with more comments', () => {
    const schema = `definition user {}
        
        /**
         * a document
         */


        definition document {
          relation writer: user
          relation reader: user

          permission writer = writer
          permission read = reader + writer // has both
        }`;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
  });

  it('parses a real example', () => {
    const schema = `definition user {}

        definition collection {
            relation curator: user
            relation editor: user
            relation reader: user
        
            permission delete = curator
            permission rename = curator
            permission read = curator + editor + reader
            permission add_paper = curator + editor
            permission delete_paper = curator
            permission add_comment = curator + editor + reader
            permission share = curator
        }`;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
  });

  it('parses an arrow expression', () => {
    const schema = `definition user {}

        definition organization {
            relation admin: user;
        }

        definition document {
            relation reader: user
            relation org: organization

            permission read = reader + org->admin
        }`;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(3);

    const definition = parsed?.definitions[2]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('document');
    expect(definition.relations.length).toEqual(2);
    expect(definition.permissions.length).toEqual(1);

    const read = definition.permissions[0]!;
    expect(read.name).toEqual('read');

    const expr = read.expr as ParsedBinaryExpression;
    const leftExpr = expr.left as ParsedRelationRefExpression;
    expect(leftExpr.relationName).toEqual('reader');

    const rightExpr = expr.right as ParsedArrowExpression;
    expect(
      (rightExpr.sourceRelation as ParsedRelationRefExpression).relationName
    ).toEqual('org');
    expect(rightExpr.targetRelationOrPermission).toEqual('admin');
  });

  it('parses a named arrow expression', () => {
    const schema = `definition user {}

        definition organization {
            relation admin: user;
        }

        definition document {
            relation reader: user
            relation org: organization

            permission read = reader + org.any(admin)
        }`;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(3);

    const definition = parsed?.definitions[2]! as ParsedObjectDefinition;
    expect(definition.name).toEqual('document');
    expect(definition.relations.length).toEqual(2);
    expect(definition.permissions.length).toEqual(1);

    const read = definition.permissions[0]!;
    expect(read.name).toEqual('read');

    const expr = read.expr as ParsedBinaryExpression;
    const leftExpr = expr.left as ParsedRelationRefExpression;
    expect(leftExpr.relationName).toEqual('reader');

    const rightExpr = expr.right as ParsedNamedArrowExpression;
    expect(
      (rightExpr.sourceRelation as ParsedRelationRefExpression).relationName
    ).toEqual('org');
    expect(rightExpr.functionName).toEqual('any');
    expect(rightExpr.targetRelationOrPermission).toEqual('admin');
  });

  it('parses an example with multiple comments', () => {
    const schema = `
       /**
        * This is a user definition
        */
       definition user {}

       /** doc */
       definition document {}`;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
  });

  it('parses correctly with synthetic semicolon', () => {
    const schema = `
       definition document {
           permission foo = (first + second)
           permission bar = third
       }
       
       definition user {}
       `;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
    expect(
      (parsed?.definitions[0] as ParsedObjectDefinition).permissions.length
    ).toEqual(2);
  });

  it('parses correctly with synthetic semicolon and comment after', () => {
    const schema = `
            definition document {
                relation foo: user
                permission resolve = foo + (bar)   
                // a comment
            }
            
            definition user {}
        `;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
    expect(
      (parsed?.definitions[0] as ParsedObjectDefinition).permissions.length
    ).toEqual(1);
    expect(
      (parsed?.definitions[0] as ParsedObjectDefinition).relations.length
    ).toEqual(1);
  });

  it('parses wildcard relation correctly with synthetic semicolon and comment after', () => {
    const schema = `
            definition document {
                relation foo: user:*
                permission resolve = foo + (bar)   
                // a comment
            }
            
            definition user {}
        `;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
    expect(
      (parsed?.definitions[0] as ParsedObjectDefinition).permissions.length
    ).toEqual(1);
    expect(
      (parsed?.definitions[0] as ParsedObjectDefinition).relations.length
    ).toEqual(1);
  });

  it('parses correctly with synthetic semicolon and comment before', () => {
    const schema = `
            definition document {
                permission resolve = foo + (bar)   
                // a comment
                permission anotherthing = somethingelse
            }
            
            definition user {}
        `;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
    expect(
      (parsed?.definitions[0] as ParsedObjectDefinition).permissions.length
    ).toEqual(2);
  });

  it('succeeds parsing a valid schema with caveat', () => {
    const schema = `caveat somecaveat(somearg any) {
      somearg.foo().bar
    }

    definition user {}`;

    const parsed = parseSchema(schema);
    expect(parsed?.definitions?.length).toEqual(2);
  });
});

describe('parsing fails when', () => {
  it('it is missing a definition name', () => {
    const schema = `definition `;
    const parsed = parseSchema(schema);
    expect(parsed).toEqual(undefined);
  });

  it('it is missing a definition close', () => {
    const schema = `definition foo {`;
    const parsed = parseSchema(schema);
    expect(parsed).toEqual(undefined);
  });

  it('it is missing a relation type', () => {
    const schema = `definition foo {
            relation foo
        }`;
    const parsed = parseSchema(schema);
    expect(parsed).toEqual(undefined);
  });

  it('it is a typeless wildcard', () => {
    const schema = `definition foo {
            relation *
        }`;
    const parsed = parseSchema(schema);
    expect(parsed).toEqual(undefined);
  });

  it('it is missing a second relation type', () => {
    const schema = `definition foo {
            relation foo: bar |
        }`;
    const parsed = parseSchema(schema);
    expect(parsed).toEqual(undefined);
  });

  it('it is missing a permission expression', () => {
    const schema = `definition foo {
            relation foo: bar
            permission meh
        }`;
    const parsed = parseSchema(schema);
    expect(parsed).toEqual(undefined);
  });

  it('it has an empty permission expression', () => {
    const schema = `definition foo {
            relation foo: bar
            permission meh =
        }`;
    const parsed = parseSchema(schema);
    expect(parsed).toEqual(undefined);
  });

  it('it has an incomplete permission expression', () => {
    const schema = `definition foo {
            relation foo: bar
            permission meh = a +
        }`;
    const parsed = parseSchema(schema);
    expect(parsed).toEqual(undefined);
  });

  it('fails if caveat contains unterminated backtick', () => {
    const schema =
      'caveat foo (someParam string, anotherParam int) { someParam == 42` }';
    const parsed = parseSchema(schema);
    expect(parsed).toBeUndefined();
  });
});
