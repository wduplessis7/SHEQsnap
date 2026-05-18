-- CreateTable
CREATE TABLE "BehaviourObservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "site" TEXT,
    "shaft" TEXT,
    "plant" TEXT,
    "observerName" TEXT NOT NULL,
    "observerDepartment" TEXT,
    "observerId" TEXT,
    "teamObserved" TEXT,
    "contractorObserved" TEXT,
    "employeeObserved" TEXT,
    "workType" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "workContext" TEXT,
    "safeBehaviours" TEXT,
    "unsafeBehaviours" TEXT,
    "hazardsPresent" TEXT,
    "potentialConsequences" TEXT,
    "riskLevel" TEXT,
    "likelihoodScore" INTEGER,
    "impactScore" INTEGER,
    "riskScore" INTEGER,
    "immediateActionTaken" TEXT,
    "workStopped" BOOLEAN NOT NULL DEFAULT false,
    "supervisorNotified" BOOLEAN NOT NULL DEFAULT false,
    "rootCauses" TEXT,
    "workerEngaged" BOOLEAN NOT NULL DEFAULT false,
    "workerFeedback" TEXT,
    "safetyCategory" TEXT,
    "behaviourType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT
);

-- CreateTable
CREATE TABLE "BehaviourAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsiblePerson" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" DATETIME,
    "closedNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BehaviourAction_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "BehaviourObservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObservationEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservationEvidence_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "BehaviourObservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
