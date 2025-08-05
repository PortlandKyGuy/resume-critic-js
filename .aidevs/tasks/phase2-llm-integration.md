# Phase 2: LLM Integration Implementation Plan

## Overview
Phase 2 focuses on implementing the LLM (Language Model) integration layer with support for multiple providers (OpenAI, Google Gemini, Ollama) and a mock provider for development/testing.

## Goals
1. Create a flexible LLM provider system that allows easy switching between providers
2. Implement mock provider for cost-effective development and testing
3. Add retry logic with exponential backoff for reliability
4. Create provider factory for clean instantiation

## Task Breakdown

### 1. LLM Client Interface & Factory
**File**: `src/llm/client.js`
- Create the main LLM client factory function
- Implement provider selection logic based on configuration
- Add retry wrapper with configurable backoff strategies
- Include mock mode detection logic
- Utility functions for development (createMockClient, createTestClient)

### 2. Mock Provider Implementation
**File**: `src/llm/providers/mock.js`
- Implement complete mock provider with realistic delays
- Support custom response mapping
- Generate appropriate batch evaluation responses
- Include specialized responses for different evaluation types
- Development helpers for setting mock responses

### 3. OpenAI Provider Implementation  
**File**: `src/llm/providers/openai.js`
- Implement OpenAI API integration
- Handle authentication and API key management
- Map internal request format to OpenAI format
- Error handling and response parsing
- Support for different OpenAI models (gpt-3.5-turbo, gpt-4, etc.)

### 4. Google Gemini Provider Implementation
**File**: `src/llm/providers/gemini.js`
- Implement Google Gemini API integration
- Handle authentication and API key management
- Map internal request format to Gemini format
- Error handling and response parsing
- Support for different Gemini models

### 5. Ollama Provider Implementation
**File**: `src/llm/providers/ollama.js`
- Implement Ollama local LLM integration
- Handle connection to local Ollama server
- Map internal request format to Ollama format
- Error handling and response parsing
- Support for different local models

### 6. Retry Logic Utility
**File**: `src/llm/utils/retry.js`
- Implement exponential backoff retry logic
- Support for linear backoff option
- Configurable max retries and delays
- Error classification (retryable vs non-retryable)

### 7. Batch Processing Utility
**File**: `src/llm/utils/batch.js`
- Utilities for batching multiple requests
- Request chunking for large batches
- Response aggregation
- Error handling for partial failures

### 8. Testing
- Unit tests for each provider with mocked API calls
- Integration tests using mock provider
- Contract tests for provider interfaces
- Development scripts for testing real LLM connections

## Implementation Order
1. Start with client.js and basic structure
2. Implement mock provider first (enables immediate testing)
3. Add retry logic
4. Implement OpenAI provider
5. Implement Gemini provider
6. Implement Ollama provider
7. Add batch utilities
8. Write comprehensive tests

## Key Design Principles
1. **Functional Programming**: All functions should be pure where possible
2. **Provider Abstraction**: All providers must implement the same interface
3. **Configuration-Driven**: Provider selection and settings via config
4. **Error Resilience**: Comprehensive error handling and retry logic
5. **Mock-First Development**: Mock provider enables TDD approach

## Dependencies to Add
```json
{
  "dependencies": {
    "openai": "^4.x.x",
    "@google/generative-ai": "^latest",
    "axios": "^1.x.x"  // For Ollama HTTP requests
  }
}
```

## Configuration Requirements
All providers should respect these configuration options:
- `provider`: Provider name (openai, gemini, ollama, mock)
- `apiKey`: API key for authentication
- `model`: Model to use
- `temperature`: Response temperature
- `maxTokens`: Maximum tokens in response
- `retry.maxRetries`: Maximum retry attempts
- `retry.backoff`: Backoff strategy (exponential, linear)

## Success Criteria
- All providers implement the same interface
- Mock provider enables full development without API costs
- Retry logic handles transient failures gracefully
- Easy to add new providers in the future
- Comprehensive test coverage
- Clear error messages for debugging

## Next Steps (Phase 3)
After completing Phase 2, Phase 3 will implement the Prompt Management system that will work with these LLM providers.