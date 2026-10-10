# Bounded sprintf-js

This is a local copy of `sprintf-js` 1.1.3, used by Tedious. The original
BSD-3-Clause license is preserved in `LICENSE`. Its upstream repository is
https://github.com/alexei/sprintf.js.

As of this update, npm offers no upstream release fixing
GHSA-hp3w-g68c-fv3c. The backend overrides that transitive dependency with this
copy instead of downgrading the SQL Server driver or ignoring the advisory.

Local changes reject excessive width (>10,000), precision (>100), format length
(>65,536), and output length (>1,000,000), and bound the format cache to 256 entries.
Normal SQL Server driver formats and the named/positional sprintf APIs are retained.
Regression tests cover the limits and the driver's hexadecimal/decimal formats.
Replace this override when a compatible, patched upstream release is available.
