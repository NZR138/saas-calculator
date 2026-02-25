import "server-only";

import nodemailer from "nodemailer";

type EmailPayload = {
  email: string;
  question1: string;
  question2: string;
  question3: string;
  writtenRequestId: string;
  amount: number;
  paidAtIso: string;
};

export async function sendWrittenBreakdownAdminEmail(payload: EmailPayload) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const adminEmail = process.env.ADMIN_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !adminEmail || !fromEmail) {
    console.warn("Email not sent: missing SMTP, ADMIN_EMAIL or RESEND_FROM_EMAIL configuration");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const paidAt = new Date(payload.paidAtIso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const text = [
    "New Written Breakdown payment confirmed",
    "",
    `Request ID: ${payload.writtenRequestId}`,
    `Customer Email: ${payload.email}`,
    `Payment Amount: £${payload.amount.toFixed(2)}`,
    `Paid At: ${paidAt}`,
    "",
    "Questions:",
    `1) ${payload.question1}`,
    `2) ${payload.question2}`,
    `3) ${payload.question3}`,
  ].join("\n");

  await transporter.sendMail({
    from: fromEmail,
    to: adminEmail,
    subject: `Written Breakdown Paid: ${payload.writtenRequestId}`,
    text,
  });
}
