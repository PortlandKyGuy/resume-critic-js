# Debug Logging for Resume Critic API

## Overview

When the log level is set to `debug`, the API will now log:

1. **Incoming API Request** - Full request details including headers, body, query params
2. **LLM Request Details** - System and user prompts being sent to the LLM
3. **LLM Response Details** - Raw response from the LLM provider
4. **Parsing Results** - Success/failure of JSON parsing for each critic
5. **Outgoing API Response** - Full response being sent back to the client

## How to Enable Debug Logging

Set the environment variable:
```bash
LOG_LEVEL=debug npm start
```

Or in your `.env` file:
```
LOG_LEVEL=debug
```

## Example Debug Output

When you make a request to `/v2/evaluate`, you'll see:

```json
// 1. Incoming Request
{
  "level": "debug",
  "message": "API Request received",
  "method": "POST",
  "url": "/v2/evaluate",
  "headers": { ... },
  "body": {
    "job_description": "...",
    "resume": "...",
    "job_fit_score": 0.85
  }
}

// 2. Critic Identification
{
  "level": "debug", 
  "message": "Calling keyword critic",
  "criticIndex": 0,
  "systemPromptLength": 1234,
  "userPromptLength": 2345
}

// 3. LLM Request (OpenAI example)
{
  "level": "debug",
  "message": "OpenAI: Sending request",
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "contentLength": 1234,
      "contentPreview": "You are a senior technical recruiter..."
    },
    {
      "role": "user", 
      "contentLength": 2345,
      "contentPreview": "Instructions: 1. Identify 'must-have' keywords..."
    }
  ]
}

// 4. LLM Response
{
  "level": "debug",
  "message": "OpenAI: Received response",
  "responseLength": 456,
  "responsePreview": "{\"score\": 0.94, \"missing_must_have\": [\"ArgoCD\"]...",
  "finishReason": "stop"
}

// 5. Parsing Result
{
  "level": "debug",
  "message": "Successfully parsed keyword critic response",
  "critic": "keyword",
  "parsedKeys": ["score", "missing_must_have", "missing_nice_to_have", "present_terms", "suggestions"]
}

// 6. Full API Response
{
  "level": "debug",
  "message": "API Response",
  "method": "POST",
  "url": "/v2/evaluate",
  "statusCode": 200,
  "responseSize": 3456,
  "responseData": {
    "composite_score": 0.82,
    "job_fit_score": 0.85,
    "quality_score": 0.79,
    "critic_results": { ... },
    // ... full response body
  }
}
```

## Benefits

1. **Debugging** - See exactly what prompts are being sent to the LLM
2. **Troubleshooting** - Identify parsing errors and which critic is failing
3. **Performance** - Track response times and sizes
4. **Development** - Verify the full request/response cycle

## Security Note

Debug mode logs sensitive data including:
- Full resume content
- Job descriptions
- API responses

Only enable debug logging in development or secure environments.