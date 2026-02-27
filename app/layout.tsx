import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import ConditionalHeader from './components/ConditionalHeader';
import ConditionalFooter from './components/ConditionalFooter';
import { assertCriticalEnvInDevelopment } from './lib/envValidation';
declare global {
  interface Window {
    plausible?: (event: string, options?: Record<string, unknown>) => void;
  }
}
export const metadata: Metadata = {
  title: 'UK Profit Calculator — real profit after VAT, ads and costs',
  description:
    'UK Profit Calculator helps you calculate real monthly profit after VAT, advertising spend and fixed costs. No spreadsheets, no guesswork.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  assertCriticalEnvInDevelopment();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <ConditionalHeader />
        {children}
        <ConditionalFooter />
        <Script
          defer
          data-domain="yourdomain.com"
          src="https://plausible.io/js/script.js"
        />
      </body>
    </html>
  );
}