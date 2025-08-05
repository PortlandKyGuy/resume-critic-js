# Sub-Agent Shared Memory

## Project Overview
- **Project Type**: Resume Evaluation API
- **Architecture**: Functional Programming with Express.js
- **Key Features**: Batch LLM evaluation, multiple critics, mock LLM support
- **Stack**: Node.js, Express.js, Ramda (functional utils)

## Key Design Patterns
1. **Functional Composition**: Using pipeAsync, curry, compose for building pipelines
2. **Batch Evaluation**: All critics evaluated in single LLM call for efficiency
3. **Pure Functions**: No side effects, predictable outputs
4. **Provider Pattern**: Pluggable LLM providers (OpenAI, Gemini, Ollama, Mock)

## Critical File Locations
- Architecture: `docs/api-architecture.md`
- API Spec: `openapi.yaml`
- Source Code: `src/` (not yet implemented)
- Tests: `tests/` (not yet implemented)

## Important Insights
- Document any critical insights beneficial for future reference here
- Record patterns discovered during implementation
- Note any gotchas or edge cases encountered

## Agent Usage Patterns
- **Parallel Execution**: When implementing features, invoke multiple specialists concurrently (e.g., functional-programming-expert + api-design-specialist)
- **Critic Review**: Always follow implementation agents with appropriate critics
- **Synthesis Required**: When multiple agents provide recommendations, use report-synthesizer to resolve conflicts

## Project-Specific Patterns
- **Batch Evaluation**: All resume critics must be evaluated in a single LLM call for efficiency
- **Mock Provider**: Essential for development - implement comprehensive mock responses
- **Functional Pipelines**: Use pipeAsync for all async operations, maintain immutability
- **Error Handling**: Use functional error patterns (Result/Either types) not try/catch in business logic