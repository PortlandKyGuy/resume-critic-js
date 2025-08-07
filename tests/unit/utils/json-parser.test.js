const { parseJsonResponse } = require('../../../src/utils/json-parser');

describe('parseJsonResponse', () => {
  it('should parse valid JSON', () => {
    const response = '{"score": 0.8, "result": "success"}';
    const parsed = parseJsonResponse(response);
    expect(parsed).toEqual({ score: 0.8, result: 'success' });
  });

  it('should handle JSON wrapped in markdown code blocks', () => {
    const response = '```json\n{"score": 0.8, "result": "success"}\n```';
    const parsed = parseJsonResponse(response);
    expect(parsed).toEqual({ score: 0.8, result: 'success' });
  });

  it('should remove single-line comments', () => {
    const response = `{
      "score": 0.8, // This is the score
      "result": "success" // This is the result
    }`;
    const parsed = parseJsonResponse(response);
    expect(parsed).toEqual({ score: 0.8, result: 'success' });
  });

  it('should remove multi-line comments', () => {
    const response = `{
      "score": 0.8, /* This is 
      a multi-line comment */
      "result": "success"
    }`;
    const parsed = parseJsonResponse(response);
    expect(parsed).toEqual({ score: 0.8, result: 'success' });
  });

  it('should handle trailing commas', () => {
    const response = `{
      "score": 0.8,
      "result": "success",
    }`;
    const parsed = parseJsonResponse(response);
    expect(parsed).toEqual({ score: 0.8, result: 'success' });
  });

  it('should handle the specific error case from the user', () => {
    const response = `{
      "score": 0.94,
      "missing_must_have": [
        "ArgoCD"
      ],
      "missing_nice_to_have": [
        "Terraform"
      ],
      "present_terms": [
        "3+ years experience",
        "backend development",
        "JavaScript", // implied
        "Node.js"
      ]
    }`;
    const parsed = parseJsonResponse(response);
    expect(parsed).toEqual({
      score: 0.94,
      missing_must_have: ['ArgoCD'],
      missing_nice_to_have: ['Terraform'],
      present_terms: [
        '3+ years experience',
        'backend development',
        'JavaScript',
        'Node.js'
      ]
    });
  });

  it('should return null for invalid JSON', () => {
    const response = 'This is not JSON at all';
    const parsed = parseJsonResponse(response);
    expect(parsed).toBeNull();
  });

  it('should handle truncated JSON', () => {
    const response = '{"score": 0.94, "missing_must_have": ["ArgoCD"], "present_terms": ["JavaScrip';
    const parsed = parseJsonResponse(response);
    expect(parsed).toBeNull();
  });
});