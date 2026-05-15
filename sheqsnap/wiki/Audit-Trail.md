# Audit Trail

---

## What is Logged Automatically?

SHEQsnap automatically records an audit entry every time a significant action occurs in the system. You do not need to do anything to enable this — it happens in the background for every user.

Actions that are logged automatically include:

- **Record created** — a new near miss, incident, action, or log entry is created
- **Record updated** — any field on a record is changed
- **Status changed** — the status of a record moves from one value to another (e.g., Submitted to Under Review)
- **Record approved** — an approver approves a pending submission
- **Record rejected** — an approver rejects a submission with a reason
- **Comment added** — a comment is posted on a record
- **Attachment uploaded** — a file is added to a record
- **User created or edited** — an Admin creates or modifies a user account
- **Login event** — a user logs in or fails to log in

---

## What the Audit Log Contains

Each audit log entry records the following information:

| Field | Description |
|-------|-------------|
| **Entity Type** | The type of record that was changed (e.g., NearMiss, Incident, Action, LogEntry) |
| **Entity ID** | The unique ID of the record that was changed |
| **Reference Number** | The human-readable reference (e.g., NM0042, INC0017) |
| **Action** | What happened (e.g., CREATED, UPDATED, STATUS_CHANGED, APPROVED, REJECTED) |
| **Changed By** | The name and email of the user who performed the action |
| **Timestamp** | The exact date and time the action occurred |
| **Changes (JSON)** | A before-and-after snapshot of the fields that were changed |

The **Changes** field is particularly useful for compliance — it shows exactly what value a field had before the change and what it was changed to.

---

## How to View Audit History on a Record

Every near miss, incident, action, and log entry has its own audit history tab at the bottom of the detail page.

1. Open any record (near miss, incident, action, log entry)
2. Scroll to the bottom of the page
3. Click the **Audit History** tab
4. A chronological list of all changes to that record is displayed

This view shows:
- Who made each change
- When they made it
- What was changed (field name, old value, new value)

---

## Who Can View the Full Audit Log

The full system-wide audit log is available to **Admin** users only.

1. Go to **Admin** in the sidebar
2. Click **Audit Log**
3. You can filter by:
   - Date range
   - Entity type (Near Miss, Incident, Action, etc.)
   - User (who made the change)
   - Action type (Created, Updated, Approved, etc.)

Individual record audit history (as described above) is visible to any user who has access to that record.

---

## Why Audit Trails Matter for Compliance

A complete and tamper-proof audit trail is essential for:

- **Legal compliance** — demonstrating to regulators that records have not been altered improperly
- **ISO 45001 / OHSAS 18001 audits** — providing evidence that your safety management system is being properly maintained
- **Incident investigations** — reconstructing exactly what happened, when, and who was involved
- **Accountability** — ensuring that every action in the system can be traced back to a specific user
- **Insurance and liability** — providing evidence of due diligence in the event of a claim or litigation

SHEQsnap's audit trail cannot be edited or deleted by any user, including Admins. This ensures the integrity of your compliance records.

---

[Back to Home](Home)
