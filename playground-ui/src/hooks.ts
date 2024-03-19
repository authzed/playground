import {
  ApolloError,
  ApolloQueryResult,
  FetchResult,
  LazyQueryHookOptions,
  MutationFunctionOptions,
  MutationHookOptions,
  OperationVariables,
  TypedDocumentNode,
  useLazyQuery,
  useMutation,
  useQuery,
} from '@apollo/client';
import { useAlert } from '@code/playground-ui/src/AlertProvider';
import { DocumentNode } from 'graphql';
import { useEffect, useState } from 'react';
import { MutationError, WithErrors } from './base';

export interface ManagedQueryMetadata {
  workingMessage: string;
  errorMessage: string;
}

export interface ManagedMutationState {
  running: boolean;
  called: boolean;
  apolloError?: ApolloError;
  errors?: MutationError[];
}

export interface DocumentNodeAndMetadata {
  query: DocumentNode;
  metadata: ManagedQueryMetadata;
  refetchQueries?: string[];
}

type WithNestedErrors = { [key: string]: WithErrors };

export declare type ManagedMutationTuple<TData, TVariables> = [
  (
    options?: MutationFunctionOptions<TData, TVariables>,
    metadata?: ManagedQueryMetadata
  ) => Promise<FetchResult<TData> | undefined>,
  ManagedMutationState
];

/**
 * useManagedMutation provides a useMutation hook, with in-progress and error handling UI managed
 * by default.
 */
export function useManagedMutation<
  TData extends WithNestedErrors = any,
  TVariables = OperationVariables
>(
  mutationAndMetadata: DocumentNodeAndMetadata,
  options?: MutationHookOptions<TData, TVariables>,
  manageOptions?: ManagedMutationOptions
): ManagedMutationTuple<TData, TVariables> {
  return useManagedMutationWithMetadata<TData, TVariables>(
    mutationAndMetadata.query,
    mutationAndMetadata.metadata,
    { ...options, refetchQueries: mutationAndMetadata.refetchQueries },
    manageOptions
  );
}

export interface ManagedMutationOptions {
  /**
   * handleMutationErrors, if false, indicates that the caller is going to handle mutation errors.
   * Apollo errors will still be handled automatically.
   */
  handleMutationErrors: boolean;
}

/**
 * useManagedMutationWithMetadata provides a useMutation hook, with in-progress and error handling UI managed
 * by default.
 */
export function useManagedMutationWithMetadata<
  TData extends WithNestedErrors = any,
  TVariables = OperationVariables
>(
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>,
  metadata: ManagedQueryMetadata,
  options?: MutationHookOptions<TData, TVariables>,
  manageOptions?: ManagedMutationOptions
): ManagedMutationTuple<TData, TVariables> {
  const { showAlert } = useAlert();
  const [invoker] = useMutation<TData, TVariables>(mutation, options);
  const [managedState, setManagedState] = useState<ManagedMutationState>({
    running: false,
    called: false,
  });

  const updateManagedState = (
    state: ManagedMutationState,
    overrideMetadata?: ManagedQueryMetadata
  ) => {
    if (state.errors || state.apolloError) {
      if (!state.errors || manageOptions?.handleMutationErrors !== false) {
        showAlert({
          title:
            overrideMetadata?.errorMessage ||
            metadata.errorMessage ||
            'An error occurred',
          content: state.errors
            ? state.errors[0].details
            : state.apolloError?.message,
          buttonTitle: 'Okay',
        });
      }
    }

    setManagedState(state);
  };

  async function wrappedInvoker(
    options?: MutationFunctionOptions<TData, TVariables>,
    metadata?: ManagedQueryMetadata
  ): Promise<FetchResult<TData> | undefined> {
    updateManagedState(
      {
        running: true,
        called: true,
      },
      metadata
    );

    let result = undefined;
    try {
      result = await invoker(options);
    } catch (e) {
      updateManagedState(
        {
          running: false,
          called: true,
          apolloError: e as ApolloError,
        },
        metadata
      );
      return undefined;
    }

    if (
      result === undefined ||
      result.data === undefined ||
      result.data === null
    ) {
      throw Error('Got undefined result');
    }

    // Ensure there is a single key in the data (which is the name of the mutation).
    const resultKeys = Object.keys(result.data);
    if (resultKeys.length !== 1) {
      throw Error('Found more than one key in result data');
    }

    const resultData = result.data[resultKeys[0]];
    if (!resultData.ok) {
      updateManagedState(
        {
          running: false,
          called: true,
          errors: resultData.errors,
        },
        metadata
      );
    } else {
      updateManagedState(
        {
          called: true,
          running: false,
        },
        metadata
      );
    }

    return result;
  }

  return [wrappedInvoker, managedState];
}

export interface ManagedQueryState<TData, TVariables = OperationVariables> {
  loading: boolean;
  apolloError?: ApolloError;
  data?: TData;
  query: DocumentNodeAndMetadata;
  refetch:
    | ((
        variables?: Partial<TVariables> | undefined
      ) => Promise<ApolloQueryResult<TData>>)
    | undefined;
}

export type FixedQueryOptions<
  TData,
  TVariables = OperationVariables
> = LazyQueryHookOptions<TData, TVariables> & {
  skipIf?: boolean;
};

/**
 * useManagedQuery is a wrapper around useQuery that fixes some issues (see useFixedQuery below) and
 * manages its state.
 */
export function useManagedQuery<TData, TVariables = OperationVariables>(
  query: DocumentNodeAndMetadata,
  options?: FixedQueryOptions<TData, TVariables>
): ManagedQueryState<TData, TVariables> {
  if (query.refetchQueries !== undefined) {
    throw Error('Cannot have refetchQueries on a non-mutation');
  }
  const { loading, error, data, refetch } = useFixedQuery<TData, TVariables>(
    query.query,
    options
  );

  return {
    loading: loading,
    apolloError: error,
    data: data,
    query: query,
    refetch: refetch,
  };
}

/**
 * useFixedQuery is a wrapper around useQuery that fixes the issue associated with de-registration
 * of queries currently in Apollo. Instead of using useQuery, useFixedQuery makes use of
 * useLazyQuery, which is invoked via a useEffect hook as soon as the component is mounted, and we
 * check if the component is still mounted before any additional calls.
 */
export function useFixedQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: FixedQueryOptions<TData, TVariables>
) {
  const [loadData, queryState] = useLazyQuery(query, options);
  const { loading, error, data, fetchMore, refetch, called } = queryState;

  // NOTE: Changed to use lazyQuery based on: https://github.com/apollographql/react-apollo/issues/3635#issuecomment-621070899
  useEffect(() => {
    if (!called && (options === undefined || options.skipIf !== true)) {
      loadData();
    }
  }, [called, loadData, options, data, error]);

  return { loading, error, data, fetchMore, refetch };
}

/**
 * useImperativeQuery runs the query only when the returned callback is invoked.
 */
export function useImperativeQuery<
  TData = any,
  TVariables = OperationVariables
>(query: DocumentNode) {
  // From: https://github.com/apollographql/react-apollo/issues/3499#issuecomment-586039082
  const { loading, refetch } = useQuery<TData, TVariables>(query, {
    skip: true,
  });

  const imperativelyCallQuery = (variables?: TVariables) => {
    return refetch(variables);
  };

  return { execute: imperativelyCallQuery, loading: loading };
}
