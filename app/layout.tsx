import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import ConditionalHeader from './components/ConditionalHeader';
import ConditionalFooter from './components/ConditionalFooter';
import { assertCriticalEnvInDevelopment } from './lib/envValidation';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'UK Profit Calculator',
  url: 'https://ukprofit.co.uk',
  logo: 'https://ukprofit.co.uk/logo.png',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'admin@ukprofit.co.uk',
  },
};

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'UK Profit Calculator',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://ukprofit.co.uk',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'GBP',
  },
};

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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
      </head>
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