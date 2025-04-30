import yaml from "yaml";
import { sortBy, zip } from "es-toolkit";
import { ParsedValidation } from "./validationfileformat";
export interface Example {
  id: string;
  title: string;
  documentation: string;
  subtitle: string;
  data: ParsedValidation;
}

const readmesImports = import.meta.glob("/examples/schemas/*/README.md", {
  // Get just the raw text
  query: "?raw",
});
const schemasImports = import.meta.glob(
  "/examples/schemas/*/schema-and-data.yaml",
  {
    // Get just the raw text
    query: "?raw",
  },
);

const isTextImport = (input: unknown): input is { default: string } => {
  return typeof input === "object" && input !== null && "default" in input;
};

const sortAndRealizeImports = async (
  imports: Record<string, () => Promise<unknown>>,
) => {
  const realizedImports = await Promise.all(
    sortBy(Object.entries(imports), [0]).map(([, importThunk]) =>
      importThunk(),
    ),
  );
  return realizedImports
    .filter(isTextImport)
    .map(({ default: defaultExport }) => defaultExport);
};

/**
 * LoadExamples loads the examples defined statically and compiled in.
 */
export async function LoadExamples(): Promise<Example[]> {
  const names = Object.entries(readmesImports).map(([path]) => path);
  names.sort();
  const sortedReadmes = await sortAndRealizeImports(readmesImports);
  const sortedSchemas = await sortAndRealizeImports(schemasImports);
  const zippedImports = zip(names, sortedReadmes, sortedSchemas);
  return zippedImports.map(([name, readme, schema]) => {
    const lines = readme.split("\n");
    const title = lines[0].trim().substring(1).trim(); // Strip the # for the markdown header
    const subtitle = lines[2].trim();
    return {
      id: name,
      title,
      subtitle,
      documentation: readme,
      data: yaml.parse(schema),
    };
  });
}
