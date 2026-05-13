import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Neuvra AI",
  description: "Privacy Policy for Neuvra AI",
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-wrap">
        <Link href="/" className="legal-back">← Back to Neuvra</Link>

        <h1>Privacy Policy</h1>
        <p className="legal-date">Last updated: May 12, 2025</p>

        <p>
          Neuvra AI ("we", "us", "our") is committed to protecting your privacy.
          This policy explains what data we collect, how we use it, and your
          rights.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>Account information</h3>
        <p>
          When you create an account, we collect your email address and, if you
          sign in with Google, your name and profile picture.
        </p>

        <h3>Content you upload</h3>
        <p>
          Files, PDFs, notes, and text you submit to Neuvra for processing. This
          content is used solely to provide the service (summarization, analysis,
          flashcard generation).
        </p>

        <h3>Usage data</h3>
        <p>
          We collect data on how you use the platform — features accessed, AI
          queries made, and session information — to improve the product and
          enforce usage limits.
        </p>

        <h3>Payment information</h3>
        <p>
          We do not store payment card details. All payment processing is handled
          by <strong>Paddle</strong>, our Merchant of Record. Paddle's privacy
          policy governs payment data.
        </p>

        <h2>2. How We Use Your Data</h2>
        <ul>
          <li>To provide and improve the Neuvra service</li>
          <li>To process AI requests and generate study materials</li>
          <li>To manage your subscription and billing</li>
          <li>To send important account notifications</li>
          <li>To enforce our Terms of Service and usage limits</li>
        </ul>
        <p>
          We do not sell your personal data to third parties. We do not use your
          uploaded content to train AI models.
        </p>

        <h2>3. Data Storage</h2>
        <p>
          Your data is stored securely using <strong>Supabase</strong>, a
          cloud database provider. Data is stored in servers located in the
          United States. We implement industry-standard security measures
          including encryption at rest and in transit.
        </p>

        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — database and authentication
          </li>
          <li>
            <strong>Anthropic</strong> — AI model provider (your content is sent
            to Anthropic's API to generate responses)
          </li>
          <li>
            <strong>Paddle</strong> — payment processing and subscription
            management
          </li>
          <li>
            <strong>Google</strong> — optional OAuth sign-in
          </li>
        </ul>

        <h2>5. Data Retention</h2>
        <p>
          We retain your account data as long as your account is active. You can
          request deletion of your account and associated data at any time by
          emailing <a href="mailto:hello@neuvra.ai">hello@neuvra.ai</a>. We will
          process deletion requests within 30 days.
        </p>

        <h2>6. Cookies</h2>
        <p>
          We use essential cookies for authentication (session management). We do
          not use tracking cookies or advertising cookies.
        </p>

        <h2>7. Your Rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data in a portable format</li>
          <li>Object to certain types of processing</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{" "}
          <a href="mailto:hello@neuvra.ai">hello@neuvra.ai</a>.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          Neuvra is not directed to children under 13. We do not knowingly
          collect personal data from children under 13. If you believe a child
          has provided us with personal data, contact us immediately.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you
          of significant changes via email. Continued use of the service after
          changes constitutes acceptance of the updated policy.
        </p>

        <h2>10. Contact</h2>
        <p>
          For privacy-related questions, contact us at{" "}
          <a href="mailto:hello@neuvra.ai">hello@neuvra.ai</a>.
        </p>
      </div>
    </div>
  );
}
