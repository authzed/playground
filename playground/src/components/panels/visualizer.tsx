import TabLabel from '@code/playground-ui/src/TabLabel';
import TenantGraph from '@code/spicedb-common/src/components/graph/TenantGraph';
import { TextRange } from '@code/spicedb-common/src/include/protobuf-parser';
import { RelationshipFound } from '@code/spicedb-common/src/parsing';
import { RelationTuple as Relationship } from '@code/spicedb-common/src/protodevdefs/core/v1/core';
import {
  createStyles,
  darken,
  makeStyles,
  Theme,
} from '@material-ui/core/styles';
import BubbleChartIcon from '@material-ui/icons/BubbleChart';
import monaco from 'monaco-editor-core';
import React from 'react';
import 'react-reflex/styles.css';
import { useHistory } from 'react-router-dom';
import {
  DataStoreItem,
  DataStoreItemKind,
  DataStorePaths,
} from '../../services/datastore';
import { PanelProps, PanelSummaryProps } from './base/common';
import { PlaygroundPanelLocation } from './panels';

var _ = React;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tenantGraphContainer: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.palette.background.default,
      backgroundSize: '20px 20px',
      backgroundImage: `
              linear-gradient(to right, ${darken(
                theme.palette.background.default,
                0.1
              )} 1px, transparent 1px),
              linear-gradient(to bottom, ${darken(
                theme.palette.background.default,
                0.1
              )} 1px, transparent 1px)
            `,
    },
  })
);

export function VisualizerSummary(
  props: PanelSummaryProps<PlaygroundPanelLocation>
) {
  return <TabLabel icon={<BubbleChartIcon />} title="System Visualization" />;
}

export function VisualizerPanel(
  props: PanelProps<PlaygroundPanelLocation> & {
    dimensions?: { width: number; height: number };
  } & {
    editorPosition?: monaco.Position | undefined;
    currentItem?: DataStoreItem | undefined;
  }
) {
  const classes = useStyles();
  const currentItem = props.currentItem;
  const history = useHistory();

  const handleBrowseRequested = (range: TextRange | undefined) => {
    history.push(DataStorePaths.Schema(), {
      range: range,
    });
  };

  const relationships = props.services.localParseService.state.relationships
    .filter((tf: RelationshipFound) => !('errorMessage' in tf.parsed))
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
