# Vendored `sprintf-js`

`tedious@18.6.2` declares `sprintf-js: ^1.1.3`. The vendored implementation is based on upstream `sprintf-js@1.1.3`, licensed under BSD-3-Clause; the upstream license is kept in `sprintf-js/LICENSE`.

## Local differences

A direct diff of upstream `src/sprintf.js` 1.1.3 and `sprintf-js/sprintf.cjs` shows ten added lines and no removed lines:

- Reject a format string longer than 65,536 characters.
- Reject width above 10,000 or precision above 100.
- Reject formatted output above 1,000,000 characters.
- Clear the parsed-format cache after 256 entries.

The rest of the formatting implementation is unchanged. Backend unit tests cover the added bounds and representative SQL driver formats.

## Why it is patched

The bounds mitigate resource exhaustion reported as `GHSA-hp3w-g68c-fv3c`. The project history added this local copy and records the same reason in `sprintf-js/README.md`. Replace it when a compatible upstream release includes the fix.

The local package is named `@chat-ai/sprintf-js` at `1.1.3-patched.1`; npm aliases it as `sprintf-js` to satisfy Tedious. `npm ls sprintf-js` currently resolves both the direct dependency and Tedious to this local package without an invalid dependency warning.
