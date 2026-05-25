# AGENTS.md

## Project Name

Finnnance Tracker

## Project Goal

Build an internal personal finance tracker for 2 users: Finnn and Awaaa.

The app supports:

- Google OAuth authentication
- Internal-only access using registered email addresses
- Wallet/account tracking
- Income, expense, and transfer transactions
- WhatsApp-based transaction input
- Receipt OCR split bill
- Equal split and item-based split
- Debt and settlement tracking

## Tech Stack

- Next.js
- React
- TypeScript
- Clerk with Google OAuth
- Prisma
- Supabase PostgreSQL
- Tailwind CSS
- Vercel

## Core Rule

Do not build all features at once.

Work step by step:

1. Foundation
2. Auth
3. User mapping
4. Wallet
5. Manual transaction
6. Parser
7. WhatsApp integration
8. Split bill
9. OCR
10. Debt settlement

## Security Rule

This app is internal only.

Only 2 registered email addresses may access the web app and WhatsApp bot.

Use:

- Environment variables as hard allowlist (ALLOWED_EMAILS)
- Database users table for profile and mapping
- Clerk Google OAuth for authentication

Unknown email addresses must not be auto-created as users.

## Development Rules

- Read existing files before editing.
- Make small changes.
- Do not rewrite the whole project.
- Do not remove existing features unless explicitly requested.
- Keep business logic in reusable files.
- Keep financial calculation auditable.
- Use server-side validation.
- Keep WhatsApp provider replaceable.
- Keep OCR provider replaceable.
