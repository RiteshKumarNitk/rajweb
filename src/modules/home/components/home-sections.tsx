import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { LogoImage } from "@/shared/components/ui/media-image";
import { formatDate } from "@/lib/utils";
import { siteConfig, siteImages } from "@/shared/config/site";
import { getHomeNewsSync } from "@/modules/home/data/get-news";

export function LatestNews() {
  const news = getHomeNewsSync();

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-secondary">News</span>
            <h2 className="mt-2 text-3xl font-extrabold text-primary md:text-4xl">Latest News</h2>
          </div>
          <Button variant="outline" asChild className="hidden sm:flex">
            <Link href="/media/news">All News <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {news.map((item) => (
            <Link key={item.id} href={`/media/news`} className="group rounded-xl border border-slate-200 bg-background p-6 transition-shadow hover:shadow-md">
              <span className="text-xs font-semibold uppercase text-secondary">{item.category}</span>
              <h3 className="mt-2 text-lg font-bold text-primary group-hover:text-secondary">{item.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.excerpt}</p>
              <p className="mt-4 text-xs text-slate-400">{item.publishedAt ? formatDate(item.publishedAt) : ""}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PartnersSection() {
  return (
    <section className="border-t border-slate-200 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-bold uppercase tracking-wider text-slate-500">
          Let&apos;s Win Together — Proudly Sponsored By
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {siteImages.sponsors.map((p) => (
            <div key={p.name} className="flex h-20 w-36 items-center justify-center">
              <LogoImage src={p.logo} alt={p.name} maxHeight={80} maxWidth={144} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FederationsSection() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-primary md:text-3xl">Globally Recognised Governing Bodies</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Racquetball was a charter member of the World Games first held in 1981. It has been included in five IOC-Recognized Continental Games since 1995.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {siteImages.federations.map((org) => (
            <div key={org.name} className="flex h-16 w-28 items-center justify-center" title={org.name}>
              <LogoImage src={org.logo} alt={org.name} maxHeight={64} maxWidth={112} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-primary">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 md:p-12">
              <span className="text-sm font-bold uppercase tracking-wider text-accent">Contact</span>
              <h2 className="mt-2 text-3xl font-extrabold text-white">Get in Touch</h2>
              <p className="mt-4 text-slate-300">Have questions about membership, tournaments, or player registration? We&apos;re here to help.</p>
              <div className="mt-8 space-y-4 text-slate-300">
                <p>
                  <strong className="text-white">Email:</strong>{" "}
                  <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                    {siteConfig.email}
                  </a>
                </p>
                <p>
                  <strong className="text-white">Website:</strong>{" "}
                  <a
                    href={siteConfig.url.startsWith("http") ? siteConfig.url : `https://${siteConfig.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    {siteConfig.website}
                  </a>
                </p>
                <p>
                  <strong className="text-white">Phone:</strong>{" "}
                  {siteConfig.phones.map((phone, index) => (
                    <span key={phone}>
                      {index > 0 ? " · " : ""}
                      <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-white">
                        {phone}
                      </a>
                    </span>
                  ))}
                </p>
                <p>
                  <strong className="text-white">Reg. Office:</strong> {siteConfig.registeredOffice}
                </p>
                <p>
                  <strong className="text-white">Head Office:</strong> {siteConfig.headOffice}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center bg-secondary/20 p-8 md:p-12">
              <Button variant="accent" size="lg" asChild>
                <Link href="/contact">Contact Us <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
