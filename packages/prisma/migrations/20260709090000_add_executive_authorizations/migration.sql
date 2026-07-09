-- CreateEnum
CREATE TYPE "ExecutiveAuthorizationStatus" AS ENUM (
  'DRAFT',
  'READY',
  'SENT',
  'PARTIALLY_SIGNED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "ExecutiveAuthorizationType" AS ENUM (
  'BOARD_RESOLUTION',
  'GENERAL_AUTHORIZATION'
);

-- CreateTable
CREATE TABLE "ExecutiveAuthorization" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "companyLegalName" TEXT NOT NULL,
  "type" "ExecutiveAuthorizationType" NOT NULL,
  "status" "ExecutiveAuthorizationStatus" NOT NULL DEFAULT 'DRAFT',
  "actionDate" TIMESTAMP(3),
  "templateKey" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "signers" JSONB NOT NULL,
  "renderedMarkdown" TEXT NOT NULL,
  "notes" TEXT,
  "sentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "teamId" INTEGER NOT NULL,
  "createdByUserId" INTEGER NOT NULL,
  "envelopeId" TEXT,

  CONSTRAINT "ExecutiveAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveAuthorization_envelopeId_key" ON "ExecutiveAuthorization"("envelopeId");

-- CreateIndex
CREATE INDEX "ExecutiveAuthorization_teamId_idx" ON "ExecutiveAuthorization"("teamId");

-- CreateIndex
CREATE INDEX "ExecutiveAuthorization_createdByUserId_idx" ON "ExecutiveAuthorization"("createdByUserId");

-- CreateIndex
CREATE INDEX "ExecutiveAuthorization_status_idx" ON "ExecutiveAuthorization"("status");

-- CreateIndex
CREATE INDEX "ExecutiveAuthorization_type_idx" ON "ExecutiveAuthorization"("type");

-- CreateIndex
CREATE INDEX "ExecutiveAuthorization_actionDate_idx" ON "ExecutiveAuthorization"("actionDate");

-- CreateIndex
CREATE INDEX "ExecutiveAuthorization_createdAt_idx" ON "ExecutiveAuthorization"("createdAt");

-- AddForeignKey
ALTER TABLE "ExecutiveAuthorization" ADD CONSTRAINT "ExecutiveAuthorization_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveAuthorization" ADD CONSTRAINT "ExecutiveAuthorization_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveAuthorization" ADD CONSTRAINT "ExecutiveAuthorization_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE SET NULL ON UPDATE CASCADE;
