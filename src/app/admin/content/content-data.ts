import prisma from "@/infrastructure/database/prisma";

export interface AdminContentRecord {
  id: string;
  isActive: boolean;
  sortOrder?: number;
  order?: number;
  updatedAt: string;
  [key: string]: unknown;
}

export async function getAdminCommittee(): Promise<AdminContentRecord[]> {
  const rows = await prisma.executiveMember.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    designation: r.designation,
    photo: r.photo,
    bio: r.bio,
    positions: r.positions,
    badge: r.badge,
    email: r.email,
    phone: r.phone,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getAdminAchievements(): Promise<AdminContentRecord[]> {
  const rows = await prisma.achievement.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    value: r.value,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getAdminTimeline(): Promise<AdminContentRecord[]> {
  const rows = await prisma.timelineItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    year: r.year,
    title: r.title,
    description: r.description,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getAdminNews(): Promise<AdminContentRecord[]> {
  const rows = await prisma.news.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    excerpt: r.excerpt,
    content: r.content,
    author: r.author,
    sortOrder: 0,
    isActive: r.isActive,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getAdminPartners(type: string): Promise<AdminContentRecord[]> {
  const rows = await prisma.partner.findMany({
    where: { type },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    logo: r.logo,
    website: r.website,
    role: r.role,
    location: r.location,
    phone: r.phone,
    order: r.order,
    isActive: r.isActive,
    updatedAt: r.updatedAt.toISOString(),
  }));
}
