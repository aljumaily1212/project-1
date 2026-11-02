import { z } from "zod";

const phone = z.string().regex(/^07\d{9}$/, "validation.phone");
const password = z.string().min(6, "validation.password");

export const loginSchema = z.object({ phone, password });
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "validation.name"),
});
export type RegisterForm = z.infer<typeof registerSchema>;

export const walkInSchema = z.object({
  name: z.string().trim().min(2, "validation.name"),
  phone,
  doctor_id: z.string(),
  emergency: z.boolean(),
});
export type WalkInForm = z.infer<typeof walkInSchema>;
