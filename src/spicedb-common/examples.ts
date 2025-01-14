import yaml from "yaml";
import { ParsedValidation } from "./validationfileformat";
export interface Example {
  id: string;
  title: string;
  documentation: string;
  subtitle: string;
  data: ParsedValidation;
}

async function get(path: string): Promise<string> {
  const result = await fetch(path);
  return await result.text();
}

const prefix = `/static/schemas`;

/**
 * LoadExamples loads the examples defined statically and compiled in.
 */
export async function LoadExamples(): Promise<Example[]> {
  // NOTE: the format of the file tree here is defined by the Dockerfile for playground-ui/playground
  // and matches the tree structure found in https://github.com/authzed/examples/tree/main/schemas.
  // `_all` is added by the Dockerfile at build time.
  const exampleNames = (await get(`${prefix}/_all`))
    .split('\n')
    .filter((n) => !!n && n !== '_all');
  const examples: Example[] = [];
  for (const n of exampleNames) {
    const documentation = await get(`${prefix}/${n}/README.md`);
    const data = await get(`${prefix}/${n}/schema-and-data.yaml`);
    const title = documentation.split('\n')[0].trim().substring(1).trim(); // Strip the # for the markdown header
    const subtitle = documentation.split('\n')[2].trim();

    examples.push({
      id: n,
      title: title,
      subtitle: subtitle,
      documentation: documentation,
      data: yaml.parse(data) as ParsedValidation,
    });
  }
  return examples;
}
