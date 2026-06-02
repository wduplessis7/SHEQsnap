-- AlterTable
ALTER TABLE "Action" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "LegalAppointment" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "LegalAppointment" ADD COLUMN "disability" TEXT;
ALTER TABLE "LegalAppointment" ADD COLUMN "gender" TEXT;
ALTER TABLE "LegalAppointment" ADD COLUMN "race" TEXT;

-- AlterTable
ALTER TABLE "NearMiss" ADD COLUMN "deletedAt" DATETIME;
