# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| downlink (mahmoodseoud.me) | Gallery / catalog | Solid top bar that is an index of objects and jumps, including into the rail; one mail link | Natural-flow layered photographic scene: rebuilt Earth plate, name, satellite cutout, bloom veil; object one already labelled | parallax flow > pin > flow+reveal > pan > flow > pin; 6 acts, 11.7vh | Short pinned inquiry plate typeset as an object label; CTA is the label's Link row; portrait develops from a mosaic | Scroll runs a real BayerRG mosaic and bilinear demosaic of the hero picture in the browser, with a photosite readout under the pointer | Photographic, the user's own mission render and photos; cold off-black, one amber accent | 46217 |

*(empty: your first build has nothing to clear, so build whatever the interview
points at. From the second onwards, this table is the constraint.)*

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- Gallery / catalog grammar with one label schema (What, For, Medium, Link) on every object. Taken by downlink.
- Index-of-objects top bar. Taken by downlink.
- Scroll-driven Bayer develop as the signature move. Taken by downlink.
- 6 acts at 11.7vh. Taken by downlink.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
