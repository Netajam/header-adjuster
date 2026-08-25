# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the actual strings used in this repo's issue tracker.

Because this repo uses a local markdown tracker, these are not GitHub labels —
they are the values written on the `Status:` line near the top of each issue
file under `.scratch/`.

| Label in mattpocock/skills | `Status:` value in our tracker | Meaning                                  |
| -------------------------- | ------------------------------ | ---------------------------------------- |
| `needs-triage`             | `needs-triage`                 | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`                   | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`              | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`              | Requires human implementation            |
| `wontfix`                  | `wontfix`                      | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), write the
corresponding value from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## After triage

The five roles above describe *triage*, not the whole life of an issue: none of
them means "done". Work that has shipped is recorded as `released (<version>)`,
which sits outside the state machine — nothing transitions out of it, and a
triage pass should skip anything carrying it.
