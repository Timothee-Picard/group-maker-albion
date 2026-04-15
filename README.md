# Group Maker

A modular Discord bot designed to manage Albion Online events and roster compositions. Built with TypeScript, discord.js, and Prisma.

## Architecture

- **botdiscord/**: The core Discord application and business domain.
  - Slash commands available: `/compositions` and `/events`.
- **siteweb/**: The web dashboard (Work in progress).
- **packages/**: Shared packages and utilities.
- **docker/**: Infrastructure bindings for Coolify via `docker-compose.yml`.

## Prerequisites

- Node.js >= 20
- npm >= 10
- Docker (for database)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment:**
   Copy `.env.example` to `.env` inside `botdiscord/`:
   ```bash
   cp botdiscord/.env.example botdiscord/.env
   ```
   Fill in your `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`.

3. **Start the database:**
   ```bash
   cd docker
   docker compose up -d
   ```

4. **Initialize Prisma:**
   ```bash
   cd botdiscord
   npx prisma generate
   npx prisma db push
   ```

5. **Start Dev Server:**
   From the root:
   ```bash
   make dev
   ```

## Using the Bot

1. Give the bot permissions (`Administrator` or `ManageGuild`).
2. Run `/compositions` to create a new group composition (e.g. 5v5 Hellgate).
3. Run `/events` to create an event using that composition.
4. Users can tag themselves in the event thread by typing `1`, `2`, or untag by typing `-`. The bot will update the parent message automatically!


## Development Rules
_See workspace-rule.md for details._
