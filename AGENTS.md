# AGENTS.md

## Purpose

This repository is a small static portfolio website.

Primary goal for coding agents:
**make the requested change with the smallest possible amount of inspection, reasoning, and code modification.**

Do not treat this repository as a redesign or refactor task unless the user explicitly asks for one.

---

## Codex Usage Policy

### Minimize token / usage consumption

1. Read only files directly relevant to the current request.
2. Do not scan the entire repository unless strictly necessary.
3. Start from filenames, selectors, text, or components explicitly mentioned by the user.
4. Use targeted search before opening large files.
5. Do not repeatedly reread unchanged files.
6. Do not perform broad codebase audits.
7. Do not investigate unrelated bugs, styling, accessibility, performance, SEO, or architecture.
8. Do not install dependencies unless explicitly required.
9. Prefer editing existing HTML/CSS/JS over introducing new systems.
10. Stop once the requested task is correctly completed and verified.

---

## Fail-Fast Rule

Before editing:

1. Identify the exact file(s) responsible for the requested feature.
2. Identify the relevant element, selector, function, or animation.
3. Confirm the safest minimal edit.

If the target cannot be identified confidently:

**STOP. Do not guess.**

Report:
- files inspected,
- likely relevant selectors/elements,
- what information is missing.

Do not make speculative edits.

---

## Scope Control

Unless explicitly requested, DO NOT:

- redesign the website,
- refactor unrelated code,
- rename unrelated classes,
- reorganize folders,
- rewrite existing CSS,
- change navigation,
- alter typography,
- modify global colors,
- change responsive behavior outside the target feature,
- touch other pages,
- replace working code for stylistic reasons,
- add frameworks or libraries,
- modify assets unrelated to the task.

Preserve the current visual identity and layout.

---

## Repository Context

This is a static portfolio website using:

- HTML
- CSS
- JavaScript
- local image/assets

Typical pages include:

- `index.html`
- `home.html`
- `about.html`
- `projects.html`
- `contact.html`
- `style.css`
- `script.js`

There is no need to run `npm install` unless the repository structure later changes and a package manager file actually exists.

Local testing can normally use:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

## Editing Strategy

For every request:

### 1. Locate
Use targeted search for:
- visible text,
- relevant class/id names,
- filenames,
- existing feature names.

### 2. Inspect
Open only enough surrounding code to understand the implementation.

### 3. Edit
Make the smallest coherent change.

### 4. Verify
Check only what is necessary to confirm:
- requested behavior works,
- target layout is intact,
- no obvious regression was introduced.

Do not perform unrelated cleanup.

---

## Visual Changes

When editing visual elements:

- preserve the existing pixel / voxel / game-like portfolio aesthetic,
- reuse existing spacing, colors, shadows, borders, and motion language where possible,
- avoid introducing a visually unrelated design system,
- keep decorative animation subtle enough not to compete with portfolio content,
- ensure decorative elements do not block clicks,
- keep responsive behavior intact.

---

## Animation Changes

Prefer CSS animation when the requested effect can be implemented cleanly without JavaScript.

Use JavaScript only when behavior genuinely requires state or interaction.

For decorative animations:

- use `pointer-events: none`,
- avoid expensive continuous DOM updates,
- prefer `transform` and `opacity`,
- keep loops smooth,
- avoid unnecessary libraries.

---

## Current Landing Page Rule

For landing-page requests involving the existing hero:

- preserve the hero copy,
- preserve the portfolio panel,
- preserve the existing ground/platform,
- preserve the background/grid,
- preserve the ENTER PORTFOLIO interaction,
- do not alter other pages unless explicitly asked.

If replacing the current Roblox/UGC decorative character, remove only the relevant character and label, then add the requested replacement without redesigning the hero.

---

## Response Format

After completing a coding task, respond concisely with only:

1. **Files changed**
2. **What changed**
3. **Manual check needed**, if any

Do not provide a long explanation unless requested.

---

## Priority Order

When instructions conflict, follow this order:

1. User's explicit current request
2. This `AGENTS.md`
3. Existing project conventions
4. General best practices

The user's requested scope always takes priority over optional improvements.
