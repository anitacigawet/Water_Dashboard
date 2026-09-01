# Local source automation

Arizona Basin Monitor checks its primary sources locally rather than using GitHub Actions. The scheduled operation is deterministic:

```bash
npm run sources:daily
```

That command checks ADWR and USGS availability and schema, generates an ignored snapshot candidate, validates it, compares source-backed fields, and writes `artifacts/daily-source-check.json`. It uses a single-run lock so overlapping checks cannot replace one another's candidate or report.

## Publication boundary

The daily check is read-only with respect to tracked project data. It stops and requests review when a required source fails, a schema or managed-area classification changes, an unexpected narrative-status result appears, or the candidate cannot be validated. A check timestamp by itself is not a data change.

Promotion is intentionally separate:

```bash
npm run data:apply-candidate
npm run data:validate
npm run lint
npm run build
```

The apply command verifies the candidate hash, the baseline hash, source health, and the manual-review flag before copying anything into the tracked snapshot. Commit, push, and deployment remain separate operations.

## Maintainer autopilot

The local maintainer schedule runs:

```powershell
npm run autopilot
```

The controller holds an exclusive local lock, requires a clean synchronized `main` branch, and runs the deterministic daily check. If the report is unchanged, it verifies that the deployed water build matches the current repository. If the report is changed and explicitly auto-apply eligible, it applies the exact validated candidate, reruns data validation, TypeScript, and the production build, and refuses to continue unless the generated snapshot is the only tracked change. It then creates a data-only commit, pushes `main`, and publishes only the water showroom payload.

The VPS helper verifies the uploaded archive hash, stages the candidate on a separate loopback port, checks the title, asset responses, and water-specific content-security policy, preserves the previous water directory, activates the candidate, restarts the shared static service, and verifies all seven local origins. The final production Playwright test must pass. A failed activation restores the previous water directory.

This standing permission is deliberately narrow. The autopilot cannot change source code, dependencies, schemas, monitored-area classifications, narrative legal status, deployment helpers, other showrooms, Cloudflare configuration, or the owner console. Those conditions stop for review.

## Storage and model policy

The canonical public data remains structured JSON with direct source URLs, dates, units, identifiers, and explicit unavailable states. If a durable run and field-change history becomes necessary, use SQLite and generate the web snapshot from it.

A vector database is not part of the measurement pipeline. It may be useful later as a secondary search index for a large collection of versioned reports, plans, and orders, but retrieved text must never become a published number or classification without deterministic source extraction and validation.

No model is required to fetch, validate, compare, apply, or deploy source data. The scheduled Codex task uses a low-cost model only to run the deterministic controller and report its result. Source/schema or legal-status changes require human review; a model does not resolve them automatically.
