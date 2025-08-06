# Phase 3: Prompt Management System Implementation Plan

## Overview
Phase 3 focuses on implementing a sophisticated prompt management system that works with the LLM providers from Phase 2. This system will enable dynamic prompt generation based on evaluation criteria, industry context, and job requirements.

## Goals
1. Create a flexible prompt template system with variable substitution
2. Implement industry-specific prompt variations
3. Build a prompt composition system that combines base prompts with critic-specific instructions
4. Support structured output parsing for consistent LLM responses
5. Enable prompt versioning for A/B testing and improvements

## Task Breakdown

### 1. Prompt Template Engine
**File**: `src/prompts/template.js`
- Create template parser with variable substitution support
- Implement template compilation for performance
- Support conditional sections based on context
- Handle nested templates and partials
- Pure functional implementation with memoization

### 2. Base Prompt Repository
**File**: `src/prompts/base.js`
- Define core evaluation prompt structures
- Create system prompts for different evaluation modes
- Implement prompt fragments for reusable components
- Support for multiple languages (future-ready)
- Functional composition of prompt parts

### 3. Critic-Specific Prompts
**Files**: `src/prompts/critics/*.js`
- Keyword analysis prompt generator
- Experience evaluation prompt generator
- Impact measurement prompt generator
- Readability assessment prompt generator
- Completeness checking prompt generator
- Relevance scoring prompt generator
- Requirements matching prompt generator

### 4. Industry Context Loader
**File**: `src/prompts/industry.js`
- Load industry-specific terminology and requirements
- Map industries to evaluation criteria
- Provide context enrichment for prompts
- Support custom industry definitions
- Cache loaded contexts for performance

### 5. Prompt Composition Engine
**File**: `src/prompts/composer.js`
- Combine base prompts with critic-specific instructions
- Inject industry context and job requirements
- Build structured output schemas
- Generate batch evaluation prompts
- Pure functional composition with currying

### 6. Output Schema Generator
**File**: `src/prompts/schema.js`
- Define JSON schema for expected LLM outputs
- Generate parsing instructions for LLMs
- Validate responses against schemas
- Handle schema versioning
- Support for different output formats

### 7. Prompt Version Manager
**File**: `src/prompts/version.js`
- Track prompt versions and changes
- Support A/B testing of prompts
- Log prompt performance metrics
- Enable rollback to previous versions
- Configuration-based version selection

### 8. Prompt Utilities
**File**: `src/prompts/utils.js`
- Token counting and optimization
- Prompt truncation strategies
- Variable validation and sanitization
- Debug mode for prompt inspection
- Performance monitoring helpers

### 9. Testing
- Unit tests for template engine
- Integration tests for prompt composition
- Contract tests for LLM response parsing
- Performance tests for prompt generation
- Mock data generators for testing

## Implementation Order
1. Start with template.js for core template functionality
2. Implement base.js with fundamental prompts
3. Add composer.js for prompt assembly
4. Create schema.js for output structure
5. Implement individual critic prompts
6. Add industry.js for context loading
7. Build version.js for versioning support
8. Add comprehensive utilities
9. Write extensive tests

## Key Design Principles
1. **Functional Programming**: All prompt operations as pure functions
2. **Composability**: Small, reusable prompt components
3. **Performance**: Memoization and caching for repeated operations
4. **Type Safety**: Clear interfaces and validation
5. **Testability**: Easy to test prompt generation logic

## Prompt Structure Example
```javascript
// Base evaluation prompt structure
{
  system: "You are an expert resume evaluator...",
  context: {
    industry: "software engineering",
    jobTitle: "Senior Developer",
    requirements: ["React", "Node.js", "AWS"]
  },
  instructions: {
    format: "structured_json",
    schema: { /* JSON schema */ },
    critics: ["keyword", "experience", "impact"]
  },
  examples: [ /* Few-shot examples */ ]
}
```

## Configuration Integration
The prompt system will respect these configuration options:
- `prompts.industry`: Default industry context
- `prompts.version`: Prompt version selection
- `critics.enabled`: Which critics to include
- `evaluation.threshold`: Scoring thresholds

## Dependencies to Add
```json
{
  "dependencies": {
    "json-schema": "^0.4.x",
    "gpt-tokenizer": "^2.x.x"
  }
}
```

## Success Criteria
- Dynamic prompt generation based on evaluation context
- Industry-specific evaluation criteria
- Consistent structured outputs from LLMs
- Easy to add new critics and industries
- Performance optimization through caching
- Clear debugging and inspection tools

## Integration with Phase 2
- Prompts will be passed to LLM clients created in Phase 2
- Support all providers (OpenAI, Gemini, Ollama, Mock)
- Handle provider-specific prompt optimizations
- Maintain provider-agnostic interfaces

## Next Steps (Phase 4)
After completing Phase 3, Phase 4 will implement the Critic System that uses these prompts to perform actual resume evaluations.