-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Formula" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Formula" ("id", "updatedAt", "value") SELECT "id", "updatedAt", "value" FROM "Formula";
DROP TABLE "Formula";
ALTER TABLE "new_Formula" RENAME TO "Formula";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
