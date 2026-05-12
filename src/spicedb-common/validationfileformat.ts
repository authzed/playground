import yaml from "yaml";
import z from "zod";

export const zAssertionData = z.object({
  assertTrue: z.array(z.string()).optional(),
  assertFalse: z.array(z.string()).optional(),
});
export type AssertionData = z.infer<typeof zAssertionData>;

export const zCheckWatch = z.object({
  object: z.string(),
  action: z.string(),
  subject: z.string(),
  context: z.string().optional(),
});
export type CheckWatch = z.infer<typeof zCheckWatch>;

export const zCheckWatches = z.array(zCheckWatch);
export type CheckWatches = z.infer<typeof zCheckWatches>;

export const zValidationData = z.record(z.string(), z.array(z.string()));
export type ValidationData = z.infer<typeof zValidationData>;

export const zParsedValidation = z.object({
  schema: z.string(),
  relationships: z.string(),
  assertions: zAssertionData.optional(),
  validation: zValidationData.optional(),
  checkWatches: zCheckWatches.optional(),
});
export type ParsedValidation = z.infer<typeof zParsedValidation>;

export interface ParseValidationError {
  message: string;
}

/**
 * parseValidationYAML parses the contents as a validation YAML, returning the ParsedValidation
 * file or undefined if invalid.
 */
export const parseValidationYAML = (contents: string): ParsedValidation | ParseValidationError => {
  let parsed = undefined;
  try {
    parsed = yaml.parse(contents);
  } catch (e) {
    const errorText = e instanceof Error ? e.message : "unknown";
    return { message: `parse error: ${errorText}` };
  }

  const { data, error } = z.safeParse(zParsedValidation, parsed);

  if (error) {
    return {
      message: z.prettifyError(error),
    };
  }

  return data;
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
