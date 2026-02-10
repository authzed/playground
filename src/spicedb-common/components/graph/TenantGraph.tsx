import type { TextRange, ParsedSchema } from "@authzed/spicedb-parser-js";

import { RelationTuple as Relationship } from "../../protodefs/core/v1/core_pb";

export interface TenantGraphProps {
  /**
   * schema is the parsed schema.
   */
  schema: ParsedSchema | undefined;

  /**
   * relationships are the test relationships for the schema.
   */
  relationships?: Relationship[] | undefined;

  /**
   * onBrowseRequested is invoked if the user has requested a browse to the specific
   * range in the schema.
   */
  onBrowseRequested?: (range: TextRange | undefined) => void;
}

/**
 * TenantGraph reners a graphical view of the schema configured in a Tenant.
 */
export default function TenantGraph({
  schema,
  relationships,
  active,
}: TenantGraphProps) {

  return (
    <div className="w-full h-full relative">
    </div>
  );
}
