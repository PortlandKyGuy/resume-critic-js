# V2 Evaluate Endpoint Implementation Plan

## Overview
Implement `/v2/evaluate` endpoint that enhances the existing evaluation flow with:
- Job-fit aware scoring
- True batch evaluation (single LLM call)
- Industry-specific prompt variants
- Enhanced response structure

## Architecture Approach
Follow the existing `/evaluate` architecture patterns:
- Factory function pattern for routes
- Middleware composition
- Functional programming principles
- Mock LLM support

## Implementation Tasks

### 1. Route Definition
- Create `src/api/routes/v2/evaluation.routes.js`
- Follow same factory pattern as v1
- Use existing validation middleware
- Add v2-specific enhancements

### 2. Batch Evaluation Pipeline
- Create `src/services/evaluation/batchEvaluator.js`
- Implement single LLM call for all critics
- Structure prompt for batch processing
- Parse batch response correctly

### 3. Enhanced Prompts
- Extend existing prompts with job-fit awareness
- Add industry context support
- Maintain backward compatibility
- Create batch-friendly prompt format

### 4. Response Structure
- Keep all v1 fields for compatibility
- Add new fields:
  - `job_fit_score`
  - `industry_context`
  - `batch_execution`
  - Individual critic reasoning

### 5. Testing
- Use mock LLM provider
- Test batch evaluation
- Verify score calculations
- Ensure v1 compatibility

## Key Differences from V1

1. **Batch Processing**: Single LLM call vs parallel calls
2. **Job-Fit Scoring**: New scoring dimension
3. **Industry Context**: Optional industry-specific evaluation
4. **Enhanced Response**: More detailed feedback

## MVP Scope
- Basic batch evaluation working
- Job-fit score calculation
- Reuse existing prompts
- Mock LLM testing
- Same validation as v1

## File Structure
```
src/api/routes/v2/
├── evaluation.routes.js
src/services/evaluation/
├── batchEvaluator.js
src/prompts/v2/
├── batchPrompt.js
```

## Validation Points
- Request structure matches v1
- Batch response parsing works
- Scores normalize correctly
- Response includes all fields
- Mock LLM returns expected format