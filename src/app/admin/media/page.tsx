import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { Newspaper, Video, Image as ImageIcon, Sparkles, PlusCircle, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getMedia() {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const [news, videos, galleries] = await Promise.all([
      prisma.news.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.video.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.gallery.findMany({
        include: { _count: { select: { images: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    return { news, videos, galleries };
  } catch {
    return { news: [], videos: [], galleries: [] };
  }
}

export default async function AdminMediaPage() {
  await requireAdminScope(PERMISSIONS.MEDIA_READ);
  const { news, videos, galleries } = await getMedia();

  const publishedNews = news.filter((n) => n.isPublished).length;
  const totalGalleryImages = galleries.reduce((acc, g) => acc + g._count.images, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Media &amp; Communications CMS</h1>
          <p className="text-sm text-slate-500">
            Publish press bulletins, manage official tournament video streams, and photo gallery archives.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Press Articles</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{news.length}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Newspaper className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">{publishedNews} articles published</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Video Content</p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{videos.length}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Video className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Match streams &amp; highlights</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Galleries</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{galleries.length}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ImageIcon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{totalGalleryImages} photographs archived</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Public Portal</p>
                <h3 className="text-sm font-bold text-primary mt-1">Live CMS</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <Link href="/media/news" target="_blank" className="mt-2 text-[11px] text-primary hover:underline flex items-center gap-1 font-medium">
              View Public Newsfeed <ExternalLink className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Media 3-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* News Column */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base font-bold text-primary">Press News ({news.length})</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {news.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No news articles created yet.</p>
            ) : (
              news.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50/70 p-3 space-y-1.5 border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.isPublished
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.isPublished ? "PUBLISHED" : "DRAFT"}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">{item.title}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Video Column */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-red-600" />
                <CardTitle className="text-base font-bold text-primary">Videos &amp; Streams ({videos.length})</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {videos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No video recordings logged.</p>
            ) : (
              videos.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50/70 p-3 space-y-1.5 border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 uppercase">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">{item.title}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Galleries Column */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base font-bold text-primary">Galleries ({galleries.length})</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {galleries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No photo galleries uploaded.</p>
            ) : (
              galleries.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50/70 p-3 space-y-1.5 border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      {item._count.images} IMAGES
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">{item.title}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
