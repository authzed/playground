import { EditorState } from "@/store/editorSlice";
import yaml from "yaml";

/**
 * createValidationYAML creates the full validation YAML file format contents from
 * the datastore.
 */
export const createValidationYAML = ({schema, relationships, assertions, expectedRelations}: EditorState): string => {
  const parsed = {
    schema: schema,
    relationships: relationships,
    assertions: yaml.parse(assertions),
    validation: yaml.parse(expectedRelations),
  };

  return yaml.stringify(parsed, { lineWidth: 0 });
};

/**
 * normalizeValidationYAML reformats the expected relations YAML into a YAML string as produced
 * by the Playground, to ensure diffs have minimal changes.
 */
export const normalizeValidationYAML = (expectedRelations: string) => {
  if (!expectedRelations.trim()) {
    return "";
  }

  return yaml.stringify(yaml.parse(expectedRelations), {
    lineWidth: 0,
  });
};
