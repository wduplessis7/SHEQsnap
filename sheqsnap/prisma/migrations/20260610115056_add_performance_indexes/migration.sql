-- CreateIndex
CREATE INDEX "Action_deletedAt_status_idx" ON "Action"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "Action_deletedAt_createdAt_idx" ON "Action"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Action_deletedAt_dueDate_idx" ON "Action"("deletedAt", "dueDate");

-- CreateIndex
CREATE INDEX "Action_ownerId_deletedAt_idx" ON "Action"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_assignedApproverId_status_idx" ON "ApprovalRequest"("assignedApproverId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "Incident_deletedAt_createdAt_idx" ON "Incident"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Incident_deletedAt_status_idx" ON "Incident"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "Incident_deletedAt_departmentId_idx" ON "Incident"("deletedAt", "departmentId");

-- CreateIndex
CREATE INDEX "Incident_deletedAt_dateOfIncident_idx" ON "Incident"("deletedAt", "dateOfIncident");

-- CreateIndex
CREATE INDEX "NearMiss_deletedAt_createdAt_idx" ON "NearMiss"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "NearMiss_deletedAt_status_idx" ON "NearMiss"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "NearMiss_deletedAt_departmentId_idx" ON "NearMiss"("deletedAt", "departmentId");

-- CreateIndex
CREATE INDEX "NearMiss_deletedAt_dateReported_idx" ON "NearMiss"("deletedAt", "dateReported");
