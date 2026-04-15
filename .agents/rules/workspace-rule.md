---
trigger: always_on
---

# Workspace Rules

## Project scope
This workspace contains a TypeScript Discord bot designed for medium-to-large multi-server usage.
The architecture must stay modular, lightweight, and evolvable.

## Repository structure
- Organize the repository with clear top-level separation such as:
  - `botdiscord/`
  - `siteweb/`
  - `packages/`
  - `docker/`
  - `docs/`
- Keep project boundaries clear between the Discord bot, the future web dashboard, and shared code.

## Discord bot architecture
- Use `discord.js`.
- Prefer slash commands for admin-only setup and management actions.
- Use Discord UI components (buttons, modals, select menus, embeds, and threads) for the main user experience.
- Restrict admin-only commands and actions with explicit permission checks.
- All permission-sensitive interactions must be validated server-side.

## Functional expectations
- The bot must support event creation through admin-only slash commands.
- Events can create structured participation flows using Discord messages and threads.
- Slot assignment logic must ensure that one user can only occupy one slot at a time for a given event.
- Reassignment must free the previous slot before assigning a new one.
- The bot must support message-based participation commands inside threads when required by the feature design.

## Clean architecture expectations
- Keep Discord interaction code separate from business rules.
- Keep database access separate from domain logic.
- Do not place business logic directly inside command handlers, button handlers, or event listeners.
- Prefer lightweight services and focused modules over complex enterprise patterns.
- Avoid unnecessary classes unless they provide real clarity.

## Database and persistence
- Use Postgres with Prisma.
- Use Prisma migrations.
- Start with Prisma used in infrastructure/services without forcing a heavy repository abstraction.
- Introduce repositories only when a real need appears.
- Model data for guilds, events, slots, assignments, permissions, and audit/logging in a way that supports multi-server usage.

## Testing
- Use Vitest.
- Write tests for business logic and critical flows.
- Prefer testing domain/services logic before framework glue.
- Add integration-style tests where useful for important workflows.

## Tooling
- Use ESLint and Prettier.
- Use Husky and lint-staged.
- Use npm.
- Use Docker and Docker Compose.
- The project should be deployable on Coolify through docker-compose.

## Logging
- Use a structured logger.
- Prefer Pino for application logs.
- Avoid scattered console.log usage except for temporary debugging.

## Security and permissions
- Never trust Discord UI visibility alone for permissions.
- Every admin action must be verified server-side.
- Validate guild context, member permissions, and target resources before mutating data.

## Delivery process
- Always start feature work with a plan and a sub-plan.
- Then list the files to create or modify.
- Implement in small, reviewable steps.
- Avoid broad refactors unless explicitly requested.
- Update README when setup, architecture, environment variables, commands, or behavior changes.

## Git conventions
- Use conventional commit types such as:
  - `feat:`
  - `fix:`
  - `refactor:`
  - `chore:`
  - `docs:`
  - `test:`
- Prefer branch names such as:
  - `feat/...`
  - `fix/...`
  - `refactor/...`
  - `chore/...`
  - `docs/...`
  - `test/...`