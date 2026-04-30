/**
 * TerminalRenderer is the interface implemented by terminal-rendering strategies.
 * The HTML implementation lives in HtmlTerminalRenderer; a future xterm.js
 * implementation can drop in without changing consumers.
 */
export interface TerminalRendererInterface {
  writeOutput: (text: string) => void;
  setInputCallback: (cb: (line: string) => void) => void;
  clear: () => void;
  focus: () => void;
  dispose: () => void;
}
