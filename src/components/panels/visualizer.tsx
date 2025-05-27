import TabLabel from "../../playground-ui/TabLabel";
import TenantGraph from "../../spicedb-common/components/graph/TenantGraph";
import { TextRange } from "../../spicedb-common/include/protobuf-parser";
import { RelationshipFound } from "../../spicedb-common/parsing";
import { RelationTuple as Relationship } from "../../spicedb-common/protodefs/core/v1/core_pb";
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
import { PlaygroundPanelLocation } from "./panels";

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

export function VisualizerPanel(
  props: PanelProps<PlaygroundPanelLocation> & {
    dimensions?: { width: number; height: number };
  } & {
    editorPosition?: monaco.Position | undefined;
    currentItem?: DataStoreItem | undefined;
  },
) {
  const classes = useStyles();
  const currentItem = props.currentItem;
  const navigate = useNavigate();

  const handleBrowseRequested = (range: TextRange | undefined) => {
    // TODO: make this functionality use querystrings instead of history state
    navigate({
      to: DataStorePaths.Schema(),
      state: {
        range,
      },
    });
  };

  const relationships = props.services.localParseService.state.relationships
    .filter((tf: RelationshipFound) => !("errorMessage" in tf.parsed))
    .map((tf: RelationshipFound) => tf.parsed) as Relationship[];

  return (
    <div
      className={classes.tenantGraphContainer}
      style={{ height: props.dimensions?.height ?? 0 }}
    >
      <TenantGraph
        key={props.location}
        schema={props.services.localParseService.state.parsed}
        relationships={relationships}
        onBrowseRequested={handleBrowseRequested}
        active={
          props.editorPosition
            ? {
                isSchema: currentItem?.kind === DataStoreItemKind.SCHEMA,
                position: props.editorPosition,
              }
            : undefined
        }
      />
    </div>
  );
}
