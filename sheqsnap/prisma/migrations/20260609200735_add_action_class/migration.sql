-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Action" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "linkedType" TEXT NOT NULL DEFAULT 'OTHER',
    "nearMissId" TEXT,
    "incidentId" TEXT,
    "description" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "departmentId" TEXT,
    "assignedGroupId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "actionClass" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "completionNotes" TEXT,
    "dateCompleted" DATETIME,
    "escalationFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Action_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Action_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_nearMissId_fkey" FOREIGN KEY ("nearMissId") REFERENCES "NearMiss" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Action" ("assignedGroupId", "completionNotes", "createdAt", "dateCompleted", "deletedAt", "departmentId", "description", "dueDate", "escalationFlag", "id", "incidentId", "linkedType", "nearMissId", "ownerId", "priority", "referenceNo", "status", "updatedAt") SELECT "assignedGroupId", "completionNotes", "createdAt", "dateCompleted", "deletedAt", "departmentId", "description", "dueDate", "escalationFlag", "id", "incidentId", "linkedType", "nearMissId", "ownerId", "priority", "referenceNo", "status", "updatedAt" FROM "Action";
DROP TABLE "Action";
ALTER TABLE "new_Action" RENAME TO "Action";
CREATE UNIQUE INDEX "Action_referenceNo_key" ON "Action"("referenceNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
