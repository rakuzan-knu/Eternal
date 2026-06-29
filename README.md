# Social Network — Onboarding Guide

<div align="center">

![NestJS](https://img.shields.io/badge/-NestJS-E0234E?logo=nestjs&logoColor=white&style=for-the-badge)
![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)
![Redis](https://img.shields.io/badge/-Redis-DC382D?logo=redis&logoColor=white&style=for-the-badge)
![Prisma](https://img.shields.io/badge/-Prisma-2D3748?logo=prisma&logoColor=white&style=for-the-badge)
![Socket.io](https://img.shields.io/badge/-Socket.io-010101?logo=socket.io&logoColor=white&style=for-the-badge)
![Docker](https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=white&style=for-the-badge)

</div>

---

## Before You Start

Make sure you have installed:

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

Also read [CONTRIBUTING.md](./CONTRIBUTING.md) — it covers branch naming, commit format, and PR rules.

---

## Getting Started

**1. Clone the repository:**
```bash
git clone <url>
cd social-network
```

**2. Set up environment variables:**
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` and fill in your local values (see table below).

**3. Start PostgreSQL and Redis:**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**4. Install all dependencies:**
```bash
npm run install:all
```

**5. Run database migrations:**
```bash
cd backend
npx prisma generate
npx prisma migrate dev
cd ..
```

**6. Start the project:**
```bash
npm run dev:backend   # API → http://localhost:3000
npm run dev:frontend  # App → http://localhost:5173
```

If everything works — you're ready to pick up a task from Jira.

---

## Environment Variables

Fill these in `backend/.env`. Ask the tech lead if you need real values for AWS.

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/social` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for JWT tokens | any random string |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `PORT` | Backend port | `3000` |
| `AWS_BUCKET_NAME` | S3 bucket name | — |
| `AWS_ACCESS_KEY` | AWS Access Key | — |
| `AWS_SECRET_KEY` | AWS Secret Key | — |
| `AWS_REGION` | AWS Region | `eu-central-1` |

> `AWS_*` variables are not required for local development.

---

## Project Structure

```
social-network/
├── backend/               # NestJS API
│   ├── src/
│   │   ├── auth/          # authentication, JWT, guards
│   │   ├── users/         # user profiles
│   │   ├── feed/          # posts, likes, comments
│   │   ├── chat/          # Socket.io gateway
│   │   ├── common/        # shared guards, pipes, decorators
│   │   └── prisma/        # Prisma service
│   └── prisma/
│       └── schema.prisma  # database schema
├── frontend/              # React + Vite
│   └── src/
│       ├── app/           # router, providers, layout
│       ├── pages/         # route pages
│       ├── features/      # feature slices (auth, feed, chat...)
│       ├── entities/      # domain entities (user, post...)
│       └── shared/        # ui-kit, utils, constants
└── docker-compose.dev.yml
```

---

## Daily Commands

**From root:**
```bash
npm run install:all       # install all dependencies
npm run dev:backend       # start backend
npm run dev:frontend      # start frontend
```

**Database:**
```bash
npx prisma migrate dev    # apply new migration
npx prisma generate       # regenerate Prisma Client after schema change
npx prisma studio         # visual database UI → http://localhost:5555
```

**Docker:**
```bash
docker compose -f docker-compose.dev.yml up -d    # start containers
docker compose -f docker-compose.dev.yml down     # stop containers
docker compose -f docker-compose.dev.yml logs     # view logs
```

---

## Stuck?

- Check that Docker containers are running: `docker ps`
- Check that `.env` is filled correctly
- Don't spend more than **1 hour** on a problem alone — message us in the chat.