# SHEQsnap — Safety Management System

A full-featured **Safety, Health, Environment & Quality (SHEQ)** management system built with Next.js 14, Prisma 7, and NextAuth.js.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | SQLite via Prisma 7 + `@prisma/adapter-libsql` |
| Auth | NextAuth.js v4 (JWT, credentials provider, RBAC) |
| Styling | Tailwind CSS + custom shadcn-style UI |
| Charts | Recharts |
| Excel Export | SheetJS (xlsx) |
| PDF Export | jsPDF + jspdf-autotable |

---

## Features

- **Near Miss Register** — Log, categorise, and track near misses by severity and department
- **Incident Register** — Full incident recording with investigation notes, root cause, and injury tracking
- **Action Register** — Corrective and preventive actions linked to near misses or incidents, with due-date escalation
- **Dashboard** — Live KPI cards, monthly trend charts, severity breakdowns, overdue action alerts
- **Reports** — Date-filtered analytics with Excel and PDF export
- **Admin Panel** — Manage users, roles, groups, and departments
- **Audit Trail** — Every change logged with timestamp, user, and old/new values
- **Comments & Attachments** — Per-record comment threads and file attachments

---

## Roles

| Role | Permissions |
|------|------------|
| ADMIN | Full access including user/group/department management |
| SAFETY_OFFICER | Create, edit, and manage all SHEQ records |
| MANAGER | View all records, approve closures |
| REPORTER | Create near misses and incidents in their department |
| VIEWER | Read-only access |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/wduplessis7/SHEQsnap.git
cd SHEQsnap

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed with demo data
npm run db:seed
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Demo Credentials

After seeding, the following accounts are available (password: `Password123!`):

| Email | Role |
|-------|------|
| admin@sheqsnap.com | Admin |
| safety@sheqsnap.com | Safety Officer |
| manager@sheqsnap.com | Manager |
| reporter@sheqsnap.com | Reporter |
| viewer@sheqsnap.com | Viewer |

---

## Database Scripts

```bash
# Reset database and re-seed
npm run db:reset

# Seed only
npm run db:seed

# Open Prisma Studio
npx prisma studio
```

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # KPI overview
│   │   ├── near-misses/      # Near miss CRUD
│   │   ├── incidents/        # Incident CRUD
│   │   ├── actions/          # Action register
│   │   ├── reports/          # Analytics & exports
│   │   └── admin/            # Admin panel
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth
│   │   ├── near-misses/      # Near miss API
│   │   ├── incidents/        # Incident API
│   │   ├── actions/          # Actions API
│   │   ├── dashboard/        # Stats API
│   │   ├── reports/          # Export API
│   │   └── admin/            # Admin API
│   └── login/                # Login page
├── components/
│   ├── layout/               # Sidebar, TopBar, DashboardLayout
│   └── ui/                   # Reusable UI components
└── lib/
    ├── auth.ts               # NextAuth config
    ├── prisma.ts             # Prisma client
    └── utils.ts              # Shared utilities
```

---

## Documentation (Wiki)

Full user and admin documentation is available in the [`wiki/`](./wiki/) folder of this repository, and will be published to the [GitHub Wiki](https://github.com/wduplessis7/SHEQsnap/wiki) once the wiki is initialised.

| Page | Description |
|------|-------------|
| [Home](./wiki/Home.md) | Welcome page and table of contents |
| [Getting Started](./wiki/Getting-Started.md) | Installation and setup |
| [User Roles and Permissions](./wiki/User-Roles-and-Permissions.md) | Role-based access control |
| [Dashboard](./wiki/Dashboard.md) | KPI cards and charts explained |
| [Near Misses](./wiki/Near-Misses.md) | Reporting and managing near misses |
| [Incidents](./wiki/Incidents.md) | Logging and investigating incidents |
| [Actions](./wiki/Actions.md) | Corrective actions register |
| [Log Register](./wiki/Log-Register.md) | Inspections, toolbox talks, permits |
| [Approvals](./wiki/Approvals.md) | Approval workflow |
| [Contractor Management](./wiki/Contractor-Management.md) | Managing external contractors |
| [Reports and Exports](./wiki/Reports-and-Exports.md) | Charts, filters, Excel and PDF exports |
| [Admin Configuration](./wiki/Admin-Configuration.md) | System configuration |
| [Audit Trail](./wiki/Audit-Trail.md) | Compliance logging |

### Publishing the Wiki to GitHub

The wiki content is ready to push to the GitHub Wiki. To activate it:

1. Go to https://github.com/wduplessis7/SHEQsnap/wiki
2. Click **"Create the first page"** — this initialises the wiki git backend
3. You can then push the wiki content from the `wiki/` folder:

```bash
git clone https://github.com/wduplessis7/SHEQsnap.wiki.git /tmp/sheqsnap-wiki
cp wiki/*.md /tmp/sheqsnap-wiki/
cd /tmp/sheqsnap-wiki
git config user.email "wduplessis7@gmail.com"
git config user.name "Werner du Plessis"
git add .
git commit -m "Add full SHEQsnap wiki documentation"
git push origin master
```

---

## License

Private — SHEQsnap is proprietary software.
