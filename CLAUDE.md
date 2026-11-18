# Project instructions

## Skills: always on

At the start of every new conversation in this project, before your first response or tool call:

1. Invoke the `using-superpowers` skill with the Skill tool.
2. Follow its rules for the whole session: before any response or action, check whether a skill applies. If there is even a small chance one does, invoke it first.
3. When several skills apply, run process skills first (brainstorming, debugging), then implementation skills.
4. Announce each skill you use in one line: "Using [skill] to [purpose]".

If a skill named by `using-superpowers` (for example `superpowers:brainstorming` or `superpowers:systematic-debugging`) is not installed, say so in one line and continue without it.
