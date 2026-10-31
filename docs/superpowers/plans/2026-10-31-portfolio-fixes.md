# Portfolio Fixes Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this task. Track the steps below.

**Goal:** Remove unfinished public copy, reduce photo transfer size, and provide accurate shared-link previews.

**Architecture:** Retain the existing GitHub Pages static site. Change HTML and add compressed image variants; preserve CSS, JavaScript, existing assets, and deployment configuration.

**Tech Stack:** HTML, CSS, browser JavaScript, cwebp, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-31-portfolio-fixes-design.md`

## Global Constraints

- Preserve the existing visual design, facts, contact details, resume, advertising configuration, and motion.
- Do not invent official project names, dates, achievements, or metrics.
- Use the descriptive hackathon heading `Company Policy Q&A`; omit the unknown date.
- Keep the original photograph; add WebP variants at widths 800 and 1600, quality 80, without metadata.
- Use absolute `https://jazferlex.github.io/` URLs for canonical and social metadata; use the existing 600 × 600 `images/profile.png` for previews.
- No new dependencies, build framework, hosting service, account changes, or paid services.
- Do not push or merge to `main`; prepare a reviewable branch.

## Review Focus

Check unknown-date copy, image aspect ratio and crop, narrow-screen overflow, direct fragment links with animated content, and all local asset/resume paths.

### Task 1: Complete public copy, image delivery, and link previews

**Files:** Modify `index.html`; add `images/about-800.webp` and `images/about-1600.webp`.

**Interfaces:** Existing `.about-photo img` styling and `[data-reveal]` attributes remain unchanged. The browser uses `srcset` and `sizes` to choose the image. Public sharing clients read metadata from the document head.

- [ ] Verify the reported placeholder copy, missing metadata, and original image size before editing.
- [ ] Update the hackathon heading and remove the unknown date. Retain project facts and technologies.
- [ ] Compress the existing photograph into the two specified WebP variants with cwebp. Point the existing About image to them using appropriate responsive sizes, dimensions, lazy loading, and asynchronous decoding.
- [ ] Add canonical, Open Graph, and Twitter summary metadata using the existing title, description, URL, and profile image. Include image dimensions and descriptive image alt text.
- [ ] Validate HTML parsing, local links/assets, unique IDs, no placeholder copy, image dimensions and savings, and `git diff --check`. There is no existing test suite or build command; do not introduce one for these reversible content and asset changes.
- [ ] Self-review and commit only the three task files. Return the exact checks and results to the controller.

The controller then runs browser QA on the served site, obtains independent review, pushes the branch, and creates a pull request for integration.
