"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { MediaImage } from "@/shared/components/ui/media-image";
import { useSession } from "next-auth/react";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
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
  const [quantity, setQuantity] = useState(1);
  const [placing, setPlacing] = useState(false);
  const maxQty = Math.min(item.stockQuantity, 10);

  function handleSignInRedirect() {
    router.push(`/account/login?callbackUrl=${encodeURIComponent(`/equipment?item=${item.slug}`)}`);
  }

  async function handlePlaceOrder() {
    setPlacing(true);
    try {
      const res = await apiFetch("/api/equipment/purchase", {
        method: "POST",
        body: JSON.stringify({ items: [{ equipmentId: item.id, quantity }] }),
      });
      const { data, message } = await handleApiFetch<{ orderNumber: string; total: number }>(res);
      toast.success(message ?? "Order placed");
      router.push(`/account/orders?placed=${encodeURIComponent(data.orderNumber)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">Order Summary</h2>
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
              <p className="font-semibold text-primary">{item.name}</p>
              <p className="text-xs uppercase tracking-wide text-secondary">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </p>
              <p className="text-sm font-bold text-slate-800">{formatInr(item.price)}</p>
            </div>
          </div>

          {authenticated ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">Quantity</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || placing}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty || placing}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm text-slate-600">Total</span>
                <span className="text-lg font-extrabold text-primary">{formatInr(item.price * quantity)}</span>
              </div>

              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Online payment is coming soon. Your order will be reserved as{" "}
                <strong>pending payment</strong> and RRA will contact you to complete the purchase.
              </p>

              <Button className="w-full" onClick={handlePlaceOrder} disabled={placing || maxQty < 1}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                {placing ? "Placing order…" : "Place Order"}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Sign in to your RRA account to purchase equipment.
              </p>
              <Button className="w-full" onClick={handleSignInRedirect}>
                Sign in to continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EquipmentCatalog({ items }: { items: CatalogItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [buyItem, setBuyItem] = useState<CatalogItem | null>(null);
  const { status } = useSession();
  const authenticated = status === "authenticated";

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((i) => cats.add(i.category));
    return ["All", ...Array.from(cats)];
  }, [items]);

  const filtered =
    selectedCategory === "All" ? items : items.filter((i) => i.category === selectedCategory);

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
