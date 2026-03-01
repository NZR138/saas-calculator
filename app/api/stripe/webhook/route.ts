import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { assertCriticalEnvInDevelopment } from "@/app/lib/envValidation";

export const runtime = "nodejs";

assertCriticalEnvInDevelopment();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-01-28.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim();
const ADMIN_EMAIL_RECIPIENT = process.env.ADMIN_EMAIL?.trim();

type SnapshotInputs = {
  productPrice: number | null;
  unitsSold: number | null;
  productCostPerUnit: number | null;
  shippingCostPerUnit: number | null;
  paymentProcessingPercent: number | null;
  refundRatePercent: number | null;
  adSpend: number | null;
  fixedCosts: number | null;
  vatIncluded: boolean | null;
  targetMonthlyProfit: number | null;
};

type SnapshotResults = {
  revenue: number | null;
  netRevenue: number | null;
  totalCosts: number | null;
  vatAmount: number | null;
  netProfit: number | null;
  marginPercent: number | null;
  roas: number | null;
  contributionMarginPerUnit: number | null;
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
  requiredUnitsForTargetProfit: number | null;
  requiredRevenueForTargetProfit: number | null;
  negativeContributionMargin: boolean | null;
};

type CanonicalSnapshot = {
  kind: "ecommerce";
  inputs: SnapshotInputs;
  results: SnapshotResults;
};

type PersistedRequest = {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  question_1: string | null;
  question_2: string | null;
  question_3: string | null;
  calculator_snapshot?: Record<string, unknown> | null;
  calculator_results?: Record<string, unknown> | null;
};

type SendAdminEmailPayload = PersistedRequest & {
  fallbackEmail?: string | null;
  metadata?: Stripe.Metadata | null;
  snapshotSource?: "db" | "metadata";
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toNullableBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
    if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  }
  return null;
}

function parseMetadataSnapshot(metadata?: Stripe.Metadata | null): CanonicalSnapshot | null {
  if (!metadata || metadata.snapshot_kind !== "ecommerce") {
    return null;
  }

  return {
    kind: "ecommerce",
    inputs: {
      productPrice: toNullableNumber(metadata.s_i_pp),
      unitsSold: toNullableNumber(metadata.s_i_us),
      productCostPerUnit: toNullableNumber(metadata.s_i_pcpu),
      shippingCostPerUnit: toNullableNumber(metadata.s_i_scpu),
      paymentProcessingPercent: toNullableNumber(metadata.s_i_ppp),
      refundRatePercent: toNullableNumber(metadata.s_i_rrp),
      adSpend: toNullableNumber(metadata.s_i_ads),
      fixedCosts: toNullableNumber(metadata.s_i_fix),
      vatIncluded: toNullableBoolean(metadata.s_i_vat),
      targetMonthlyProfit: toNullableNumber(metadata.s_i_tmp),
    },
    results: {
      revenue: toNullableNumber(metadata.s_r_rev),
      netRevenue: toNullableNumber(metadata.s_r_nrev),
      totalCosts: toNullableNumber(metadata.s_r_tcs),
      vatAmount: toNullableNumber(metadata.s_r_vat),
      netProfit: toNullableNumber(metadata.s_r_np),
      marginPercent: toNullableNumber(metadata.s_r_mp),
      roas: toNullableNumber(metadata.s_r_roas),
      contributionMarginPerUnit: toNullableNumber(metadata.s_r_cm),
      breakEvenUnits: toNullableNumber(metadata.s_r_beu),
      breakEvenRevenue: toNullableNumber(metadata.s_r_ber),
      requiredUnitsForTargetProfit: toNullableNumber(metadata.s_r_rut),
      requiredRevenueForTargetProfit: toNullableNumber(metadata.s_r_rrt),
      negativeContributionMargin: toNullableBoolean(metadata.s_r_ncm),
    },
  };
}

function buildCanonicalSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
  results: Record<string, unknown> | null | undefined,
  metadata?: Stripe.Metadata | null
): CanonicalSnapshot {
  const metadataSnapshot = parseMetadataSnapshot(metadata);

  const snapshotRecord = asRecord(snapshot);
  const nestedInputs = asRecord(snapshotRecord?.inputs);
  const nestedResults = asRecord(snapshotRecord?.results);
  const resultsRecord = asRecord(results);

  const legacyInputs = snapshotRecord;

  const canonicalSnapshot: CanonicalSnapshot = {
    kind: "ecommerce",
    inputs: {
      productPrice:
        toNullableNumber(nestedInputs?.productPrice) ??
        toNullableNumber(legacyInputs?.productPrice) ??
        metadataSnapshot?.inputs.productPrice ??
        null,
      unitsSold:
        toNullableNumber(nestedInputs?.unitsSold) ??
        toNullableNumber(legacyInputs?.unitsSold) ??
        metadataSnapshot?.inputs.unitsSold ??
        null,
      productCostPerUnit:
        toNullableNumber(nestedInputs?.productCostPerUnit) ??
        toNullableNumber(legacyInputs?.productCostPerUnit) ??
        toNullableNumber(legacyInputs?.productCost) ??
        metadataSnapshot?.inputs.productCostPerUnit ??
        null,
      shippingCostPerUnit:
        toNullableNumber(nestedInputs?.shippingCostPerUnit) ??
        toNullableNumber(legacyInputs?.shippingCostPerUnit) ??
        toNullableNumber(legacyInputs?.shippingCost) ??
        metadataSnapshot?.inputs.shippingCostPerUnit ??
        null,
      paymentProcessingPercent:
        toNullableNumber(nestedInputs?.paymentProcessingPercent) ??
        toNullableNumber(legacyInputs?.paymentProcessingPercent) ??
        metadataSnapshot?.inputs.paymentProcessingPercent ??
        null,
      refundRatePercent:
        toNullableNumber(nestedInputs?.refundRatePercent) ??
        toNullableNumber(legacyInputs?.refundRatePercent) ??
        toNullableNumber(legacyInputs?.refundRate) ??
        metadataSnapshot?.inputs.refundRatePercent ??
        null,
      adSpend:
        toNullableNumber(nestedInputs?.adSpend) ??
        toNullableNumber(legacyInputs?.adSpend) ??
        metadataSnapshot?.inputs.adSpend ??
        null,
      fixedCosts:
        toNullableNumber(nestedInputs?.fixedCosts) ??
        toNullableNumber(legacyInputs?.fixedCosts) ??
        toNullableNumber(legacyInputs?.adSpend) ??
        metadataSnapshot?.inputs.fixedCosts ??
        null,
      vatIncluded:
        toNullableBoolean(nestedInputs?.vatIncluded) ??
        toNullableBoolean(legacyInputs?.vatIncluded) ??
        metadataSnapshot?.inputs.vatIncluded ??
        null,
      targetMonthlyProfit:
        toNullableNumber(nestedInputs?.targetMonthlyProfit) ??
        toNullableNumber(legacyInputs?.targetMonthlyProfit) ??
        metadataSnapshot?.inputs.targetMonthlyProfit ??
        null,
    },
    results: {
      revenue:
        toNullableNumber(nestedResults?.revenue) ??
        toNullableNumber(resultsRecord?.revenue) ??
        metadataSnapshot?.results.revenue ??
        null,
      netRevenue:
        toNullableNumber(nestedResults?.netRevenue) ??
        toNullableNumber(resultsRecord?.netRevenue) ??
        metadataSnapshot?.results.netRevenue ??
        null,
      totalCosts:
        toNullableNumber(nestedResults?.totalCosts) ??
        toNullableNumber(resultsRecord?.totalCosts) ??
        metadataSnapshot?.results.totalCosts ??
        null,
      vatAmount:
        toNullableNumber(nestedResults?.vatAmount) ??
        toNullableNumber(resultsRecord?.vatAmount) ??
        metadataSnapshot?.results.vatAmount ??
        null,
      netProfit:
        toNullableNumber(nestedResults?.netProfit) ??
        toNullableNumber(resultsRecord?.netProfit) ??
        toNullableNumber(resultsRecord?.profit) ??
        metadataSnapshot?.results.netProfit ??
        null,
      marginPercent:
        toNullableNumber(nestedResults?.marginPercent) ??
        toNullableNumber(resultsRecord?.marginPercent) ??
        toNullableNumber(resultsRecord?.margin) ??
        metadataSnapshot?.results.marginPercent ??
        null,
      roas:
        toNullableNumber(nestedResults?.roas) ??
        toNullableNumber(resultsRecord?.roas) ??
        metadataSnapshot?.results.roas ??
        null,
      contributionMarginPerUnit:
        toNullableNumber(nestedResults?.contributionMarginPerUnit) ??
        toNullableNumber(resultsRecord?.contributionMarginPerUnit) ??
        metadataSnapshot?.results.contributionMarginPerUnit ??
        null,
      breakEvenUnits:
        toNullableNumber(nestedResults?.breakEvenUnits) ??
        toNullableNumber(resultsRecord?.breakEvenUnits) ??
        metadataSnapshot?.results.breakEvenUnits ??
        null,
      breakEvenRevenue:
        toNullableNumber(nestedResults?.breakEvenRevenue) ??
        toNullableNumber(resultsRecord?.breakEvenRevenue) ??
        metadataSnapshot?.results.breakEvenRevenue ??
        null,
      requiredUnitsForTargetProfit:
        toNullableNumber(nestedResults?.requiredUnitsForTargetProfit) ??
        toNullableNumber(resultsRecord?.requiredUnitsForTargetProfit) ??
        metadataSnapshot?.results.requiredUnitsForTargetProfit ??
        null,
      requiredRevenueForTargetProfit:
        toNullableNumber(nestedResults?.requiredRevenueForTargetProfit) ??
        toNullableNumber(resultsRecord?.requiredRevenueForTargetProfit) ??
        metadataSnapshot?.results.requiredRevenueForTargetProfit ??
        null,
      negativeContributionMargin:
        toNullableBoolean(nestedResults?.negativeContributionMargin) ??
        toNullableBoolean(resultsRecord?.negativeContributionMargin) ??
        toNullableBoolean(resultsRecord?.hasNegativeContributionMargin) ??
        metadataSnapshot?.results.negativeContributionMargin ??
        null,
    },
  };

  return canonicalSnapshot;
}

function safeQuestion(value: string | null | undefined) {
  const trimmedValue = (value ?? "").trim();
  return trimmedValue.length > 0 ? trimmedValue : "—";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return `£${value.toFixed(2)}`;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(2)}%`;
}

function formatUnits(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(2);
}

function formatBoolean(value: boolean | null) {
  if (value === null) return "—";
  return value ? "Yes" : "No";
}

function formatRoas(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(2)}x`;
}

function buildTableRows(rows: Array<{ label: string; value: string }>) {
  return rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${label}</td>
          <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;" align="right">${value}</td>
        </tr>
      `
    )
    .join("");
}

async function sendAdminEmail(request: SendAdminEmailPayload) {
  if (!ADMIN_EMAIL_RECIPIENT) {
    console.error("Missing ADMIN_EMAIL");
    return;
  }

  if (!FROM_EMAIL) {
    console.error("Missing RESEND_FROM_EMAIL");
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("[stripe-webhook] missing RESEND_API_KEY");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let identityEmail = request.guest_email ?? request.fallbackEmail ?? null;

  if (!identityEmail && request.user_id) {
    const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
    identityEmail = userData.user?.email ?? null;
  }

  const snapshot = buildCanonicalSnapshot(
    request.calculator_snapshot,
    request.calculator_results,
    request.metadata
  );

  const targetProfitEnabled =
    snapshot.inputs.targetMonthlyProfit !== null && snapshot.inputs.targetMonthlyProfit > 0;

  const inputRows = buildTableRows([
    { label: "Product Price", value: formatMoney(snapshot.inputs.productPrice) },
    { label: "Units Sold", value: formatUnits(snapshot.inputs.unitsSold) },
    { label: "Product Cost / Unit", value: formatMoney(snapshot.inputs.productCostPerUnit) },
    { label: "Shipping Cost / Unit", value: formatMoney(snapshot.inputs.shippingCostPerUnit) },
    {
      label: "Payment Processing %",
      value: formatPercent(snapshot.inputs.paymentProcessingPercent),
    },
    { label: "Refund Rate %", value: formatPercent(snapshot.inputs.refundRatePercent) },
    { label: "Fixed Costs", value: formatMoney(snapshot.inputs.fixedCosts) },
    { label: "VAT Included", value: formatBoolean(snapshot.inputs.vatIncluded) },
    ...(targetProfitEnabled
      ? [
          {
            label: "Target Monthly Profit",
            value: formatMoney(snapshot.inputs.targetMonthlyProfit),
          },
        ]
      : []),
  ]);

  const resultRows = buildTableRows([
    { label: "Revenue", value: formatMoney(snapshot.results.revenue) },
    { label: "Net Revenue", value: formatMoney(snapshot.results.netRevenue) },
    { label: "Total Costs", value: formatMoney(snapshot.results.totalCosts) },
    { label: "VAT", value: formatMoney(snapshot.results.vatAmount) },
    { label: "Net Profit", value: formatMoney(snapshot.results.netProfit) },
    { label: "Margin %", value: formatPercent(snapshot.results.marginPercent) },
    { label: "ROAS", value: formatRoas(snapshot.results.roas) },
    {
      label: "Contribution Margin / Unit",
      value: formatMoney(snapshot.results.contributionMarginPerUnit),
    },
    { label: "Break-even Units", value: formatUnits(snapshot.results.breakEvenUnits) },
    { label: "Break-even Revenue", value: formatMoney(snapshot.results.breakEvenRevenue) },
    ...(targetProfitEnabled
      ? [
          {
            label: "Required Units (Target Profit)",
            value: formatUnits(snapshot.results.requiredUnitsForTargetProfit),
          },
          {
            label: "Required Revenue (Target Profit)",
            value: formatMoney(snapshot.results.requiredRevenueForTargetProfit),
          },
        ]
      : []),
    ...(snapshot.results.negativeContributionMargin === true
      ? [
          {
            label: "Negative Contribution Margin",
            value: "Yes",
          },
        ]
      : []),
  ]);

  const emailFormatted = (identityEmail ?? "").trim() || "—";
  const metadata = request.metadata ?? null;
  const question1Formatted =
    safeQuestion(request.question_1) !== "—" ? safeQuestion(request.question_1) : safeQuestion(metadata?.q1);
  const question2Formatted =
    safeQuestion(request.question_2) !== "—" ? safeQuestion(request.question_2) : safeQuestion(metadata?.q2);
  const question3Formatted =
    safeQuestion(request.question_3) !== "—" ? safeQuestion(request.question_3) : safeQuestion(metadata?.q3);
  const renderedAt = new Date().toISOString();
  const escapedRequestId = escapeHtml(request.id);
  const escapedEmail = escapeHtml(emailFormatted);
  const escapedQuestion1 = escapeHtml(question1Formatted);
  const escapedQuestion2 = escapeHtml(question2Formatted);
  const escapedQuestion3 = escapeHtml(question3Formatted);

  const adminSendResult = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL_RECIPIENT,
    replyTo: ADMIN_EMAIL_RECIPIENT,
    subject: "New Paid Written Breakdown",
    html: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f7fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
                  <div style="font-size:20px;line-height:28px;font-weight:700;color:#111827;">New Paid Written Breakdown</div>
                  <div style="margin-top:10px;display:inline-block;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;">PAID</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td style="font-size:12px;color:#6b7280;padding-bottom:6px;">Request ID</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;font-weight:600;padding-bottom:16px;word-break:break-all;">${escapedRequestId}</td>
                    </tr>
                    <tr>
                      <td style="font-size:12px;color:#6b7280;padding-bottom:6px;">User Email</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;font-weight:600;padding-bottom:4px;">${escapedEmail}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td style="font-size:14px;color:#111827;font-weight:700;padding-bottom:10px;">Questions</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;">1) ${escapedQuestion1}</td>
                    </tr>
                    <tr><td style="height:8px;"></td></tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;">2) ${escapedQuestion2}</td>
                    </tr>
                    <tr><td style="height:8px;"></td></tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;">3) ${escapedQuestion3}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td style="font-size:14px;color:#111827;font-weight:700;padding-bottom:10px;">Data Overview</td>
                    </tr>
                    <tr>
                      <td>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                          <tr>
                            <td width="50%" valign="top" style="padding-right:8px;">
                              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                  <td style="font-size:13px;color:#111827;font-weight:700;padding-bottom:8px;">Input Data</td>
                                </tr>
                                <tr>
                                  <td>
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                                      <tr>
                                        <td style="padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;">Input</td>
                                        <td style="padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;" align="right">Value</td>
                                      </tr>
                                      ${inputRows}
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                            <td width="50%" valign="top" style="padding-left:8px;">
                              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                  <td style="font-size:13px;color:#111827;font-weight:700;padding-bottom:8px;">Results</td>
                                </tr>
                                <tr>
                                  <td>
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                                      <tr>
                                        <td style="padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;">Metric</td>
                                        <td style="padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;" align="right">Value</td>
                                      </tr>
                                      ${resultRows}
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;font-size:12px;line-height:18px;color:#6b7280;">
                  This tool does not constitute financial advice.<br/>
                  Generated at: ${renderedAt}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    text: [
      "New Paid Written Breakdown",
      "",
      `request_id: ${request.id}`,
      `email: ${emailFormatted}`,
      `question_1: ${question1Formatted}`,
      `question_2: ${question2Formatted}`,
      `question_3: ${question3Formatted}`,
      `revenue: ${formatMoney(snapshot.results.revenue)}`,
      `netRevenue: ${formatMoney(snapshot.results.netRevenue)}`,
      `totalCosts: ${formatMoney(snapshot.results.totalCosts)}`,
      `vatAmount: ${formatMoney(snapshot.results.vatAmount)}`,
      `netProfit: ${formatMoney(snapshot.results.netProfit)}`,
      `marginPercent: ${formatPercent(snapshot.results.marginPercent)}`,
      `roas: ${formatRoas(snapshot.results.roas)}`,
      `contributionMarginPerUnit: ${formatMoney(snapshot.results.contributionMarginPerUnit)}`,
      `breakEvenUnits: ${formatUnits(snapshot.results.breakEvenUnits)}`,
      `breakEvenRevenue: ${formatMoney(snapshot.results.breakEvenRevenue)}`,
      `requiredUnitsForTargetProfit: ${
        targetProfitEnabled
          ? formatUnits(snapshot.results.requiredUnitsForTargetProfit)
          : "—"
      }`,
      `requiredRevenueForTargetProfit: ${
        targetProfitEnabled
          ? formatMoney(snapshot.results.requiredRevenueForTargetProfit)
          : "—"
      }`,
      `negativeContributionMargin: ${formatBoolean(snapshot.results.negativeContributionMargin)}`,
      "Paid: YES",
      `Generated at: ${renderedAt}`,
    ].join("\n"),
  });

  if (adminSendResult.error) {
    const resendError = adminSendResult.error as {
      statusCode?: number;
      message?: string;
    } | null;

    console.error("[stripe-webhook] resend error", {
      from: FROM_EMAIL,
      to: ADMIN_EMAIL_RECIPIENT,
      statusCode: resendError?.statusCode ?? null,
      message: resendError?.message ?? null,
      error: resendError,
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("❌ Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const writtenRequestId =
          session.metadata?.written_request_id ??
          (typeof session.client_reference_id === "string"
            ? session.client_reference_id
            : null);
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        if (!writtenRequestId) {
          console.error("[WEBHOOK] missing written_request_id; skipping", {
            stripeSessionId: session.id,
            paymentIntentId,
          });
          break;
        }

        let shouldSendEmail = false;
        let updateErrorMessage: string | null = null;
        let updatedRequest: PersistedRequest | null = null;

        const updateResult = await supabase
          .from("written_requests")
          .update({
            status: "paid",
            payment_intent_id: paymentIntentId,
          })
          .eq("id", writtenRequestId)
          .eq("status", "awaiting_payment")
          .select("id, user_id, guest_email, question_1, question_2, question_3, calculator_snapshot, calculator_results")
          .maybeSingle();

        if (updateResult.error) {
          updateErrorMessage = updateResult.error.message;
          shouldSendEmail = true;
          console.error("[WEBHOOK] DB UPDATE ERROR", {
            writtenRequestId,
            paymentIntentId,
            error: updateResult.error.message,
          });
        } else if (updateResult.data) {
          updatedRequest = updateResult.data as PersistedRequest;
          shouldSendEmail = true;
        }

        if (!updatedRequest) {
          const { data: existingRequest } = await supabase
            .from("written_requests")
            .select("id, user_id, guest_email, question_1, question_2, question_3, calculator_snapshot, calculator_results")
            .eq("id", writtenRequestId)
            .maybeSingle();

          if (existingRequest) {
            updatedRequest = existingRequest as PersistedRequest;
          }
        }

        if (!shouldSendEmail) {
          break;
        }

        const fallbackRequest: PersistedRequest = {
          id: writtenRequestId,
          user_id:
            typeof session.metadata?.user_id === "string" && session.metadata.user_id !== "null"
              ? session.metadata.user_id
              : null,
          guest_email: null,
          question_1: null,
          question_2: null,
          question_3: null,
          calculator_snapshot: null,
          calculator_results: null,
        };

        const dbSnapshot = updatedRequest?.calculator_snapshot ?? null;
        const dbResults = updatedRequest?.calculator_results ?? null;

        const hasDbSnapshot =
          Boolean(dbSnapshot && typeof dbSnapshot === "object") ||
          Boolean(dbResults && typeof dbResults === "object");

        await sendAdminEmail({
          ...(updatedRequest ?? fallbackRequest),
          calculator_snapshot: hasDbSnapshot ? dbSnapshot : null,
          calculator_results: hasDbSnapshot ? dbResults : null,
          fallbackEmail:
            updatedRequest?.guest_email ??
            session.customer_details?.email ??
            (typeof session.customer_email === "string" ? session.customer_email : null),
          metadata: session.metadata ?? null,
          snapshotSource: hasDbSnapshot ? "db" : "metadata",
        });

        if (updateErrorMessage) {
          console.error("[WEBHOOK] Email sent with metadata fallback due to DB error", {
            writtenRequestId,
            error: updateErrorMessage,
          });
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing failed:", err);
    return NextResponse.json({ received: true });
  }
}
