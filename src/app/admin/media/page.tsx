import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";

async function getMedia() {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const [news, videos, galleries] = await Promise.all([
      prisma.news.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.video.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.gallery.findMany({ include: { _count: { select: { images: true } } }, orderBy: { createdAt: "desc" } }),
    ]);
    return { news, videos, galleries };
  } catch {
    return { news: [], videos: [], galleries: [] };
  }
}

export default async function AdminMediaPage() {
  await requireAdminScope(PERMISSIONS.MEDIA_READ);
  const { news, videos, galleries } = await getMedia();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Media CMS</h1>
        <p className="text-slate-500">Manage news, videos, and galleries</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>News ({news.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {news.length === 0 ? (
              <p className="text-sm text-slate-500">No news articles</p>
            ) : (
              news.slice(0, 5).map((item) => (
                <div key={item.id} className="border-b border-slate-100 pb-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.isPublished ? "Published" : "Draft"}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Videos ({videos.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {videos.length === 0 ? (
              <p className="text-sm text-slate-500">No videos</p>
            ) : (
              videos.slice(0, 5).map((item) => (
                <div key={item.id} className="border-b border-slate-100 pb-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Galleries ({galleries.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {galleries.length === 0 ? (
              <p className="text-sm text-slate-500">No galleries</p>
            ) : (
              galleries.slice(0, 5).map((item) => (
                <div key={item.id} className="border-b border-slate-100 pb-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-slate-500">{item._count.images} images</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
