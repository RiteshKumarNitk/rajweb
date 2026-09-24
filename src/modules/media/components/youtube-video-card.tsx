import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { YoutubeMediaItem } from "@/shared/config/site";
import { siteImages, youtubeMedia } from "@/shared/config/site";
import { cn } from "@/lib/utils";

type YoutubeVideoCardProps = {
  item: YoutubeMediaItem;
};

function getThumbnail(item: YoutubeMediaItem) {
  return item.thumbnail ?? siteImages.social.youtube;
}

export function YoutubeVideoCard({ item }: YoutubeVideoCardProps) {
  const thumbnail = getThumbnail(item);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
        <div
          className={cn(
            "relative overflow-hidden bg-primary",
            item.kind === "short" ? "aspect-[9/16] max-h-[420px]" : "aspect-video"
          )}
        >
          {item.kind === "channel" ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-8">
              <Image
                src={thumbnail}
                alt={item.title}
                width={160}
                height={160}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <Image
              src={thumbnail}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-primary/20 transition-colors group-hover:bg-primary/35" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Play className="h-8 w-8 text-white" fill="white" />
            </div>
          </div>
          {item.kind === "short" ? (
            <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
              Short
            </span>
          ) : null}
          {item.kind === "channel" ? (
            <span className="absolute left-3 top-3 rounded bg-secondary px-2 py-1 text-xs font-medium text-white">
              Subscribe
            </span>
          ) : null}
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
            YouTube
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>
        <CardHeader>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {item.category}
          </span>
          <CardTitle className="line-clamp-2 text-base">{item.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-sm text-slate-600">{item.description}</p>
        </CardContent>
      </Card>
    </a>
  );
}

async function enrichYoutubeItem(item: YoutubeMediaItem): Promise<YoutubeMediaItem> {
  if (item.kind === "channel" || !item.url) {
    return item;
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(item.url)}&format=json`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      return item;
    }

    const data = (await response.json()) as { title?: string; author_name?: string };
    return {
      ...item,
      title: data.title ?? item.title,
      description: data.author_name
        ? `From ${data.author_name} on YouTube`
        : item.description,
    };
  } catch {
    return item;
  }
}

export async function getYoutubeMediaItems() {
  return Promise.all(youtubeMedia.map(enrichYoutubeItem));
}
