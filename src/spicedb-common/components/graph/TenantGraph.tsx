import VisNetworkGraph from "../../../playground-ui/VisNetworkGraph";
import { RelationTuple as Relationship } from "../../protodefs/core/v1/core_pb";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import type { TextRange, ParsedSchema } from "@authzed/spicedb-parser-js";
import {
  ActiveInfo,
  findActive,
  generateTenantGraph,
  LocalEdge,
  LocalNode,
  RELATIONSHIP_TABLE_CLASS_NAME,
} from "./builder";

export interface TenantGraphProps {
  /**
   * schema is the parsed schema.
   */
  schema: ParsedSchema | undefined;

  /**
   * relationships are the test relationships for the schema.
   */
  relationships?: Relationship[] | undefined;

  /**
   * onBrowseRequested is invoked if the user has requested a browse to the specific
   * range in the schema.
   */
  onBrowseRequested?: (range: TextRange | undefined) => void;

  /**
   * active contains the active namespace and position information for highlighting
   * in the graph.
   */
  active?: ActiveInfo;
}

interface StyleProps {
  prefersDarkMode: boolean;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    graph: {
      "& .vis-tooltip": {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      },
      [`& .${RELATIONSHIP_TABLE_CLASS_NAME}`]: {
        borderCollapse: "collapse",
        "& td": {
          padding: 0,
          margin: 0,
          color: (props: StyleProps) =>
            props.prefersDarkMode
              ? theme.palette.grey[500]
              : theme.palette.grey[700],
          fontSize: "85%",
          "&:nth-child(1)": {
            color: (props: StyleProps) =>
              props.prefersDarkMode ? "#8787ff" : "#4242ff",
          },
          "&:nth-child(3)": {
            color: theme.palette.text.primary,
            fontSize: "95%",
            fontWeight: "bold",
          },
          "&:nth-child(5)": {
            color: (props: StyleProps) =>
              props.prefersDarkMode ? "#ffa887" : "#883425",
          },
          "&:nth-child(7)": {
            color: (props: StyleProps) =>
              props.prefersDarkMode ? "#8787ff" : "#4242ff",
          },
          "&:nth-child(9)": {
            color: theme.palette.text.primary,
            fontSize: "95%",
            fontWeight: "bold",
          },
          "&:nth-child(11)": {
            color: theme.palette.text.secondary,
            fontSize: "95%",
          },
          "&.target-permission": {
            color: (props: StyleProps) =>
              props.prefersDarkMode ? "#1acc92" : "#1acc92",
            fontSize: "95%",
          },
          "&.target-relation": {
            color: (props: StyleProps) =>
              props.prefersDarkMode ? "#ffa887" : "#883425",
            fontSize: "95%",
          },
        },
      },
    },
    graphContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    toggle: {
      position: "absolute",
      bottom: theme.spacing(1),
      right: theme.spacing(1),
    },
  }),
);

/**
 * TenantGraph renders a graphical view of the schema configured in a Tenant.
 */
export default function TenantGraph(props: TenantGraphProps) {
  const graph = generateTenantGraph(props.schema, props.relationships);

  const handleDoubleClicked = (nodes: LocalNode[], edges: LocalEdge[]) => {
    if (props.onBrowseRequested === undefined) {
      return;
    }

    let rangeToShow: TextRange | undefined = undefined;

    if (nodes.length === 0 && edges.length === 1) {
      rangeToShow = edges[0].sourceInfo?.parserRange;
    } else if (nodes.length === 1) {
      rangeToShow = nodes[0].sourceInfo?.parserRange;
    }

    if (rangeToShow !== undefined) {
      props.onBrowseRequested(rangeToShow);
    }
  };

  const { nodes, edges } = graph;
  const selected = {
    nodes: findActive<LocalNode>(nodes, props.active) ?? [],
    edges: findActive<LocalEdge>(edges, props.active) ?? [],
  };

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const classes = useStyles({ prefersDarkMode });

  return (
    <div className={classes.graphContainer}>
      <VisNetworkGraph<LocalNode, LocalEdge>
        className={classes.graph}
        graph={graph}
        selected={selected}
        onDblClicked={handleDoubleClicked}
      />
    </div>
  );
}
