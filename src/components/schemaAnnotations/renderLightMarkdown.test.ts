import { describe, expect, it } from "vitest";

import { renderLightMarkdown } from "./renderAnnotations";

describe("renderLightMarkdown", () => {
  it("escapes HTML", () => {
    expect(renderLightMarkdown("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it("renders inline code and bold", () => {
    expect(renderLightMarkdown("use `viewer` and **owner**")).toBe(
      'use <code class="schema-annot-code">viewer</code> and <strong>owner</strong>',
    );
  });
});
