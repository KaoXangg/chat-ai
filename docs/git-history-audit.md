# Git history audit — 2026-10-07

Read-only audit of all reachable Git objects and the contents of the four largest ZIP blobs. Secret values were neither printed nor copied into this report.

`git count-objects -vH` reports 453 loose objects using **175.90 MiB**, with no packs. Most of the size comes from old archives containing `node_modules`:

| Object | Path | Bytes |
| --- | --- | ---: |
| `cff29dcdb7a43d85377cfb6950b515ba87673555` | `frontend.zip` | 45,293,254 |
| `19ae7fd2034c2da71706a9ec4c7519e8616fd7c6` | `frontend.zip` | 45,289,632 |
| `f6297ac721803a85eafe9a3de24df3a5c3fb2893` | `frontend.zip` | 45,263,214 |
| `6cb0a9481065abdbba8fe4447bbda8d493cec6ea` | `backend.zip` | 20,750,486 |

**`backend.zip` contains `backend/.env` with nonempty DB_PASSWORD, JWT_SECRET, ADMIN_PASSWORD, GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY and TAVILY_API_KEY.** DB_PASSWORD, JWT_SECRET and ADMIN_PASSWORD still match the local backend environment at the time of this audit. Different local API keys do not establish that the archived keys were revoked.

Each frontend archive contains `frontend/.env`; no settings named KEY, SECRET, PASSWORD or TOKEN were present there. Historical `backend/sql/SQLQuery1.sql` and `migration_add_images_column.sql` contained no credential assignments detected by the audit. This was a targeted inspection, not a complete secret scanner.

Required follow-up:

1. Rotate the exposed DB and administrator passwords and JWT secret. Rotating the JWT secret invalidates existing signed sessions. Revoke or rotate each archived provider/search API key that is still valid through the corresponding account.
2. After coordinating with other repository users and making a backup, remove both ZIP paths from **all Git history** using `git filter-repo` or BFG. Repository hosting, forks and existing clones can retain copies; deleting current files or running garbage collection alone does not revoke credentials.
3. Coordinate the rewritten remote history and fresh clones, then verify the archives are absent from every retained branch/tag and run a secret scanner.

The working tree now ignores `backend.zip` and `frontend.zip`. No credentials were changed and no Git history was rewritten by this task; the provider accounts are not accessible from this workspace.
