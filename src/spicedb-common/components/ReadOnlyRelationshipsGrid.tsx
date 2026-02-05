import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { RelationTuple as Relationship } from "../protodefs/core/v1/core_pb";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    table: {
      backgroundColor: theme.palette.background.default,
    },
    def: {
      color: "#8787ff",
    },
    rel: {
      color: "#ffa887",
    },
    cell: {
      fontWeight: "bold",
      width: "16%",
    },
  }),
);

export function ReadOnlyRelationshipsGrid(props: {
  relationships: Relationship[];
  hideSubjectRelation?: boolean;
}) {
  const classes = useStyles();

  return (
    <Table className={classes.table}>
      <TableHead>
        <TableRow>
          <TableCell className={classes.cell}>Object Type</TableCell>
          <TableCell className={classes.cell}>Object ID</TableCell>
          <TableCell className={classes.cell}>Relation</TableCell>
          <TableCell className={classes.cell}>Subject Type</TableCell>
          <TableCell className={classes.cell}>Subject ID</TableCell>
          {props.hideSubjectRelation !== true && (
            <TableCell className={classes.cell}>Subject Relation</TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {props.relationships.map((relationship: Relationship) => {
          return (
            <TableRow>
              <TableCell className={classes.def}>
                {relationship.resourceAndRelation?.namespace}
              </TableCell>
              <TableCell>{relationship.resourceAndRelation?.objectId}</TableCell>
              <TableCell className={classes.rel}>
                {relationship.resourceAndRelation?.relation}
              </TableCell>
              <TableCell className={classes.def}>{relationship.subject?.namespace}</TableCell>
              <TableCell>{relationship.subject?.objectId}</TableCell>
              {props.hideSubjectRelation !== true && (
                <TableCell>{relationship.subject?.relation}</TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
