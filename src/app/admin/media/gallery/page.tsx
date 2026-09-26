import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { GalleryManager, type GalleryRow } from "./gallery-manager";

export const dynamic = "force-dynamic";

async function getGalleryItems() {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.gallery.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        category: true,
        imageUrl: true,
        driveUrl: true,
        description: true,
        sortOrder: true,
        isPublished: true,
        updatedAt: true,
      },
    });
  } catch {
    return [];
  }
}

export default async function AdminGalleryPage() {
  const { user } = await requireAdminScope(PERMISSIONS.MEDIA_READ);

  // Management requires media:manage (enforced again server-side by the API).
  if (!hasPermission(user, PERMISSIONS.MEDIA_MANAGE)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Gallery Management</h1>
          <p className="text-sm text-slate-500">Manage the photos shown on the public photo gallery.</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You have view-only access to media. Gallery editing requires the <strong>media:manage</strong>{" "}
          permission — ask a Super Admin to grant it to your role.
        </div>
        <Link href="/admin/media" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Media
        </Link>
      </div>
    );
  }

  const items = await getGalleryItems();
  const rows: GalleryRow[] = items.map((item) => ({
    ...item,
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Gallery Management</h1>
        <p className="text-sm text-slate-500">
          Manage the photos shown on the public photo gallery — including each item&apos;s optional Google
          Drive link, visibility, and display order.
        </p>
      </div>

      <GalleryManager items={rows} />
    </div>
  );
}
