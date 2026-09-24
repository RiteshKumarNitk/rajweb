"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MediaImageSliderProps = {
  images: string[];
  alt: string;
  className?: string;
};

export function MediaImageSlider({ images, alt, className }: MediaImageSliderProps) {
  const [current, setCurrent] = useState(0);
  const total = images.length;

  if (total === 0) return null;

  const goNext = () => setCurrent((prev) => (prev + 1) % total);
  const goPrev = () => setCurrent((prev) => (prev - 1 + total) % total);

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-slate-100", className)}>
      {images.map((src, index) => (
        <div
          key={src}
          aria-hidden={index !== current}
          className={cn(
            "absolute inset-0 transition-opacity duration-500 ease-in-out",
            index === current ? "opacity-100" : "opacity-0"
          )}
        >
          <Image
            src={src}
            alt={`${alt} — photo ${index + 1}`}
            fill
            priority={index === 0}
            loading={index === 0 ? undefined : "lazy"}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
          />
        </div>
      ))}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-primary/75 p-2 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-primary"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-primary/75 p-2 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-primary"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setCurrent(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === current ? "w-6 bg-accent" : "w-1.5 bg-white/70"
                )}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
