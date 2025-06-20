-- CreateTable
CREATE TABLE "MetalPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "metal" TEXT NOT NULL,
    "karat" TEXT,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
