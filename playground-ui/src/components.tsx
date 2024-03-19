import LoadingView from '@code/playground-ui/src/LoadingView';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import React, { PropsWithChildren } from 'react';
import { ManagedQueryState } from './hooks';

/**
 * QueryViewProps is the props for the QueryView.
 */
export interface QueryViewProps<TData> {
  /**
   * state is the state returned from useManagedQuery.
   */
  state: ManagedQueryState<TData>;
}

/**
 * QueryView displays common query UI, such as a loading when loading, an error
 * display if the query errors, and the contents of the view otherwise.
 * @example
 *    const myQueryState = useManagedQuery<SomeData>(SOME_QUERY);
 *    <QueryView state={myQueryState}>content to display on success here</QueryView>
 */
export function QueryView<TData>(
  props: PropsWithChildren<QueryViewProps<TData>>
) {
  return (
    <>
      {props.state.apolloError && (
        <Snackbar
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          open={true}
        >
          <Alert severity="error">
            {props.state.query.metadata.errorMessage}
          </Alert>
        </Snackbar>
      )}

      {props.state.loading && (
        <LoadingView message={props.state.query.metadata.workingMessage} />
      )}

      {props.children}
    </>
  );
}
