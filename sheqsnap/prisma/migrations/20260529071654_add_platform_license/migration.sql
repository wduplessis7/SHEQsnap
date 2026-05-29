-- CreateTable
CREATE TABLE "PlatformLicense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "serverTier" TEXT NOT NULL DEFAULT 'STARTUP',
    "setupFee" REAL NOT NULL DEFAULT 0,
    "annualLicenseFee" REAL NOT NULL DEFAULT 0,
    "monthlyHostingFee" REAL NOT NULL DEFAULT 850,
    "perUserRate" REAL NOT NULL DEFAULT 385,
    "licenseStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "licenseRenewal" DATETIME NOT NULL,
    "backupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupRetentionMonths" INTEGER NOT NULL DEFAULT 12,
    "maxLicensedUsers" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'REPORTER',
    "departmentId" TEXT,
    "companyId" TEXT,
    "responsiblePersonId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mocApprover" BOOLEAN NOT NULL DEFAULT false,
    "isLicensed" BOOLEAN NOT NULL DEFAULT true,
    "reportingOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_responsiblePersonId_fkey" FOREIGN KEY ("responsiblePersonId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "companyId", "createdAt", "departmentId", "email", "id", "mocApprover", "name", "password", "responsiblePersonId", "role", "updatedAt") SELECT "active", "companyId", "createdAt", "departmentId", "email", "id", "mocApprover", "name", "password", "responsiblePersonId", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
