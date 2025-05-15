'use client';

import { Button } from '@/components/ui/button';
import { ShareIcon } from 'lucide-react';
import {ReactElement, useState} from 'react';
import {CodeGenerator} from "@/components/CodeGenerator.tsx";
import {DataStore, DataStoreItemKind} from "@/services/datastore.ts";
import CodeIcon from "@material-ui/icons/Code";
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from '@/components/ui/command';
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover';
// import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Sample data for the select menu
// const options = [
//   { value: 'option1', label: 'Option 1' },
//   { value: 'option2', label: 'Option 2' },
//   { value: 'option3', label: 'Option 3' },
//   { value: 'option4', label: 'Option 4' },
//   { value: 'option5', label: 'Option 5' },
// ];

function CodeGeneratorButton (props: {datastore: DataStore})  {
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [codeGenProps, setCodeGenProps] = useState({ schema: "", relationshipsYaml: "" });

  const handleOpenCodeGenerator = () => {
    const schema = props.datastore.getSingletonByKind(DataStoreItemKind.SCHEMA).editableContents!;
    const relationshipsYaml = props.datastore.getSingletonByKind(DataStoreItemKind.RELATIONSHIPS).editableContents!;
    if (schema && relationshipsYaml) {
      setCodeGenProps({ schema, relationshipsYaml });
      setShowCodeGenerator(true);
    }
  };

  return (
      <>
        <Button variant="outline" onClick={handleOpenCodeGenerator}>
          <CodeIcon /> Generate code
        </Button>
        {showCodeGenerator && (
            <CodeGenerator
                schema={codeGenProps.schema}
                relationshipsYaml={codeGenProps.relationshipsYaml}
                onClose={() => setShowCodeGenerator(false)}
            />
        )}
      </>
  );
}

export function TopBar(props: { examplesDropdown: ReactElement, datastore: DataStore }) {
  // const [open, setOpen] = useState(false);
  // const [value, setValue] = useState('');

  const { examplesDropdown } = props;

  return (
    <div className="bg-slate-950 border-b border-b-slate-700">
      <div className="flex h-16 items-center px-4">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <img src="/authzed-icon-multi.svg" className="w-8 h-8" />
          <span className="text-lg font-semibold">SpiceDB Playground</span>
        </div>

        {/* Select Menu - Hidden on mobile */}
        <div className="ml-6 hidden md:block">
          {examplesDropdown}
          {/* <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[200px] justify-between"
              >
                {value
                  ? options.find((option) => option.value === value)?.label
                  : 'Select option...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search options..." />
                <CommandList>
                  <CommandEmpty>No option found.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={(currentValue) => {
                          setValue(currentValue === value ? '' : currentValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === option.value ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover> */}
        </div>

        {/* Right aligned buttons */}
        <div className="ml-auto flex items-center space-x-2">
          {/* Buttons visible on desktop */}
          <div className="hidden md:flex space-x-2">
            <Button variant="outline">
              <ShareIcon /> Share
            </Button>
            <CodeGeneratorButton datastore={props.datastore} />
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            {/* <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 mt-8">*/}
            {/* Mobile select menu */}
            {/*<div className="mb-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {value
                            ? options.find((option) => option.value === value)
                                ?.label
                            : 'Select option...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search options..." />
                          <CommandList>
                            <CommandEmpty>No option found.</CommandEmpty>
                            <CommandGroup>
                              {options.map((option) => (
                                <CommandItem
                                  key={option.value}
                                  value={option.value}
                                  onSelect={(currentValue) => {
                                    setValue(
                                      currentValue === value ? '' : currentValue
                                    );
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      value === option.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  {option.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>*/}

            {/* Mobile buttons */}
            {/*<Button variant="outline" className="w-full justify-start">
                    Dashboard
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Settings
                  </Button>
                  <Button className="w-full justify-start">Login</Button>
                </div>
              </SheetContent>
            </Sheet> */}
          </div>
        </div>
      </div>
    </div>
  );
}
