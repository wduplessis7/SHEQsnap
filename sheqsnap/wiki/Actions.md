# Actions

---

## What is the Actions Register?

The Actions Register is a centralised list of all corrective and preventive actions in SHEQsnap. Actions are the tasks that need to be completed to address the root causes of near misses and incidents, to close out findings from inspections, or to improve safety processes.

Every action is tracked with a due date, assignee, priority, and status so nothing slips through the cracks.

---

## Linked Actions vs Standalone Actions

| Type | Description |
|------|-------------|
| **Linked Action** | Created directly from a near miss, incident, or log entry. It is associated with that parent record. Closing the parent record requires all linked actions to be completed. |
| **Standalone Action** | Created independently from the Actions Register without being tied to a specific near miss or incident. Used for proactive safety improvements or tasks that do not stem from a specific event. |

To create a standalone action:

1. Click **Actions** in the sidebar
2. Click **+ New Action**
3. Fill in the details and click **Save**

---

## Reference Number Format

Each action is automatically assigned a unique reference number in the format **ACT0001**, **ACT0002**, etc.

---

## Field Descriptions

| Field | Description | Required |
|-------|-------------|----------|
| **Title** | Short description of the action to be taken | Yes |
| **Description** | Full details of what needs to be done | No |
| **Priority** | How urgent the action is (see Priority Levels below) | Yes |
| **Due Date** | The date by which the action must be completed | Yes |
| **Assigned To** | The person responsible for completing this action | Yes |
| **Linked Record** | The near miss, incident, or log entry this action belongs to (auto-filled for linked actions) | No |
| **Status** | Current state of the action | Auto |
| **Escalation Flag** | Mark this action as escalated if it is at risk of not being completed | No |
| **Completion Notes** | Explanation of what was done to complete the action | On completion |
| **Evidence / Attachments** | Files uploaded to prove the action was completed | No |

---

## Priority Levels

| Priority | Description |
|----------|-------------|
| **Low** | Can be completed within the normal work schedule |
| **Medium** | Should be completed within the week |
| **High** | Must be addressed within 24–48 hours |
| **Critical** | Immediate action required — stop work if necessary |

---

## Status Values

| Status | Description |
|--------|-------------|
| **Open** | Action has been created and is waiting to be started |
| **In Progress** | The assignee has started working on the action |
| **Completed** | The action has been finished and notes/evidence have been submitted |
| **Overdue** | The due date has passed and the action has not been completed |
| **Cancelled** | The action is no longer required (e.g., duplicate or scope change) |

---

## How Overdue is Calculated

An action is automatically flagged as **Overdue** when:
- The current date is past the **Due Date**, AND
- The action status is NOT **Completed** or **Cancelled**

Overdue actions are highlighted in red on the Actions list and counted on the Dashboard KPI card.

---

## Reassigning Actions

1. Open the action record
2. Click **Edit**
3. Change the **Assigned To** field to a different user
4. Click **Save**

The new assignee will see the action in their list.

---

## Completing an Action

1. Open the action record
2. Click **Mark as Complete**
3. Enter **Completion Notes** describing what was done
4. Optionally upload evidence (photos, sign-off documents)
5. Click **Confirm Completion**

The action status changes to **Completed** and the completion date is recorded.

---

## Escalation Flag

If an action is at risk of not being completed on time — for example due to resource constraints or blocked progress — it can be escalated:

1. Open the action record
2. Click **Escalate**
3. Add a note explaining the reason for escalation

Escalated actions are highlighted and visible to Managers and Safety Officers for prioritisation.

---

## Filtering and Searching Actions

On the Actions list page you can filter by:

- **Status** (Open, In Progress, Completed, Overdue, Cancelled)
- **Priority** (Low, Medium, High, Critical)
- **Assigned To** (specific user)
- **Linked Record** (near miss or incident reference)
- **Due Date Range**
- **Department**

Use the **Search** bar to find actions by title or reference number.

---

## Overdue Actions — Highlighted in Red

Any action that is overdue will:

- Display with a **red background** in the Actions list
- Be counted in the **Overdue Actions** KPI card on the Dashboard
- Remain overdue until it is marked as Completed or Cancelled

---

[Back to Home](Home)
