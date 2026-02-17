import Ajv from "ajv";
import yaml from "yaml";

export type AssertionData = {
  assertTrue?: string[];
  assertFalse?: string[];
};

export interface ParsedValidation {
  schema: string;
  relationships: string;
  assertions?: AssertionData;
  validation?: ValidationData;
}

export type ValidationData = Record<string, string[]>;

const schema = {
  type: "object",
  properties: {
    schema: { type: "string" },
    relationships: { type: "string" },
    assertions: {
      type: ["object", "null"],
      properties: {
        assertTrue: {
          type: "array",
          items: {
            type: "string",
          },
        },
        assertFalse: {
          type: "array",
          items: {
            type: "string",
          },
        },
        additionalProperties: false,
      },
    },
    validation: {
      type: ["object", "null"],
      additionalProperties: true,
    },
  },
  required: ["schema", "relationships"],
  additionalProperties: false,
};

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

  const ajv = new Ajv();
  const valid = ajv.validate(schema, parsed);
  if (!valid) {
    return {
      message: ajv.errorsText(ajv.errors),
    };
  }

  // TODO: type this better
  return parsed as unknown as ParsedValidation;
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
