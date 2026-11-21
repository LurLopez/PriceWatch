-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quality_rating" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "specs_score" DOUBLE PRECISION NOT NULL,
    "image_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_history" (
    "id" TEXT NOT NULL,
    "weight_price" DOUBLE PRECISION NOT NULL,
    "weight_quality" DOUBLE PRECISION NOT NULL,
    "weight_stock" DOUBLE PRECISION NOT NULL,
    "weight_specs" DOUBLE PRECISION NOT NULL,
    "context_profile" TEXT NOT NULL DEFAULT 'personalizado',
    "source_run_id" TEXT,
    "top_product_id" TEXT NOT NULL,
    "top_product_name" TEXT NOT NULL,
    "top_product_score" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_runs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "received" INTEGER NOT NULL DEFAULT 0,
    "accepted" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retrieved_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "error_code" TEXT,

    CONSTRAINT "source_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_listings" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "brand" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT,
    "rating" DOUBLE PRECISION,
    "availability_reference" INTEGER,
    "specs" JSONB,
    "source_url" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "retrieved_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ranking_history_evaluated_at_idx" ON "ranking_history"("evaluated_at");

-- CreateIndex
CREATE INDEX "ranking_history_source_run_id_idx" ON "ranking_history"("source_run_id");

-- CreateIndex
CREATE INDEX "source_runs_source_started_at_idx" ON "source_runs"("source", "started_at");

-- CreateIndex
CREATE INDEX "source_listings_external_id_idx" ON "source_listings"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_listings_run_id_external_id_key" ON "source_listings"("run_id", "external_id");

-- AddForeignKey
ALTER TABLE "ranking_history" ADD CONSTRAINT "ranking_history_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "source_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_listings" ADD CONSTRAINT "source_listings_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "source_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

