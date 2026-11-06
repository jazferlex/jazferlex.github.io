# Portfolio Visits Implementation Plan

> Use superpowers:subagent-driven-development. The public site stays on GitHub Pages and reuses the Vercel API, Neon database, and Google-protected admin.

- [ ] Add a credentials-free page-view POST restricted to the public browser origin. Classify Vercel country and region headers and browser/OS families, then increment separate daily counts in one statement. Keep raw request attributes out of storage.
- [ ] Expose a 30-day report through the existing owner check. Verify request authorization, aggregation, and concurrent writes with Node tests and isolated PostgreSQL.
- [ ] Send one event per visible public page load and add a private Visits tab with daily totals and location, browser, and OS breakdowns. Verify the public-to-admin flow and responsive layout.
- [ ] Run the migration, publish the change, and smoke-test the live paths.
