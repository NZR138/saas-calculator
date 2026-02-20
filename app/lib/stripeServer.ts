import "server-only";

import Stripe from "stripe";

export function getStripeServerClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const normalizedKey = stripeSecretKey?.trim();

  if (!normalizedKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
  });

  return stripe;
}

export function getAppBaseUrl(fallbackOrigin: string) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    fallbackOrigin
  );
}
