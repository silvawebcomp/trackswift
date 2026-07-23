-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ShipmentStage" AS ENUM ('SHIPMENT_CREATED', 'PROCESSING_IN_ITALY', 'PACKAGE_PICKED_UP', 'DEPARTED_ORIGIN_FACILITY', 'INTERNATIONAL_TRANSIT', 'CUSTOMS_CLEARANCE', 'ARRIVED_IN_UNITED_STATES', 'LOCAL_DISTRIBUTION_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL DEFAULT 'Italy',
    "destinationCity" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL DEFAULT 'United States',
    "weightKg" DECIMAL(10,2),
    "dimensions" TEXT,
    "currentStage" "ShipmentStage" NOT NULL DEFAULT 'SHIPMENT_CREATED',
    "currentLocation" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "carrierNotes" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "stage" "ShipmentStage" NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "eventTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_createdAt_idx" ON "Admin"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingId_key" ON "Shipment"("trackingId");

-- CreateIndex
CREATE INDEX "Shipment_customerEmail_updatedAt_idx" ON "Shipment"("customerEmail", "updatedAt");

-- CreateIndex
CREATE INDEX "Shipment_createdById_createdAt_idx" ON "Shipment"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "Shipment_currentStage_updatedAt_idx" ON "Shipment"("currentStage", "updatedAt");

-- CreateIndex
CREATE INDEX "ProgressEvent_shipmentId_eventTime_idx" ON "ProgressEvent"("shipmentId", "eventTime");

-- CreateIndex
CREATE INDEX "ProgressEvent_createdById_createdAt_idx" ON "ProgressEvent"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEvent" ADD CONSTRAINT "ProgressEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEvent" ADD CONSTRAINT "ProgressEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
