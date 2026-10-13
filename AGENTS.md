
/

















Agents · MD
AGENTS.md
PRIMARY RULE
CODE ONLY. Make the requested change with the lowest possible usage, then STOP.

No testing, verification, debugging, cleanup, or extra improvements — ever, unless explicitly asked.

WORKFLOW
Read only the file(s) named or clearly implied.
Find the exact code to change.
Edit it.
Report files changed + what changed, in a few lines.
STOP.
Target per task: 1–2 file reads, 1 edit, 0 other commands.

NEVER RUN
node · npm · python · linters · formatters · test scripts · local servers · port or process checks · browser automation · headless Chrome/Edge · screenshots · image viewing · responsive or visual-regression checks · git add / commit / push · any command run only to confirm your own edit worked.

Source inspection is enough.

NEVER CREATE
Temp files of any kind: .tmp-*, test-*, debug-*, verify-*, throwaway HTML, temp browser profiles, screenshots. Edit the real project files.

FILE READING
Start at the file or section the user names. Do not scan the repo, read files "just in case", or inspect git history.

EDITING
Smallest possible change. Targeted replacement over rewrites.

Never: refactor, rename unrelated code, reformat whole files, change architecture, touch dependencies or lockfiles, or clean up anything unrelated.

Preserve all unrelated user code.

IF SOMETHING LOOKS BROKEN
Make the single most likely direct fix. Do not reproduce the issue, build a test harness, inspect runtime state, or retry in a loop.

VALIDATION
Default: none.

Only validate when the user explicitly says: test, debug, verify, run it, check browser, check responsive, screenshot.

PROJECT CONCEPT
A portfolio built around water. The visitor arrives at a pool and goes under.

index.html — black page, one top-down swimming pool floating in the centre. The pool is a box with real depth: walls, floor, tiled rim. Water is bright turquoise with caustics, and ripples follow the cursor and bounce off the walls. "ENTER WORLD →" sits on the lane marking. Clicking zooms the pool past the viewport, then goes to home.html.
home.html — reads as being underwater. The hero canvases carry dark, slow caustics and a faint refraction over the portrait, continuing the pool from index.html.
The water simulation and noise/caustics helpers live in script.js. Reuse them. Never write a second implementation.
intro.html has been deleted. Do not recreate or reference it.
DESIGN DIRECTION
Dark · premium · editorial · cinematic · minimal · bold typography · polished motion.

The pool itself is the one bright element, and that contrast against black is the point.

Water must read as water, never as illustration:

Caustics are thin, irregular networks of varying brightness. Never thick, even ribbons on a repeating grid.
Everything inside the pool distorts with the ripples, lane markings and floor grout included — not just the caustics layer.
Colour moves in gradients. No flat fill meeting another flat fill at a hard edge.
Tiles and grout carry slight irregularity in tone and width. A perfect grid reads as fake.
Light comes from the top left throughout.
Geometry is precise: wall thickness derived from one inset value for all four sides, floor centred on the rim, coordinates rounded to whole pixels.

Avoid: voxel or Roblox styling, generic portfolio templates, card grids, heavy gradients, glow, animation that serves nothing.

RESPONSIVE & PERFORMANCE
Never break desktop, tablet, mobile, navigation, text layout, or overflow.

Canvas work: simulate at half resolution, stop the loop on document.hidden, and render a still frame under prefers-reduced-motion.

DEPENDENCIES
No installs, removals, or upgrades. No npm install. Everything stays vanilla HTML/CSS/JS.

HARD STOP
Once the requested change exists in the code: STOP. No checks, no cleanup, no "one more thing".


Claude finished the response
