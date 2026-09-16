import { z } from "zod";

export const capsulePolicySchema = z.object({
  checkInInterval: z.number().int().positive(),
  warningLeadTime: z.number().int().positive(),
  gracePeriod: z.number().int().positive(),
});

export type CapsulePolicyInput = z.infer<typeof capsulePolicySchema>;

export const emailSchema = z.string().email();

export const passwordSchema = z.string().min(1);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;