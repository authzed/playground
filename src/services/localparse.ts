import {
  parseSchema,
  type ResolvedDefinition,
  Resolver,
} from "@authzed/spicedb-parser-js";
import { useMemo } from "react";

import { useAppSelector } from "@/hooks";

export interface LocalParseService {
  lookupDefinition: (name: string) => ResolvedDefinition | undefined;
  resolver?: Resolver,
}

/**
 * useLocalParseService is a hook which monitors the datastore and checks for invalid
 * validation tuples by locally parsing.
 */
export function useLocalParseService(): LocalParseService {
  const schema = useAppSelector(state => state.editor.schema)

  const parsed = useMemo(() => parseSchema(schema), [schema])
  const resolver = useMemo(() => parsed && new Resolver(parsed), [parsed])

  const lookupDefinition = useMemo(() => {
    return (name: string): ResolvedDefinition | undefined => {
      if (resolver === undefined) {
        return undefined;
      }

      return resolver.lookupDefinition(name);
    };
  }, [resolver]);

  return useMemo(() => ({
    resolver,
    lookupDefinition,
  }), [resolver, lookupDefinition]);
}
