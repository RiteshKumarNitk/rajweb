import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Button } from "@/shared/components/ui/button";
import { siteConfig } from "@/shared/config/site";

const websiteUrl = siteConfig.url.startsWith("http")
  ? siteConfig.url
  : `https://${siteConfig.website}`;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    `Privacy Policy for ${siteConfig.name} (${siteConfig.website}) — how we collect, use, and protect personal information on our official website.`,
  alternates: {
    canonical: `${websiteUrl}/governance/privacy-policy`,
  },
};

const sections = [
  {
    title: "1. Introduction",
    body: [
      `This Privacy Policy explains how ${siteConfig.name} (“RRA”, “we”, “us”) handles personal information when you visit ${siteConfig.website} and related pages served from ${websiteUrl} (the “Website”).`,
      "RRA is the official state body for racquetball in Rajasthan. We are committed to protecting your privacy in line with applicable Indian law, including the Information Technology Act, 2000, and the Digital Personal Data Protection Act, 2023 (DPDP Act), as applicable.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "We may collect the following categories of information when you use the Website or submit forms:",
    ],
    list: [
      "Identity and contact details: name, email address, phone number, postal address, district, and organisation name (club, school, or academy).",
      "Membership and registration data: player or coach registration details, age category, club affiliation, documents you upload for verification, and application status.",
      "Communications: messages sent through contact forms, donation inquiries, equipment orders, and official correspondence.",
      "Technical data: IP address, browser type, device information, pages visited, and timestamps — collected through server logs and essential cookies for security and session management.",
      "Admin account data: credentials and activity logs for authorised federation administrators (access is role-based and audited where enabled).",
    ],
  },
  {
    title: "3. How we use your information",
    body: ["We use personal information to:"],
    list: [
      "Process membership, player, coach, tournament, and certificate-related applications.",
      "Respond to inquiries, RTI requests, and governance matters.",
      "Operate and secure the Website, prevent fraud and abuse, and maintain audit records.",
      "Send service-related communications about your application or RRA programmes (not unsolicited marketing without consent).",
      "Comply with obligations to the Indian Racquetball Association (IRA), sports governing bodies, and applicable law.",
    ],
  },
  {
    title: "4. Legal basis and consent",
    body: [
      "We process personal data based on your consent (for example, when you submit a form), performance of steps at your request before entering a membership or registration agreement, compliance with legal obligations, and legitimate interests of RRA in administering sport in Rajasthan, provided such interests do not override your rights.",
      "Where consent is required, you may withdraw it by contacting us; withdrawal does not affect processing that was lawful before withdrawal.",
    ],
  },
  {
    title: "5. Sharing and disclosure",
    body: [
      "We do not sell your personal information. We may share data only as needed with:",
    ],
    list: [
      "IRA and other recognised sports bodies for affiliation, eligibility, and anti-doping compliance.",
      "Service providers that host the Website, send email, store files, or provide database services — under contractual confidentiality and security obligations.",
      "Law enforcement, courts, or regulators when required by law or to protect rights, safety, and integrity of sport.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "We retain personal information only as long as necessary for the purposes described in this Policy, including statutory retention for federation records, tournament results, and financial or audit requirements. When data is no longer required, we delete or anonymise it in accordance with our records policy.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "We implement reasonable technical and organisational measures — including access controls, encryption in transit (HTTPS), hashed passwords for admin accounts, rate limiting, and audit logging — to protect personal information. No method of transmission over the Internet is completely secure; please use strong passwords and protect your account credentials.",
    ],
  },
  {
    title: "8. Your rights",
    body: [
      "Subject to applicable law (including the DPDP Act), you may have the right to:",
    ],
    list: [
      "Request access to personal information we hold about you.",
      "Request correction of inaccurate or incomplete data.",
      "Request erasure or restriction of processing where legally permitted.",
      "Nominate a contact for exercise of rights in the event of death or incapacity, as provided under the DPDP Act.",
      "Lodge a grievance with us and, where applicable, with the Data Protection Board of India.",
    ],
  },
  {
    title: "9. Cookies and similar technologies",
    body: [
      "The Website uses essential cookies and similar technologies for authentication, CSRF protection, and security. We do not use third-party advertising cookies on this Website. You can control non-essential cookies through your browser settings; disabling essential cookies may limit some features.",
    ],
  },
  {
    title: "10. Children’s privacy",
    body: [
      "Junior and sub-junior registrations may involve personal information about minors. Such data must be submitted by a parent, guardian, or authorised institution. We collect only what is necessary for sport registration and safeguarding, and we expect affiliates to comply with child protection norms.",
    ],
  },
  {
    title: "11. Third-party links",
    body: [
      "The Website may link to external sites (for example, social media or IRA resources). We are not responsible for the privacy practices of those sites. Please review their policies before providing personal information.",
    ],
  },
  {
    title: "12. Changes to this Policy",
    body: [
      "We may update this Privacy Policy from time to time. The “Last updated” date below will reflect the latest version. Continued use of the Website after changes constitutes acceptance of the updated Policy where permitted by law.",
    ],
  },
  {
    title: "13. Contact and grievance",
    body: [
      `For privacy-related questions, access requests, or grievances, contact ${siteConfig.name}:`,
    ],
    contact: true,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Privacy Policy"
        description={`How ${siteConfig.shortName} collects, uses, and protects personal information on ${siteConfig.website}.`}
      />
      <PageContent>
        <p className="mb-10 max-w-3xl text-sm text-slate-500">
          <strong className="font-semibold text-slate-700">Effective:</strong> 1 January 2025
          <span className="mx-2 text-slate-300">|</span>
          <strong className="font-semibold text-slate-700">Last updated:</strong> 19 September 2026
          <span className="mx-2 text-slate-300">|</span>
          <strong className="font-semibold text-slate-700">Website:</strong>{" "}
          <a href={websiteUrl} className="text-secondary hover:underline">
            {siteConfig.website}
          </a>
        </p>

        <div className="max-w-3xl space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-extrabold text-primary">{section.title}</h2>
              <div className="mt-4 space-y-4 text-slate-600 leading-relaxed">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.list ? (
                  <ul className="list-disc space-y-2 pl-6">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {section.contact ? (
                  <ul className="space-y-2 text-slate-700">
                    <li>
                      <strong>Email:</strong>{" "}
                      <a href={`mailto:${siteConfig.email}`} className="text-secondary hover:underline">
                        {siteConfig.email}
                      </a>
                    </li>
                    <li>
                      <strong>Phone:</strong>{" "}
                      <a
                        href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                        className="text-secondary hover:underline"
                      >
                        {siteConfig.phone}
                      </a>
                    </li>
                    <li>
                      <strong>Registered office:</strong> {siteConfig.registeredOffice}
                    </li>
                    <li>
                      <strong>Head office:</strong> {siteConfig.headOffice}
                    </li>
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/contact">Contact RRA</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/about/rules-policies">Rules & Policies</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/governance/rti">RTI & Governance</Link>
          </Button>
        </div>
      </PageContent>
    </>
  );
}
