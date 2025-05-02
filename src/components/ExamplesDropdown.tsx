import { Example, LoadExamples } from "../spicedb-common/examples";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

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

import { useEffect, useState } from "react";

export function ExamplesDropdown({
  disabled,
  loadExample,
}: {
  disabled: boolean;
  loadExample: (example: Example) => void;
}) {
  const [examples, setExamples] = useState<Example[]>();
  const [promptOpen, setPromptOpen] = useState(false);
  const [selectedExample, setSelectedExample] = useState<Example>();

  useEffect(() => {
    const fetchExamples = async () => {
      if (examples === undefined) {
        setExamples(await LoadExamples());
      }
    };
    fetchExamples();
  }, [examples]);

  return (
    <>
      <Select
        onValueChange={(value) => {
          const example = examples?.find(({ id }) => id === value);
          if (example) {
            setSelectedExample(example);
            setPromptOpen(true);
          }
        }}
        disabled={disabled || !examples}
      >
        <SelectTrigger>
          {selectedExample ? selectedExample.title : "Select Example Schema"}
        </SelectTrigger>
        <SelectContent>
          {examples?.map((example) => {
            return (
              <SelectItem value={example.id} key={example.id}>
                {example.title}
                <br />
                {example.subtitle}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <AlertDialog open={promptOpen} onOpenChange={setPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Replace contents with "{selectedExample?.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current Playground data with the example
              data for "{selectedExample?.title}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedExample) {
                  loadExample(selectedExample);
                }
              }}
            >
              Replace with Example
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
