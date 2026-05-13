import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "Refund Policy | Neuvra AI",
  description: "Refund Policy for Neuvra AI",
};

export default function RefundsPage() {
  return (
    <div className="legal-page">
      <div className="legal-wrap">
        <Link href="/" className="legal-back">← Back to Neuvra</Link>

        <h1>Refund Policy</h1>
        <p className="legal-date">Last updated: May 12, 2025</p>

        <p>
          We want you to be happy with Neuvra AI. This policy explains when and
          how you can request a refund.
        </p>

        <h2>1. Free Trial</h2>
        <p>
          Neuvra AI offers a free plan so you can try the platform before
          subscribing. We encourage you to use the free tier to evaluate the
          service before upgrading to Pro.
        </p>

        <h2>2. Refund Eligibility</h2>
        <p>
          We offer a <strong>7-day money-back guarantee</strong> on all new Pro
          subscriptions. If you are not satisfied with your subscription for any
          reason, you can request a full refund within 7 days of your initial
          payment.
        </p>
        <p>Refunds are not available for:</p>
        <ul>
          <li>Requests made more than 7 days after the initial payment</li>
          <li>Subscription renewals (monthly or yearly)</li>
          <li>Accounts that have violated our Terms of Service</li>
          <li>Partial periods — we do not prorate refunds</li>
        </ul>

        <h2>3. How to Request a Refund</h2>
        <p>To request a refund, email us at{" "}
          <a href="mailto:hello@neuvra.ai">hello@neuvra.ai</a> with:
        </p>
        <ul>
          <li>The email address associated with your account</li>
          <li>The date of your payment</li>
          <li>The reason for your refund request (optional but helpful)</li>
        </ul>
        <p>
          We will process your request within <strong>5 business days</strong>.
          Refunds are returned to the original payment method.
        </p>

        <h2>4. Cancellations</h2>
        <p>
          You can cancel your subscription at any time from your account
          settings. Cancellation takes effect at the end of your current billing
          period — you will continue to have Pro access until then. No partial
          refunds are issued for unused time after the 7-day guarantee window.
        </p>

        <h2>5. Payment Processing</h2>
        <p>
          All payments are processed by <strong>Paddle</strong>, our Merchant of
          Record. Refunds are issued through Paddle and may take 5–10 business
          days to appear on your statement depending on your bank.
        </p>

        <h2>6. Contact</h2>
        <p>
          For refund requests or billing questions, contact us at{" "}
          <a href="mailto:hello@neuvra.ai">hello@neuvra.ai</a>.
        </p>
      </div>
    </div>
  );
}
