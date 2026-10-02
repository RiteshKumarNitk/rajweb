import prisma from "@/infrastructure/database/prisma";
import { requireAuth } from "@/security/auth/session";
import { getMemberHome } from "@/modules/account/member-home.server";
import { getMemberCatalog } from "@/modules/equipment/catalog";
import { getPaymentProvider } from "@/modules/payments/payment-provider";
import { EquipmentShop, type ShopItem, type OwnedItem } from "./equipment-shop";

export const dynamic = "force-dynamic";

export default async function AccountEquipmentPage() {
  const user = await requireAuth();
  const home = await getMemberHome(user.id);

  const [items, owned, buyer] = await Promise.all([
    // Server-side scope: central + own state store + own district store only.
    getMemberCatalog(home),
    prisma.equipmentPurchaseOrderItem.findMany({
      where: { order: { userId: user.id, paymentStatus: "PAID" } },
      orderBy: { order: { createdAt: "desc" } },
      select: {
        id: true,
        productNameSnapshot: true,
        skuSnapshot: true,
        quantity: true,
        unitPriceSnapshot: true,
        equipment: { select: { image: true } },
        order: { select: { id: true, orderNumber: true, createdAt: true, status: true, state: { select: { name: true } }, district: { select: { name: true } } } },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, profile: { select: { address: true, city: true, pincode: true } } },
    }),
  ]);

  const shopItems: ShopItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    shortDescription: i.shortDescription,
    description: i.description,
    image: i.image,
    sku: i.sku,
    specifications: i.specifications,
    category: i.category,
    price: i.price,
    stockQuantity: i.stockQuantity,
    storeKey: `${i.stateId ?? ""}|${i.districtId ?? ""}`,
    state: i.state,
    district: i.district,
  }));

  const ownedItems: OwnedItem[] = owned.map((o) => ({
    id: o.id,
    name: o.productNameSnapshot,
    sku: o.skuSnapshot,
    quantity: o.quantity,
    unitPrice: o.unitPriceSnapshot,
    image: o.equipment.image,
    orderId: o.order.id,
    orderNumber: o.order.orderNumber,
    orderStatus: o.order.status,
    purchasedAt: o.order.createdAt.toISOString(),
    state: o.order.state,
    district: o.order.district,
  }));

  return (
    <EquipmentShop
      items={shopItems}
      owned={ownedItems}
      home={{ hasDistrict: home.hasDistrict, stateName: home.stateName, districtName: home.districtName }}
      buyer={{
        name: buyer?.name ?? "",
        email: buyer?.email ?? "",
        phone: buyer?.phone ?? "",
        address: buyer?.profile?.address ?? "",
        city: buyer?.profile?.city ?? "",
        pincode: buyer?.profile?.pincode ?? "",
      }}
      paymentsEnabled={getPaymentProvider() !== null}
    />
  );
}
