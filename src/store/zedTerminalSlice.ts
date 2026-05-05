import { CommandResult, useZedService } from '@/spicedb-common/services/zedservice';
import { createListenerMiddleware, createSlice, isAnyOf } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

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

type LoadingState = {
  status: "loading";
  progress: number;
}

type NonLoadingState = "standby" | "initializing" | "unsupported" | "loaderror" | "ready"

export type ZedServiceState =
  | {
      status: NonLoadingState;
    }
  | LoadingState;

export type ZedTerminalState = {
  terminalSections: TerminalSection[];
  commandHistory: string[];
  serviceState: ZedServiceState;
}

const initialState: ZedTerminalState = {
  terminalSections: [],
  commandHistory: [],
  serviceState: { status: "standby" }
}

type UpdateOutputPayload = {
  command: string,
  result: CommandResult,
}

export const zedTerminalSlice = createSlice({
  name: "zedTerminal",
  initialState,
  reducers: {
    clearOutput: (state) => { state.terminalSections = [] },
    appendResult: (state, action: PayloadAction<CommandResult>) => {
      state.terminalSections.push({
        output: (action.payload.output || action.payload.error || "").trim(),
      })
    },
    appendCommand: (state, action: PayloadAction<string>) => {
      state.commandHistory.push(action.payload)
    },
    updateLoadingState: (state, action: PayloadAction<number>) => {
      state.serviceState = {
        status: "loading",
        progress: action.payload
      }
    },
    updateServiceState: (state, action: PayloadAction<NonLoadingState>) => {
      state.serviceState = { status: action.payload }
    }
    
    /*
    updateOutput: (state, action: PayloadAction<UpdateOutputPayload>) => {
      state.commandHistory.push(action.payload.command)

      // TODO: this might need to go up into the thunk?
      if (action.payload.command === "clear") {
        state.terminalSections = []
        return
      }
      if (!action.payload.command.startsWith("zed")) {
        state.terminalSections.push({
          output: `Only 'zed' commands (and 'clear') are supported`,
        })
        return
      }

    }
    */
  }
})

export const { clearOutput, appendResult, appendCommand } = zedTerminalSlice.actions
export default zedTerminalSlice.reducer
