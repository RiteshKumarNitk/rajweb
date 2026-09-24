import type { Metadata } from "next";
import { Clock, Globe } from "lucide-react";
import { PageHeader, PageContent } from "@/shared/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { LogoImage } from "@/shared/components/ui/media-image";
import { siteConfig } from "@/shared/config/site";
import { ContactForm } from "./contact-form";

const websiteUrl = siteConfig.url.startsWith("http")
  ? siteConfig.url
  : `https://${siteConfig.website}`;

const contactIcons = [
  { label: "Email", value: siteConfig.email, href: `mailto:${siteConfig.email}`, icon: "/images/icon-email.png" },
  { label: "Website", value: siteConfig.website, href: websiteUrl, icon: null },
  ...siteConfig.phones.map((phone) => ({
    label: "Phone",
    value: phone,
    href: `tel:${phone.replace(/\s/g, "")}`,
    icon: "/images/icon-phone-call.png",
  })),
  {
    label: "Reg. Office",
    value: siteConfig.registeredOffice,
    icon: "/images/icon-push-pin-simple.png",
  },
  {
    label: "Head Office",
    value: siteConfig.headOffice,
    icon: "/images/icon-push-pin-simple.png",
  },
];

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Rajasthan Racquetball Association for membership, tournaments, partnerships, and general inquiries.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get in Touch"
        title="Contact Us"
        description="Reach out to RRA for membership inquiries, tournament information, media requests, or general support."
      />
      <PageContent>
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Send Us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="space-y-6 p-6">
                {contactIcons.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary/10 p-2">
                      {item.icon ? (
                        <LogoImage src={item.icon} alt={item.label} maxHeight={32} maxWidth={32} />
                      ) : (
                        <Globe className="h-6 w-6 text-secondary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-primary">{item.label}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.label === "Website" ? "_blank" : undefined}
                          rel={item.label === "Website" ? "noopener noreferrer" : undefined}
                          className="text-slate-600 hover:text-secondary"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-slate-600">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <Clock className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">Office Hours</p>
                    <p className="text-slate-600">Mon – Sat: 10:00 AM – 6:00 PM</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  );
}
