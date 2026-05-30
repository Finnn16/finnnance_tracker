import { z } from "zod";

const emailSchema = z.string().email("Invalid email format").toLowerCase();

const emailAllowlistSchema = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(z.array(emailSchema).min(1, "At least one allowed email is required"));

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  ALLOWED_EMAILS: emailAllowlistSchema,
  ADMIN_EMAIL: emailSchema,
  USER_EMAIL: emailSchema,
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).optional(),
  GEMINI_FALLBACK_MODELS: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const messages = parsedEnv.error.issues.map((issue) => {
    const path = issue.path.join(".") || "env";
    return `${path}: ${issue.message}`;
  });

  throw new Error(`Invalid environment variables:\n${messages.join("\n")}`);
}

export const env = {
  databaseUrl: parsedEnv.data.DATABASE_URL,
  allowedEmails: parsedEnv.data.ALLOWED_EMAILS,
  adminEmail: parsedEnv.data.ADMIN_EMAIL,
  userEmail: parsedEnv.data.USER_EMAIL,
  geminiApiKey: parsedEnv.data.GEMINI_API_KEY?.trim() || "",
  geminiModel: parsedEnv.data.GEMINI_MODEL || "gemini-3.5-flash",
  geminiFallbackModels:
    parsedEnv.data.GEMINI_FALLBACK_MODELS?.split(",")
      .map((model) => model.trim())
      .filter(Boolean) ?? ["gemini-2.5-flash"],
};
