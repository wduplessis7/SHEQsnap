-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "riskCategory" TEXT;

-- CreateTable
CREATE TABLE "Induction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
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
    "departmentId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "riskAssessment" TEXT,
    "affectedAreas" TEXT,
    "proposedDate" DATETIME,
    "implementationDate" DATETIME,
    "reviewDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "requestedById" TEXT,
    "requestedByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "closureNotes" TEXT,
    "checklistTemplateId" TEXT,
    "checklistCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MocChecklistResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "changeRequestId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MocChecklistResponse_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MocChecklistResponse_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MocChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "value" TEXT,
    "passed" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MocChecklistItem_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "MocChecklistResponse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MocChecklistItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistTemplateItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MocNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "changeRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "discussedTelephonically" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MocNotification_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MocNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "docNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" TEXT,
    "ownerId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewInterval" INTEGER,
    "nextReviewDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "majorVersion" INTEGER NOT NULL,
    "minorVersion" INTEGER NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "content" TEXT NOT NULL DEFAULT '{}',
    "changeNotes" TEXT,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocWorkflowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "docVersionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "assignedRole" TEXT,
    "assignedUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "completedById" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocWorkflowStep_docVersionId_fkey" FOREIGN KEY ("docVersionId") REFERENCES "DocVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocWorkflowStep_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocWorkflowStep_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "docVersionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isReviewNote" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocComment_docVersionId_fkey" FOREIGN KEY ("docVersionId") REFERENCES "DocVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocComment" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "DocAcknowledgement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocAcknowledgement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "completionNotes" TEXT,
    "dateCompleted" DATETIME,
    "escalationFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Action_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Action_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_nearMissId_fkey" FOREIGN KEY ("nearMissId") REFERENCES "NearMiss" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Action" ("assignedGroupId", "completionNotes", "createdAt", "dateCompleted", "description", "dueDate", "escalationFlag", "id", "incidentId", "linkedType", "nearMissId", "ownerId", "priority", "referenceNo", "status", "updatedAt") SELECT "assignedGroupId", "completionNotes", "createdAt", "dateCompleted", "description", "dueDate", "escalationFlag", "id", "incidentId", "linkedType", "nearMissId", "ownerId", "priority", "referenceNo", "status", "updatedAt" FROM "Action";
DROP TABLE "Action";
ALTER TABLE "new_Action" RENAME TO "Action";
CREATE UNIQUE INDEX "Action_referenceNo_key" ON "Action"("referenceNo");
CREATE TABLE "new_NearMiss" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "dateReported" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedById" TEXT NOT NULL,
    "departmentId" TEXT,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskCategory" TEXT NOT NULL,
    "severityLevel" TEXT NOT NULL DEFAULT 'LOW',
    "immediateAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignedUserId" TEXT,
    "assignedGroupId" TEXT,
    "targetCloseDate" DATETIME,
    "actualCloseDate" DATETIME,
    "contractorsInvolved" BOOLEAN NOT NULL DEFAULT false,
    "contractorDetails" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NearMiss_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NearMiss_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NearMiss_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NearMiss_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NearMiss" ("actualCloseDate", "assignedGroupId", "assignedUserId", "createdAt", "dateReported", "departmentId", "description", "id", "immediateAction", "location", "referenceNo", "reportedById", "riskCategory", "severityLevel", "status", "targetCloseDate", "updatedAt") SELECT "actualCloseDate", "assignedGroupId", "assignedUserId", "createdAt", "dateReported", "departmentId", "description", "id", "immediateAction", "location", "referenceNo", "reportedById", "riskCategory", "severityLevel", "status", "targetCloseDate", "updatedAt" FROM "NearMiss";
DROP TABLE "NearMiss";
ALTER TABLE "new_NearMiss" RENAME TO "NearMiss";
CREATE UNIQUE INDEX "NearMiss_referenceNo_key" ON "NearMiss"("referenceNo");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_responsiblePersonId_fkey" FOREIGN KEY ("responsiblePersonId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "companyId", "createdAt", "departmentId", "email", "id", "name", "password", "responsiblePersonId", "role", "updatedAt") SELECT "active", "companyId", "createdAt", "departmentId", "email", "id", "name", "password", "responsiblePersonId", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Induction_referenceNo_key" ON "Induction"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_referenceNo_key" ON "ChangeRequest"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "MocChecklistResponse_changeRequestId_key" ON "MocChecklistResponse"("changeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_docNumber_key" ON "Document"("docNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocAcknowledgement_documentId_userId_key" ON "DocAcknowledgement"("documentId", "userId");
