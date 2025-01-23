import { ParsedSchema, parseSchema } from "../spicedb-common/parsers/dsl/dsl";
import {
  ResolvedDefinition,
  Resolver,
} from "../spicedb-common/parsers/dsl/resolution";
import {
  parseRelationshipsWithErrors,
  RelationshipFound,
} from "../spicedb-common/parsing";
import { useDebouncedChecker } from "../playground-ui/debouncer";
import { useEffect, useMemo, useState } from "react";
import { DataStore, DataStoreItemKind } from "./datastore";

export interface LocalParseService {
  state: LocalParseState;
  lookupDefinition: (name: string) => ResolvedDefinition | undefined;
}

export interface LocalParseState {
  schemaText: string;
  resolver: Resolver | undefined;
  parsed: ParsedSchema | undefined;

  relsText: string;
  relationships: RelationshipFound[];
}

/**
 * useLocalParseService is a hook which monitors the datastore and checks for invalid
 * validation tuples by locally parsing.
 */
export function useLocalParseService(datastore: DataStore): LocalParseService {
  const [state, setState] = useState<LocalParseState>({
    relsText: "",
    schemaText: "",

    parsed: undefined,
    resolver: undefined,
    relationships: [],
  });

  const runCheck = async ({
    schemaText,
    relsText,
  }: {
    schemaText: string;
    relsText: string;
  }) => {
    if (relsText === state.relsText && schemaText === state.schemaText) {
      return;
    }

    const rels =
      relsText === state.relsText
        ? state.relationships
        : parseRelationshipsWithErrors(relsText);
    const parsed =
      schemaText === state.schemaText ? state.parsed : parseSchema(schemaText);
    setState({
      relsText: relsText,
      schemaText: schemaText,
      relationships: rels,
      parsed: parsed,
      resolver: parsed ? new Resolver(parsed) : undefined,
    });
  };

  const { run: check } = useDebouncedChecker(250, runCheck);

  useEffect(() => {
    // Kick off the initial check.
    const schemaText = datastore.getSingletonByKind(
      DataStoreItemKind.SCHEMA,
    ).editableContents!;
    const relsText = datastore.getSingletonByKind(
      DataStoreItemKind.RELATIONSHIPS,
    ).editableContents!;
    check({ schemaText: schemaText, relsText: relsText });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return datastore.registerListener(() => {
      const schemaText = datastore.getSingletonByKind(
        DataStoreItemKind.SCHEMA,
      ).editableContents!;
      const relsText = datastore.getSingletonByKind(
        DataStoreItemKind.RELATIONSHIPS,
      ).editableContents!;
      check({ schemaText: schemaText, relsText: relsText });
    });

    // NOTE: we do not want to rely on `check` changing, since it is merely
    // a function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datastore]);

  const lookupDefinition = useMemo(() => {
    return (name: string): ResolvedDefinition | undefined => {
      if (state.resolver === undefined) {
        return undefined;
      }

      return state.resolver.lookupDefinition(name);
    };
  }, [state.resolver]);

  return {
    state: state,
    lookupDefinition: lookupDefinition,
  };
}
