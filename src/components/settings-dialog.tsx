import { Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useState } from "react";

import { useSettings } from "@/components/SettingsProvider";
import { useTheme } from "@/components/ThemeProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { minimapEnabled, setMinimapEnabled } = useSettings();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = () => {
    try {
      window.localStorage.clear();
    } catch {
      // ignore — reload still gives a clean session
    }
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Preferences are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-2">
          <Label>Appearance</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={theme}
            onValueChange={(value) => {
              if (value === "light" || value === "dark" || value === "system") {
                setTheme(value);
              }
            }}
            aria-label="Theme"
          >
            <ToggleGroupItem value="light" aria-label="Light theme">
              <Sun className="size-4" />
              Light
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark theme">
              <Moon className="size-4" />
              Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="System theme">
              <Monitor className="size-4" />
              System
            </ToggleGroupItem>
          </ToggleGroup>
        </section>

        <section className="flex flex-col gap-2">
          <Label>Editor</Label>
          <Label htmlFor="setting-minimap" className="font-normal">
            <Checkbox
              id="setting-minimap"
              checked={minimapEnabled}
              onCheckedChange={(checked) => setMinimapEnabled(checked === true)}
            />
            Show minimap in editors
          </Label>
        </section>

        <section className="flex flex-col gap-2">
          <Label>Reset</Label>
          <p className="text-sm text-muted-foreground">
            Removes all locally stored playground data — schema, test relationships,
            settings, and recent examples. This cannot be undone.
          </p>
          <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="self-start">
                <Trash2 className="size-4" />
                Clear all data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all playground data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes all locally stored data including your schema, test
                  relationships, settings, and recent examples. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={handleClear}
                >
                  Clear and reload
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </DialogContent>
    </Dialog>
  );
}
