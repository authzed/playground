import { useRef } from "react";

enum CheckerStatus {
  SLEEPING = 0,
  SCHEDULED = 1,
  REQUESTED = 2,
  RUNNING = 3,
}

interface CheckerState<T> {
  status: CheckerStatus;
  runIndex: number;
  argument: T | undefined;
}

/**
 * useDebouncedChecker is a hook for invoking a specific checker function after the given
 * rate of seconds, and automatically handling debouncing and rechecking.
 */
export function useDebouncedChecker<T>(
  rate: number,
  checker: (arg: T) => Promise<void>,
) {
  const state = useRef<CheckerState<T>>({
    status: CheckerStatus.SLEEPING,
    runIndex: -1,
    argument: undefined,
  });

  const runChecker = (existingIndex: number) => {
    const arg = state.current.argument;
    if (arg === undefined) {
      return;
    }

    const currentIndex = state.current.runIndex;
    if (currentIndex > existingIndex) {
      // Things are being changed rapidly. Wait until they are done.
      setTimeout(() => runChecker(currentIndex), rate);
      return;
    }

    (async () => {
      state.current = {
        status: CheckerStatus.RUNNING,
        runIndex: existingIndex,
        argument: arg,
      };
      await checker(arg);

      // If the run went stale, issue another call.
      const nextIndex = state.current.runIndex;
      if (nextIndex > existingIndex) {
        setTimeout(() => runChecker(nextIndex), rate);
        return;
      }

      state.current = {
        status: CheckerStatus.SLEEPING,
        runIndex: existingIndex,
        argument: undefined,
      };
    })();
  };

  // TODO: this is creating a new `run` on every render. Refactor so that the reference is stable,
  // or else use an off-the-shelf debounce.
  return {
    run: (arg: T) => {
      // To prevent it blocking the main thread.
      (async () => {
        if (state.current.status === CheckerStatus.SLEEPING) {
          const currentIndex = state.current.runIndex + 1;
          state.current = {
            status: CheckerStatus.SCHEDULED,
            runIndex: currentIndex,
            argument: arg,
          };

          // Kick off the timeout.
          setTimeout(() => runChecker(currentIndex), rate);
        } else {
          state.current = {
            ...state.current,
            runIndex: state.current.runIndex + 1,
            argument: arg,
          };
        }
      })();
    },
    isActive: () => {
      return state.current.status !== CheckerStatus.SLEEPING;
    },
  };
}
