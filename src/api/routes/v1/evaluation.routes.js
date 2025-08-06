const express = require('express');
const { asyncHandler } = require('../../../utils/errors');
const { sanitizeRequest } = require('../../middleware/validation.middleware');
const { createEvaluationValidator } = require('../../validators/evaluation.validators');
const prompts = require('../../../prompts/prompts.js');
const { createLLMClient } = require('../../../llm/client.js');

const createEvaluationRoutes = () => {
  const router = express.Router();

  // Scoring weights configuration - equal weights like legacy
  const DEFAULT_WEIGHTS = {
    keyword: 1.0,
    readability: 1.0,
    relevance: 1.0,
    language: 1.0
  };

  // Normalize scores to 0-1 range
  const normalizeScore = (criticName, score) => {
    // Handle critics that use 1-5 scale or 0-100 scale
    if (['relevance', 'language', 'tone', 'personalization', 'related_accomplishments'].includes(criticName)) {
      if (typeof score === 'number') {
        if (score >= 1 && score <= 5) {
          return (score - 1) / 4;
        }
        if (score >= 0 && score <= 100) {
          return score / 100;
        }
      }
      console.warn(`Invalid score format for ${criticName}: ${score}. Defaulting to 0.`);
      return 0.0;
    }
    
    // Handle readability which uses appropriateness_score
    if (criticName === 'readability') {
      const appropriatenessScore = score?.appropriateness_score;
      if (typeof appropriatenessScore === 'number' && appropriatenessScore >= 0 && appropriatenessScore <= 1) {
        return appropriatenessScore;
      }
      console.warn(`Invalid appropriateness_score for readability: ${appropriatenessScore}. Defaulting to 0.`);
      return 0.0;
    }
    
    // Handle bias which uses flags with severity
    if (criticName === 'bias') {
      const flags = score?.flags || [];
      if (!Array.isArray(flags)) {
        console.warn(`Invalid flags format for bias: ${flags}. Defaulting score to 0.`);
        return 0.0;
      }
      
      const highSeverityCount = flags.filter(flag => flag.severity === 'high').length;
      const mediumSeverityCount = flags.filter(flag => flag.severity === 'medium').length;
      
      // Penalize heavily for high severity, moderately for medium
      const penalty = highSeverityCount * 0.5 + mediumSeverityCount * 0.2;
      return Math.max(0.0, 1.0 - penalty);
    }
    
    // Default case for scores already expected to be 0-1 (keyword, ats)
    if (typeof score === 'number' && score >= 0 && score <= 1) {
      return score;
    }
    
    // Attempt to get score from a dict if score itself wasn't numeric
    if (typeof score === 'object' && score !== null) {
      const scoreValue = score.score;
      if (typeof scoreValue === 'number' && scoreValue >= 0 && scoreValue <= 1) {
        return scoreValue;
      }
    }
    
    console.warn(`Invalid score format for ${criticName}: ${score}. Defaulting to 0.`);
    return 0.0;
  };

  // Parse LLM response to extract score and full object
  const parseScoreFromResponse = (response, criticType) => {
    try {
      // Log the raw response for debugging
      console.log(`Raw response for ${criticType}:`, response.substring(0, 200) + '...');
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      
      // Remove markdown JSON code blocks
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanedResponse);
      return parsed;  // Return the full parsed object
    } catch (error) {
      // If JSON parsing fails, try to extract JSON from the response
      console.warn(`Failed to parse JSON for ${criticType}, attempting extraction`);
      console.warn(`Parse error:`, error.message);
      
      // Try to find JSON object in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          console.log(`Successfully extracted JSON for ${criticType}`);
          return extracted;
        } catch (e) {
          console.warn(`Failed to parse extracted JSON for ${criticType}`);
        }
      }
      
      // Last resort - return raw response
      return response;
    }
  };

  // Aggregate scores into composite score
  const aggregateScores = (results, weights = DEFAULT_WEIGHTS) => {
    const normalizedScores = {};
    const rawResults = {};
    
    // Process each critic result
    Object.entries(results).forEach(([critic, result]) => {
      try {
        const parsedResult = parseScoreFromResponse(result, critic);
        rawResults[critic] = parsedResult;
        
        // Extract score for normalization
        let score;
        if (critic === 'readability') {
          score = parsedResult;
        } else if (typeof parsedResult === 'object' && parsedResult !== null) {
          score = parsedResult.score || 0;
        } else {
          score = 0;
        }
        
        normalizedScores[critic] = normalizeScore(critic, score);
      } catch (error) {
        console.error(`Error processing score for critic '${critic}':`, error);
      }
    });
    
    // Calculate composite score with available critics
    const availableWeights = Object.entries(weights)
      .filter(([critic]) => critic in normalizedScores)
      .reduce((acc, [critic, weight]) => ({ ...acc, [critic]: weight }), {});
    
    const totalWeight = Object.values(availableWeights).reduce((sum, w) => sum + w, 0);
    
    let compositeScore = 0;
    if (totalWeight > 0) {
      compositeScore = Object.entries(availableWeights).reduce(
        (sum, [critic, weight]) => sum + normalizedScores[critic] * (weight / totalWeight),
        0
      );
    }
    
    return {
      composite_score: compositeScore,
      normalized_scores: normalizedScores,
      raw_results: rawResults
    };
  };

  const createEvaluationHandler = () => asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { 
      job_description: jobDescription, 
      resume,
      required_terms,
      provider = 'openai',
      model = 'gpt-4o-mini',
      temperature = 0.7,
      process_markdown = true,
      max_workers = 6
    } = req.body;

    const critics = [
      { type: 'keyword', ...prompts.keywordCritic(jobDescription, resume) },
      { type: 'readability', ...prompts.readabilityCritic(jobDescription, resume) },
      { type: 'relevance', ...prompts.relevanceCritic(jobDescription, resume) },
      { type: 'language', ...prompts.languageCritic(jobDescription, resume) }
    ];

    // Get LLM config
    const { getConfig } = require('../../../utils/config');
    const useMock = getConfig('llm.useMock', false);
    
    const client = await createLLMClient({ 
      provider,
      model,
      temperature,
      useMock 
    });
    
    // Execute all critics in parallel
    const results = await Promise.all(
      critics.map(critic =>
        client.complete({
          system: critic.systemPrompt,
          user: critic.userPrompt
        })
      )
    );

    // Map results to critic types
    const criticResults = {
      keyword: results[0],
      readability: results[1],
      relevance: results[2],
      language: results[3]
    };

    // Calculate composite score
    const scoreResults = aggregateScores(criticResults);
    
    // Get config for threshold
    const threshold = getConfig('evaluation.threshold', 0.75);
    
    // Calculate execution time
    const executionTime = (Date.now() - startTime) / 1000;

    // Create final response matching legacy format
    res.json({
      composite_score: scoreResults.composite_score,
      normalized_scores: scoreResults.normalized_scores,
      raw_results: scoreResults.raw_results,
      pass: scoreResults.composite_score >= threshold,
      threshold,
      jd_file: 'job_description.txt',  // Legacy compatibility
      resume_file: 'resume.txt',        // Legacy compatibility
      llm_provider: client.provider,
      llm_model: client.model,
      llm_temperature: temperature,
      process_markdown,
      max_workers,
      execution_time: executionTime,
      version: '0.22.0'  // Match legacy version
    });
  });

  const createFileEvaluationHandler = () => asyncHandler(async (req, res) => {
    res.json({
      message: 'File evaluation endpoint - to be implemented',
      data: req.validated,
      files: req.files ? req.files.length : 0
    });
  });

  // Routes
  router.post(
    '/evaluate',
    createEvaluationValidator(),
    sanitizeRequest,
    createEvaluationHandler()
  );

  router.post(
    '/evaluate-files',
    // File upload middleware will be added later
    sanitizeRequest,
    createFileEvaluationHandler()
  );

  return router;
};

module.exports = { createEvaluationRoutes };
