import yaml from "yaml";
import z from "zod";

export const AssertionData = z.object({
  assertTrue: z.array(z.string()).optional(),
  assertFalse: z.array(z.string()).optional(),
});

export const ExpectedRelationData = z.record(z.string(), z.array(z.string()))

const ParsedValidation = z.object({
  schema: z.string(),
  relationships: z.string(),
  assertions: AssertionData.optional(),
  validation: ExpectedRelationData.optional(),
})

type ParsedValidationType = z.infer<typeof ParsedValidation>

export type ParseValidationError = {
  message: string;
}

/**
 * parseValidationYAML parses the contents as a validation YAML, returning the ParsedValidation
 * file or undefined if invalid.
 */
export const parseValidationYAML = (contents: string): ParsedValidationType | ParseValidationError => {
  let parsed = undefined;
  try {
    parsed = yaml.parse(contents);
  } catch (e) {
    const errorText = e instanceof Error ? e.message : "unknown";
    return { message: `parse error: ${errorText}` };
  }

  const result = ParsedValidation.safeParse(parsed);
  if (!result.success) {
    return result.error
  }
  return result.data
};

/**
 * getValidationBlockContents returns the contents of the validation block.
 */
export const getValidationBlockContents = (validationBlockYaml: string): string | undefined => {
  let parsed = undefined;
  try {
    parsed = yaml.parse(validationBlockYaml);
  } catch (e) {
    console.log(e);
  }

  if (parsed === undefined || typeof parsed["validation"] !== "object") {
    return undefined;
  }

  return yaml.stringify(parsed["validation"]);
};
