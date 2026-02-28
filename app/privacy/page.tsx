export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 text-gray-800">
        <h1 className="text-3xl font-semibold text-gray-900">🔐 PRIVACY POLICY</h1>
        <p className="text-sm">(UK GDPR Compliant – Sole Trader Version)</p>
        <p className="text-sm">Last updated: January 2026</p>

        <p>UK Profit Calculator respects your privacy and complies with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Data Controller</h2>
          <p>UK Profit Calculator operates as an independent sole trader business in the United Kingdom.</p>
          <p>For data protection enquiries:</p>
          <p>Email: admin@ukprofit.co.uk</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">2. What Data We Collect</h2>
          <p>We may collect:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email address (for account login)</li>
            <li>Account authentication data</li>
            <li>Calculator input data</li>
            <li>Purchase records (if applicable)</li>
            <li>Basic technical data (IP address, browser type)</li>
          </ul>
          <p>We do not collect special category (sensitive) data.</p>
          <p>Payment details are processed securely by Stripe and are not stored on our servers.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">3. Lawful Basis for Processing</h2>
          <p>We process personal data based on:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Performance of a contract (providing your account and tools)</li>
            <li>Legitimate interest (improving services)</li>
            <li>Legal obligation (where required)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">4. How We Use Data</h2>
          <p>We use data to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide calculator functionality</li>
            <li>Enable account access</li>
            <li>Process paid digital services</li>
            <li>Respond to user enquiries</li>
            <li>Improve website performance</li>
          </ul>
          <p>We do not sell personal data.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">5. Data Storage</h2>
          <p>Data may be stored securely using:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Supabase (database services)</li>
            <li>Stripe (payment processing)</li>
            <li>Secure hosting providers</li>
          </ul>
          <p>We use reasonable technical measures to protect data.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">6. Data Retention</h2>
          <p>Account data is retained while your account remains active.</p>
          <p>Paid transaction records are retained for accounting compliance.</p>
          <p>You may request deletion of your account at any time.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">7. Your Rights</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access your data</li>
            <li>Request correction</li>
            <li>Request deletion</li>
            <li>Restrict processing</li>
            <li>Object to processing</li>
          </ul>
          <p>To exercise your rights, contact:</p>
          <p>admin@ukprofit.co.uk</p>
          <p>We will respond within 30 days.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">8. Cookies</h2>
          <p>This website may use essential cookies for:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Login sessions</li>
            <li>Security</li>
            <li>Functionality</li>
          </ul>
          <p>You may disable cookies in your browser settings.</p>
        </section>
      </div>
    </main>
  );
}
