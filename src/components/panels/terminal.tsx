import { CircleX } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import { DataStore, DataStoreItemKind } from "../../services/datastore";
import { Services } from "../../services/services";
import { mergeRelationshipsStringAndComments } from "../../spicedb-common/parsing";
import { HtmlTerminalRenderer } from "../terminal/HtmlTerminalRenderer";

interface TerminalPanelProps {
  services: Services;
  datastore: DataStore;
}

export function TerminalPanel({ services, datastore }: TerminalPanelProps) {
  const zts = services.zedTerminalService!;

  useEffect(() => {
    zts.start();
  }, [zts]);

  const handleSubmit = (cmd: string) => {
    const schema = datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents!;
    const relString = datastore.getSingletonByKind(
      DataStoreItemKind.RELATIONSHIPS,
    ).editableContents!;
    const [result] = zts.runCommand(cmd, schema, relString);
    if (result?.updatedRelationships) {
      const relItem = datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS);
      const merged = mergeRelationshipsStringAndComments(
        relItem.editableContents,
        result.updatedRelationships,
      );
      datastore.update(relItem, merged);
    }
  };

  if (zts.state.status === "loading") {
    return (
      <div className="grid grid-cols-[auto_1fr] items-center gap-2 p-4">
        Loading Terminal:
        <Progress value={Math.floor(zts.state.progress * 100)} />
      </div>
    );
  }

  if (zts.state.status === "loaderror" || zts.state.status === "unsupported") {
    return (
      <Alert variant="destructive">
        <CircleX />
        <AlertTitle>
          {zts.state.status === "unsupported"
            ? "Your browser does not support WebAssembly"
            : "Could not start the Terminal"}
        </AlertTitle>
      </Alert>
    );
  }

  if (zts.state.status !== "ready") return <div>Initializing Terminal</div>;

  return (
    <HtmlTerminalRenderer
      outputSections={zts.outputSections}
      commandHistory={zts.commandHistory}
      onSubmitCommand={handleSubmit}
      onClear={() => zts.clear()}
    />
  );
}
