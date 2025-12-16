import { z } from "zod";

export const zEntityId = z.string().min(1);

export const zBaseEntity = z.object({
  id: zEntityId,
  createdAt: z.number(),
  updatedAt: z.number(),
  flags: z.record(z.string(), z.boolean()).optional(),
  tags: z.array(z.string()).optional(),
});
