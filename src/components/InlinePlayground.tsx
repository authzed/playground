import { parseSchema } from "@authzed/spicedb-parser-js";
import AppBar from "@material-ui/core/AppBar";
import { createStyles, darken, makeStyles, Theme } from "@material-ui/core/styles";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import BubbleChartIcon from "@material-ui/icons/BubbleChart";
import clsx from "clsx";
import { SquareArrowOutUpRight } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
// TODO: rename
import TenantGraph from "@/components/visualizer/TenantGraph";

import TabLabel from "../playground-ui/TabLabel";
import { useLiveCheckService } from "../services/check";
import { DataStore, DataStoreItemKind, useReadonlyDatastore } from "../services/datastore";
import { useLocalParseService } from "../services/localparse";
import { useProblemService } from "../services/problem";
import { useValidationService } from "../services/validation";
import { parseRelationships } from "../spicedb-common/parsing";
import { useDeveloperService } from "../spicedb-common/services/developerservice";

import { DatastoreRelationshipEditor } from "./DatastoreRelationshipEditor";
import { EditorDisplay } from "./EditorDisplay";
import { AT, ET, NS, VL } from "./KindIcons";
import { ShareLoader } from "./ShareLoader";
import { useAppSelector } from "@/hooks";
import { PATHS } from "@/constants";

export function InlinePlayground() {
  return (
    <ShareLoader shareUrlRoot="i" sharedRequired={true}>
      <InlinePlaygroundUI />
    </ShareLoader>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tabBar: {
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      columnGap: theme.spacing(0.25),
    },
    buttonContainer: {
      padding: theme.spacing(1),
    },
    root: {
      display: "grid",
      gridTemplateRows: "auto 1fr",
      height: "100vh",
    },
    tabPanel: {
      height: "100%",
      "& > div": {
        height: "100%",
      },
      "& > div > div": {
        height: "100%",
      },
    },
    tabRoot: {
      minWidth: "0px",
    },
    graphTab: {},
    tenantGraphContainer: {
      width: "100%",
      height: "98vh",
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

// TODO: figure out how readonly would fit - need to make store unmodifiable somehow
function InlinePlaygroundUI() {
  const classes = useStyles();

  const developerService = useDeveloperService();
  const localParseService = useLocalParseService();
  const liveCheckService = useLiveCheckService(developerService);
  const validationService = useValidationService(developerService);
  const problemService = useProblemService(localParseService, liveCheckService, validationService);

  const schema = useAppSelector(state => state.editor.schema)
  const relationships = useAppSelector(state => state.editor.relationships)

  const services = {
    localParseService,
    liveCheckService,
    validationService,
    problemService,
    developerService,
  };

  const [disableMouseWheelScrolling, setDisableMouseWheelScrolling] = useState(true);
  const [currentTabName, setCurrentTabName] = useState(PATHS.SCHEMA);

  const handleChangeTab = (_event: React.ChangeEvent<object>, selectedTabName: string) => {
    setCurrentTabName(selectedTabName);
  };

  const parsedSchema = parseSchema(schema);
  const parsedRelationships = parseRelationships(relationships);
  const [resizeIndex, setResizeIndex] = useState(0);

  React.useEffect(() => {
    const handler = () => {
      // Force a rerender
      setResizeIndex(resizeIndex + 1);
    };

    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
    };
  }, [resizeIndex, setResizeIndex]);

  return (
    <div onClick={() => setDisableMouseWheelScrolling(false)} className={clsx(classes.root)}>
      <AppBar className={classes.tabBar} position="static" color="default">
        <Tabs
          value={currentTabName}
          onChange={handleChangeTab}
          indicatorColor="primary"
          textColor="primary"
          aria-label="Tabs"
        >
          <Tab
            classes={{ root: classes.tabRoot }}
            value={PATHS.SCHEMA}
            label={<TabLabel icon={<NS small />} title="Schema" />}
          />
          <Tab
            classes={{ root: classes.tabRoot }}
            value={PATHS.RELATIONSHIPS}
            label={<TabLabel icon={<VL small />} title="Test Data" />}
          />
          <Tab
            classes={{ root: clsx(classes.tabRoot, classes.graphTab) }}
            value={"$graph"}
            label={<TabLabel icon={<BubbleChartIcon />} title="Graph" />}
          />
          <Tab
            classes={{ root: classes.tabRoot }}
            value={PATHS.ASSERTIONS}
            label={<TabLabel icon={<AT small />} title="Assert" />}
          />
          <Tab
            classes={{ root: classes.tabRoot }}
            value={PATHS.EXPECTED_RELATIONS}
            label={<TabLabel icon={<ET small />} title="Expected" />}
          />
        </Tabs>
        <div className={classes.buttonContainer}>
          <Button asChild variant="link">
            <a href={window.location.toString().replace("/i/", "/s/")} target="_blank">
              <SquareArrowOutUpRight />
              Open
            </a>
          </Button>
        </div>
      </AppBar>

      {currentTabName === "$graph" && (
        <div className={classes.tenantGraphContainer}>
          <TenantGraph schema={parsedSchema} relationships={parsedRelationships} />
        </div>
      )}

      {currentTabName === PATHS.RELATIONSHIPS && (
        <DatastoreRelationshipEditor
          services={services}
          isReadOnly
          dimensions={{
            width: document.body.clientWidth,
            height: document.body.clientHeight,
          }}
        />
      )}

      {/* TODO: simplify this logic with the above. Switch? */}
      {currentTabName !== "$graph" && currentTabName !== PATHS.RELATIONSHIPS && (
        <EditorDisplay
          services={services}
          isReadOnly={true}
          datastoreUpdated={() => null}
          disableMouseWheelScrolling={disableMouseWheelScrolling}
          defaultWidth="100vw"
          defaultHeight="100%"
        />
      )}
    </div>
  );
}
