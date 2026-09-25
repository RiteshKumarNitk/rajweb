import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/shared/components/seo/json-ld";
import { SessionProvider } from "@/shared/components/providers/session-provider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://rajasthanracquetball.com"),
  title: {
    default: "Rajasthan Racquetball Association (RRA)",
    template: "%s | RRA",
  },
  description:
    "Official State Body for Racquetball in Rajasthan. RRA conducts structured tournaments, certification programs, and official training initiatives.",
  keywords: ["racquetball", "rajasthan", "RRA", "sports", "tournament", "membership"],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Rajasthan Racquetball Association",
    url: process.env.APP_URL || "https://rajasthanracquetball.com",
    title: "Rajasthan Racquetball Association (RRA)",
    description:
      "Official State Body for Racquetball in Rajasthan. Tournaments, membership, and player development across all districts.",
    images: [
      {
        url: "/images/cropped-rra-logo.webp",
        width: 512,
        height: 512,
        alt: "Rajasthan Racquetball Association logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rajasthan Racquetball Association (RRA)",
    description:
      "Official State Body for Racquetball in Rajasthan — tournaments, training, and membership.",
    images: ["/images/cropped-rra-logo.webp"],
  },
  alternates: {
    canonical: process.env.APP_URL || "https://rajasthanracquetball.com",
  },
  icons: {
    icon: "/images/cropped-rra-logo-32x32.webp",
    apple: "/images/cropped-rra-logo-180x180.webp",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full scroll-smooth`} suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
      </head>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
