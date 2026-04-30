import { toast } from "sonner";
import AppConfig from "@/services/configservice";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { CircleX } from "lucide-react";
import { redirect } from "@tanstack/react-router";


export const shareLoader = async (shareReference: string) => {
  const apiEndpoint = AppConfig().shareApiEndpoint;
  if (!apiEndpoint) {
    return;
  }

  const response = await fetch(
    `${apiEndpoint}/api/lookupshare?shareid=${encodeURIComponent(shareReference)}`,
  );

    if (!response.ok) {
      if (response.status === 404) {
        toast.error("Shared playground not found", {
          description: "The shared playground specified does not exist",
          action: {
            label: "Okay",
            // TODO: this may not work as desired
            onClick: () => { throw redirect({ to: "/" }) },
          },
        });
        return;
      }

      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      toast.error("Error loading shared playground", {
        description: errorData.error || "Failed to load shared playground",
        action: {
          label: "Okay",
          onClick: () => { throw redirect({ to: "/" }) },
        },
      });
      return;
    }

    return await response.json();
}

export const ErrorComponent = () => (
  <Alert variant="destructive">
  <CircleX />
  <AlertTitle>Could not load shared playground</AlertTitle>
  </Alert>
)
