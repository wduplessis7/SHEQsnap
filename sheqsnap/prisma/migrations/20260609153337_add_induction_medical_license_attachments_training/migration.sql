-- CreateTable
CREATE TABLE "ChemicalTraining" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chemicalItemId" TEXT NOT NULL,
    "trainingDate" DATETIME NOT NULL,
    "trainerName" TEXT NOT NULL,
    "location" TEXT,
    "duration" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChemicalTraining_chemicalItemId_fkey" FOREIGN KEY ("chemicalItemId") REFERENCES "ChemicalItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChemicalTrainingAttendee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainingId" TEXT NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "attendeeType" TEXT NOT NULL DEFAULT 'employee',
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChemicalTrainingAttendee_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "ChemicalTraining" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "nearMissId" TEXT,
    "incidentId" TEXT,
    "actionId" TEXT,
    "licenseId" TEXT,
    "inductionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attachment_nearMissId_fkey" FOREIGN KEY ("nearMissId") REFERENCES "NearMiss" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attachment_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attachment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attachment_inductionId_fkey" FOREIGN KEY ("inductionId") REFERENCES "Induction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Attachment" ("actionId", "createdAt", "filename", "id", "incidentId", "mimeType", "nearMissId", "originalName", "size", "uploadedById") SELECT "actionId", "createdAt", "filename", "id", "incidentId", "mimeType", "nearMissId", "originalName", "size", "uploadedById" FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
CREATE TABLE "new_Induction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "recordType" TEXT NOT NULL DEFAULT 'induction',
    "inducteeName" TEXT NOT NULL,
    "inducteeType" TEXT NOT NULL,
    "inducteeId" TEXT,
    "inductionType" TEXT NOT NULL,
    "conductedById" TEXT,
    "conductedByName" TEXT NOT NULL,
    "conductedDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "validityMonths" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'current',
    "medicalResult" TEXT,
    "medicalProvider" TEXT,
    "departmentId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Induction" ("conductedById", "conductedByName", "conductedDate", "createdAt", "createdById", "departmentId", "expiryDate", "id", "inducteeId", "inducteeName", "inducteeType", "inductionType", "notes", "referenceNo", "status", "updatedAt", "validityMonths") SELECT "conductedById", "conductedByName", "conductedDate", "createdAt", "createdById", "departmentId", "expiryDate", "id", "inducteeId", "inducteeName", "inducteeType", "inductionType", "notes", "referenceNo", "status", "updatedAt", "validityMonths" FROM "Induction";
DROP TABLE "Induction";
ALTER TABLE "new_Induction" RENAME TO "Induction";
CREATE UNIQUE INDEX "Induction_referenceNo_key" ON "Induction"("referenceNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
