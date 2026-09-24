import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Rajasthan Racquetball Association",
  description: "Privacy policy for the Rajasthan Racquetball Association (RRA).",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Last updated: {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="prose prose-slate mx-auto max-w-none">
        <p>
          At the Rajasthan Racquetball Association (RRA), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy outlines how we collect, use, disclose, and safeguard your data when you visit our website, register as a member, or participate in our events.
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          We may collect personal information that you voluntarily provide to us when you:
        </p>
        <ul>
          <li>Register as a player, coach, or member</li>
          <li>Register for tournaments or events</li>
          <li>Subscribe to our newsletters</li>
          <li>Contact us through our website forms</li>
          <li>Make a donation</li>
        </ul>
        <p>
          This information may include your name, email address, phone number, date of birth, district, payment details, and other relevant details required for membership and participation.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>
          We use the collected information for various purposes, including:
        </p>
        <ul>
          <li>Processing and managing your memberships and registrations</li>
          <li>Communicating with you about upcoming tournaments, events, and news</li>
          <li>Issuing official certificates and managing player/coach profiles</li>
          <li>Improving our website and services</li>
          <li>Complying with legal and regulatory obligations</li>
        </ul>

        <h2>3. Data Sharing and Disclosure</h2>
        <p>
          We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted partners and service providers who assist us in operating our website, conducting our activities, or serving our members, provided that these parties agree to keep this information confidential.
        </p>
        <p>
          We may also disclose your information when required by law or to protect our rights, property, or safety.
        </p>

        <h2>4. Data Security</h2>
        <p>
          We implement a variety of security measures to maintain the safety of your personal information. However, please note that no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>5. Your Rights</h2>
        <p>
          You have the right to access, correct, or request the deletion of your personal information held by us. If you wish to exercise any of these rights, please contact us using the details provided below.
        </p>

        <h2>6. Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information.
        </p>

        <h2>7. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
        </p>
        <p>
          <strong>Email:</strong> info@rajasthanracquetball.com
        </p>
      </div>
    </div>
  );
}
