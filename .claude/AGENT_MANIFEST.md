# AI Agent Team Manifest - Resume Evaluation API

## Overview
This manifest documents the specialized AI agents configured for the Resume Evaluation API project. Each agent has been carefully designed with deep expertise in specific domains to support the development, testing, and maintenance of this functional programming-based Node.js application.

## Agent Roster

### Development Agents

#### 1. **functional-programming-expert** (Sonnet)
- **Expertise**: Ramda, pure functions, composition patterns
- **Triggers**: Functional design, pipeline creation, immutability concerns
- **Output**: Functional implementations with verification plans

#### 2. **api-design-specialist** (Sonnet)
- **Expertise**: RESTful APIs, Express.js, OpenAPI 3.0
- **Triggers**: Endpoint design, route implementation, API versioning
- **Output**: API specifications with Express implementations

#### 3. **system-architecture-expert** (Opus)
- **Expertise**: Scalable systems, functional architecture, performance
- **Triggers**: System design, module structure, scalability planning
- **Output**: Architecture blueprints with mermaid diagrams

### Testing & Quality Agents

#### 4. **test-engineer** (Sonnet)
- **Expertise**: Jest, TDD, mock strategies, coverage analysis
- **Triggers**: Test implementation, mock design, coverage goals
- **Output**: Test suites with mock strategies and fixtures

#### 5. **code-reviewer-critic** (Sonnet)
- **Expertise**: Code quality, best practices, security review
- **Triggers**: Post-implementation review, quality audits
- **Output**: Actionable audit reports with remediation steps

#### 6. **security-auditor-critic** (Sonnet)
- **Expertise**: OWASP, API security, vulnerability assessment
- **Triggers**: Security reviews, data protection audits
- **Output**: Security assessments with risk ratings

### Specialized Domain Agents

#### 7. **llm-integration-specialist** (Sonnet)
- **Expertise**: OpenAI/Gemini/Ollama APIs, batch processing
- **Triggers**: LLM provider implementation, batch optimization
- **Output**: Provider patterns with error handling

#### 8. **prompt-engineering-expert** (Opus)
- **Expertise**: Prompt optimization, structured outputs, domain prompts
- **Triggers**: Critic prompt design, output formatting
- **Output**: Optimized prompts with JSON schemas

### Performance & Planning Agents

#### 9. **nodejs-performance-optimizer** (Sonnet)
- **Expertise**: V8 optimization, event loop, memory management
- **Triggers**: Performance issues, scalability concerns
- **Output**: Optimization strategies with benchmarks

#### 10. **implementation-planner** (Sonnet)
- **Expertise**: Task breakdown, timeline estimation, dependency mapping
- **Triggers**: Feature planning, roadmap creation
- **Output**: Phased implementation plans with acceptance criteria

### Orchestration Agent

#### 11. **report-synthesizer** (Opus)
- **Expertise**: Multi-agent consolidation, conflict resolution, prioritization
- **Triggers**: Multiple agent reports, synthesis needs
- **Output**: Unified action plans with resolved conflicts

## Usage Guidelines

### Context Injection Protocol
When invoking agents, always provide:
1. Clear task description
2. Relevant file paths
3. Specific constraints or requirements
4. Previous related work (if any)

### R.A.C.R.S. Workflow
1. **Primary Agent**: Performs initial analysis/implementation
2. **Critic Agent**: Reviews the work independently
3. **Refinement**: Address critic feedback
4. **Synthesizer**: Consolidate all findings into action plan

### Parallel Execution
Leverage multiple agents concurrently for:
- Different aspects of the same feature
- Independent module development
- Comprehensive reviews from multiple perspectives

## Best Practices

1. **Always use agents** for complex tasks to preserve main context
2. **Invoke critics** after any significant implementation
3. **Use synthesizer** when multiple agents provide input
4. **Update shared memory** (`.claude/sub_agents_memory.md`) with insights
5. **Follow functional principles** throughout all implementations

## Project-Specific Notes

- This is a **functional programming** project - agents must respect immutability
- **Batch evaluation** is critical for performance - single LLM calls for all critics
- **Mock LLM support** is required for development/testing
- **Security** is paramount - all endpoints must be audited
- Focus on **MVP first**, then iterate with enhancements

## Maintenance

This manifest should be updated when:
- New agents are added
- Agent capabilities are modified
- Project requirements change significantly
- New patterns or best practices emerge

Last Updated: [Auto-generated timestamp]
Agent Count: 11 specialized agents