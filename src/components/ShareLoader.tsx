import { useAlert } from "../playground-ui/AlertProvider";
import { useConfirmDialog } from "../playground-ui/ConfirmDialogProvider";
import LoadingView from "../playground-ui/LoadingView";
import Alert from "@material-ui/lab/Alert";
import React, { useEffect, useState } from "react";
import "react-reflex/styles.css";
import { useNavigate, useLocation } from "@tanstack/react-router";
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
  const navigate = useNavigate();
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

    if (!AppConfig().shareApiEndpoint) {
      setLoadingStatus(SharedLoadingStatus.NOT_APPLICABLE);
      return;
    }

    setLoadingStatus(SharedLoadingStatus.LOADING);

    // Load the shared data.
    (async () => {
      const apiEndpoint = AppConfig().shareApiEndpoint;
      if (!apiEndpoint) {
        return;
      }

      // TODO: use routing for this instead of string manipulation
      const pieces = location.pathname.replace(urlPrefix, "").split("/");
      if (pieces.length < 1 && !props.sharedRequired) {
        navigate({ to: "/" });
        return;
      }

      const shareReference = pieces[0];

      try {
        const response = await fetch(
          `${apiEndpoint}/api/lookupshare?shareid=${encodeURIComponent(shareReference)}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            setLoadingStatus(SharedLoadingStatus.LOAD_ERROR);
            if (props.sharedRequired) {
              return;
            }

            await showAlert({
              title: "Shared playground not found",
              content: "The shared playground specified does not exist",
              buttonTitle: "Okay",
            });
            navigate({ to: "/", replace: true });
            return;
          }

          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          setLoadingStatus(SharedLoadingStatus.LOAD_ERROR);
          if (props.sharedRequired) {
            return;
          }

          await showAlert({
            title: "Error loading shared playground",
            content: errorData.error || "Failed to load shared playground",
            buttonTitle: "Okay",
          });
          navigate({ to: "/", replace: true });
          return;
        }

        const shareData = await response.json();

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
            schema: shareData.schema || "",
            relationshipsYaml: shareData.relationships_yaml || "",
            assertionsYaml: shareData.assertions_yaml || "",
            verificationYaml: shareData.validation_yaml || "",
          });
        }

        if (!props.sharedRequired) {
          // TODO: do this with routing as well
          navigate({
            to: location.pathname.slice(
              0,
              urlPrefix.length + shareReference.length,
            ),
            replace: true,
          });
        }

        setLoadingStatus(SharedLoadingStatus.LOADED);
      } catch (error: unknown) {
        setLoadingStatus(SharedLoadingStatus.LOAD_ERROR);
        if (props.sharedRequired) {
          return;
        }

        await showAlert({
          title: "Error loading shared playground",
          content:
            error instanceof Error
              ? error.message
              : "Failed to load shared playground",
          buttonTitle: "Okay",
        });
        navigate({ to: "/", replace: true });
        return;
      }
    })();
  }, [
    location.pathname,
    loadingStatus,
    datastore,
    navigate,
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
