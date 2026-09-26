-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'READ', 'REPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('RACQUETS', 'BALLS', 'GRIPS', 'BAGS', 'ACCESSORIES', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "contact_messages" ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "executive_members" DROP COLUMN "order";

-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "driveUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "equipment_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "image" TEXT,
    "category" "EquipmentCategory" NOT NULL DEFAULT 'OTHER',
    "price" INTEGER NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_purchase_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "unitPriceSnapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "equipment_purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_videos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "youtubeVideoId" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_items_slug_key" ON "equipment_items"("slug");

-- CreateIndex
CREATE INDEX "equipment_items_isActive_sortOrder_idx" ON "equipment_items"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "equipment_items_category_idx" ON "equipment_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_purchase_orders_orderNumber_key" ON "equipment_purchase_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "equipment_purchase_orders_userId_idx" ON "equipment_purchase_orders"("userId");

-- CreateIndex
CREATE INDEX "equipment_purchase_orders_status_idx" ON "equipment_purchase_orders"("status");

-- CreateIndex
CREATE INDEX "equipment_purchase_order_items_orderId_idx" ON "equipment_purchase_order_items"("orderId");

-- CreateIndex
CREATE INDEX "equipment_purchase_order_items_equipmentId_idx" ON "equipment_purchase_order_items"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "media_videos_youtubeVideoId_key" ON "media_videos"("youtubeVideoId");

-- CreateIndex
CREATE INDEX "media_videos_isActive_sortOrder_idx" ON "media_videos"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "galleries_sortOrder_idx" ON "galleries"("sortOrder");

-- AddForeignKey
ALTER TABLE "equipment_purchase_orders" ADD CONSTRAINT "equipment_purchase_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_purchase_order_items" ADD CONSTRAINT "equipment_purchase_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "equipment_purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_purchase_order_items" ADD CONSTRAINT "equipment_purchase_order_items_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

