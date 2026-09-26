CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'PROCESSOR');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "DistributorStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING_RECEIPT', 'RECEIVED', 'REISSUED', 'CLOSED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DistributorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyWork" (
    "id" TEXT NOT NULL,
    "processorId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "excellentMail" INTEGER NOT NULL DEFAULT 0,
    "officialMail" INTEGER NOT NULL DEFAULT 0,
    "registeredMail" INTEGER NOT NULL DEFAULT 0,
    "governmentDocs" INTEGER NOT NULL DEFAULT 0,
    "parcels" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyWork_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShipmentEntry" (
    "id" TEXT NOT NULL,
    "dailyWorkId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShipmentEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "processorId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING_RECEIPT',
    "receivedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "reissuedAt" TIMESTAMP(3),
    "reissuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Distributor_name_key" ON "Distributor"("name");
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");
CREATE INDEX "DailyWork_workDate_idx" ON "DailyWork"("workDate");
CREATE UNIQUE INDEX "DailyWork_processorId_workDate_key" ON "DailyWork"("processorId", "workDate");
CREATE INDEX "ShipmentEntry_districtId_idx" ON "ShipmentEntry"("districtId");
CREATE INDEX "ShipmentEntry_distributorId_idx" ON "ShipmentEntry"("distributorId");
CREATE UNIQUE INDEX "ShipmentEntry_dailyWorkId_distributorId_districtId_key" ON "ShipmentEntry"("dailyWorkId", "distributorId", "districtId");
CREATE INDEX "Return_processorId_createdAt_idx" ON "Return"("processorId", "createdAt");
CREATE INDEX "Return_status_idx" ON "Return"("status");
CREATE INDEX "Return_distributorId_idx" ON "Return"("distributorId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

ALTER TABLE "DailyWork" ADD CONSTRAINT "DailyWork_processorId_fkey" FOREIGN KEY ("processorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShipmentEntry" ADD CONSTRAINT "ShipmentEntry_dailyWorkId_fkey" FOREIGN KEY ("dailyWorkId") REFERENCES "DailyWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentEntry" ADD CONSTRAINT "ShipmentEntry_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShipmentEntry" ADD CONSTRAINT "ShipmentEntry_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Return" ADD CONSTRAINT "Return_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Return" ADD CONSTRAINT "Return_processorId_fkey" FOREIGN KEY ("processorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Return" ADD CONSTRAINT "Return_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Return" ADD CONSTRAINT "Return_reissuedById_fkey" FOREIGN KEY ("reissuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
