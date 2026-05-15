import { useEffect, useState } from "react";

/**
 * useModifierKeyHeld returns whether the Ctrl or Cmd (meta) key is currently
 * held down. Used to show the "click to jump" affordance in the relationship
 * editors. Resets on window blur so a key still held while switching apps does
 * not leave the affordance stuck on.
 */
export function useModifierKeyHeld(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setHeld(false);
      }
    };
    const onBlur = () => setHeld(false);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return held;
}
