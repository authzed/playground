import {
  convertRelationshipToString,
  mergeRelationshipsStringAndComments,
  parseRelationship,
  parseRelationshipWithError,
} from './parsing';
import { Struct } from './protodevdefs/google/protobuf/struct';
import { describe, it, expect } from 'vitest';

describe('converting relationships', () => {
  it('converts relationships properly to strings', () => {
    const relationship = 'document:something#somerel@user:something#...';
    const parsed = parseRelationship(relationship);
    expect(convertRelationshipToString(parsed!)).toEqual(
      'document:something#somerel@user:something'
    );
  });

  it('converts relationships with subject relation properly to strings', () => {
    const relationship = 'document:something#somerel@user:something#foo';
    const parsed = parseRelationship(relationship);
    expect(convertRelationshipToString(parsed!)).toEqual(relationship);
  });

  it('converts caveated relationships properly to strings', () => {
    const relationship =
      'document:something#somerel@user:something[some:{"hi":"there"}]';
    const parsed = parseRelationship(relationship);
    expect(convertRelationshipToString(parsed!)).toEqual(relationship);
  });
});

describe('parsing relationships', () => {
  it('returns an error for an empty relationship', () => {
    const relationship = '';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage: 'Relationship missing a subject',
    });
  });

  it('returns an error for a relationship missing an object', () => {
    const relationship = 'somenamespace#somerel@someuser:foo';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage:
        'Relationship must be of the form `resourcetype:resourceid#relation@subjecttype:subjectid`',
    });
  });

  it('returns an error for a relationship missing a subject', () => {
    const relationship = 'somenamespace:something#somerel';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage: 'Relationship missing a subject',
    });
  });

  it('returns an error for a relationship with an invalid namespace', () => {
    const relationship = 'a:something#somerel@user:foo';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage: "Invalid namespace 'a': Must be alphanumeric",
    });
  });

  it('returns an error for a relationship with an invalid object id', () => {
    const relationship = 'document:some.thing#somerel@user:foo';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage:
        "Invalid resource object ID 'some.thing': Must be alphanumeric. Wildcards are not allowed",
    });
  });

  it('returns an error for a relationship with a wildcard resource id', () => {
    const relationship = 'document:*#somerel@user:foo';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage:
        "Invalid resource object ID '*': Must be alphanumeric. Wildcards are not allowed",
    });
  });

  it('returns an error for a relationship with an invalid relation', () => {
    const relationship = 'document:something#a@user:foo';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage: "Invalid relation 'a': Must be alphanumeric",
    });
  });

  it('returns an error for a relationship with an invalid subject namespace', () => {
    const relationship = 'document:something#somerel@a:foo';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage: "Invalid namespace 'a': Must be alphanumeric",
    });
  });

  it('returns an error for a relationship with an invalid subject object id', () => {
    const relationship = 'document:something#somerel@user:some.thing';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage:
        "Invalid subject object ID 'some.thing': Must be alphanumeric",
    });
  });

  it('returns an error for a relationship with an invalid subject relation', () => {
    const relationship = 'document:something#somerel@user:someuser#a';
    expect(parseRelationshipWithError(relationship)).toEqual({
      errorMessage: "Invalid relation 'a': Must be alphanumeric",
    });
  });

  it('parses a correct relationship', () => {
    const relationship = 'document:something#somerel@user:someuser';
    expect(parseRelationship(relationship)).toBeDefined();
  });

  it('parses a correct wildcard relationship', () => {
    const relationship = 'document:something#somerel@user:*';
    expect(parseRelationship(relationship)).toBeDefined();
  });

  it('parses a correct relationship with multiple levels of namespace nesting', () => {
    const relationship =
      'foo/bar/baz/document:something#somerel@one/two/three/user:foo#...';
    expect(parseRelationship(relationship)).toBeDefined();
  });

  it('parses a correct relationship with ...', () => {
    const relationship = 'document:something#somerel@user:foo#...';
    expect(parseRelationship(relationship)).toBeDefined();
  });

  it('parses a correct relationship with pipe for object ID', () => {
    const relationship = 'document:something#somerel@user:something|someuser';
    expect(parseRelationship(relationship)).toBeDefined();
  });

  it('parses a correct relationship with caveat name', () => {
    const relationship =
      'document:something#somerel@user:something[somecaveat]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeDefined();
    expect(parsed?.caveat?.caveatName).toBe('somecaveat');
  });

  it('parses a correct relationship with caveat name and context', () => {
    const relationship =
      'document:something#somerel@user:something[somecaveat:{"hi": "there"}]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeDefined();
    expect(parsed?.caveat?.caveatName).toBe('somecaveat');
    expect(parsed?.caveat?.context).toHaveProperty('fields');
    expect(parsed?.caveat?.context).toEqual({
      fields: {
        hi: {
          kind: {
            oneofKind: 'stringValue',
            stringValue: 'there',
          },
        },
      },
    });
    expect(Struct.toJson(parsed?.caveat?.context!)).toEqual({ hi: 'there' });
  });

  it('parses a relationship with list in caveat context', () => {
    const relationship =
      'document:something#somerel@user:something[some:{"somecondition": []}]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeDefined();
    expect(parsed?.caveat?.caveatName).toBe('some');
    expect(parsed?.caveat?.context).toHaveProperty('fields');
    expect(Struct.toJson(parsed?.caveat?.context!)).toEqual({
      somecondition: [],
    });
  });

  it('parses a relationship with list with elements, in caveat context', () => {
    const relationship =
      'document:something#somerel@user:something[some:{"somecondition": [1, true, "3"]}]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeDefined();
    expect(parsed?.caveat?.caveatName).toBe('some');
    expect(Struct.toJson(parsed?.caveat?.context!)).toEqual({
      somecondition: [1, true, '3'],
    });
  });

  it('parses a relationship with an email in caveat context', () => {
    const relationship =
      'document:something#somerel@user:something[some:{"em":"a@example.com"}]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeDefined();
    expect(parsed?.caveat?.caveatName).toBe('some');
    expect(Struct.toJson(parsed?.caveat?.context!)).toEqual({
      em: 'a@example.com',
    });
  });

  it('fails to parse a relationship with an invalid caveat name', () => {
    const relationship = 'document:something#somerel@user:something[]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeUndefined();
  });

  it('fails to parse a relationship with empty caveat context', () => {
    const relationship = 'document:something#somerel@user:something[some:{}]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeUndefined();
  });

  it('fails to parse a relationship with invalid caveat context', () => {
    const relationship =
      'document:something#somerel@user:something[some:{"hi"]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeUndefined();
  });

  it('fails to parse a relationship with literal caveat context', () => {
    const relationship = 'document:something#somerel@user:something[some:true]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeUndefined();
  });

  it('fails to parse a relationship with null caveat context', () => {
    const relationship = 'document:something#somerel@user:something[some:null]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeUndefined();
  });

  it('parses a correct a relationship with super long and extended IDs', () => {
    const relationship =
      'document:--=base64YWZzZGZh-ZHNmZHPwn5iK8J+YivC/fmIrwn5iK==#view@user:veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryverylong';
    expect(parseRelationship(relationship)).toBeDefined();
  });
});

describe('merging relationships', () => {
  it('merges relationships and maintains comments', () => {
    const existing = `
// testing 123
document:firstdoc#viewer@user:tom
    `;

    const updated = [parseRelationship('document:firstdoc#viewer@user:sarah')!];

    const merged = mergeRelationshipsStringAndComments(existing, updated);
    expect(merged).toBe(`// testing 123
document:firstdoc#viewer@user:sarah`);
  });

  it('adds new relationship', () => {
    const existing = `
// testing 123
document:firstdoc#viewer@user:tom
    `;

    const updated = [
      parseRelationship('document:firstdoc#viewer@user:tom')!,
      parseRelationship('document:firstdoc#viewer@user:sarah')!,
    ];

    const merged = mergeRelationshipsStringAndComments(existing, updated);
    expect(merged).toBe(`// testing 123
document:firstdoc#viewer@user:tom
document:firstdoc#viewer@user:sarah`);
  });

  it('attempts to parse a relationship with empty context, which is not allowed', () => {
    const relationship = 'role:somerole#some_relation@user:*[somecaveat:{}]';
    const parsed = parseRelationship(relationship);
    expect(parsed).toBeUndefined();
  });
});
