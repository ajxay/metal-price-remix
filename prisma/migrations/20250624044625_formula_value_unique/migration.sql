/*
  Warnings:

  - A unique constraint covering the columns `[value]` on the table `Formula` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Formula_value_key" ON "Formula"("value");
