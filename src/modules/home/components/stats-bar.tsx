import { getPublicAchievements, type PublicAchievement } from "@/modules/content/public-content";
import { achievements } from "@/shared/config/site";

/** Stats bar — values are database-managed with the static config as fallback. */
export async function StatsBar() {
  let stats: PublicAchievement[] = [];
  try {
    stats = await getPublicAchievements();
  } catch {
    stats = [];
  }

  const items =
    stats.length > 0
      ? stats.map((s) => ({ label: s.label, value: s.value }))
      : achievements.map((a) => ({ label: a.label, value: a.value }));

  return (
    <section className="relative -mt-16 z-10 mx-auto max-w-5xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-6 shadow-xl md:grid-cols-4 md:p-8">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-3xl font-extrabold text-secondary md:text-4xl">{item.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-600">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
