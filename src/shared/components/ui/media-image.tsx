import Image from "next/image";
import { cn } from "@/lib/utils";

type MediaAspect = "video" | "square" | "portrait" | "gallery" | "poster" | "wide";
type MediaFit = "cover" | "contain";

const aspectClass: Record<MediaAspect, string> = {
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  gallery: "aspect-[4/3]",
  poster: "aspect-[3/4]",
  wide: "aspect-[21/9]",
};

type MediaImageProps = {
  src: string;
  alt: string;
  aspect?: MediaAspect;
  fit?: MediaFit;
  priority?: boolean;
  rounded?: boolean;
  className?: string;
  containerClassName?: string;
  sizes?: string;
};

/** Consistent image framing across the public site. */
export function MediaImage({
  src,
  alt,
  aspect = "video",
  fit = "cover",
  priority,
  rounded = true,
  className,
  containerClassName,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: MediaImageProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-slate-100",
        aspectClass[aspect],
        rounded && "rounded-xl",
        containerClassName
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? undefined : "lazy"}
        sizes={sizes}
        className={cn(
          fit === "contain" ? "object-contain p-3 sm:p-4" : "object-cover",
          className
        )}
      />
    </div>
  );
}

type LogoImageProps = {
  src: string;
  alt: string;
  maxHeight?: number;
  maxWidth?: number;
  className?: string;
  priority?: boolean;
};

/** Federation / sponsor logos — centered, no distortion. */
export function LogoImage({
  src,
  alt,
  maxHeight = 64,
  maxWidth = 140,
  className,
  priority,
}: LogoImageProps) {
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center", className)}
      style={{ maxHeight, maxWidth }}
    >
      <Image
        src={src}
        alt={alt}
        width={maxWidth}
        height={maxHeight}
        loading={priority ? undefined : "lazy"}
        className="max-h-full max-w-full object-contain"
        style={{ width: "auto", height: "auto" }}
      />
    </div>
  );
}
