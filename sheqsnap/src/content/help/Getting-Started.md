# Getting Started

This page walks you through installing, configuring, and running SHEQsnap for the first time.

---

## System Requirements

| Requirement | Minimum Version |
|-------------|-----------------|
| Node.js | 20.x or higher |
| npm | 9.x or higher |
| Operating System | Windows, macOS, or Linux |
| Database | SQLite (default, included) or PostgreSQL |

---

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/sheqsnap.git
cd sheqsnap
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your preferred text editor (see [Environment Variables](#environment-variables) below).

### 4. Generate the Prisma Client

```bash
npx prisma generate
```

### 5. Run Database Migrations

This creates all the required database tables:

```bash
npx prisma migrate deploy
```

### 6. Seed the Database

This creates the default roles, demo users, and sample data:

```bash
npm run db:seed
```

### 7. Start the Development Server

```bash
npm run dev
```

Open your browser and navigate to **http://localhost:3000**

---

## Environment Variables

The following variables must be set in your `.env` file:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | A random secret string used to sign session tokens. Must be at least 32 characters. | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | The full URL of your application. In development use `http://localhost:3000`. In production use your domain. | `https://sheqsnap.yourcompany.com` |
| `DATABASE_URL` | Connection string for your database. Defaults to a local SQLite file. | `file:./dev.db` |

### Generating a Secure Secret

Run the following command to generate a strong `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NEXTAUTH_SECRET` in your `.env` file.

---

## First Login Walkthrough

1. Open **http://localhost:3000** in your browser
2. You will be redirected to the login page
3. Enter the default Admin credentials:
   - **Email:** admin@sheqsnap.com
   - **Password:** Admin1234!
4. After logging in you will land on the **Dashboard**
5. Navigate to **Admin > Users** to review and update user accounts

---

## How to Change Default Passwords

1. Click your profile icon in the top-right corner
2. Select **Profile Settings**
3. Enter your current password and then your new password
4. Click **Save Changes**

Alternatively, an Admin can reset any user's password from **Admin > Users**.

---

## Production Deployment Notes

- Always set `NEXTAUTH_URL` to your actual production domain (e.g., `https://sheqsnap.yourcompany.com`)
- Use a strong, unique `NEXTAUTH_SECRET` — never reuse the development secret
- For production databases, consider switching from SQLite to PostgreSQL by updating `DATABASE_URL`
- Run migrations before starting the production server: `npx prisma migrate deploy`
- Use a process manager such as PM2 or run SHEQsnap inside a Docker container for reliability
- Enable HTTPS on your web server or reverse proxy (Nginx, Caddy, etc.)

---

[Back to Home](Home)
