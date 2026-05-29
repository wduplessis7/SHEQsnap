-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformLicense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "serverTier" TEXT NOT NULL DEFAULT 'STARTUP',
    "setupFee" REAL NOT NULL DEFAULT 0,
    "annualLicenseFee" REAL NOT NULL DEFAULT 0,
    "monthlyHostingFee" REAL NOT NULL DEFAULT 650,
    "perUserRate" REAL NOT NULL DEFAULT 270,
    "monthlySupportHours" REAL NOT NULL DEFAULT 0,
    "supportHourlyRate" REAL NOT NULL DEFAULT 385,
    "monthlyDevHours" REAL NOT NULL DEFAULT 0,
    "devHourlyRate" REAL NOT NULL DEFAULT 585,
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
INSERT INTO "new_PlatformLicense" ("active", "annualLicenseFee", "backupEnabled", "backupRetentionMonths", "clientName", "createdAt", "id", "licenseRenewal", "licenseStart", "maxLicensedUsers", "monthlyHostingFee", "notes", "perUserRate", "serverTier", "setupFee", "updatedAt") SELECT "active", "annualLicenseFee", "backupEnabled", "backupRetentionMonths", "clientName", "createdAt", "id", "licenseRenewal", "licenseStart", "maxLicensedUsers", "monthlyHostingFee", "notes", "perUserRate", "serverTier", "setupFee", "updatedAt" FROM "PlatformLicense";
DROP TABLE "PlatformLicense";
ALTER TABLE "new_PlatformLicense" RENAME TO "PlatformLicense";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
