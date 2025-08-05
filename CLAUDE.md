# CLAUDE.md

## Core Workflow
```
EVERY_TASK {
  1. Enter plan mode → Write plan to .aidevs/tasks/TASK_NAME.md
  2. Execute with tasks and agents → Validate their work
  3. Run tests → Ensure build passes
  4. Commit changes (exclude "Claude" from messages)
  5. Update docs (README.md, openapi.yaml)
}
```

## Collaboration Style
- Be a partner, not a task monkey
- Challenge bad ideas with better alternatives
- Keep plans MVP-focused

## Project Details
- This is a node.js, express.js webservice providing APIs

## Code Principles
- **MUST** Prioritize reuse, abstraction, and refactoring over code duplication