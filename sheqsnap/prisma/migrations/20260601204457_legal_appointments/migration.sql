-- CreateTable
CREATE TABLE "LegalPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organizationType" TEXT NOT NULL,
    "appointmentCategory" TEXT NOT NULL,
    "description" TEXT,
    "isStatutory" BOOLEAN NOT NULL DEFAULT false,
    "termLengthMonths" INTEGER,
    "renewalAllowed" BOOLEAN NOT NULL DEFAULT true,
    "minQualifications" TEXT,
    "eligibilityRules" TEXT,
    "requiresResolution" BOOLEAN NOT NULL DEFAULT false,
    "requiresBackgroundCheck" BOOLEAN NOT NULL DEFAULT false,
    "requiresDeclarationOfInterest" BOOLEAN NOT NULL DEFAULT false,
    "requiresGazettePublication" BOOLEAN NOT NULL DEFAULT false,
    "requiredDocuments" TEXT,
    "complianceNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" DATETIME,
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LegalPosition_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LegalAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "departmentId" TEXT,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT,
    "passportNumber" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'South African',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "employeeNumber" TEXT,
    "appointmentDate" DATETIME NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "termLengthMonths" INTEGER,
    "appointmentType" TEXT NOT NULL DEFAULT 'PERMANENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "appointmentAuthority" TEXT,
    "gazettedDate" DATETIME,
    "gazetteNumber" TEXT,
    "resolutionRef" TEXT,
    "acceptanceDate" DATETIME,
    "consentDate" DATETIME,
    "complianceNotes" TEXT,
    "terminationReason" TEXT,
    "terminatedAt" DATETIME,
    "terminatedById" TEXT,
    "reminder180Sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder90Sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder30Sent" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LegalAppointment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "LegalPosition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LegalAppointment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LegalAppointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LegalAppointment_terminatedById_fkey" FOREIGN KEY ("terminatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "expiryDate" DATETIME,
    "notes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentDocument_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "LegalAppointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppointmentDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConflictOfInterest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "declarationType" TEXT NOT NULL,
    "entityName" TEXT,
    "description" TEXT NOT NULL,
    "interestValue" TEXT,
    "relationshipType" TEXT,
    "managementPlan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCLOSED',
    "disclosedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConflictOfInterest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "LegalAppointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConflictOfInterest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalPosition_code_key" ON "LegalPosition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LegalAppointment_referenceNo_key" ON "LegalAppointment"("referenceNo");
