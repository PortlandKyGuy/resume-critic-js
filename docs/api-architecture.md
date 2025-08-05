# Resume Evaluation API Architecture Design (v2)

## Executive Summary

This document outlines the architecture for a sophisticated resume evaluation API that uses an ensemble of AI critics to provide comprehensive feedback. The system is designed using functional programming principles, batch LLM evaluation for efficiency, and includes mock LLM support for development/testing.

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Architecture Principles](#core-architecture-principles)
3. [Project Structure](#project-structure)
4. [Component Design](#component-design)
5. [Prompt Management System](#prompt-management-system)
6. [Request Processing Flow](#request-processing-flow)
7. [Data Models](#data-models)
8. [API Versioning Strategy](#api-versioning-strategy)
9. [Error Handling](#error-handling)
10. [Performance Considerations](#performance-considerations)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Architecture](#deployment-architecture)

## System Overview

The Resume Evaluation API is a Node.js/Express application that provides comprehensive resume analysis through multiple specialized AI critics. All critics are evaluated in a single LLM call for efficiency, with scores and detailed feedback provided for each aspect.

### Key Features
- **Batch Critic Evaluation**: All critics evaluated in a single LLM call for efficiency
- **Industry-Specific Prompts**: Configurable prompts for different industries
- **Multiple LLM Providers**: Support for OpenAI, Google Gemini, and Ollama with mock support
- **File Format Support**: PDF, DOCX, TXT, HTML processing
- **Comprehensive Audit Trail**: Request/response logging and analytics
- **Functional Programming**: Immutable, composable functions throughout
- **Mock LLM Support**: Development and testing without LLM costs

## Core Architecture Principles

### 1. Functional Programming
- **Pure Functions**: No side effects, predictable outputs
- **Immutability**: Data transformation without mutation
- **Composition**: Building complex operations from simple functions
- **Higher-Order Functions**: Functions that operate on other functions

### 2. Separation of Concerns
- **API Layer**: Handles HTTP concerns, validation, and response formatting
- **Business Logic Layer**: Pure functions for evaluation logic
- **Infrastructure Layer**: LLM integration, file processing, data persistence

### 3. Modularity
- Pluggable critic system
- Swappable LLM providers with mock support
- Industry-specific prompt modules

### 4. Scalability
- Stateless design for horizontal scaling
- Batch evaluation for efficient LLM usage
- Asynchronous job processing for long-running evaluations

### 5. Maintainability
- Functional programming principles
- Comprehensive error handling
- Extensive logging and monitoring
- Mock LLM support for development/testing

## Project Structure

```
resume-critic-js/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── v1/
│   │   │   │   ├── evaluation.routes.js
│   │   │   │   ├── comparison.routes.js
│   │   │   │   ├── fidelity.routes.js
│   │   │   │   └── specialized.routes.js
│   │   │   ├── v2/
│   │   │   │   └── evaluation.routes.js
│   │   │   ├── config.routes.js
│   │   │   ├── health.routes.js
│   │   │   └── audit.routes.js
│   │   ├── middleware/
│   │   │   ├── validation.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── audit.middleware.js
│   │   └── validators/
│   │       ├── evaluation.validators.js
│   │       ├── comparison.validators.js
│   │       └── common.validators.js
│   ├── core/
│   │   ├── critics/
│   │   │   ├── index.js
│   │   │   ├── config.js
│   │   │   └── specialized/
│   │   │       ├── summary.js
│   │   │       ├── workExperience.js
│   │   │       └── accomplishments.js
│   │   ├── evaluators/
│   │   │   ├── pipeline.js
│   │   │   ├── batch.js
│   │   │   ├── scoring.js
│   │   │   └── specialized.js
│   │   ├── processors/
│   │   │   ├── file.processor.js
│   │   │   ├── text.processor.js
│   │   │   ├── markdown.processor.js
│   │   │   └── parsers/
│   │   │       ├── pdf.parser.js
│   │   │       ├── docx.parser.js
│   │   │       └── html.parser.js
│   │   └── scoring/
│   │       ├── calculator.js
│   │       ├── weights.js
│   │       └── jobFit.js
│   ├── prompts/
│   │   ├── manager.js
│   │   ├── loader.js
│   │   ├── general/
│   │   │   ├── index.js
│   │   │   ├── critics.js
│   │   │   └── specialized.js
│   │   └── software-engineering/
│   │       ├── index.js
│   │       ├── critics.js
│   │       └── specialized.js
│   ├── llm/
│   │   ├── client.js
│   │   ├── providers/
│   │   │   ├── openai.js
│   │   │   ├── gemini.js
│   │   │   ├── ollama.js
│   │   │   └── mock.js
│   │   └── utils/
│   │       ├── retry.js
│   │       └── batch.js
│   ├── audit/
│   │   ├── logger.js
│   │   ├── storage/
│   │   │   ├── interface.js
│   │   │   ├── memory.storage.js
│   │   │   └── database.storage.js
│   │   ├── analytics.js
│   │   └── export.js
│   ├── utils/
│   │   ├── config.js
│   │   ├── logger.js
│   │   ├── errors.js
│   │   ├── validators.js
│   │   └── functional.js
│   └── app.js
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── mocks/
│   └── fixtures/
├── config/
│   ├── default.json
│   ├── development.json
│   ├── production.json
│   └── test.json
├── scripts/
│   ├── dev-mock.js
│   └── test-llm.js
├── .env.example
├── package.json
├── README.md
└── openapi.yaml
```

## Component Design

### 1. Functional Utilities

```javascript
// src/utils/functional.js
const { curry, pipe, compose, map, filter, reduce } = require('ramda');

// Async pipe helper
const pipeAsync = (...fns) => async (x) => {
  let result = x;
  for (const fn of fns) {
    result = await fn(result);
  }
  return result;
};

// Parallel execution helper
const parallel = async (fns) => Promise.all(fns.map(fn => fn()));

// Sequential execution helper
const sequence = async (fns) => {
  const results = [];
  for (const fn of fns) {
    results.push(await fn());
  }
  return results;
};

// Error handling wrapper
const tryCatch = (fn, errorHandler) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    return errorHandler(error, ...args);
  }
};

// Memoization for pure functions
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

module.exports = {
  pipeAsync,
  parallel,
  sequence,
  tryCatch,
  memoize,
  curry,
  pipe,
  compose,
  map,
  filter,
  reduce
};
```

### 2. Functional Route Handlers

```javascript
// src/api/routes/v1/evaluation.routes.js
const { pipe, map } = require('ramda');
const { pipeAsync } = require('../../../utils/functional');

// Pure function to create routes
const createEvaluationRoutes = (dependencies) => {
  const { evaluationPipeline, fileProcessor, validators } = dependencies;
  
  return [
    {
      method: 'post',
      path: '/evaluate',
      middleware: [validators.evaluation],
      handler: createEvaluationHandler(evaluationPipeline)
    },
    {
      method: 'post',
      path: '/evaluate-files',
      middleware: [
        createFileUploadMiddleware(),
        validators.evaluationFiles
      ],
      handler: createFileEvaluationHandler(evaluationPipeline, fileProcessor)
    }
  ];
};

// Handler creators
const createEvaluationHandler = (pipeline) => 
  pipeAsync(
    extractValidatedBody,
    pipeline,
    formatResponse
  );

const createFileEvaluationHandler = (pipeline, fileProcessor) => 
  pipeAsync(
    extractFiles,
    fileProcessor,
    mergeWithBody,
    pipeline,
    formatResponse
  );

// Helper functions
const extractValidatedBody = (req) => req.validated;
const extractFiles = (req) => ({ files: req.files, body: req.validated });
const mergeWithBody = ({ processedData, body }) => ({ ...body, ...processedData });
const formatResponse = (result) => ({ res, result }) => res.json(result);
```

### 3. Batch Evaluation Architecture

```javascript
// src/core/evaluators/batch.js
const { pipe, map, reduce } = require('ramda');

// Create batch evaluation request
const createBatchEvaluationRequest = (critics, context) => ({
  system: createBatchSystemPrompt(),
  user: createBatchUserPrompt(critics, context),
  temperature: context.options.temperature || 0.7,
  maxTokens: calculateMaxTokens(critics.length)
});

// System prompt for batch evaluation
const createBatchSystemPrompt = () => `
You are an expert resume evaluator. You will evaluate a resume against a job description 
from multiple perspectives. For each evaluation criterion, provide a score (0-100) and 
detailed feedback.

Respond in JSON format with the structure:
{
  "evaluations": [
    {
      "critic": "critic_name",
      "score": 0-100,
      "feedback": "detailed feedback explaining the score"
    },
    ...
  ]
}

Ensure all critics are evaluated and included in the response.
`;

// User prompt combining all critics
const createBatchUserPrompt = (critics, context) => {
  const header = `
Job Description:
${context.jobDescription}

Resume:
${context.resume}

${context.requirements ? `Required Terms: ${context.requirements.join(', ')}` : ''}

Please evaluate this resume from the following perspectives:
`;

  const criticPrompts = critics.map((critic, index) => `
${index + 1}. ${critic.name} (${critic.description}):
${critic.evaluationCriteria}
`).join('\n');

  return header + criticPrompts;
};

// Parse batch response
const parseBatchResponse = curry((critics, response) => {
  try {
    const parsed = JSON.parse(response);
    return critics.map(critic => {
      const evaluation = parsed.evaluations.find(e => 
        e.critic.toLowerCase() === critic.name.toLowerCase()
      );
      
      return {
        name: critic.name,
        score: evaluation?.score || 50,
        feedback: evaluation?.feedback || 'Unable to evaluate',
        executionTime: 0 // Will be calculated by the pipeline
      };
    });
  } catch (error) {
    return critics.map(critic => ({
      name: critic.name,
      score: 50,
      feedback: 'Error parsing evaluation response',
      error: error.message
    }));
  }
});

// Main batch evaluation function
const executeBatchEvaluation = curry(async (llmClient, critics, context) => {
  const startTime = Date.now();
  
  const request = createBatchEvaluationRequest(critics, context);
  const response = await llmClient.complete(request);
  const results = parseBatchResponse(critics, response);
  
  // Add execution time to each result
  const executionTime = (Date.now() - startTime) / 1000;
  return results.map(result => ({
    ...result,
    executionTime: executionTime / critics.length // Distribute time evenly
  }));
});

module.exports = {
  createBatchEvaluationRequest,
  parseBatchResponse,
  executeBatchEvaluation
};
```

### 4. Evaluation Pipeline

```javascript
// src/core/evaluators/pipeline.js
const { pipe, map, reduce, filter } = require('ramda');
const { pipeAsync } = require('../../utils/functional');

// Create the main evaluation pipeline
const createEvaluationPipeline = (dependencies) => {
  const {
    promptManager,
    llmClient,
    scoreCalculator,
    auditLogger,
    criticConfig
  } = dependencies;

  return pipeAsync(
    buildContext(promptManager),
    selectCritics(criticConfig),
    executeBatchEvaluation(llmClient),
    calculateScores(scoreCalculator),
    checkRequirements,
    formatResponse,
    logAudit(auditLogger)
  );
};

// Pipeline stages
const buildContext = curry((promptManager, request) => ({
  jobDescription: request.job_description,
  resume: request.resume,
  originalResume: request.original_resume,
  requirements: request.required_terms?.split(',').map(s => s.trim()) || [],
  options: {
    temperature: request.temperature || 0.7,
    processMarkdown: request.process_markdown !== false,
    industry: request.industry || process.env.PROMPTS_INDUSTRY || 'general'
  },
  promptManager,
  threshold: parseFloat(process.env.EVALUATION_THRESHOLD || '0.75'),
  startTime: Date.now()
}));

const selectCritics = curry((config, context) => {
  const enabledCritics = config.critics?.enabled || [
    'keyword', 'experience', 'impact', 'readability',
    'completeness', 'relevance', 'requirements'
  ];

  return {
    ...context,
    critics: enabledCritics.map(name => ({
      name,
      description: config.descriptions[name],
      evaluationCriteria: context.promptManager.getPrompt(name).criteria,
      weight: config.weights?.[name] || 1.0
    }))
  };
});

const calculateScores = curry((calculator, context) => {
  const results = context.results;
  const scores = results.map(r => ({
    name: r.name,
    score: r.score,
    weight: context.critics.find(c => c.name === r.name)?.weight || 1.0
  }));

  const compositeScore = calculator.calculateWeighted(scores);

  return {
    ...context,
    compositeScore,
    results
  };
});

const checkRequirements = (context) => {
  if (!context.requirements.length) {
    return { ...context, missingRequirements: [] };
  }

  const resumeLower = context.resume.toLowerCase();
  const missing = context.requirements.filter(req => 
    !resumeLower.includes(req.toLowerCase())
  );

  return { ...context, missingRequirements: missing };
};

const formatResponse = (context) => ({
  composite_score: context.compositeScore,
  pass: context.compositeScore >= context.threshold,
  threshold: context.threshold,
  results: reduce((acc, result) => ({
    ...acc,
    [result.name]: {
      score: result.score,
      feedback: result.feedback,
      execution_time: result.executionTime
    }
  }), {}, context.results),
  missing_requirements: context.missingRequirements,
  execution_time: (Date.now() - context.startTime) / 1000,
  llm_provider: context.llmClient?.provider || 'unknown',
  llm_model: context.llmClient?.model || 'unknown',
  prompt_version: context.promptManager.getVersion(),
  version: process.env.npm_package_version
});

const logAudit = curry(async (logger, response) => {
  await logger.log({
    event_type: 'evaluation',
    request: response.request,
    response,
    context: response.context
  });
  return response;
});

module.exports = { createEvaluationPipeline };
```

### 5. Mock LLM Provider

```javascript
// src/llm/providers/mock.js
const { curry } = require('ramda');

// Create mock provider
const createMockProvider = (config = {}) => {
  const responses = config.responses || getDefaultResponses();
  
  return {
    name: 'mock',
    model: 'mock-1.0',
    complete: createMockComplete(responses)
  };
};

// Mock complete function
const createMockComplete = curry(async (responses, options) => {
  // Simulate network delay
  await simulateDelay(100, 300);
  
  // Check for specific mock response
  const customResponse = findCustomResponse(responses, options);
  if (customResponse) return customResponse;
  
  // Generate appropriate mock response based on prompt
  if (options.user.includes('evaluate this resume')) {
    return generateBatchEvaluationResponse();
  }
  
  return 'Mock response for: ' + options.user.substring(0, 50);
});

// Helper functions
const simulateDelay = (min, max) => 
  new Promise(resolve => 
    setTimeout(resolve, Math.random() * (max - min) + min)
  );

const findCustomResponse = (responses, options) => {
  const key = Object.keys(responses).find(k => 
    options.user.toLowerCase().includes(k.toLowerCase())
  );
  return key ? responses[key] : null;
};

const generateBatchEvaluationResponse = () => JSON.stringify({
  evaluations: [
    {
      critic: 'keyword',
      score: 75,
      feedback: 'Mock: Good keyword coverage with room for improvement in technical terms'
    },
    {
      critic: 'experience',
      score: 82,
      feedback: 'Mock: Strong experience alignment with job requirements'
    },
    {
      critic: 'impact',
      score: 68,
      feedback: 'Mock: Consider adding more quantifiable achievements'
    },
    {
      critic: 'readability',
      score: 88,
      feedback: 'Mock: Well-structured and easy to read'
    },
    {
      critic: 'completeness',
      score: 90,
      feedback: 'Mock: Comprehensive coverage of all major sections'
    },
    {
      critic: 'relevance',
      score: 79,
      feedback: 'Mock: Mostly relevant with some extraneous details'
    },
    {
      critic: 'requirements',
      score: 85,
      feedback: 'Mock: Meets most of the stated requirements'
    }
  ]
});

const getDefaultResponses = () => ({
  'job fit': JSON.stringify({
    job_fit_score: 0.78,
    match_category: 'good',
    recommendation: 'proceed_with_full_evaluation',
    key_gaps: ['Advanced cloud architecture experience'],
    transferable_strengths: ['Strong programming skills', 'Team leadership']
  }),
  'summary evaluation': JSON.stringify({
    evaluations: [{
      critic: 'summary',
      score: 80,
      feedback: 'Mock: Compelling summary with clear value proposition'
    }]
  })
});

// Development helper to set mock responses
const setMockResponse = curry((provider, key, response) => {
  if (provider.name === 'mock') {
    provider.responses[key] = response;
  }
  return provider;
});

module.exports = {
  createMockProvider,
  setMockResponse
};
```

### 6. LLM Client Factory

```javascript
// src/llm/client.js
const { pipe, when } = require('ramda');
const { createMockProvider } = require('./providers/mock');
const { createOpenAIProvider } = require('./providers/openai');
const { createGeminiProvider } = require('./providers/gemini');
const { createOllamaProvider } = require('./providers/ollama');

// Factory function to create LLM client
const createLLMClient = (config = {}) => {
  const provider = selectProvider(config);
  
  return {
    provider: provider.name,
    model: provider.model,
    complete: withRetry(provider.complete, config.retry)
  };
};

// Select provider based on configuration
const selectProvider = (config) => {
  // Check for mock mode
  if (shouldUseMock(config)) {
    return createMockProvider(config.mock);
  }
  
  // Select real provider
  const providerName = config.provider || process.env.LLM_PROVIDER || 'openai';
  const providerConfig = {
    apiKey: config.apiKey || process.env[`${providerName.toUpperCase()}_API_KEY`],
    model: config.model || process.env.LLM_MODEL,
    ...config
  };
  
  switch (providerName) {
    case 'openai':
      return createOpenAIProvider(providerConfig);
    case 'gemini':
      return createGeminiProvider(providerConfig);
    case 'ollama':
      return createOllamaProvider(providerConfig);
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`);
  }
};

// Check if mock should be used
const shouldUseMock = (config) => {
  return config.useMock || 
         process.env.USE_MOCK_LLM === 'true' ||
         process.env.NODE_ENV === 'test';
};

// Add retry logic
const withRetry = (fn, retryConfig = {}) => {
  const maxRetries = retryConfig.maxRetries || 3;
  const backoff = retryConfig.backoff || 'exponential';
  
  return async (options) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn(options);
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          const delay = backoff === 'exponential' 
            ? Math.pow(2, i) * 1000 
            : 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };
};

// Development utilities
const createMockClient = (responses) => createLLMClient({
  useMock: true,
  mock: { responses }
});

const createTestClient = () => createMockClient({
  'default': 'Test response'
});

module.exports = {
  createLLMClient,
  createMockClient,
  createTestClient
};
```

## Prompt Management System

### 1. Prompt Structure

```javascript
// src/prompts/software-engineering/critics.js
module.exports = {
  keyword: {
    name: 'Technical Keyword Analysis',
    description: 'Evaluates technical keywords and skills alignment',
    criteria: `Assess the resume for:
- Programming languages and proficiency levels
- Frameworks, libraries, and tools mentioned
- Cloud platforms and DevOps technologies
- Database and data technologies
- Technical certifications
- Industry-specific terminology
- Missing critical keywords from the job description`,
    weight: 1.2
  },
  
  experience: {
    name: 'Technical Experience Evaluation',
    description: 'Evaluates software engineering experience relevance',
    criteria: `Evaluate the candidate's experience for:
- Relevance of past projects to the role
- Technical complexity of work described
- Scale and impact of systems built
- Team size and collaboration experience
- Technology stack alignment
- Career progression in technical roles
- Open source contributions (if any)`,
    weight: 1.5
  },
  
  impact: {
    name: 'Technical Impact Assessment',
    description: 'Evaluates quantifiable technical achievements',
    criteria: `Assess the technical impact by looking for:
- Performance improvements (latency, throughput)
- Scale metrics (users, requests, data volume)
- Cost savings or efficiency gains
- Code quality improvements
- System reliability improvements
- Development velocity improvements
- Technical innovation or patents`,
    weight: 1.3
  }
  
  // ... other critics
};
```

### 2. Prompt Manager

```javascript
// src/prompts/manager.js
const { curry, memoize } = require('ramda');

// Create prompt manager
const createPromptManager = (options = {}) => {
  const industry = options.industry || process.env.PROMPTS_INDUSTRY || 'general';
  const version = options.version || process.env.PROMPTS_VERSION || 'latest';
  
  const loadPrompts = memoize(loadPromptsForIndustry);
  const prompts = loadPrompts(industry, version);
  
  return {
    getPrompt: curry((criticName) => {
      const prompt = prompts.critics[criticName];
      if (!prompt) {
        throw new Error(`Prompt not found: ${industry}/${criticName}`);
      }
      return prompt;
    }),
    
    getAllPrompts: () => prompts.critics,
    
    getVersion: () => `${industry}:${prompts.version}`,
    
    getIndustry: () => industry
  };
};

// Load prompts for industry
const loadPromptsForIndustry = (industry, version) => {
  try {
    const prompts = require(`./${industry}`);
    
    if (version !== 'latest' && prompts.version !== version) {
      throw new Error(`Version ${version} not found for ${industry}`);
    }
    
    return prompts;
  } catch (error) {
    if (industry !== 'general') {
      console.warn(`Industry prompts not found, using general: ${error.message}`);
      return loadPromptsForIndustry('general', 'latest');
    }
    throw error;
  }
};

module.exports = { createPromptManager };
```

## Testing Strategy

### 1. Unit Testing with Mock LLM

```javascript
// tests/unit/evaluators/pipeline.test.js
const { createEvaluationPipeline } = require('../../../src/core/evaluators/pipeline');
const { createMockClient } = require('../../../src/llm/client');

describe('Evaluation Pipeline', () => {
  let pipeline;
  let mockClient;
  
  beforeEach(() => {
    mockClient = createMockClient({
      'evaluate this resume': JSON.stringify({
        evaluations: [
          { critic: 'keyword', score: 80, feedback: 'Good keywords' },
          { critic: 'experience', score: 75, feedback: 'Relevant experience' }
        ]
      })
    });
    
    pipeline = createEvaluationPipeline({
      llmClient: mockClient,
      promptManager: createMockPromptManager(),
      scoreCalculator: createMockScoreCalculator(),
      auditLogger: createMockAuditLogger()
    });
  });
  
  it('should evaluate resume with all critics', async () => {
    const request = {
      job_description: 'Senior Software Engineer...',
      resume: 'John Doe - Software Engineer...',
      required_terms: 'Python,AWS'
    };
    
    const result = await pipeline(request);
    
    expect(result.composite_score).toBe(77.5);
    expect(result.pass).toBe(true);
    expect(result.results.keyword.score).toBe(80);
    expect(result.results.experience.score).toBe(75);
    expect(result.missing_requirements).toEqual([]);
  });
});
```

### 2. Integration Testing

```javascript
// tests/integration/api.test.js
const request = require('supertest');
const { createApp } = require('../../src/app');

describe('API Integration Tests', () => {
  let app;
  
  beforeAll(() => {
    process.env.USE_MOCK_LLM = 'true';
    app = createApp();
  });
  
  describe('POST /evaluate', () => {
    it('should evaluate resume successfully', async () => {
      const response = await request(app)
        .post('/evaluate')
        .send({
          job_description: 'We need a Senior Developer...',
          resume: 'Experienced developer with 10 years...',
          required_terms: 'JavaScript,React'
        })
        .expect(200);
      
      expect(response.body).toMatchObject({
        composite_score: expect.any(Number),
        pass: expect.any(Boolean),
        results: expect.any(Object),
        missing_requirements: expect.any(Array)
      });
    });
  });
});
```

### 3. Development Scripts

```javascript
// scripts/dev-mock.js
#!/usr/bin/env node

// Start development server with mock LLM
process.env.USE_MOCK_LLM = 'true';
process.env.NODE_ENV = 'development';

console.log('Starting development server with mock LLM...');
console.log('This mode does not make real LLM API calls.');

require('../src/app').start();

// scripts/test-llm.js
#!/usr/bin/env node

// Test real LLM connection
const { createLLMClient } = require('../src/llm/client');

async function testLLM() {
  console.log('Testing LLM connection...');
  
  const client = createLLMClient({
    provider: process.env.LLM_PROVIDER,
    useMock: false
  });
  
  try {
    const response = await client.complete({
      system: 'You are a helpful assistant.',
      user: 'Say "Hello, World!"'
    });
    
    console.log('✓ LLM connection successful');
    console.log('Response:', response);
  } catch (error) {
    console.error('✗ LLM connection failed:', error.message);
    process.exit(1);
  }
}

testLLM();
```

## Configuration

### 1. Development Configuration

```json
// config/development.json
{
  "server": {
    "port": 8000,
    "bodyLimit": "10mb"
  },
  "llm": {
    "useMock": true,
    "provider": "mock",
    "retry": {
      "maxRetries": 3,
      "backoff": "exponential"
    }
  },
  "critics": {
    "enabled": [
      "keyword", "experience", "impact", 
      "readability", "completeness", "relevance", "requirements"
    ],
    "weights": {
      "keyword": 1.0,
      "experience": 1.5,
      "impact": 1.2,
      "readability": 0.8,
      "completeness": 1.0,
      "relevance": 1.3,
      "requirements": 1.0
    }
  },
  "prompts": {
    "industry": "general",
    "version": "latest"
  },
  "audit": {
    "enabled": true,
    "storage": "memory"
  }
}
```

### 2. Production Configuration

```json
// config/production.json
{
  "server": {
    "port": 8000,
    "bodyLimit": "10mb"
  },
  "llm": {
    "useMock": false,
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7,
    "retry": {
      "maxRetries": 3,
      "backoff": "exponential"
    }
  },
  "critics": {
    "enabled": [
      "keyword", "experience", "impact", 
      "readability", "completeness", "relevance", "requirements"
    ]
  },
  "prompts": {
    "industry": "general",
    "version": "1.0.0"
  },
  "audit": {
    "enabled": true,
    "storage": "database",
    "retentionDays": 90
  }
}
```

## Deployment

### 1. Environment Variables

```bash
# Required
NODE_ENV=production
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Optional
PORT=8000
PROMPTS_INDUSTRY=software-engineering
PROMPTS_VERSION=1.0.0
USE_MOCK_LLM=false
EVALUATION_THRESHOLD=0.75

# Development
USE_MOCK_LLM=true  # Set to use mock LLM
```

### 2. Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run as non-root
USER node

EXPOSE 8000

CMD ["node", "src/app.js"]
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "USE_MOCK_LLM=true nodemon src/app.js",
    "dev:real": "nodemon src/app.js",
    "test": "USE_MOCK_LLM=true jest",
    "test:integration": "USE_MOCK_LLM=true jest --testPathPattern=integration",
    "test:llm": "node scripts/test-llm.js",
    "lint": "eslint src",
    "format": "prettier --write 'src/**/*.js'"
  }
}
```

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Express app setup with functional middleware
- [ ] Basic routing structure with functional handlers
- [ ] Error handling framework
- [ ] Configuration management
- [ ] Functional utilities module

### Phase 2: LLM Integration
- [ ] LLM provider interfaces
- [ ] Mock provider implementation
- [ ] OpenAI provider implementation
- [ ] Retry logic
- [ ] Provider factory

### Phase 3: Prompt Management
- [ ] Prompt manager implementation
- [ ] General prompts module
- [ ] Software engineering prompts
- [ ] Dynamic loading system

### Phase 4: Batch Evaluation
- [ ] Batch evaluation module
- [ ] Response parsing
- [ ] Score calculation with weights
- [ ] Requirements checking

### Phase 5: API Endpoints
- [ ] V1 evaluation endpoints
- [ ] File processing
- [ ] Specialized evaluations
- [ ] V2 enhanced endpoints

### Phase 6: Audit System
- [ ] Audit logger
- [ ] Storage implementation
- [ ] Query endpoints
- [ ] Analytics

### Phase 7: Testing
- [ ] Unit tests with mock LLM
- [ ] Integration tests
- [ ] Contract tests for batch responses
- [ ] Development scripts
- [ ] API documentation

### Phase 8: Production Readiness
- [ ] Job queue implementation
- [ ] Graceful shutdown
- [ ] Monitoring setup
- [ ] Deployment documentation
- [ ] Performance benchmarking

## Conclusion

This architecture provides a robust, functional programming-based foundation for the Resume Evaluation API. Key improvements include:

1. **Batch Evaluation**: All critics evaluated in a single LLM call for efficiency
2. **Mock LLM Support**: Development and testing without API costs
3. **Functional Programming**: Pure, composable functions throughout
4. **No Authentication/Rate Limiting**: Simplified as requested
5. **Industry-Specific Prompts**: Easy switching via environment variables

The modular design allows for easy extension while maintaining code quality and testability.