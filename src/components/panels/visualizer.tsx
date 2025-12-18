import TabLabel from "../../playground-ui/TabLabel";
import TenantGraph from "../../spicedb-common/components/graph/TenantGraph";
import { TextRange } from "../../spicedb-common/include/protobuf-parser";
import { ParseRelationshipError } from "../../spicedb-common/parsing";
import { RelationTuple } from "../../spicedb-common/protodefs/core/v1/core_pb";
import {
  createStyles,
  darken,
  makeStyles,
  Theme,
} from "@material-ui/core/styles";
import BubbleChartIcon from "@material-ui/icons/BubbleChart";
import monaco from "monaco-editor";
import "react-reflex/styles.css";
import { useNavigate } from "@tanstack/react-router";
import {
  DataStoreItem,
  DataStoreItemKind,
  DataStorePaths,
} from "../../services/datastore";
import { PanelProps } from "./base/common";

declare module "@tanstack/react-router" {
  interface HistoryState {
    range?: TextRange;
  }
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tenantGraphContainer: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.palette.background.default,
      backgroundSize: "20px 20px",
      backgroundImage: `
              linear-gradient(to right, ${darken(
                theme.palette.background.default,
                0.1,
              )} 1px, transparent 1px),
              linear-gradient(to bottom, ${darken(
                theme.palette.background.default,
                0.1,
              )} 1px, transparent 1px)
            `,
    },
  }),
);

export function VisualizerSummary() {
  return <TabLabel icon={<BubbleChartIcon />} title="System Visualization" />;
}

function isRelationship(
  relOrError: RelationTuple | ParseRelationshipError,
): relOrError is RelationTuple {
  return !("errorMessage" in relOrError);
}

export function VisualizerPanel({
  location,
  services,
  dimensions,
  editorPosition,
  currentItem,
}: PanelProps & {
  dimensions?: { width: number; height: number };
  editorPosition?: monaco.Position | undefined;
  currentItem?: DataStoreItem | undefined;
}) {
  const classes = useStyles();
  const navigate = useNavigate();

  const handleBrowseRequested = (range?: TextRange) => {
    // TODO: make this functionality use querystrings instead of history state
    navigate({
      to: DataStorePaths.Schema(),
      state: {
        range,
      },
    });
  };

  const relationships = services.localParseService.state.relationships
    .map((relFound) => relFound.parsed)
    .filter(isRelationship);

  return (
    <div
      className={classes.tenantGraphContainer}
      style={{ height: dimensions?.height ?? 0 }}
    >
      <TenantGraph
        key={location}
        schema={services.localParseService.state.parsed}
        relationships={relationships}
        onBrowseRequested={handleBrowseRequested}
        active={
          editorPosition
            ? {
                isSchema: currentItem?.kind === DataStoreItemKind.SCHEMA,
                position: editorPosition,
              }
            : undefined
        }
      />
    </div>
  );
}
