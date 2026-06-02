-- Drop old chemical tables (no data, safe to drop)
DROP TABLE IF EXISTS "SdsDocument";
DROP TABLE IF EXISTS "ChemicalLocation";
DROP TABLE IF EXISTS "Chemical";

-- CreateTable ChemicalItem
CREATE TABLE "ChemicalItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "referenceNo" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "tradeName" TEXT,
  "manufacturer" TEXT,
  "supplier" TEXT,
  "physicalState" TEXT,
  "colour" TEXT,
  "odour" TEXT,
  "flashPoint" TEXT,
  "boilingPoint" TEXT,
  "unNumber" TEXT,
  "mhiThreshold" REAL,
  "mhiQuantityOnSite" REAL,
  "isHazardous" BOOLEAN NOT NULL DEFAULT true,
  "emergencyContact" TEXT,
  "poisonCentre" TEXT,
  "notes" TEXT,
  "addedById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME,
  CONSTRAINT "ChemicalItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable ChemicalLibrary
CREATE TABLE "ChemicalLibrary" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "casNumber" TEXT,
  "formula" TEXT,
  "ghsPictograms" TEXT NOT NULL DEFAULT '[]',
  "hazardClass" TEXT,
  "signalWord" TEXT,
  "hazardStatements" TEXT NOT NULL DEFAULT '[]',
  "precautionaryStatements" TEXT NOT NULL DEFAULT '[]',
  "pubchemCid" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateTable ChemicalItemComponent
CREATE TABLE "ChemicalItemComponent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chemicalItemId" TEXT NOT NULL,
  "libraryId" TEXT NOT NULL,
  "concentration" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChemicalItemComponent_chemicalItemId_fkey" FOREIGN KEY ("chemicalItemId") REFERENCES "ChemicalItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ChemicalItemComponent_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "ChemicalLibrary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable SdsDocument (recreated with chemicalItemId)
CREATE TABLE "SdsDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chemicalItemId" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "language" TEXT NOT NULL DEFAULT 'English',
  "effectiveDate" DATETIME,
  "expiryDate" DATETIME,
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "uploadedById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" DATETIME,
  CONSTRAINT "SdsDocument_chemicalItemId_fkey" FOREIGN KEY ("chemicalItemId") REFERENCES "ChemicalItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SdsDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable ChemicalLocation (recreated with chemicalItemId)
CREATE TABLE "ChemicalLocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chemicalItemId" TEXT NOT NULL,
  "locationName" TEXT NOT NULL,
  "buildingArea" TEXT,
  "quantity" REAL,
  "unit" TEXT NOT NULL DEFAULT 'kg',
  "maxQuantity" REAL,
  "storageConditions" TEXT,
  "qrToken" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ChemicalLocation_chemicalItemId_fkey" FOREIGN KEY ("chemicalItemId") REFERENCES "ChemicalItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX "ChemicalItem_referenceNo_key" ON "ChemicalItem"("referenceNo");
CREATE UNIQUE INDEX "ChemicalLibrary_casNumber_key" ON "ChemicalLibrary"("casNumber");
CREATE UNIQUE INDEX "ChemicalItemComponent_chemicalItemId_libraryId_key" ON "ChemicalItemComponent"("chemicalItemId", "libraryId");
CREATE UNIQUE INDEX "ChemicalLocation_qrToken_key" ON "ChemicalLocation"("qrToken");
