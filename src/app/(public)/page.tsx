import type { Metadata } from "next";
import {
  // PresidentMessage,
  GeneralSecretaryMessage,
  TestimonialsSection,
  MembershipCTA,
} from "@/modules/home/components/president-message";
import {
  LatestNews,
  PartnersSection,
  FederationsSection,
  ContactSection,
} from "@/modules/home/components/home-sections";
import { HeroSlider } from "@/modules/home/components/hero-slider";
import { StatsBar } from "@/modules/home/components/stats-bar";

export const dynamic = "force-dynamic";
import { AboutSection } from "@/modules/home/components/about-section";
import { siteConfig } from "@/shared/config/site";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSlider />
      <StatsBar />
      <AboutSection />
      <LatestNews />
      {/* <PresidentMessage /> */}
      <GeneralSecretaryMessage />
      <TestimonialsSection />
      <MembershipCTA />
      <FederationsSection />
      <PartnersSection />
      <ContactSection />
    </>
  );
}
