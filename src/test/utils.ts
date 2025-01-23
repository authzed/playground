// Takes an expression as an argument and throws if that assertion fails.
// This primarily exists to provide typescript narrowing in a statement,
// rather than needing to narrow with an if/switch
export function assert(val: unknown, msg = "Assertion failed"): asserts val {
  if (!val) throw new Error(msg);
}
