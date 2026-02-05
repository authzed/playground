import { useState } from "react";

import { CommandResult, useZedService, ZedServiceState } from "./zedservice";

/**
 * ZedTerminalService is a service which exposes a virtual terminal for running
 * zed commands.
 */
export interface ZedTerminalService {
  /**
   * runCommand runs the given command against zed, adding it to the terminal's
   * history and output.
   * @param cmd The command to run, including the `zed` prefixed (if entered)
   * @param schema The schema against which to run the command.
   * @param relationshipsString The string containing the newline-delimited relationships.
   * @returns [the result of the command (if any), the updated number of history entries]
   */
  runCommand: (
    cmd: string,
    schema: string,
    relationshipsString: string,
  ) => [CommandResult | undefined, number];

  /**
   * commandHistory is the history of commands entered.
   */
  commandHistory: string[];

  /**
   * outputSections are the sections of the terminal output.
   */
  outputSections: TerminalSection[];

  /**
   * state is the state of the underlying zed service.
   */
  state: ZedServiceState;

  /**
   * start starts the underlying zed service if necessary.
   */
  start(): void;
}

/**
 * TerminalCommand is a command that was executed.
 */
export interface TerminalCommand {
  command: string;
}

/**
 * TerminalOutput is output written to the terminal.
 */
export interface TerminalOutput {
  output: string;
}

/**
 * TerminalSection represents a section of terminal output.
 */
export type TerminalSection = TerminalCommand | TerminalOutput;

/**
 * useZedTerminalService creates a new zed terminal service.
 * @returns
 */
export function useZedTerminalService(): ZedTerminalService {
  const zedService = useZedService();

  const [terminalSections, setTerminalSections] = useState<TerminalSection[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  return {
    runCommand: (cmd, schema, relationshipsString) => {
      const cloned = Array.from(commandHistory);
      cloned.push(cmd);
      setCommandHistory(cloned);

      const updatedSections = Array.from(terminalSections);
      updatedSections.push({ command: cmd });

      if (cmd === "clear") {
        setTerminalSections([]);
        return [undefined, cloned.length];
      }

      if (!cmd.startsWith("zed")) {
        updatedSections.push({
          output: `Only 'zed' commands (and 'clear') are supported`,
        });
        setTerminalSections(updatedSections);
        return [undefined, cloned.length];
      }

      const args = cmd.substring("zed ".length).split(" ");
      const result = zedService.runCommand(schema, relationshipsString, args);
      updatedSections.push({
        output: (result.output || result.error || "").trim(),
      });
      setTerminalSections(updatedSections);
      return [result, cloned.length];
    },
    commandHistory: commandHistory,
    outputSections: terminalSections,
    state: zedService.state,
    start: () => {
      zedService.start();
    },
  };
}
