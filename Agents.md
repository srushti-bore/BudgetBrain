# BudgetBrain Agent Instructions

## Mandatory First Response

* Before executing any task, always start by greeting the user with: **"Hello Srush"**.

---

## Project Context

You are working on **BudgetBrain — Personal Expense Tracker**.
This is a **single-user, authentication-free MVP** focused on a simple core loop:

> Log expense → See impact → Track remaining budget

Do not introduce features outside the defined MVP scope unless explicitly approved.

---

## General Rules

* Do not change approved architecture.
* Follow repository structure strictly.
* Never request, expose, or store secrets.
* Use environment variables for all configuration.
* Never commit `.env` files.
* Follow API specification exactly.
* Follow UI design system strictly.
* Do not use inline styles.
* Do not hardcode business or demo data.
* Write tests for all new functionality.
* Do not modify unrelated files.
* Do not push directly to `main`.
* Run all required checks before completion.
* Update documentation when architecture changes.
* Ask for approval when requirements are ambiguous.

---

## Backend Guidelines

* Follow REST conventions under `/api/v1`.
* Keep clear separation:

  * Router → Service → Repository
* Do not place business logic inside routers.
* Validate all inputs at:

  * API layer
  * Service layer
* Enforce database constraints at all times.
* Use consistent response format:

  * Success: `{ data, meta }`
  * Error: `{ error: { code, message, field } }`
* Handle errors gracefully with meaningful messages.
* Write unit + integration tests for all endpoints.

---

## Frontend Guidelines

* Use component-based architecture.
* Build reusable UI components.
* Follow design system (colors, typography, spacing).
* Do not use inline CSS.
* Use proper data fetching (e.g., TanStack Query).
* Handle all UI states:

  * Loading
  * Empty
  * Error
* Ensure responsive design (mobile + desktop).
* Optimize rendering and avoid unnecessary re-renders.

---

## Database & Data Integrity

* Never use dummy or hardcoded data.
* All data must come from the real database.
* Maintain referential integrity.
* Respect constraints (foreign keys, validation rules).
* Implement safe category deletion:

  * Reassign linked expenses to "Uncategorized".
* Prevent data loss in all operations.

---

## Testing & Quality

* Tests are mandatory for every feature.
* Ensure:

  * Unit tests
  * Integration tests
* Cover edge cases:

  * Empty states
  * Invalid inputs
  * Boundary values
* Do not skip tests for speed.

---

## Git & Workflow

* Use feature branches: `feature/...`
* Write meaningful commit messages.
* Open Pull Requests (PRs) for all changes.
* Never push directly to `main`.
* Ensure all checks pass before merge.
* Keep PRs small and focused.

---

## Performance & Reliability

* Avoid unnecessary API calls.
* Optimize database queries.
* Ensure dashboard loads efficiently with real data.
* Prevent UI blocking and lag.
* Maintain smooth user experience.

---

## Security & Constraints

* No authentication is implemented — do not add it.
* Deployment URL is the only access boundary.
* Do not introduce third-party integrations without approval.
* Never expose sensitive configuration.

---

## Product Thinking Rules

* Prioritize simplicity over complexity.
* Do not introduce scope creep.
* Stick strictly to MVP requirements.
* Optimize for user flow:

  * Log → View → Understand → Act
* Focus on reducing friction (fast expense entry).

---

## UX Discipline

* Adding an expense should take < 30 seconds.
* Keep UI intuitive and minimal.
* Avoid unnecessary steps or clutter.
* Ensure clear visual feedback (charts, budget status).

---

## Code Quality Standards

* Use consistent naming conventions.
* Keep functions small and focused.
* Avoid deeply nested logic.
* Write clean, readable, maintainable code.
* Add comments only where necessary.

---

## Error Handling

* Show user-friendly error messages in UI.
* Log technical details internally (not exposed to users).
* Ensure graceful failure without crashes.

---

## Scalability Awareness

* Write code that supports future phases.
* Avoid shortcuts that block future enhancements.
* Keep architecture extensible.

---

## When in Doubt

* Do not assume requirements.
* Ask for clarification.
* Propose options before implementing major changes.

---

## Definition of Done (Agent Perspective)

A task is complete only when:

* Feature works end-to-end
* Tests are written and passing
* No hardcoded or dummy data is used
* API follows specification
* UI follows design system
* Code is clean and maintainable
* No unrelated files are modified
* All checks pass
* Documentation is updated (if needed)

---

## Strict Violations (Must Never Happen)

* Hardcoding business or demo data
* Committing `.env` or secrets
* Breaking API contract
* Ignoring validation rules
* Skipping tests
* Modifying unrelated files
* Pushing directly to `main`

---

*This document defines the strict operating rules for all agents contributing to BudgetBrain.*
