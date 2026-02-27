import "server-only";

const CRITICAL_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

let hasValidated = false;

export function assertCriticalEnvInDevelopment() {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (hasValidated) {
    return;
  }

  const missingVars = CRITICAL_ENV_VARS.filter((envKey) => {
    const value = process.env[envKey];
    return !value || value.trim().length === 0;
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing critical env variables in development: ${missingVars.join(", ")}`
    );
  }

  hasValidated = true;
}
