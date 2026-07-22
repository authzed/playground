import { describe, expect, it } from "vitest";

import { CheckOperationsResult_Membership } from "../spicedb-common/protodefs/developer/v1/developer_pb";

import { checkTupleString, runChecksAgainst, runValidationAgainst } from "./wasmRunners";

// Fake developer service: queues check/assertion/validation callbacks, fires them on execute().
function fakeDev(
  opts: {
    membership?: number;
    checkError?: string;
    caveat?: boolean;
    assertionErrors?: { message: string; line: number; column: number }[];
    assertionInputError?: { message: string; line: number; column: number };
    developerInputErrors?: { message: string; line: number; column: number }[];
    internalError?: string;
  } = {},
) {
  return {
    newRequest: () => {
      const checks: ((r: any) => void)[] = [];
      const assertions: ((r: any) => void)[] = [];
      return {
        schemaWarnings: (cb: (r: any) => void) => cb({ warnings: [] }),
        check: (_p: unknown, cb: (r: any) => void) => checks.push(cb),
        runAssertions: (_y: string, cb: (r: any) => void) => assertions.push(cb),
        runValidation: (_y: string, cb: (r: any) => void) =>
          cb({ updatedValidationYaml: "", validationErrors: [] }),
        execute: () => {
          for (const cb of checks) {
            if (opts.checkError) cb({ checkError: { message: opts.checkError } });
            else if (opts.caveat)
              cb({
                partialCaveatInfo: { missingRequiredContext: ["ip"] },
                resolvedDebugInformation: undefined,
              });
            else cb({ membership: opts.membership, resolvedDebugInformation: undefined });
          }
          for (const cb of assertions) {
            if (opts.assertionInputError) cb({ inputError: opts.assertionInputError });
            else cb({ validationErrors: opts.assertionErrors ?? [] });
          }
          return {
            internalError: opts.internalError,
            developerErrors: opts.developerInputErrors
              ? { inputErrors: opts.developerInputErrors }
              : undefined,
          };
        },
      };
    },
  } as any;
}

const tuple = { object: "document:readme", action: "view", subject: "user:alice", context: "" };

describe("checkTupleString", () => {
  it("adds #... to a plain subject and appends caveat context", () => {
    expect(checkTupleString("document:readme", "view", "user:alice", "")).toBe(
      "document:readme#view@user:alice#...",
    );
    expect(checkTupleString("doc:1", "view", "user:alice", "ip:1.2.3.4")).toBe(
      "doc:1#view@user:alice#...[ip:1.2.3.4]",
    );
    expect(checkTupleString("doc:1", "view", "group:eng#member", "")).toBe(
      "doc:1#view@group:eng#member",
    );
  });
});

describe("runChecksAgainst", () => {
  it("returns member for MEMBER and not_member for NOT_MEMBER", () => {
    const m = runChecksAgainst(
      fakeDev({ membership: CheckOperationsResult_Membership.MEMBER }),
      "schema",
      "",
      [tuple],
    );
    expect(m?.outcomes[0].kind).toBe("member");
    const n = runChecksAgainst(
      fakeDev({ membership: CheckOperationsResult_Membership.NOT_MEMBER }),
      "schema",
      "",
      [tuple],
    );
    expect(n?.outcomes[0].kind).toBe("not_member");
  });
  it("returns error on check error and caveated on partial caveat", () => {
    expect(
      runChecksAgainst(fakeDev({ checkError: "bad relation" }), "s", "", [tuple])?.outcomes[0],
    ).toMatchObject({ kind: "error", message: "bad relation" });
    expect(runChecksAgainst(fakeDev({ caveat: true }), "s", "", [tuple])?.outcomes[0].kind).toBe(
      "caveated",
    );
  });
  it("returns unparseable for a malformed tuple without queueing a check", () => {
    const out = runChecksAgainst(fakeDev({ membership: 2 }), "s", "", [
      { object: "", action: "", subject: "", context: "" },
    ]);
    expect(out?.outcomes[0].kind).toBe("unparseable");
  });
});

describe("runValidationAgainst", () => {
  it("collects assertion failures and reports internalError", () => {
    const ok = runValidationAgainst(fakeDev(), "s", "", "", "");
    expect(ok?.validationErrors).toHaveLength(0);
    const fail = runValidationAgainst(
      fakeDev({ assertionErrors: [{ message: "expected true", line: 3, column: 1 }] }),
      "s",
      "",
      "",
      "",
    );
    expect(fail?.validationErrors[0].message).toBe("expected true");
    const err = runValidationAgainst(fakeDev({ internalError: "boom" }), "s", "", "", "");
    expect(err?.internalError).toBe("boom");
  });
  it("buckets an assertion inputError into requestErrors", () => {
    const out = runValidationAgainst(
      fakeDev({ assertionInputError: { message: "syntax", line: 1, column: 1 } }),
      "s",
      "",
      "",
      "",
    );
    expect(out?.requestErrors[0].message).toBe("syntax");
  });
  it("appends developerErrors.inputErrors to requestErrors", () => {
    const out = runValidationAgainst(
      fakeDev({ developerInputErrors: [{ message: "compile error", line: 2, column: 3 }] }),
      "s",
      "",
      "",
      "",
    );
    expect(out?.requestErrors.some((e) => e.message === "compile error")).toBe(true);
  });
});
