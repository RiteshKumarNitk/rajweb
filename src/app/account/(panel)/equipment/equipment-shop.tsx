"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MapPin, Minus, Package, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { OrderStatusBadge } from "@/shared/components/equipment/order-badges";
import { TestCheckoutModal } from "@/shared/components/equipment/test-checkout-modal";
import { apiPost } from "@/lib/api-client";
import { formatInrHelper } from "@/lib/format";
import { formatDate, cn } from "@/lib/utils";
import { storeLabel } from "@/modules/equipment/order-status";

export interface ShopItem {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  image: string | null;
  sku: string | null;
  specifications: string | null;
  category: string;
  price: number;
  stockQuantity: number;
  storeKey: string;
  state: { name: string } | null;
  district: { name: string } | null;
}

export interface OwnedItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  image: string | null;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  purchasedAt: string;
  state: { name: string } | null;
  district: { name: string } | null;
}

interface Buyer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  RACQUETS: "Racquets",
  BALLS: "Balls",
  GRIPS: "Grips",
  BAGS: "Bags",
  ACCESSORIES: "Accessories",
  TRAINING: "Training",
  OTHER: "Other",
};

function specLines(spec: string | null): { label: string; value: string }[] {
  return (spec ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : { label: "", value: l };
    });
}

function ItemImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100 text-slate-300", className)}>
        <Package className="h-10 w-10" />
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-slate-50", className)}>
      <Image src={src} alt={alt} fill unoptimized sizes="(max-width: 640px) 100vw, 300px" className="object-cover" />
    </div>
  );
}

function stockLabel(stock: number): { text: string; className: string } {
  if (stock <= 0) return { text: "Out of stock", className: "text-red-600" };
  if (stock <= 5) return { text: `Only ${stock} left`, className: "text-amber-600" };
  return { text: "In stock", className: "text-emerald-600" };
}

export function EquipmentShop({
  items,
  owned,
  home,
  buyer,
  paymentsEnabled,
}: {
  items: ShopItem[];
  owned: OwnedItem[];
  home: { onboarded: boolean; stateName: string | null; districtName: string | null };
  buyer: Buyer;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"shop" | "owned">("shop");
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<ShopItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [cart, setCart] = useState<{ storeKey: string; lines: Record<string, number> }>({ storeKey: "", lines: {} });
  const [pendingSwitch, setPendingSwitch] = useState<{ item: ShopItem; qty: number } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [delivery, setDelivery] = useState(buyer);
  const [placing, setPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [payOrderId, setPayOrderId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const categories = useMemo(() => ["ALL", ...Array.from(new Set(items.map((i) => i.category)))], [items]);
  const filtered = items.filter(
    (i) =>
      (category === "ALL" || i.category === category) &&
      (!query.trim() || `${i.name} ${i.sku ?? ""} ${i.shortDescription ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
  );
  const stores = Array.from(new Set(items.map((i) => storeLabel(i))));

  const cartLines = Object.entries(cart.lines)
    .map(([id, qty]) => ({ item: byId.get(id), qty }))
    .filter((l): l is { item: ShopItem; qty: number } => !!l.item);
  const cartCount = cartLines.reduce((n, l) => n + l.qty, 0);
  const subtotal = cartLines.reduce((n, l) => n + l.item.price * l.qty, 0);
  const cartStore = cartLines[0] ? storeLabel(cartLines[0].item) : "";

  function addToCart(item: ShopItem, qty: number) {
    if (cart.storeKey && cart.storeKey !== item.storeKey && cartLines.length > 0) {
      setPendingSwitch({ item, qty });
      return;
    }
    const current = cart.storeKey === item.storeKey ? cart.lines[item.id] ?? 0 : 0;
    const next = Math.min(current + qty, Math.min(10, item.stockQuantity));
    setCart({ storeKey: item.storeKey, lines: { ...(cart.storeKey === item.storeKey ? cart.lines : {}), [item.id]: next } });
    toast.success(`${item.name} added to cart`);
    setDetail(null);
  }

  function setLineQty(id: string, qty: number) {
    const item = byId.get(id);
    if (!item) return;
    const lines = { ...cart.lines };
    if (qty <= 0) delete lines[id];
    else lines[id] = Math.min(qty, Math.min(10, item.stockQuantity));
    setCart({ storeKey: Object.keys(lines).length ? cart.storeKey : "", lines });
  }

  const deliveryErrors = {
    name: delivery.name.trim().length < 2 ? "Enter the recipient's name" : "",
    phone: /^[6-9]\d{9}$/.test(delivery.phone.trim()) ? "" : "Enter a valid 10-digit mobile number",
    address: delivery.address.trim().length < 10 ? "Enter the full delivery address" : "",
    city: delivery.city.trim().length < 2 ? "Enter the city" : "",
    pincode: /^\d{6}$/.test(delivery.pincode.trim()) ? "" : "Enter a valid 6-digit pincode",
  };
  const deliveryValid = Object.values(deliveryErrors).every((e) => !e);

  async function placeOrder() {
    setPlacing(true);
    setCheckoutError("");
    try {
      const res = await apiPost("/api/account/equipment/orders", {
        items: cartLines.map((l) => ({ equipmentId: l.item.id, quantity: l.qty })),
        delivery: { ...delivery, email: delivery.email.trim() },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        const issue = Array.isArray(json?.error?.details) ? json.error.details[0]?.message : null;
        setCheckoutError(issue || json?.error?.message || "Could not create the order.");
        return;
      }
      setCart({ storeKey: "", lines: {} });
      setCheckoutOpen(false);
      if (paymentsEnabled) {
        setPayOrderId(json.data.id);
      } else {
        toast.message(`Order ${json.data.orderNumber} saved — online payment is not available yet.`);
        router.push(`/account/orders/${json.data.id}`);
      }
    } catch {
      setCheckoutError("Network error — please try again.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Equipment Shop</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-4 w-4" />
            {home.onboarded && home.districtName
              ? `Equipment available to members of ${home.districtName}, ${home.stateName}`
              : "Showing the common RRA catalog"}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {(["shop", "owned"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn("rounded-md px-3 py-1.5 font-medium", tab === t ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50")}
            >
              {t === "shop" ? "Shop" : `My Equipment (${owned.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === "owned" ? (
        <Card>
          <CardContent className="p-0">
            {owned.length === 0 ? (
              <EmptyState
                title="No equipment yet"
                description="Items appear here once their order is paid."
                icon={<Package className="h-8 w-8" />}
                action={<Button size="sm" onClick={() => setTab("shop")}>Browse the shop</Button>}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {owned.map((o) => (
                  <li key={o.id} className="flex items-center gap-4 p-4">
                    <ItemImage src={o.image} alt={o.name} className="h-14 w-14 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{o.name}</p>
                      <p className="text-xs text-slate-500">
                        {o.quantity} × {formatInrHelper(o.unitPrice)} · {storeLabel(o)} · {formatDate(o.purchasedAt)}
                        {o.sku ? ` · SKU ${o.sku}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <OrderStatusBadge status={o.orderStatus} />
                      <Link href={`/account/orders/${o.orderId}`} className="font-mono text-xs text-accent hover:underline">
                        {o.orderNumber}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search equipment or SKU" className="pl-9" aria-label="Search equipment" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      category === c ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {c === "ALL" ? "All" : CATEGORY_LABELS[c] ?? c}
                  </button>
                ))}
              </div>
            </div>
            {stores.length > 0 && <p className="text-xs text-slate-500">Stores: {stores.join(" · ")}</p>}

            {items.length === 0 ? (
              <Card>
                <EmptyState
                  title="No equipment available yet"
                  description="Your district association has not listed any equipment. Check back soon."
                  icon={<Package className="h-8 w-8" />}
                />
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <EmptyState title="Nothing matches" description="Try another category or search term." />
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => {
                  const stock = stockLabel(item.stockQuantity);
                  return (
                    <Card key={item.id} className="flex flex-col overflow-hidden">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => {
                          setDetail(item);
                          setDetailQty(1);
                        }}
                        aria-label={`View ${item.name}`}
                      >
                        <ItemImage src={item.image} alt={item.name} className="aspect-[4/3] w-full" />
                      </button>
                      <CardContent className="flex flex-1 flex-col gap-2 p-4">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{CATEGORY_LABELS[item.category] ?? item.category}</p>
                        <p className="font-semibold leading-snug text-slate-900">{item.name}</p>
                        {item.shortDescription && <p className="line-clamp-2 text-xs text-slate-500">{item.shortDescription}</p>}
                        <p className="text-[11px] text-slate-400">Sold by {storeLabel(item)}</p>
                        <div className="mt-auto flex items-end justify-between pt-2">
                          <div>
                            <p className="text-lg font-bold text-primary">{formatInrHelper(item.price)}</p>
                            <p className={cn("text-xs font-medium", stock.className)}>{stock.text}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => { setDetail(item); setDetailQty(1); }}>
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" /> Cart {cartCount > 0 && <span className="text-sm font-normal text-slate-500">({cartCount})</span>}
              </CardTitle>
              {cartStore && <p className="text-xs text-slate-500">From {cartStore}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              {cartLines.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Your cart is empty.</p>
              ) : (
                <>
                  <ul className="space-y-3">
                    {cartLines.map(({ item, qty }) => (
                      <li key={item.id} className="flex items-start gap-3">
                        <ItemImage src={item.image} alt={item.name} className="h-12 w-12 shrink-0 rounded" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{formatInrHelper(item.price)} each</p>
                          <div className="mt-1 flex items-center gap-1">
                            <button type="button" className="rounded border p-1 hover:bg-slate-50" onClick={() => setLineQty(item.id, qty - 1)} aria-label={`Decrease ${item.name}`}>
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm">{qty}</span>
                            <button
                              type="button"
                              className="rounded border p-1 hover:bg-slate-50 disabled:opacity-40"
                              disabled={qty >= Math.min(10, item.stockQuantity)}
                              onClick={() => setLineQty(item.id, qty + 1)}
                              aria-label={`Increase ${item.name}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button type="button" className="ml-auto rounded p-1 text-slate-400 hover:text-red-600" onClick={() => setLineQty(item.id, 0)} aria-label={`Remove ${item.name}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-semibold">{formatInrHelper(item.price * qty)}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatInrHelper(subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="text-emerald-700">Free</span></div>
                    <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatInrHelper(subtotal)}</span></div>
                  </div>
                  <Button className="w-full" onClick={() => { setCheckoutError(""); setCheckoutOpen(true); }}>
                    Checkout
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Item details */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={detail.name}>
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <div className="grid gap-0 sm:grid-cols-2">
              <ItemImage src={detail.image} alt={detail.name} className="aspect-square w-full sm:rounded-l-xl" />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{CATEGORY_LABELS[detail.category] ?? detail.category}</p>
                    <h2 className="text-lg font-bold text-slate-900">{detail.name}</h2>
                  </div>
                  <button type="button" onClick={() => setDetail(null)} className="rounded p-1 hover:bg-slate-100" aria-label="Close">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-2xl font-bold text-primary">{formatInrHelper(detail.price)}</p>
                <p className={cn("text-sm font-medium", stockLabel(detail.stockQuantity).className)}>{stockLabel(detail.stockQuantity).text}</p>
                <p className="text-xs text-slate-500">
                  Sold by {storeLabel(detail)}
                  {detail.sku ? ` · SKU ${detail.sku}` : ""}
                </p>
                {(detail.description || detail.shortDescription) && <p className="whitespace-pre-line text-sm text-slate-700">{detail.description || detail.shortDescription}</p>}
                {specLines(detail.specifications).length > 0 && (
                  <dl className="divide-y divide-slate-100 rounded-md border border-slate-100 text-sm">
                    {specLines(detail.specifications).map((s, i) => (
                      <div key={i} className="flex justify-between gap-3 px-3 py-1.5">
                        <dt className="text-slate-500">{s.label}</dt>
                        <dd className="text-right font-medium text-slate-800">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {detail.stockQuantity > 0 && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex items-center rounded-md border">
                      <button type="button" className="p-2 disabled:opacity-40" disabled={detailQty <= 1} onClick={() => setDetailQty(detailQty - 1)} aria-label="Decrease quantity">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{detailQty}</span>
                      <button
                        type="button"
                        className="p-2 disabled:opacity-40"
                        disabled={detailQty >= Math.min(10, detail.stockQuantity)}
                        onClick={() => setDetailQty(detailQty + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <Button className="flex-1" onClick={() => addToCart(detail, detailQty)}>
                      <ShoppingCart className="mr-1.5 h-4 w-4" /> Add to cart
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Different store confirmation */}
      {pendingSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-5">
              <p className="font-semibold text-slate-900">Start a new cart?</p>
              <p className="text-sm text-slate-600">
                Your cart has items from {cartStore}. {pendingSwitch.item.name} is sold by {storeLabel(pendingSwitch.item)} — each order comes from one store.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPendingSwitch(null)}>Keep current cart</Button>
                <Button
                  onClick={() => {
                    const { item, qty } = pendingSwitch;
                    setPendingSwitch(null);
                    setCart({ storeKey: item.storeKey, lines: { [item.id]: Math.min(qty, item.stockQuantity, 10) } });
                    setDetail(null);
                    toast.success(`${item.name} added to a new cart`);
                  }}
                >
                  Start new cart
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Checkout */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Checkout">
          <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Checkout</CardTitle>
                <p className="mt-1 text-xs text-slate-500">From {cartStore}</p>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} disabled={placing} className="rounded p-1 hover:bg-slate-100" aria-label="Close checkout">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-[1fr_240px]">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">Delivery details</p>
                {(
                  [
                    ["name", "Recipient name", "name"],
                    ["phone", "Mobile number", "tel-national"],
                    ["email", "Email (optional)", "email"],
                    ["address", "Address", "street-address"],
                    ["city", "City", "address-level2"],
                    ["pincode", "Pincode", "postal-code"],
                  ] as const
                ).map(([key, label, autoComplete]) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`d-${key}`}>{label}</Label>
                    <Input
                      id={`d-${key}`}
                      value={delivery[key]}
                      autoComplete={autoComplete}
                      inputMode={key === "phone" || key === "pincode" ? "numeric" : undefined}
                      onChange={(e) => setDelivery({ ...delivery, [key]: e.target.value })}
                    />
                    {key !== "email" && delivery[key] && deliveryErrors[key as keyof typeof deliveryErrors] && (
                      <p className="text-xs text-red-600">{deliveryErrors[key as keyof typeof deliveryErrors]}</p>
                    )}
                  </div>
                ))}
                <p className="text-xs text-slate-500">
                  Delivering within {home.districtName ? `${home.districtName}, ${home.stateName}` : "your district"}.
                </p>
              </div>
              <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-700">Price breakdown</p>
                <ul className="space-y-1.5">
                  {cartLines.map(({ item, qty }) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span className="text-slate-600">{item.name} × {qty}</span>
                      <span>{formatInrHelper(item.price * qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 border-t border-slate-200 pt-2">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatInrHelper(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="text-emerald-700">Free</span></div>
                  <div className="flex justify-between text-base font-bold"><span>Grand total</span><span>{formatInrHelper(subtotal)}</span></div>
                </div>
                <p className="text-[11px] text-slate-500">Prices are confirmed by the server when the order is created.</p>
              </div>
              {checkoutError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{checkoutError}</div>}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="outline" onClick={() => setCheckoutOpen(false)} disabled={placing}>Back to cart</Button>
                <Button onClick={placeOrder} disabled={!deliveryValid || placing || cartLines.length === 0}>
                  {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : paymentsEnabled ? `Proceed to payment · ${formatInrHelper(subtotal)}` : "Place order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {payOrderId && <TestCheckoutModal orderId={payOrderId} onClose={() => setPayOrderId(null)} />}
    </div>
  );
}
