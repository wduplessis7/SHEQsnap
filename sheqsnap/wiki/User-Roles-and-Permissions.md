# User Roles and Permissions

SHEQsnap uses a role-based access control system. Every user is assigned one of six roles that determines what they can see and do in the system.

---

## Role Overview

| Role | Description |
|------|-------------|
| **Admin** | Full system access including user management, configuration, and all records |
| **Manager** | Can view all records, approve submissions, and manage actions |
| **Safety Officer** | Can create and manage all safety records, approve contractor submissions |
| **Reporter** | Can create near misses, incidents, and actions for their department |
| **Contractor** | Restricted access — submissions go to the approval queue |
| **Viewer** | Read-only access to records they are permitted to see |

---

## Detailed Permissions

| Permission | Admin | Manager | Safety Officer | Reporter | Contractor | Viewer |
|------------|:-----:|:-------:|:--------------:|:--------:|:----------:|:------:|
| View Dashboard | Yes | Yes | Yes | Yes | Limited | Yes |
| Create Near Miss | Yes | Yes | Yes | Yes | Yes | No |
| Edit Near Miss | Yes | Yes | Yes | Own only | Own only | No |
| Create Incident | Yes | Yes | Yes | Yes | Yes | No |
| Edit Incident | Yes | Yes | Yes | Own only | Own only | No |
| Create Action | Yes | Yes | Yes | Yes | Yes | No |
| Complete Action | Yes | Yes | Yes | Assigned | Assigned | No |
| Create Log Entry | Yes | Yes | Yes | Yes | Yes | No |
| Approve Records | Yes | Yes | Yes | No | No | No |
| Reject Records | Yes | Yes | Yes | No | No | No |
| View Reports | Yes | Yes | Yes | Limited | No | Limited |
| Export Reports | Yes | Yes | Yes | No | No | No |
| Manage Users | Yes | No | No | No | No | No |
| Manage Groups | Yes | No | No | No | No | No |
| Manage Departments | Yes | No | No | No | No | No |
| Manage Companies | Yes | No | No | No | No | No |
| View Audit Log | Yes | No | No | No | No | No |
| System Settings | Yes | No | No | No | No | No |

---

## How to Assign Roles

Only an **Admin** can assign or change user roles.

1. Go to **Admin** in the sidebar
2. Click **Users**
3. Find the user you want to update and click **Edit**
4. Select the desired role from the **Role** dropdown
5. Click **Save**

---

## Contractor Role Specifics

The Contractor role is designed for external companies and workers who need to submit safety records but require oversight before those records become active.

- Contractors can only see records linked to their own company or site
- All records created by a Contractor are automatically set to **Pending Approval**
- A Safety Officer, Manager, or Admin must review and approve the record before it is active in the system
- Contractors cannot approve other records
- Contractors cannot access reports or admin settings

---

## Group Assignment

Groups allow you to cluster users together for easier assignment and notification.

- Groups are created in **Admin > Groups**
- A user can belong to one or more groups
- When a near miss or incident is assigned to a group, all members of that group can see and work on it
- Groups are useful for department teams, shift groups, or contractor crews

---

[Back to Home](Home)
