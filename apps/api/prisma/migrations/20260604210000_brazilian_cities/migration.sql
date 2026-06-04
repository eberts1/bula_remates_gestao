-- CreateTable
CREATE TABLE "brazilian_cities" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "normalized_name" TEXT NOT NULL,

    CONSTRAINT "brazilian_cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brazilian_cities_normalized_name_state_key" ON "brazilian_cities"("normalized_name", "state");
CREATE INDEX "brazilian_cities_state_idx" ON "brazilian_cities"("state");
