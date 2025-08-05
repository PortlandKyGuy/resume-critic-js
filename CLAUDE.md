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
- Resume Evaluation API with functional programming architecture
- Batch LLM evaluation for efficiency
- Mock LLM support for development/testing

## Code Principles
- **MUST** Prioritize reuse, abstraction, and refactoring over code duplication
- Follow functional programming principles (pure functions, immutability, composition)
- Use batch evaluation for all critics in single LLM calls
- Implement proper error handling with functional patterns

## Orchestration Policy
You **MUST** utilize sub-agents for all tasks whenever possible to conserve the main context. When invoking sub-agents, you **MUST** adhere to the Context Injection Protocol: provide all necessary context and information from your current state explicitly (including relative file paths for deterministic access). Consider launching multiple agents in parallel for efficiency. Upon completion, you **MUST** invoke a Reviewer/Critic agent to examine their work, followed by a Synthesizer/Arbiter agent to consolidate the findings into a unified action plan. This R.A.C.R.S. workflow is mandatory for refined, error-free output and optimal context management.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.