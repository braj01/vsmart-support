# Helpdesk vSMART — Velocis Systems

Full-stack Helpdesk / Ticket Management System built with React, Node.js/Express, and MySQL.

---

## Project Architecture

```
Helpdesk-vSmart/
├── frontend/          React + Vite SPA
├── backend/           Node.js + Express REST API
└── database/
    ├── migrations/    run.js (Sequelize sync)
    └── seeders/       run.js (admin user)
```

---

## Prerequisites

| Tool    | Version  |
|---------|----------|
| Node.js | >= 18.x  |
| npm     | >= 9.x   |
| MySQL   | >= 8.x   |

---

## Installation

### 1. Clone / enter the project

```bash
cd Helpdesk-vSmart
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env   # edit values
npm install
```

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env   # edit values
npm install
```

---

## Environment Configuration

### backend/.env

| Variable              | Description                          |
|-----------------------|--------------------------------------|
| PORT                  | API server port (default 5000)       |
| DB_HOST               | MySQL host (use 127.0.0.1 locally)   |
| DB_PORT               | MySQL port (default 3306)            |
| DB_NAME               | Database name                        |
| DB_USER               | MySQL user                           |
| DB_PASSWORD           | MySQL password                       |
| JWT_SECRET            | Long random secret for JWT signing   |
| JWT_EXPIRES_IN        | Token expiry (default 8h)            |
| SMTP_HOST             | SMTP server host                     |
| SMTP_PORT             | SMTP port (587 for TLS)              |
| SMTP_SECURE           | true for port 465, false otherwise   |
| SMTP_USER             | SMTP username                        |
| SMTP_PASSWORD         | SMTP password                        |
| SMTP_FROM_EMAIL       | From address                         |
| SMTP_FROM_NAME        | From display name                    |
| RECAPTCHA_SECRET_KEY  | Google reCAPTCHA v2 secret key       |
| RECAPTCHA_BYPASS      | Set true to skip CAPTCHA in dev      |
| TICKET_ADMIN_EMAIL    | Admin notification email             |
| MAX_FILE_SIZE         | Max upload bytes (default 10485760)  |
| ALLOWED_FILE_TYPES    | Comma-separated extensions           |
| FRONTEND_URL          | CORS origin (http://localhost:5173)  |
| UPLOAD_DIR            | Upload directory (default: uploads/) |

### frontend/.env

| Variable                | Description                    |
|-------------------------|--------------------------------|
| VITE_API_BASE_URL       | Backend API URL                |
| VITE_RECAPTCHA_SITE_KEY | Google reCAPTCHA v2 site key   |

---

## Database Setup

```bash
# Create database
mysql -u root -p -h 127.0.0.1 -e "CREATE DATABASE helpdesk_vsmart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## Migrations

```bash
cd backend
npm run migrate
```

Or directly:

```bash
node database/migrations/run.js
```

---

## Seed Data

Creates the initial SUPER_ADMIN user.

```bash
cd backend
npm run seed
```

Default credentials (change immediately in production):

```
Email:    admin@velocis.in
Password: Admin@123456
```

Override via env:

```bash
SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD=SecurePass123 npm run seed
```

---

## Running the Application

### Backend

```bash
cd backend
npm run dev      # development (nodemon)
npm start        # production
```

API available at: http://localhost:5000

### Frontend

```bash
cd frontend
npm run dev      # development
npm run build    # production build
npm run preview  # preview production build
```

App available at: http://localhost:5173

---

## CAPTCHA Configuration

1. Go to https://www.google.com/recaptcha/admin
2. Register a new site (reCAPTCHA v2 "I'm not a robot")
3. Add your domain
4. Copy **Site Key** → `VITE_RECAPTCHA_SITE_KEY` in frontend/.env
5. Copy **Secret Key** → `RECAPTCHA_SECRET_KEY` in backend/.env

For local development without CAPTCHA keys, set `RECAPTCHA_BYPASS=true` in backend/.env.

---

## SMTP Configuration

Example for Gmail:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
```

Use an App Password if 2FA is enabled on Gmail.

---

## File Upload Configuration

```
MAX_FILE_SIZE=10485760          # 10 MB in bytes
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,zip,rar
UPLOAD_DIR=uploads              # relative to backend root
```

Files are stored outside the public web root. Admins download via authenticated API endpoint.

---

## Admin Login

Navigate to: http://localhost:5173/admin/login

Default credentials after seeding:
- Email: `admin@velocis.in`
- Password: `Admin@123456`

---

## Public Routes

| Route                  | Description              |
|------------------------|--------------------------|
| /submit-ticket         | Public ticket submission |
| /ticket/:token         | Public ticket tracking   |

---

## API Documentation

Swagger UI available at: http://localhost:5000/api/docs (when swagger.yaml is present)

### Key Endpoints

**Public**
- `POST /api/tickets` — Submit ticket (multipart/form-data)
- `GET /api/tickets/:token` — Track ticket by public token

**Auth**
- `POST /api/auth/login` — Admin login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user

**Admin (requires Bearer token)**
- `GET /api/admin/dashboard` — Stats + charts
- `GET /api/admin/tickets` — List with filters/pagination
- `GET /api/admin/tickets/:id` — Ticket detail
- `PATCH /api/admin/tickets/:id/status` — Change status
- `PATCH /api/admin/tickets/:id/priority` — Change priority
- `PATCH /api/admin/tickets/:id/assignment` — Assign agent
- `POST /api/admin/tickets/:id/comments` — Add reply/note
- `POST /api/admin/tickets/:id/attachments` — Upload attachment
- `GET /api/admin/tickets/:id/attachments/:attachmentId` — Download
- `GET /api/admin/audit-logs` — Audit log (SUPER_ADMIN only)
- `GET /api/admin/agents` — List agents

---

## Testing

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

---

## Production Build

```bash
cd frontend
npm run build
# Serve dist/ with nginx or any static server
```

For the backend, use PM2:

```bash
npm install -g pm2
cd backend
pm2 start src/server.js --name helpdesk-api
```

---

## Troubleshooting

**MySQL connection error (ECONNREFUSED)**
- Use `DB_HOST=127.0.0.1` instead of `localhost`
- Ensure MySQL is running: `brew services start mysql` (macOS)

**CAPTCHA always failing**
- Set `RECAPTCHA_BYPASS=true` in backend/.env for development

**Email not sending**
- Email failures do NOT break ticket creation — check `backend/logs/error.log`
- Verify SMTP credentials

**Port already in use**
- Change `PORT` in backend/.env
- Change `server.port` in frontend/vite.config.js
