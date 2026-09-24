"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { siteConfig, siteImages, navigation } from "@/shared/config/site";
import { Button } from "@/shared/components/ui/button";
import { LogoImage } from "@/shared/components/ui/media-image";
import { HeaderAuth, MobileHeaderAuth } from "@/shared/components/layout/header-auth";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" prefetch className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11">
            <LogoImage
              src={siteImages.logo}
              alt={siteConfig.name}
              maxHeight={44}
              maxWidth={44}
              priority
              className="rounded-lg"
            />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="text-sm font-bold leading-tight text-primary">{siteConfig.shortName}</p>
            <p className="hidden text-xs text-slate-500 lg:block">Rajasthan Racquetball</p>
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          {navigation.main.map((item) =>
            item.children ? (
              <div
                key={item.name}
                className="relative shrink-0"
                onMouseEnter={() => setOpenDropdown(item.name)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button className="flex items-center gap-0.5 rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary">
                  {item.name}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {openDropdown === item.name && (
                  <div className="absolute left-0 top-full z-50 min-w-[220px] rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        prefetch
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-secondary"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                prefetch
                className="shrink-0 rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
              >
                {item.name}
              </Link>
            )
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 sm:gap-3 lg:flex">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/verify" prefetch>
                <span className="hidden lg:inline">Verify Certificate</span>
                <span className="lg:hidden">Verify</span>
              </Link>
            </Button>
            <HeaderAuth />
          </div>

          <button
            className="rounded-md p-2 text-primary lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-slate-200 bg-white lg:hidden",
          mobileOpen ? "max-h-[80vh] overflow-y-auto" : "max-h-0"
        )}
      >
        <nav className="space-y-1 px-4 py-4">
          {navigation.main.map((item) => (
            <div key={item.name}>
              <Link
                href={item.href}
                prefetch
                className="block rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
              {item.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  prefetch
                  className="block rounded-md py-2 pl-6 text-sm text-slate-600 hover:text-secondary"
                  onClick={() => setMobileOpen(false)}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex flex-col gap-2 pt-4">
            <Button variant="outline" asChild>
              <Link href="/verify" prefetch>Verify Certificate</Link>
            </Button>
          </div>
          <MobileHeaderAuth onNavigate={() => setMobileOpen(false)} />
        </nav>
      </div>
    </header>
  );
}
