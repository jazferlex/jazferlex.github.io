# Dynamic portfolio and Google admin

User request: content is dynamic; an admin can create, read, update, and delete content. Google OAuth only, authorized verified email `jazferlex@gmail.com`. No password login. Keep the public GitHub Pages design and add the Vercel API/admin at project `jazfer-portfolio-admin`, team `jazferlexs-projects`. Neon Free PostgreSQL is the persistent store; Marketplace terms accepted by user.

## Architecture and decisions

Use existing HTML/CSS/JavaScript with a Node.js Vercel backend, Better Auth Google OAuth, pg, and Zod. Prefer one versioned JSONB portfolio document over many relational content tables because this is one small portfolio edited together. Auth uses Better Auth's separate standard database tables. No JSON-file persistence or production auth bypass. Store content in Postgres, seed existing content once, and protect saves with a revision comparison to reject stale edits (409).

Keep the public static HTML as the outage/no-JavaScript fallback. A root `content.js` fetches public JSON without credentials and updates the existing DOM safely. Retain section anchors, styles, fonts, advertising config, and project IDs. Dynamic content must initialize before motion.js (or refresh reveal observation). Social crawlers may still see the static metadata; updating text in the browser is not server-side rendering.

## Shared content contract

`GET /api/content` returns `{ content, revision, updatedAt }`; content excludes draft records. `GET /api/admin/content` returns the full same envelope, authenticated. `PUT /api/admin/content` consumes `{ content, revision }` and returns the new envelope. No session =>401, wrong verified email=>403, invalid schema=>400, stale revision=>409. Writes require exact trusted Origin, JSON content type, and a valid server-side session; no CORS credentials for the public site. Public GET permits the GitHub Pages origin. Errors never return secrets or SQL details. Admin and auth responses are no-store.

Content shape (all objects strict):

```
schemaVersion: 1
metadata: {title, description, canonicalUrl, themeColor, faviconUrl, socialImage:{url,alt,width,height}}
header: {logo:{url,alt},brandAriaLabel,navigationAriaLabel,skipLinkLabel,navigation:{projects,about,skills,contact},resumeLabel}
resume: {url,downloadFilename}
hero: {eyebrow,heading:{lineOne,lineTwo},description,primaryActionLabel,secondaryActionLabel,notes:string[],portrait:{url,alt},footerText,footerLinkLabel}
work: {eyebrow,heading:{lineOne,lineTwo},description,academicEyebrow,academicHeading}
projects: [{id,category:'selected'|'academic',status:'published'|'draft',layout:'standard'|'wide',organization,period,title,description,contribution,note,tags:string[],tagsAriaLabel,link:{label,url}}]
about: {eyebrow,heading:{lineOne,lineTwo},paragraphs:string[],photo:{url,alt},photoCaption,link:{label,url},experienceLabel}
experience: [{id,status:'published'|'draft',organization,role,period}]
skills: {eyebrow,heading:{lineOne,lineTwo},description}
skillGroups: [{id,status:'published'|'draft',title,rows:string[]}]
contact: {eyebrow,heading:{lineOne,lineTwo},description,email,phoneDisplay,phoneDial,resumeLabel}
footer: {attribution,backToTopLabel}
```

Optional project text/link fields use empty strings, not missing keys. `rows` are human-readable lines, joined by line breaks. Limits: content body 128KB; arrays at most100 records, text at most10000 characters, labels at most300, IDs unique slug strings (no collision with fixed section/heading IDs). URLs accept HTTPS or safe relative paths; forbid protocol-relative URLs, credentials, script/data protocols and backslashes. Canonical must be HTTPS. Render user strings using textContent; never raw HTML. Public contact.email never controls the admin allowlist. Existing source facts and confirmed RAG dates Oct–Dec2025 must be preserved in seed.

## Authentication and setup

Better Auth handles Google state, PKCE, token verification and session cookies. Only Google enabled; email/password disabled. Reject unverified/non-admin users at account creation and every protected API request. Disable unrelated user/account mutation routes. Secure HttpOnly cookies in production, trusted origins explicitly configured, fail closed if Google credentials missing. Request only identity/email/profile scopes. Google OAuth client credentials must come from the owner through ignored environment files or Vercel secrets, never Git or chat. Callback: `/api/auth/callback/google`; local base `http://localhost:3000`, production stable Vercel hostname. No fake development login in production.

## Admin experience

Responsive dark/purple admin with Google sign-in, authenticated identity and logout. Tabs: Overview, Site & SEO, Hero, Projects, About, Experience, Toolkit, Contact & Footer. Forms have labels and clear save/error/success states. Repeated records can be added, edited, deleted with confirmation, moved up/down, and published/hidden. Singletons are editable. Save commits the whole document atomically. Unsaved edits warning, stale edit recovery without silently overwriting local changes, and view-public-site link. Photo and resume fields use URLs; file upload is outside this iteration.

## Verification

Meaningful Node tests cover validation, dangerous URLs/HTML text, draft filtering, real Postgres persistence/revisions, denied unauthenticated/wrong-user writes, Origin checks and Google-only auth configuration. Browser QA checks responsive public rendering, login, admin CRUD and save/reload where real OAuth configuration permits. Do not claim Google login works until the real owner flow is verified. Existing static site continues to work if API fails. Document exact setup blockers; prepare a reviewable PR, leave existing public deployment unchanged until integration is approved.
