# Near Misses

---

## What is a Near Miss?

A near miss is any unplanned event that did not result in injury, illness, or damage — but had the potential to do so. Reporting near misses is one of the most effective ways to prevent future incidents. SHEQsnap makes it easy to capture, investigate, and close near misses systematically.

---

## How to Report a Near Miss

1. Click **Near Misses** in the sidebar
2. Click the **+ New Near Miss** button (top right)
3. Fill in all required fields (marked with an asterisk)
4. Click **Submit** to save the report

---

## Field Descriptions

| Field | Description | Required |
|-------|-------------|----------|
| **Title** | A short, clear description of what happened | Yes |
| **Description** | Full details of the near miss event | Yes |
| **Date & Time** | When the near miss occurred | Yes |
| **Location / Site** | Where it happened | Yes |
| **Department** | Which department was involved | Yes |
| **Severity** | How serious the potential consequences were (see Severity Levels below) | Yes |
| **Risk Category** | The type of hazard involved (e.g., Electrical, Mechanical, Chemical) | Yes |
| **Persons Involved** | Names of people who were near the event | No |
| **Immediate Action Taken** | What was done at the time to make the area safe | No |
| **Assigned To (User)** | The person responsible for investigating and closing this record | No |
| **Assigned To (Group)** | A group responsible for this record | No |
| **Attachments** | Photos, documents, or other evidence | No |

---

## Reference Number Format

Each near miss is automatically assigned a unique reference number in the format **NM0001**, **NM0002**, etc. This number is displayed on the record detail page and in all exports. Use this number to reference the record in meetings, emails, and reports.

---

## Severity Levels

| Level | Description |
|-------|-------------|
| **Low** | Minimal potential for harm — minor inconvenience or first-aid level |
| **Medium** | Moderate potential — could cause a recordable injury if repeated |
| **High** | Significant potential — could cause a serious injury or lost-time incident |
| **Critical** | Extreme potential — could cause a fatality or major catastrophe |

---

## Status Workflow

Near miss records move through the following statuses:

```
New → Submitted → Under Review → Action Required → In Progress → Closed
                                                              ↘ Cancelled
```

| Status | Meaning |
|--------|---------|
| **New** | Record has been created but not yet submitted |
| **Submitted** | Record has been submitted and is awaiting review |
| **Under Review** | A Safety Officer or Manager is actively reviewing the record |
| **Action Required** | The investigation found that corrective actions must be completed |
| **In Progress** | Corrective actions have been created and are being worked on |
| **Closed** | All required actions are complete and the record is finalised |
| **Cancelled** | The record was withdrawn (e.g., duplicate or entered in error) |

---

## How to Assign to a User or Group

On the near miss detail page:

1. Click **Edit**
2. In the **Assigned To (User)** field, type and select a user
3. Or, in the **Assigned To (Group)** field, select a group
4. Click **Save**

The assigned user or group members will be able to see and work on this record.

---

## How to Add Follow-Up Actions

1. Open the near miss record
2. Scroll to the **Actions** section at the bottom
3. Click **+ Add Action**
4. Fill in the action title, description, priority, due date, and assignee
5. Click **Save Action**

The action will appear in the Actions Register and be linked to this near miss.

---

## How to Upload Attachments

1. Open the near miss record
2. Scroll to the **Attachments** section
3. Click **Upload File**
4. Select one or more files from your device
5. Click **Upload**

Supported file types include images (JPG, PNG), PDFs, and Office documents.

---

## How to Add Comments

1. Open the near miss record
2. Scroll to the **Comments** section
3. Type your comment in the text box
4. Click **Post Comment**

Comments are visible to all users with access to the record and are recorded in the audit trail.

---

## Closing a Near Miss

A near miss can only be closed when all linked corrective actions have been completed.

1. Ensure all actions on the record are in **Completed** status
2. Open the near miss record
3. Click **Close Record**
4. Confirm the closure

Once closed, the record becomes read-only. The status changes to **Closed** and the closure date is recorded.

---

## Overdue Behaviour

A near miss is flagged as overdue if it has been open for longer than the configured review period without being closed. Overdue near misses:

- Are highlighted in red on the Near Misses list
- Appear in the **Overdue Actions** count on the Dashboard
- Can be filtered using the **Overdue** filter on the Near Misses page

---

## AI Safety Analysis

The AI Safety Analysis feature is available on individual near miss detail pages for users with the **AI Intelligence** module enabled on their SHEQSnap license.

1. Open the near miss record
2. Click the **AI Analysis** tab near the top of the detail page
3. Click **Analyse with AI**
4. Wait up to 60 seconds — the analysis runs on a local AI server with no internet connection required

The AI returns the following for the near miss:

| Output | Description |
|--------|-------------|
| **Risk Level** | An overall risk rating (Critical, High, Medium, or Low) |
| **Summary** | A concise plain-language summary of the near miss event |
| **Root Causes** | Identified underlying causes based on the reported data |
| **Immediate Actions** | Recommended steps to address the hazard identified |
| **Preventive Measures** | Longer-term controls to prevent a similar event or actual incident |
| **Investigation Checklist** | A structured checklist to guide the investigation process |

AI output is a starting point for analysis, not a replacement for professional SHEQ judgement. Always apply professional judgement and verify recommendations against actual site conditions.

To run the analysis again with updated information, click **Re-analyse**.

---

[Back to Home](Home)
