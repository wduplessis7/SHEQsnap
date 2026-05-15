# Approvals

---

## Who Can Approve

The following roles have permission to review and approve records in SHEQsnap:

| Role | Can Approve |
|------|:-----------:|
| Admin | Yes |
| Manager | Yes |
| Safety Officer | Yes |
| Reporter | No |
| Contractor | No |
| Viewer | No |

---

## What Triggers an Approval Request

An approval request is created automatically in two situations:

1. **Any record created by a Contractor** — When a user with the Contractor role creates a near miss, incident, log entry, or action, the record is immediately placed in **Pending Approval** status and added to the approvals queue.

2. **A log entry submitted for approval** — When any user clicks **Submit for Approval** on a log entry, it is placed in the approvals queue regardless of their role.

---

## The Approval Queue

The approval queue shows all records waiting for a decision. You can find it in two ways:

- Click **Approvals** in the sidebar — the sidebar shows a **badge count** indicating how many records are waiting
- The **Pending Approvals** KPI card on the Dashboard also shows the current count

The approval queue lists each pending record with:
- Record type (Near Miss, Incident, Log Entry, etc.)
- Reference number
- Title
- Submitted by
- Submitted date
- Department / Site

---

## How to Approve a Record

1. Click **Approvals** in the sidebar
2. Find the record you want to review
3. Click on the record to open the full detail view
4. Review all the information carefully
5. Click the **Approve** button
6. Confirm the approval

After approval:
- The record status changes from **Pending Approval** to **Active** (for log entries) or **Submitted** / **Under Review** (for near misses and incidents)
- The submission is recorded in the audit trail

---

## How to Reject a Record

If a record contains errors, is incomplete, or is not valid:

1. Open the record from the Approvals queue
2. Click **Reject**
3. Enter a **rejection reason** in the text field — this is required so the submitter knows what to fix
4. Click **Confirm Rejection**

After rejection:
- The record status changes to **Rejected**
- The submitter can see the rejection reason on the record
- The submitter can edit and resubmit the record

---

## What Happens After Approval

| Action | Result |
|--------|--------|
| Near miss approved | Status moves to **Submitted** for further review and investigation |
| Incident approved | Status moves to **Submitted** for further review and investigation |
| Log entry approved | Status changes to **Active** and the entry is visible in the Log Register |
| Any record approved | The approval action is recorded in the audit log with the approver's name and timestamp |

The original submitter can see the updated status on their record. The audit trail at the bottom of the record also reflects the approval decision.

---

## Pending Approval Badge Count in Sidebar

The **Approvals** menu item in the sidebar displays a numbered badge showing how many records are currently waiting for approval. This count updates in real time as records are submitted and processed. When the count reaches zero, the badge disappears.

---

[Back to Home](Home)
