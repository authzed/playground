import { parseCELExpression } from "./cel";
import { describe, it, expect } from "vitest";

describe("parsing", () => {
  it("parses basic CEL expression", () => {
    const expr = `somecondition`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses basic CEL comparison expression", () => {
    const expr = `somecondition == 42`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses with string literal", () => {
    const expr = `somecondition == 'hello'`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses with parens", () => {
    const expr = `somecondition == (1 + 2)`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses with map literal", () => {
    const expr = `somecondition == {"hi": 1, "hello": 2}`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses with accessors", () => {
    const expr = `somecondition == somevar.hi.there`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses with function call", () => {
    const expr = `somecondition.isSubsetOf(anotherthing)`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses with function call access with arguments", () => {
    const expr = `somecondition.isSubsetOf(anotherthing).third`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses with function call without arguments", () => {
    const expr = `somecondition.foo()`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("does not parse invalid CEL", () => {
    const expr = `somecondition = (1 + 2)`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeFalsy();
  });

  it("does not parse invalid CEL with mismatching brackets", () => {
    const expr = `somecondition = {1 + 2`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeFalsy();
  });

  it("parses a more complicated expression", () => {
    const expr = `account.balance >= transaction.withdrawal
    || (account.overdraftProtection
    && account.overdraftLimit >= transaction.withdrawal  - account.balance)`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses an object construction", () => {
    const expr = `common.GeoPoint{ latitude: 10.0, longitude: -5.5 }`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses a unit", () => {
    const expr = `56u`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses an exponent", () => {
    const expr = `56e10`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses a string literal", () => {
    const expr = `"hi there"`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses a multiline string literal", () => {
    const expr = `"""
    hi
    there
    """`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("fails to parse an invalid multiline string literal", () => {
    const expr = `"""
    hi
    there
    ""`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeFalsy();
  });

  it("parses literals", () => {
    const expr = `1 + true + null + 5.6 + b"hello" + "hi"`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("parses comments", () => {
    const expr = `
    // hi there
    1 + true + null + 5.6 + b"hello" + "hi"`;
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeTruthy();
  });

  it("raises an error for unterminated character", () => {
    const expr = "foo`";
    const parsed = parseCELExpression(expr);
    expect(parsed).toBeFalsy();
  });
});
