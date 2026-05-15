# Admin Configuration

---

## Overview

The Admin section is only accessible to users with the **Admin** role. It contains all configuration and management tools for running SHEQsnap. Access it by clicking **Admin** in the sidebar.

---

## User Management

### Creating a User

1. Go to **Admin > Users**
2. Click **+ New User**
3. Enter the user's first name, last name, and email address
4. Select a **Role** from the dropdown
5. Assign a **Department** and **Company** (if applicable)
6. Click **Save**

The user will receive an invitation email with a link to set their password (if email is configured).

### Editing a User

1. Go to **Admin > Users**
2. Find the user and click **Edit**
3. Update any fields as needed
4. Click **Save**

### Deactivating a User

Deactivating a user prevents them from logging in without deleting their records.

1. Go to **Admin > Users**
2. Find the user and click **Edit**
3. Toggle the **Active** switch to off
4. Click **Save**

Deactivated users will not appear in assignment dropdowns but their historical records are preserved.

### Resetting a Password

1. Go to **Admin > Users**
2. Find the user and click **Edit**
3. Click **Reset Password**
4. Enter and confirm the new password
5. Click **Save**

---

## Group Management

Groups allow you to cluster users for bulk assignment and notifications.

### Creating a Group

1. Go to **Admin > Groups**
2. Click **+ New Group**
3. Enter the group name and description
4. Click **Save**

### Adding Members to a Group

1. Go to **Admin > Groups**
2. Click on the group name
3. Click **+ Add Member**
4. Search for and select the user
5. Click **Add**

A user can belong to multiple groups.

---

## Department and Site Management

Departments and sites are used to categorise records and control visibility.

1. Go to **Admin > Departments**
2. Click **+ New Department**
3. Enter the department name and optionally a site/location
4. Click **Save**

Departments appear in dropdowns throughout the system when creating near misses, incidents, log entries, and actions.

---

## Company Management

Companies represent contractor organisations. See the [Contractor Management](Contractor-Management) page for full details.

1. Go to **Admin > Companies**
2. Click **+ New Company**
3. Fill in the company details and assign a responsible person
4. Click **Save**

---

## Configuring Dropdown Categories

SHEQsnap allows Admins to customise the dropdown options used across the system.

| Category | Where It Appears | Location in Admin |
|----------|-----------------|-------------------|
| Risk Categories | Near miss and incident forms | Admin > Risk Categories |
| Incident Types | Incident form | Admin > Incident Types |
| Injury Types | Incident persons involved section | Admin > Injury Types |
| Log Types | Log Register | Admin > Log Types |

To add a new option:

1. Navigate to the relevant category in Admin
2. Click **+ New**
3. Enter the name and description
4. Click **Save**

To deactivate an option (it will no longer appear in dropdowns but existing records are not affected):

1. Open the option
2. Toggle the **Active** switch to off
3. Click **Save**

---

## Audit Log

The audit log tracks every significant action taken in the system.

- Location: **Admin > Audit Log**
- Only Admins can view the full audit log
- The audit log on individual records (near misses, incidents, etc.) is visible to all users with access to that record

**What the audit log tracks:**
- Record created, edited, deleted
- Status changes
- Approval and rejection events
- User account changes
- Login events

See the [Audit Trail](Audit-Trail) page for full details.

---

## System Settings and Environment Variables

Core system behaviour is controlled through environment variables in the `.env` file on the server. See [Getting Started](Getting-Started) for the full list of environment variables.

Settings that can be adjusted at runtime through the Admin panel include:

- Organisation name and logo
- Default timezone
- Email notification settings (SMTP configuration)
- Session timeout duration

Changes to environment variables require a server restart to take effect.

---

[Back to Home](Home)
