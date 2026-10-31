# Portfolio repairs

Restore a complete, fast presentation of Jazfer's existing portfolio at https://jazferlex.github.io. The current HTML publishes `[Project name]` and `[month year]`, the About photograph is 2,702,475 bytes, and shared links have no explicit preview metadata.

## Approach

Apply focused maintenance to the existing static HTML and assets. A redesign would introduce unnecessary visual changes; a framework migration would add a build system without helping these defects. Keep the purple theme, layout, navigation, experience, contact details, resume, advertising configuration, and motion intact.

- Replace the unfinished hackathon title with the descriptive heading **Company Policy Q&A**. This describes the existing project rather than claiming its official name. Omit the unknown date and retain the documented contribution and technologies.
- Generate WebP versions of the existing About photograph at widths 800 and 1600 with quality 80 and no metadata. Preserve the original photo. Reference responsive variants from the HTML with correct intrinsic dimensions, lazy loading, and asynchronous decoding; keep the same crop and appearance.
- Add canonical, Open Graph, and Twitter summary metadata for the existing public URL, title, description, and 600 × 600 profile image. Use absolute public URLs. Do not claim new achievements or dates.

No new dependencies, hosting service, account changes, or paid services. Work on `codex/fix-portfolio` in the previously empty local workspace. Browser verification covers 320, 390, 768, and desktop widths; navigation, deep links, the resume, image loading, and unchanged motion fallbacks remain usable. Content and asset edits are low impact and reversible, so use direct checks and browser QA without adding a test framework.

Prepare a reviewable branch and pull request after verification. Publishing to the live `main` branch is a separate integration action.
