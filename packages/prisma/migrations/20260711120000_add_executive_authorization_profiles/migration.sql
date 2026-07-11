-- AlterTable
ALTER TABLE "ExecutiveAuthorization"
ADD COLUMN "externalId" TEXT,
ADD COLUMN "requestFingerprint" TEXT,
ADD COLUMN "generatedDocumentDataId" TEXT;

-- CreateTable
CREATE TABLE "ExecutiveAuthorizationProfile" (
  "id" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "payloadDefaults" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "teamId" INTEGER NOT NULL,

  CONSTRAINT "ExecutiveAuthorizationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveAuthorization_teamId_externalId_key" ON "ExecutiveAuthorization"("teamId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveAuthorizationProfile_teamId_templateKey_key" ON "ExecutiveAuthorizationProfile"("teamId", "templateKey");

-- CreateIndex
CREATE INDEX "ExecutiveAuthorizationProfile_teamId_idx" ON "ExecutiveAuthorizationProfile"("teamId");

-- AddForeignKey
ALTER TABLE "ExecutiveAuthorizationProfile" ADD CONSTRAINT "ExecutiveAuthorizationProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
