# Browser Automation Platform

## Overview
A web application for browser automation that allows users to configure and schedule URL interactions, capture screenshots, and monitor system status.

## Quick Start (One Command)

```bash
npm install    # Installs everything automatically
npm run dev    # Starts both frontend and backend
```

## Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS, Zustand, shadcn/ui (port 5000)
- **Backend**: Node.js, Express 5, TypeScript, Prisma, Puppeteer (port 3001)
- **Database**: PostgreSQL
- **Real-time**: Socket.IO

## Project Structure
```
/
├── package.json       # Root - orchestrates everything
├── scripts/setup.mjs  # Auto-setup (Chromium, DB, etc.)
├── frontend/          # Next.js frontend
├── backend/           # Express backend
└── DEPLOYMENT.md      # Deploy to any platform
```

## Commands (From Root)

| Command | Description |
|---------|-------------|
| `npm install` | Installs all deps, Chromium, sets up database |
| `npm run dev` | Starts both servers in dev mode |
| `npm run build` | Builds both for production |
| `npm start` | Starts both in production mode |

## What Happens Automatically

On `npm install`:
- Installs frontend & backend dependencies
- Finds or downloads Chromium
- Generates Prisma client
- Syncs database (if DATABASE_URL is set)
- Creates screenshots directory

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `JWT_SECRET` | Yes | Auth secret (generate random) |
| `PORT` | No | Backend port (default: 3001) |
| `CHROMIUM_PATH` | No | Auto-detected |

## Deploy Anywhere

Just push to GitHub and connect to Render/Railway/Vercel:
- **Build**: `npm install && npm run build`
- **Start**: `npm start`

See `DEPLOYMENT.md` for platform-specific guides.

## Recent Changes (Dec 10, 2025)
- Created unified monorepo with npm workspaces
- Single `npm install` installs everything including Chromium
- Single `npm run dev` starts both servers
- Auto-setup script handles database and dependencies
