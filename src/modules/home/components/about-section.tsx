import Link from "next/link";
import { ArrowRight, Trophy, Users, Calendar, Award } from "lucide-react";
import { aboutRacquetball, siteImages } from "@/shared/config/site";
import { Button } from "@/shared/components/ui/button";
import { MediaImage } from "@/shared/components/ui/media-image";

const features = [
  { icon: Trophy, title: "State Championships", description: "Organizing competitive state-level tournaments across all categories." },
  { icon: Users, title: "Player Development", description: "Grassroots to elite training programs for aspiring racquetball athletes." },
  { icon: Calendar, title: "Structured Events", description: "Year-round calendar of district and state-level competitions." },
  { icon: Award, title: "Certification Programs", description: "Official player and coach certification aligned with national standards." },
];

export function AboutSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-secondary">About RRA</span>
            <h2 className="mt-2 text-3xl font-extrabold text-primary md:text-4xl">
              {aboutRacquetball.title}
            </h2>
            <p className="mt-6 leading-relaxed text-slate-600">
              {aboutRacquetball.content.split("\n\n")[0]}
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              Rajasthan Racquetball Association (RRA) is the official governing body responsible for the promotion, regulation, and development of racquetball across Rajasthan.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/about/racquetball">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-6">
            <MediaImage
              src={siteImages.about}
              alt="Rajasthan Racquetball Association official banner and affiliations"
              aspect="video"
              fit="contain"
              containerClassName="bg-white ring-1 ring-slate-200"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                    <feature.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-bold text-primary">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
