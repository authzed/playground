import { useNavigate, getRouteApi } from "@tanstack/react-router";
import { useEffect, useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useDeveloperService } from "@/spicedb-common/services/developerservice";
import { usePlaygroundDatastore } from "@/services/datastore";
import { useLiveCheckService } from "@/services/check";

/**
 * ShareLoader is a component which prompts the user around loading the shared data (if any) before redirecting
 * to the loaded playground. Only used for full playground.
 */
export function ShareLoader() {
  const navigate = useNavigate();
  // NOTE: these aren't singletons, which may cause problems?
  const datastore = usePlaygroundDatastore();
  const developerService = useDeveloperService();
  const liveCheckService = useLiveCheckService(developerService, datastore);

  const routeApi = getRouteApi("/s/$shareId")
  const shareData = routeApi.useLoaderData()
  const { shareId } = routeApi.useParams()

  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);

  const loadDatastore = useCallback(() => {
    datastore.load({
      schema: shareData.schema || "",
      relationshipsYaml: shareData.relationships_yaml || "",
      assertionsYaml: shareData.assertions_yaml || "",
      verificationYaml: shareData.validation_yaml || "",
    });
    datastore.setBaseline("shared", shareId);
    if (liveCheckService) {
      liveCheckService.loadWatches(shareData.check_watches ?? []);
    }
    void navigate({ to: "/", replace: true });
  }, [shareData, datastore, shareId, liveCheckService, navigate])

  // On load, check whether the datastore is already populated.
  // If it is, open the dialog asking whether the user wants to replace contents;
  // if it's not, populate it directly.
  useEffect(() => {
    // If there isn't shareData to be had at this route, redirect
    // TODO: see if this makes sense with the sharedata loader
    if (!shareData) {
      void navigate({ to: "/", replace: true });
      return
    }
    if (datastore.isPopulated()) {
      setReplaceDialogOpen(true);
    } else {
      loadDatastore();
    }
  }, [ loadDatastore, datastore, navigate, shareData ]);

  return (
      <AlertDialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your existing Playground content?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to replace your existing Playground contents with those from the
              shared link? They will overwrite your existing contents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
            onClick={() => { void navigate({ to: "/", replace: true})}}
            >
              Keep Existing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={loadDatastore}
            >
              Replace Contents
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  );
}
