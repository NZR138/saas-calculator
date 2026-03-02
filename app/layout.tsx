import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import ConditionalHeader from './components/ConditionalHeader';
import ConditionalFooter from './components/ConditionalFooter';
import { assertCriticalEnvInDevelopment } from './lib/envValidation';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  'https://ukprofit.co.uk';

const DEFAULT_TITLE =
  'UK Profit Calculator for Ecommerce — real profit after VAT & ads';

const DEFAULT_DESCRIPTION =
  'Calculate real UK ecommerce profit after 20% VAT, ad spend and fixed costs. Built for Shopify, Amazon and UK small businesses. No spreadsheets, no guesswork.';

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | UK Profit Calculator',
  },
  description: DEFAULT_DESCRIPTION,
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    type: 'website',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
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