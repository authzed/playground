import {
  AssertionData,
  ValidationData,
} from '../spicedb-common/validationfileformat';
import yaml from 'yaml';
import { DataStore, DataStoreItemKind } from './datastore';

/**
 * buildValidationYaml builds the YAML validation block.
 */
export const buildValidationBlockYaml = (datastore: DataStore): string => {
  const expectedRelations = datastore.getSingletonByKind(
    DataStoreItemKind.EXPECTED_RELATIONS
  );
  const validationBlock = expectedRelations.editableContents;
  return validationBlock || '{}';
};

/**
 * buildAssertionsYaml builds the YAML assertions block.
 */
export const buildAssertionsYaml = (datastore: DataStore): string => {
  const assertions = datastore.getSingletonByKind(DataStoreItemKind.ASSERTIONS);
  const assertionsBlock = assertions.editableContents;
  return assertionsBlock || '{}';
};

/**
 * createValidationYAML creates the full validation YAML file format contents from
 * the datastore.
 */
export const createValidationYAML = (datastore: DataStore): string => {
  const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA)
    .editableContents!;
  const relationships = datastore.getSingletonByKind(
    DataStoreItemKind.RELATIONSHIPS
  ).editableContents!;
  const assertions = datastore.getSingletonByKind(DataStoreItemKind.ASSERTIONS)
    .editableContents!;
  const expectedRelations = datastore.getSingletonByKind(
    DataStoreItemKind.EXPECTED_RELATIONS
  ).editableContents!;

  const parsed = {
    schema: schema,
    relationships: relationships,
    assertions: yaml.parse(assertions) as AssertionData,
    validation: yaml.parse(expectedRelations) as ValidationData,
  };

  return yaml.stringify(parsed, { lineWidth: 0 });
};

/**
 * normalizeValidationYAML reformats the expected relations YAML into a YAML string as produced
 * by the Playground, to ensure diffs have minimal changes.
 */
export const normalizeValidationYAML = (expectedRelations: string) => {
  if (!expectedRelations.trim()) {
    return '';
  }

  return yaml.stringify(yaml.parse(expectedRelations) as ValidationData, {
    lineWidth: 0,
  });
};
