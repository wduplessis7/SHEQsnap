# Contractor Management

---

## What is a Contractor in SHEQsnap?

A contractor is an external company or individual who works on your site but is not a direct employee of your organisation. In SHEQsnap, contractors have their own user role that restricts their access while still allowing them to submit safety records. All contractor submissions are automatically routed to the approval queue before becoming active in the system.

---

## Setting Up a Contractor Company

Before you can create contractor users, you need to set up the contractor's company in SHEQsnap.

1. Go to **Admin** in the sidebar
2. Click **Companies**
3. Click **+ New Company**
4. Fill in the company details:
   - Company Name
   - Registration Number (optional)
   - Contact Email
   - Contact Phone
   - Address
5. Click **Save**

---

## Creating a Contractor User

Once the company is set up, create a user account for the contractor:

1. Go to **Admin > Users**
2. Click **+ New User**
3. Fill in the user details:
   - First Name and Last Name
   - Email Address
   - Set **Role** to **Contractor**
   - Set **Company** to the contractor's company (created above)
4. Click **Save**

The contractor will receive an email with their login credentials (if email is configured) or you can provide the credentials manually.

---

## Assigning a Responsible Person to a Company

Each contractor company can have a responsible person — an internal employee (Safety Officer or Manager) who oversees that company's safety submissions.

1. Go to **Admin > Companies**
2. Open the contractor company record
3. In the **Responsible Person** field, select the internal user
4. Click **Save**

The responsible person will be notified when contractor submissions arrive in the approval queue.

---

## What Contractors Can and Cannot Do

| Permission | Contractor |
|------------|:----------:|
| Create near miss reports | Yes |
| Create incident reports | Yes |
| Create log entries | Yes |
| Create actions | Yes |
| View own records | Yes |
| Edit own records (before approval) | Yes |
| View other companies' records | No |
| Approve records | No |
| View reports and exports | No |
| Access admin settings | No |

---

## How Contractor Submissions Flow to the Approval Queue

When a contractor submits any record, the following happens automatically:

1. The record is created with a status of **Pending Approval**
2. The record appears in the **Approvals** queue for Safety Officers, Managers, and Admins
3. The sidebar badge count increases
4. The Dashboard **Pending Approvals** KPI card updates
5. An approver reviews the record and either approves or rejects it
6. If approved, the record becomes active in the system
7. If rejected, the contractor can view the rejection reason and resubmit

---

## Managing Multiple Contractors Across Sites

If your organisation works with multiple contractor companies across different sites:

- Create a separate **Company** record for each contractor
- Assign contractor users to the correct company
- Use **Departments** and **Sites** to restrict visibility if needed
- Assign a different internal **Responsible Person** to each company for oversight
- Use the **Reports** page and filter by **Company** to view contractor-specific activity
- Audit trails for each contractor company's records are available to Admins

---

[Back to Home](Home)
