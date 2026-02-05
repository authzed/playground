import yaml from "yaml";
import { ParsedValidation } from "./validationfileformat";
export interface Example {
  id: string;
  title: string;
  subtitle: string;
  data: ParsedValidation;
}

const readmesImports = import.meta.glob("/examples/schemas/*/README.md", {
  // Get just the raw text
  query: "?raw",
  eager: true,
});
const schemasImports = import.meta.glob(
  "/examples/schemas/*/schema-and-data.yaml",
  {
    // Get just the raw text
    query: "?raw",
    eager: true,
  },
);

const isTextImport = (input: unknown): input is { default: string } => {
  return typeof input === "object" && input !== null && "default" in input;
};

/**
 * LoadExamples loads the examples defined statically and compiled in the /examples repo.
 * If one example is lacking the schema file, we don't include it.
 */
export function LoadExamples(): Example[] {
  return Object.keys(readmesImports)
    .map((path) => {
      // Grab the id
      const match = path.match(/\/examples\/schemas\/(.*)\/README\.md/);
      return match ? match[1] : "";
    })
    .filter((name): name is string => {
      if (name === "") return false;
      // Skip examples that don't have the schema file
      const schemaPath = `/examples/schemas/${name}/schema-and-data.yaml`;
      return schemaPath in schemasImports;
    })
    .sort()
    .map((name) => {
      const readmeModule =
        readmesImports[`/examples/schemas/${name}/README.md`];
      const schemaModule =
        schemasImports[`/examples/schemas/${name}/schema-and-data.yaml`];

      const readme = isTextImport(readmeModule) ? readmeModule.default : "";
      const schema = isTextImport(schemaModule) ? schemaModule.default : "";

      const lines = readme.split("\n");
      const title = lines[0].trim().substring(1).trim(); // Strip the # for the markdown header
      const subtitle = lines[2].trim();
      let schemaRes: ParsedValidation;
      try {
        schemaRes = yaml.parse(schema);
      } catch (e) {
        throw new Error("error parsing schema for example " + name + ": " + e);
      }
      return {
        id: name,
        title: title,
        subtitle: subtitle,
        data: schemaRes,
      };
    });
}
