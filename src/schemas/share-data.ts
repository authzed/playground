import z from "zod";

export const zSharedDataV2 = z.object({
  version: z.literal("2"),
  schema: z.string(),
  relationships_yaml: z.string().optional(),
  validation_yaml: z.string().optional(),
  assertions_yaml: z.string().optional(),
  check_watches: z
    .array(
      z.object({
        object: z.string(),
        action: z.string(),
        subject: z.string(),
        context: z.string().optional(),
      }),
    )
    .optional(),
});
export type SharedDataV2 = z.infer<typeof zSharedDataV2>;
