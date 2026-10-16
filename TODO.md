# Open work

- Verify actual Chrome extension flows in a disposable profile: permissions, partitioned cookie enumeration, popup page checks and exports.
- Add opt-in, site-specific interface adapters with explicit evidence and freshness labels. Generic logout controls remain heuristic.
- Add narrowly scoped IndexedDB database-name/count inspection only if it improves decisions; no record access.
- Consider individual permission grant removal UI.
- Keep cleanup out of v0.1. If added, distinguish local deletion from server-side revocation and require a specific user action.

# Decisions

- Chrome 132+; Manifest V3; no dependencies.
- Read-only auditing, no secret display/persistence/export, no external network calls.
- Cookie scanner necessarily receives secret values transiently because Chrome has no metadata-only cookie API.
- No automated login validity claims, password vault access or secret-storage key scanning.
