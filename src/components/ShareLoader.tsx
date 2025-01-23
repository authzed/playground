import { useAlert } from "../playground-ui/AlertProvider";
import { useConfirmDialog } from "../playground-ui/ConfirmDialogProvider";
import LoadingView from "../playground-ui/LoadingView";
import { DeveloperServiceClient } from "../spicedb-common/protodefs/authzed/api/v0/developer.client";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { LookupShareResponse_LookupStatus } from "../spicedb-common/protodefs/authzed/api/v0/developer";
import { RpcError } from "@protobuf-ts/runtime-rpc";
import Alert from "@material-ui/lab/Alert";
import React, { useEffect, useState } from "react";
import "react-reflex/styles.css";
import { useHistory, useLocation } from "react-router-dom";
import AppConfig from "../services/configservice";
import { DataStore } from "../services/datastore";

enum SharedLoadingStatus {
  NOT_CHECKED = -1,
  NOT_APPLICABLE = 0,
  LOADING = 1,
  LOADED = 2,
  LOAD_ERROR = 3,
  CONFIRMING = 4,
}

/**
 * ShareLoader is a component which loads the shared data (if any) before rendering
 * the child playground.
 */
export function ShareLoader(props: {
  shareUrlRoot: string;
  datastore: DataStore;
  children: React.ReactNode;
  sharedRequired: boolean;
}) {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirmDialog();
  const history = useHistory();
  const location = useLocation();

  const datastore = props.datastore;
  const urlPrefix = `/${props.shareUrlRoot}/`;
  const [loadingStatus, setLoadingStatus] = useState(
    SharedLoadingStatus.NOT_CHECKED,
  );

  // Register an effect to load shared data if the URL specifies to do so.
  useEffect(() => {
    if (loadingStatus !== SharedLoadingStatus.NOT_CHECKED) {
      return;
    }

    if (!location.pathname.startsWith(urlPrefix)) {
      setLoadingStatus(SharedLoadingStatus.NOT_APPLICABLE);
      return;
    }

    if (!AppConfig().authzed?.developerEndpoint) {
      setLoadingStatus(SharedLoadingStatus.NOT_APPLICABLE);
      return;
    }

    setLoadingStatus(SharedLoadingStatus.LOADING);

    // Load the shared data.
    (async () => {
      const endpoint = AppConfig().authzed.developerEndpoint;
      if (!endpoint) {
        return;
      }
      const service = new DeveloperServiceClient(
        new GrpcWebFetchTransport({ baseUrl: endpoint }),
      );

      // TODO: use routing for this instead of string manipulation
      const pieces = location.pathname.replace(urlPrefix, "").split("/");
      if (pieces.length < 1 && !props.sharedRequired) {
        history.push("/");
        return;
      }

      const shareReference = pieces[0];

      try {
        const { response, status } = await service.lookupShared({
          shareReference,
        });
        if (
          status.code ===
          LookupShareResponse_LookupStatus.FAILED_TO_LOOKUP.toString()
        ) {
          setLoadingStatus(SharedLoadingStatus.LOAD_ERROR);
          if (props.sharedRequired) {
            return;
          }

          await showAlert({
            title: "Error loading shared playground",
            content: "Invalid sharing reference",
            buttonTitle: "Okay",
          });
          history.replace("/");
          return;
        }

        // Unknown reference.
        if (
          status.code ===
          LookupShareResponse_LookupStatus.UNKNOWN_REFERENCE.toString()
        ) {
          setLoadingStatus(SharedLoadingStatus.LOAD_ERROR);
          if (props.sharedRequired) {
            return;
          }

          await showAlert({
            title: "Shared playground not found",
            content: "The shared playground specified does not exist",
            buttonTitle: "Okay",
          });
          history.replace("/");
          return;
        }

        // Valid reference.
        let updateDatastore = true;
        if (!props.sharedRequired && datastore.isPopulated()) {
          setLoadingStatus(SharedLoadingStatus.CONFIRMING);
          const [result] = await showConfirm({
            title: `Replace your existing Playground content?`,
            content: `Are you sure you want to replace your existing Playground contents with those from the shared link? They will overwrite your existing contents.`,
            buttons: [
              { title: "Keep Existing", value: "nevermind" },
              {
                title: `Replace Contents`,
                variant: "contained",
                color: "secondary",
                value: "replace",
              },
            ],
          });
          updateDatastore = result === "replace";
        }

        if (updateDatastore) {
          datastore.load({
            schema: response.schema,
            relationshipsYaml: response.relationshipsYaml,
            assertionsYaml: response.assertionsYaml,
            verificationYaml: response.validationYaml,
          });
        }

        if (!props.sharedRequired) {
          history.replace(
            location.pathname.slice(
              0,
              urlPrefix.length + shareReference.length,
            ),
          );
        }

        setLoadingStatus(SharedLoadingStatus.LOADED);
      } catch (error: unknown) {
        if (error instanceof RpcError)
          await showAlert({
            title: "Error loading shared playground",
            content: error?.message,
            buttonTitle: "Okay",
          });
        history.replace("/");
        return;
      }
    })();
  }, [
    location.pathname,
    loadingStatus,
    datastore,
    history,
    showAlert,
    showConfirm,
    urlPrefix,
    props.sharedRequired,
  ]);

  if (
    location.pathname.startsWith(urlPrefix) &&
    loadingStatus !== SharedLoadingStatus.LOADED
  ) {
    return (
      <div>
        {loadingStatus === SharedLoadingStatus.NOT_APPLICABLE && (
          <Alert severity="error">Could not load shared playground</Alert>
        )}
        {loadingStatus === SharedLoadingStatus.LOADING && (
          <LoadingView message="Loading shared playground data" />
        )}
        {loadingStatus === SharedLoadingStatus.LOAD_ERROR && (
          <Alert severity="error">Could not load shared playground</Alert>
        )}
      </div>
    );
  }

  return <div>{props.children}</div>;
}
