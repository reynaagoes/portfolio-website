# AGENTS.md

## MODE

Work fast. Use minimum tokens, tools, commands, and file reads.

Do ONLY what the user explicitly asks.

No over-engineering.
No unrelated cleanup.
No speculative improvements.

---

## BEFORE EDITING

1. Read this file.
2. Inspect ONLY files directly relevant to the task.
3. Understand existing code.
4. Make the smallest possible change.

Do NOT scan the whole repository unless absolutely necessary.

---

## EDITING RULES

- Preserve existing design and content unless asked to change them.
- Reuse existing HTML, CSS, JS, components, and assets.
- Do not install packages unless required.
- Do not refactor unrelated code.
- Do not rewrite entire files when a small edit is enough.
- Do not touch unrelated files.
- Never discard existing user changes.

---

## STRICT LOW-USAGE MODE

For normal tasks, target:

- 1–3 file reads
- 1 focused edit
- 0–1 validation commands

STOP immediately when the requested task is complete.

Do NOT perform extra investigation after finding the solution.

---

## BROWSER / SCREENSHOT RULE

NEVER automatically:

- launch Chrome or Edge
- use headless browsers
- take screenshots
- view screenshots
- create browser profiles
- create temporary test HTML
- perform visual regression
- test every page
- test desktop and mobile
- repeat failed browser commands

Only do browser or screenshot testing when the user explicitly asks for it.

For normal HTML/CSS/JS changes, source-level verification is enough.

---

## VALIDATION

Validate only what changed.

Prefer:
- code inspection
- syntax/reference check

Do not run broad regression tests.

If one validation command fails, inspect the cause before retrying.

Do not repeatedly retry the same command.

---

## DESIGN

Portfolio direction:

- premium
- dark
- editorial
- minimal
- cinematic
- bold typography
- polished motion

Avoid:
- Roblox / voxel aesthetics
- generic portfolio templates
- excessive cards
- excessive gradients
- excessive glow
- unnecessary animation

Preserve existing visual language.

---

## RESPONSIVE

Do not break:
- desktop
- tablet
- mobile
- navigation
- text layout
- overflow

Only inspect responsive behavior when the edited code could realistically affect it.

---

## GIT

Do NOT run:

- git add
- git commit
- git push

unless explicitly requested.

---

## FINISH

When done, report only:

1. files changed
2. what changed
3. validation performed

Then STOP.