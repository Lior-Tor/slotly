# Slotly

A scheduling web app inspired by Calendly. Users create an account, define their event types and weekly availability, then share a public booking link. Guests pick a date and time — no account required.

## Tech Stack

**Frontend** — React 18, Vite, Material UI v6, React Router v6, Axios, date-fns
**Backend** — Node.js, Express, Supabase JS SDK
**Database & Auth** — Supabase (PostgreSQL + Auth)
**Deployment** — Vercel (client), Railway (server)

## Features

- Email/password signup and login via Supabase Auth
- Create and manage event types (title, duration, color)
- Set weekly availability with per-day time ranges
- Public booking page — guests book without an account
- Double-booking prevention with server-side conflict check
- Dashboard with booking history and cancel action
- Copy-to-clipboard public booking link
- Responsive design with mobile sidebar drawer

## Project Structure

```
slotly-project/
├── client/          # React + Vite frontend
└── server/          # Express backend
```

## Local Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/your-username/slotly.git
cd slotly

cd server && npm install
cd ../client && npm install
```

### 2. Environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in your Supabase URL, keys, and URLs (see `.env.example` files for details).

### 3. Database

Run the following SQL in your Supabase SQL editor:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL
);

CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#0069FF',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Also disable **email confirmation** in Supabase → Authentication → Settings.

### 4. Run

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

App runs at `http://localhost:5173`.

## Deployment

- **Backend** → [Railway](https://railway.app): set Root Directory to `server/`, add env vars
- **Frontend** → [Vercel](https://vercel.com): set Root Directory to `client/`, add env vars

After deploying both, update `CLIENT_URL` on Railway with your Vercel URL.
