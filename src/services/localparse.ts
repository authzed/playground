import {
  type ParsedSchema,
  parseSchema,
  type ResolvedDefinition,
  Resolver,
} from "@authzed/spicedb-parser-js";
import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";
import {
  parseRelationshipsWithErrors,
  RelationshipFound,
} from "../spicedb-common/parsing";
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

  const runCheck = ({
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

  const check = useDebouncedCallback(runCheck, {
    wait: 250,
  });

  useEffect(() => {
    // Kick off the initial check.
    const schemaText = datastore.getSingletonByKind(
      DataStoreItemKind.SCHEMA,
    ).editableContents!;
    const relsText = datastore.getSingletonByKind(
      DataStoreItemKind.RELATIONSHIPS,
    ).editableContents!;
    check({ schemaText: schemaText, relsText: relsText });

    // Register the listener for the datastore
    return datastore.registerListener(() => {
      const schemaText = datastore.getSingletonByKind(
        DataStoreItemKind.SCHEMA,
      ).editableContents!;
      const relsText = datastore.getSingletonByKind(
        DataStoreItemKind.RELATIONSHIPS,
      ).editableContents!;
      check({ schemaText: schemaText, relsText: relsText });
    });
  }, [datastore, check]);

  const lookupDefinition = useMemo(() => {
    return (name: string): ResolvedDefinition | undefined => {
      if (state.resolver === undefined) {
        return undefined;
      }

      return state.resolver.lookupDefinition(name);
    };
  }, [state.resolver]);

  return {
    state,
    lookupDefinition,
  };
}
