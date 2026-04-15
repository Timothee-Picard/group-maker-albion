---
trigger: always_on
---

# When asked to implement a feature:

1. First analyze the current codebase and identify the relevant modules.
2. Produce a short implementation plan.
3. Produce a sub-plan with the concrete steps.
4. List the files that will be created or modified.
5. Highlight risks, assumptions, and dependencies if any.
6. Only then start implementation.
7. Implement in small, progressive steps.
8. Avoid unrelated refactors.
9. Add or propose tests.
10. Update README if setup, usage, commands, or architecture are affected.

# Before considering a task complete, verify:

- The implementation matches the requested behavior.
- Permissions and role checks are correctly enforced.
- Business logic is not embedded in Discord handlers.
- Types are explicit and safe.
- New code follows the project structure and naming conventions.
- Tests were added or updated when relevant.
- Linting and formatting expectations are respected.
- Environment variables, commands, and setup are documented if changed.
- README was updated if the change impacts usage or project structure.