-- CreateTable
CREATE TABLE "VariantConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopifyVariantId" TEXT NOT NULL,
    "metalType" TEXT,
    "goldPurity" TEXT,
    "metalWeight" REAL,
    "diamondPrice" REAL,
    "moissanitePrice" REAL,
    "gemstonePrice" REAL,
    "makingCharges" REAL,
    "wastage" REAL,
    "miscCharges" REAL,
    "shippingCharges" REAL,
    "markup" REAL,
    "tax" REAL,
    "compareAtMargin" REAL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VariantConfig_shopifyVariantId_key" ON "VariantConfig"("shopifyVariantId");
