-- CreateTable
CREATE TABLE "Chemical" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "casNumber" TEXT,
    "formula" TEXT,
    "manufacturer" TEXT,
    "supplier" TEXT,
    "ghsPictograms" TEXT NOT NULL DEFAULT '[]',
    "hazardClass" TEXT,
    "signalWord" TEXT,
    "hazardStatements" TEXT NOT NULL DEFAULT '[]',
    "precautionaryStatements" TEXT NOT NULL DEFAULT '[]',
    "flashPoint" TEXT,
    "boilingPoint" TEXT,
    "physicalState" TEXT,
    "colour" TEXT,
    "odour" TEXT,
    "isHazardous" BOOLEAN NOT NULL DEFAULT true,
    "unNumber" TEXT,
    "mhiThreshold" REAL,
    "mhiQuantityOnSite" REAL,
    "pubchemCid" INTEGER,
    "emergencyContact" TEXT,
    "poisonCentre" TEXT,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Chemical_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SdsDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chemicalId" TEXT NOT NULL,
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
    CONSTRAINT "SdsDocument_chemicalId_fkey" FOREIGN KEY ("chemicalId") REFERENCES "Chemical" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SdsDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChemicalLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chemicalId" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "buildingArea" TEXT,
    "quantity" REAL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "maxQuantity" REAL,
    "storageConditions" TEXT,
    "qrToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChemicalLocation_chemicalId_fkey" FOREIGN KEY ("chemicalId") REFERENCES "Chemical" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Chemical_referenceNo_key" ON "Chemical"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChemicalLocation_qrToken_key" ON "ChemicalLocation"("qrToken");
