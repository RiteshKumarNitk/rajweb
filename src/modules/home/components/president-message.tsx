import Link from "next/link";
import { Quote } from "lucide-react";
import { MediaImage } from "@/shared/components/ui/media-image";
import { testimonials, siteImages } from "@/shared/config/site";

/*
export function PresidentMessage() {
  return (
    <section className="bg-primary py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            <MediaImage
              src={siteImages.president}
              alt="Mr. Aamir Khan - President, RRA"
              aspect="portrait"
              fit="cover"
              containerClassName="rounded-2xl bg-slate-700"
              className="object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute -bottom-4 right-0 h-32 w-32 rounded-2xl bg-accent/20 sm:-right-4" />
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-accent">Leadership</span>
            <h2 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">President&apos;s Message</h2>
            <Quote className="mt-6 h-10 w-10 text-accent" />
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              Welcome to the Rajasthan Racquetball Association. Our mission is to promote racquetball across every district of Rajasthan, providing structured pathways for players, coaches, and clubs to excel at state and national levels.
            </p>
            <p className="mt-4 leading-relaxed text-slate-300">
              Together, we are building a strong racquetball ecosystem — from grassroots training to state championships. I invite all enthusiasts, clubs, schools, and academies to join us in this journey. Let&apos;s win together!
            </p>
            <p className="mt-6 font-bold text-accent">— Mr. Aamir Khan, President, RRA</p>
          </div>
        </div>
      </div>
    </section>
  );
}
*/

export function GeneralSecretaryMessage() {
  return (
    <section className="bg-primary py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            <MediaImage
              src={siteImages.generalSecretary}
              alt="Mr. Aashish Poonia - Founder & General Secretary, RRA"
              aspect="portrait"
              fit="cover"
              containerClassName="rounded-2xl bg-slate-700"
              className="object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute -bottom-4 right-0 h-32 w-32 rounded-2xl bg-accent/20 sm:-right-4" />
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-accent">Leadership</span>
            <h2 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">
              General Secretary&apos;s Message
            </h2>
            <Quote className="mt-6 h-10 w-10 text-accent" />
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              As Founder and General Secretary of the Rajasthan Racquetball Association, I am committed to
              building a transparent, well-organised federation that serves every district, club, school,
              and academy across our state.
            </p>
            <p className="mt-4 leading-relaxed text-slate-300">
              From membership registration and player records to tournament coordination and official
              correspondence with the Indian Racquetball Association, our team works to give every athlete
              a clear path from grassroots sport to state and national competition. I welcome players,
              coaches, and institutions to connect with RRA and grow racquetball together in Rajasthan.
            </p>
            <div className="mt-6 space-y-3">
              <p className="font-bold text-accent">— Mr. Aashish Poonia</p>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold text-white">Founder &amp; General Secretary</p>
                  <p className="text-slate-400">Rajasthan Racquetball Association</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Vice President</p>
                  <p className="text-slate-400">Indian Racquetball Association</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-secondary">Testimonials</span>
          <h2 className="mt-2 text-3xl font-extrabold text-primary md:text-4xl">What Our Community Says</h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.author} className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <Quote className="h-8 w-8 text-secondary/30" />
              <p className="mt-4 leading-relaxed text-slate-600">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="font-bold text-primary">{item.author}</p>
                <p className="text-sm text-slate-500">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MembershipCTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-secondary to-secondary/80">
          <div className="px-8 py-16 text-center md:px-16">
            <h2 className="text-3xl font-extrabold text-white md:text-4xl">Join the RRA Family</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
              Register your club, school, or academy with Rajasthan Racquetball Association and be part of the state&apos;s growing racquetball community.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/membership/club" className="rounded-md bg-white px-8 py-3 font-semibold text-secondary transition-colors hover:bg-slate-100">
                Club Membership
              </Link>
              <Link href="/membership/school" className="rounded-md border-2 border-white px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10">
                School Membership
              </Link>
              <Link href="/membership/academy" className="rounded-md border-2 border-white px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10">
                Academy Membership
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
