import Link from "next/link";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig, siteImages, navigation } from "@/shared/config/site";
import { LogoImage } from "@/shared/components/ui/media-image";

const websiteUrl = siteConfig.url.startsWith("http")
  ? siteConfig.url
  : `https://${siteConfig.website}`;

export function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6 lg:items-start">
          <div className="md:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 p-1">
                <LogoImage src={siteImages.logo} alt={siteConfig.name} maxHeight={48} maxWidth={48} />
              </div>
              <div>
                <p className="text-lg font-bold">{siteConfig.shortName}</p>
                <p className="text-sm text-slate-300">{siteConfig.tagline}</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
              {siteConfig.description}
            </p>
            <div className="mt-6 flex gap-4">
              {[
                { label: "Facebook", href: siteConfig.social.facebook, icon: siteImages.social.facebook },
                { label: "Instagram", href: siteConfig.social.instagram, icon: siteImages.social.instagram },
                { label: "YouTube", href: siteConfig.social.youtube, icon: siteImages.social.youtube },
              ].map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 transition-colors hover:bg-secondary"
                  aria-label={label}
                  title={label}
                >
                  <LogoImage src={icon} alt={label} maxHeight={24} maxWidth={24} />
                </a>
              ))}
            </div>
          </div>

          {navigation.footer.map((section) => (
            <div key={section.title} className="min-w-0">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-accent">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition-colors hover:text-white"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3 text-sm text-slate-300">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
              {siteConfig.email}
            </a>
          </div>
          <div className="flex items-start gap-3 text-sm text-slate-300">
            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              {siteConfig.website}
            </a>
          </div>
          <div className="flex items-start gap-3 text-sm text-slate-300">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="flex flex-col gap-1">
              {siteConfig.phones.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="hover:text-white"
                >
                  {phone}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm text-slate-300 sm:col-span-2 lg:col-span-1">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-white">Reg. Office</p>
                <p>{siteConfig.registeredOffice}</p>
              </div>
              <div>
                <p className="font-semibold text-white">Head Office</p>
                <p>{siteConfig.headOffice}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-400 sm:flex-row">
            <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/governance/rti" className="hover:text-white">RTI</Link>
              <Link href="/governance/anti-doping" className="hover:text-white">Anti-Doping</Link>
              <Link href="/governance/privacy-policy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/login" className="hover:text-white">Admin Login</Link>
            </div>
          </div>
          <p className="text-center text-xs text-slate-500">
            Website designed &amp; developed by{" "}
            <a
              href={siteConfig.developer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-400 transition-colors hover:text-accent"
              title={siteConfig.developer.name}
            >
              {siteConfig.developer.shortName}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
