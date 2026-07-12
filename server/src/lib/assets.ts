import { z } from "zod";

export const createAssetSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  serialNumber: z.string().min(1),
  acquisitionDate: z.coerce.date(),
  cost: z.number().nonnegative(),
  condition: z.string().min(1),
  location: z.string().min(1),
  isBookable: z.boolean().optional().default(false),
  photoUrl: z.string().optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
