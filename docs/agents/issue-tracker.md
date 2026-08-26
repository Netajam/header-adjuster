# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

> This repo has a GitHub remote (`Netajam/heading-adjuster`) with its own open
> issues, and `gh` is authenticated. That is **not** the tracker for these
> skills. Never run `gh issue create`, never comment on or label GitHub issues,
> and never publish `.scratch/` content to GitHub unless explicitly asked.

`.scratch/` is gitignored — issues stay local and are not committed.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file
  (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the
issue number directly.
