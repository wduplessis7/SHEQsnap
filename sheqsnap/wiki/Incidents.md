# Incidents

---

## What Qualifies as an Incident?

An incident is an unplanned event that has already resulted in injury, illness, property damage, or environmental harm. Unlike a near miss (which is a "could have happened"), an incident has a real outcome that must be documented, investigated, and corrected.

Examples include:
- A worker sustaining a cut, burn, or fracture on site
- Equipment damage caused by an accident
- A chemical spill that caused environmental harm
- A vehicle collision on company premises

---

## How to Log an Incident

1. Click **Incidents** in the sidebar
2. Click **+ New Incident**
3. Complete all required fields (marked with an asterisk)
4. Click **Submit**

---

## Field Descriptions

| Field | Description | Required |
|-------|-------------|----------|
| **Title** | Short summary of what happened | Yes |
| **Description** | Full account of the incident | Yes |
| **Date & Time** | When the incident occurred | Yes |
| **Location / Site** | Where it happened | Yes |
| **Department** | Department involved | Yes |
| **Incident Type** | Category of incident (e.g., Slip/Trip/Fall, Equipment Failure, Vehicle) | Yes |
| **Severity** | Actual severity of the outcome (see Severity Classification below) | Yes |
| **Persons Involved** | Names and roles of people directly involved | No |
| **Injury Type** | Type of injury sustained (e.g., Laceration, Fracture, Burns) | No |
| **Medical Treatment** | Level of treatment required (First Aid, Medical Treatment, Hospitalisation) | No |
| **Root Cause** | The underlying reason the incident happened | No |
| **Investigation Notes** | Findings from the investigation process | No |
| **Immediate Action Taken** | Steps taken to secure the scene and prevent further harm | No |
| **Assigned To (User)** | Person responsible for investigation | No |
| **Assigned To (Group)** | Group responsible for this record | No |
| **Attachments** | Photos, witness statements, documents | No |

---

## Reference Number Format

Incidents are automatically assigned a sequential reference number in the format **INC0001**, **INC0002**, etc. This number is used for tracking in reports, communications, and regulatory submissions.

---

## Incident Types and Severity Classification

### Incident Types

Common incident types configured in SHEQsnap include:

- Slip, Trip, or Fall
- Equipment Failure
- Vehicle / Mobile Plant
- Chemical Exposure
- Electrical Incident
- Fire or Explosion
- Environmental Spill
- Near Miss (Incident Level)
- Other

Types can be customised by an Admin in **Admin > Incident Types**.

### Severity Classification

| Level | Description |
|-------|-------------|
| **Low** | First-aid only, no lost time, minimal damage |
| **Medium** | Medical treatment required, minor property damage |
| **High** | Lost-time injury, significant damage, regulatory reporting may be required |
| **Critical** | Fatality, permanent disability, major environmental or property damage |

---

## Recording Persons Involved and Injury Types

1. Open the incident record and click **Edit**
2. In the **Persons Involved** section, click **+ Add Person**
3. Enter the person's name, role, and employment type (employee, contractor, visitor)
4. Select the **Injury Type** from the dropdown
5. Select the **Medical Treatment** level
6. Click **Save**

Multiple persons can be added to a single incident.

---

## Root Cause and Investigation Notes

The root cause field captures the fundamental reason the incident occurred — not just the immediate trigger but the underlying systemic issue. Examples:

- Lack of training or supervision
- Missing or inadequate procedure
- Equipment not maintained
- Unsafe work environment

The **Investigation Notes** field is a free-text area for capturing the full investigation findings, witness accounts, and timeline of events.

---

## Status Workflow

Incidents follow the same status workflow as near misses:

```
New → Submitted → Under Review → Action Required → In Progress → Closed
                                                              ↘ Cancelled
```

Refer to the [Near Misses](Near-Misses) page for a full description of each status.

---

## Linking Corrective Actions

Corrective actions can be added directly to an incident to ensure the root cause is addressed:

1. Open the incident record
2. Scroll to the **Actions** section
3. Click **+ Add Action**
4. Fill in the action details and assign a responsible person
5. Click **Save Action**

The action will appear in the Actions Register linked to the incident reference number.

---

## Closing an Incident

An incident can only be closed once all linked corrective actions are marked as **Completed**.

1. Ensure all linked actions are completed
2. Open the incident record
3. Click **Close Record**
4. Confirm the closure

Once closed, the record is read-only and the closure date is recorded.

---

[Back to Home](Home)
