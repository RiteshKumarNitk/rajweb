"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ShoppingBag } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { MediaImage } from "@/shared/components/ui/media-image";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export interface CatalogItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  image: string | null;
  category: string;
  price: number;
  stockQuantity: number;
  state: { name: string } | null;
  district: { name: string } | null;
}

/** Which store sells (and fulfils) an item — orders belong to that store. */
export function storeLabel(item: Pick<CatalogItem, "state" | "district">): string {
  if (item.district) return item.state ? `${item.district.name}, ${item.state.name}` : item.district.name;
  if (item.state) return `${item.state.name} (state store)`;
  return "RRA Central Store";
}

const CATEGORY_LABELS: Record<string, string> = {
  RACQUETS: "Racquets",
  BALLS: "Balls",
  GRIPS: "Grips",
  BAGS: "Bags",
  ACCESSORIES: "Accessories",
  TRAINING: "Training Equipment",
  OTHER: "Other",
};

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function BuyPanel({
  item,
  authenticated,
  onClose,
}: {
  item: CatalogItem;
  authenticated: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">{item.name}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-3">
            {item.image ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <MediaImage src={item.image} alt={item.name} aspect="square" rounded={false} sizes="64px" />
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">{CATEGORY_LABELS[item.category] ?? item.category}</p>
              <p className="text-sm font-bold text-slate-800">{formatInr(item.price)}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            {authenticated
              ? "Checkout, delivery details and payment happen in your account’s Equipment Shop — it also lists your own district association’s equipment."
              : "Sign in to buy. Your account’s Equipment Shop also lists your own district association’s equipment."}
          </p>
          <Button className="w-full" onClick={() => router.push(authenticated ? "/account/equipment" : "/account/login?callbackUrl=/account/equipment")}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            {authenticated ? "Continue to Equipment Shop" : "Sign in to continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EquipmentCatalog({ items }: { items: CatalogItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStore, setSelectedStore] = useState<string>("All");
  const [buyItem, setBuyItem] = useState<CatalogItem | null>(null);
  const { status } = useSession();
  const authenticated = status === "authenticated";

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((i) => cats.add(i.category));
    return ["All", ...Array.from(cats)];
  }, [items]);

  const stores = useMemo(() => ["All", ...Array.from(new Set(items.map(storeLabel)))], [items]);

  // Display filters over the public catalog (not a security boundary).
  const filtered = items.filter(
    (i) =>
      (selectedCategory === "All" || i.category === selectedCategory) &&
      (selectedStore === "All" || storeLabel(i) === selectedStore)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-all",
              selectedCategory === cat
                ? "bg-primary text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {cat === "All" ? "All" : (CATEGORY_LABELS[cat] ?? cat)}
          </button>
        ))}
      </div>

      {stores.length > 2 && (
        <div className="flex justify-center">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            Store
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All stores" : s}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const outOfStock = item.stockQuantity < 1;
          return (
            <div
              key={item.id}
              className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              onClick={() => setBuyItem(item)}
            >
              <div className="relative">
                {item.image ? (
                  <MediaImage
                    src={item.image}
                    alt={item.name}
                    aspect="gallery"
                    fit="cover"
                    rounded={false}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
                    <ShoppingBag className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                {outOfStock && (
                  <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
                    Out of Stock
                  </span>
                )}
              </div>
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </p>
                <p className="text-sm font-semibold text-primary">{item.name}</p>
                <p className="text-[11px] text-slate-400">Sold by {storeLabel(item)}</p>
                {item.shortDescription && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.shortDescription}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-extrabold text-primary">{formatInr(item.price)}</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      outOfStock ? "text-slate-400" : "text-emerald-600"
                    )}
                  >
                    {outOfStock ? "Unavailable" : `In stock (${item.stockQuantity})`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {buyItem && (
        <BuyPanel item={buyItem} authenticated={authenticated} onClose={() => setBuyItem(null)} />
      )}
    </div>
  );
}
