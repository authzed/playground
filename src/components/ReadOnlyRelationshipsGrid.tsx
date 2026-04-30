import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelationTuple as Relationship } from "@/spicedb-common/protodefs/core/v1/core_pb";

export function ReadOnlyRelationshipsGrid(props: {
  relationships: Relationship[];
  hideSubjectRelation?: boolean;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[16%] font-bold">Object Type</TableHead>
            <TableHead className="w-[16%] font-bold">Object ID</TableHead>
            <TableHead className="w-[16%] font-bold">Relation</TableHead>
            <TableHead className="w-[16%] font-bold">Subject Type</TableHead>
            <TableHead className="w-[16%] font-bold">Subject ID</TableHead>
            {props.hideSubjectRelation !== true && (
              <TableHead className="w-[16%] font-bold">Subject Relation</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.relationships.map((relationship, index) => {
            return (
              // NOTE: an index is appropriate here because a user could theoretically
              // write a duplicate relationship, and the position makes some sense as a key
              <TableRow key={index}>
                <TableCell className="text-[#8787ff]">
                  {relationship.resourceAndRelation?.namespace}
                </TableCell>
                <TableCell>{relationship.resourceAndRelation?.objectId}</TableCell>
                <TableCell className="text-[#ffa887]">
                  {relationship.resourceAndRelation?.relation}
                </TableCell>
                <TableCell className="text-[#8787ff]">
                  {relationship.subject?.namespace}
                </TableCell>
                <TableCell>{relationship.subject?.objectId}</TableCell>
                {props.hideSubjectRelation !== true && (
                  <TableCell>{relationship.subject?.relation}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
