import './globals.css';
import Header from './components/Header';
import type { Metadata } from 'next';
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
<script
  defer
  data-domain="yourdomain.com"
  src="https://plausible.io/js/script.js"
/>
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}