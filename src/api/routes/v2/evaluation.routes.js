const express = require('express');
const { asyncHandler } = require('../../../utils/errors');
const { sanitizeRequest } = require('../../middleware/validation.middleware');
const { createEvaluationValidator } = require('../../validators/evaluation.validators');
const { createLLMClient } = require('../../../llm/client');
const prompts = require('../../../prompts/prompts');
const { getConfig } = require('../../../utils/config');
const { logger } = require('../../../utils/logger');

const createEvaluationRoutes = () => {
  const router = express.Router();

  const DEFAULT_WEIGHTS = {
    keyword: 1.0,
    readability: 1.0,
    relevance: 1.0,
    language: 1.0
  };

  // Extract evaluation parameters from request
  const extractEvaluationParams = body => (
    ({
      job_description: body.job_description,
      resume: body.resume,
      original_resume: body.original_resume || null,
      provider: body.provider || 'openai',
      model: body.model || 'gpt-4o-mini',
      temperature: body.temperature || 0.7,
      process_markdown: body.process_markdown !== false,
      max_workers: body.max_workers || 6
    })
  );

  // Normalize scores to 0-1 range
  const normalizeScore = (criticName, score) => {
    switch (criticName) {
      case 'relevance':
      case 'language': {
        // These critics use 1-5 scale
        const numScore = typeof score === 'number' ? score : 0;
        if (numScore >= 1 && numScore <= 5) {
          return (numScore - 1) / 4;
        }
        return 0;
      }

      case 'readability':
        // Readability uses appropriateness_score
        if (typeof score === 'object' && score !== null) {
          const appScore = score.appropriateness_score || 0;
          return appScore >= 0 && appScore <= 1 ? appScore : 0;
        }
        return 0;

      case 'keyword': {
        // Keyword already uses 0-1 scale
        const keywordScore = typeof score === 'number' ? score : 0;
        return keywordScore >= 0 && keywordScore <= 1 ? keywordScore : 0;
      }

      default:
        return 0;
    }
  };

  // Extract the actual score value from a critic result
  const extractScoreValue = criticResult => {
    if (typeof criticResult === 'number') return criticResult;
    if (criticResult && typeof criticResult === 'object') {
      if ('score' in criticResult) return criticResult.score;
      if ('appropriateness_score' in criticResult) return criticResult;
    }
    return criticResult;
  };

  // Aggregate scores and calculate composite
  const aggregateScores = (results, weights) => {
    const normalizedScores = {};
    const rawResults = {};
    const weightedSum = { value: 0 };
    const totalWeight = { value: 0 };

    results.forEach((result, index) => {
      const criticNames = ['keyword', 'readability', 'relevance', 'language'];
      const criticName = criticNames[index];

      if (result && criticName) {
        // Store raw result
        Object.assign(rawResults, { [criticName]: result });

        // Normalize score
        const scoreValue = extractScoreValue(result);
        const normalized = normalizeScore(criticName, scoreValue);
        Object.assign(normalizedScores, { [criticName]: normalized });

        // Add to weighted sum
        if (weights[criticName]) {
          weightedSum.value += normalized * weights[criticName];
          totalWeight.value += weights[criticName];
        }
      }
    });

    const compositeScore = totalWeight.value > 0 ? weightedSum.value / totalWeight.value : 0;

    return {
      composite_score: compositeScore,
      normalized_scores: normalizedScores,
      raw_results: rawResults
    };
  };

  // Main evaluation handler
  const createEvaluationHandler = () => asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const params = extractEvaluationParams(req.body);

    try {
      // Create LLM client
      const client = await createLLMClient({
        provider: params.provider,
        model: params.model,
        temperature: params.temperature,
        useMock: getConfig('llm.useMock', false)
      });

      // Build all critic prompts
      const critics = [
        prompts.keywordCritic(params.job_description, params.resume),
        prompts.readabilityCritic(params.job_description, params.resume),
        prompts.relevanceCritic(params.job_description, params.resume),
        prompts.languageCritic(params.job_description, params.resume)
      ];

      // Execute all critics in parallel (same as v1)
      const results = await Promise.all(
        critics.map(critic => client.complete({
          system: critic.systemPrompt,
          user: critic.userPrompt
        }).then(response => {
          try {
            // Clean and parse response
            const cleaned = response
              .trim()
              .replace(/^```(?:json)?\s*\n?/, '')
              .replace(/\n?```\s*$/, '');
            return JSON.parse(cleaned);
          } catch (error) {
            logger.error('Failed to parse critic response', {
              error: error.message,
              response: response.substring(0, 200)
            });
            return null;
          }
        }))
      );

      // Aggregate results
      const threshold = getConfig('evaluation.threshold', 0.75);
      const { composite_score: compositeScore, normalized_scores: normalizedScores, raw_results: rawResults } = aggregateScores(results, DEFAULT_WEIGHTS);

      // Build response
      const executionTime = (Date.now() - startTime) / 1000;
      const response = {
        composite_score: compositeScore,
        normalized_scores: normalizedScores,
        raw_results: rawResults,
        pass: compositeScore >= threshold,
        threshold,
        jd_file: 'job_description.txt',
        resume_file: 'resume.txt',
        llm_provider: client.provider,
        llm_model: client.model,
        llm_temperature: params.temperature,
        process_markdown: params.process_markdown,
        max_workers: params.max_workers,
        execution_time: executionTime,
        version: '0.22.0'
      };

      logger.info('V2 Evaluation completed', {
        composite_score: compositeScore,
        pass: response.pass,
        execution_time: executionTime
      });

      res.json(response);
    } catch (error) {
      logger.error('V2 Evaluation failed', { error: error.message });
      throw error;
    }
  });

  router.post(
    '/evaluate',
    createEvaluationValidator(),
    sanitizeRequest,
    createEvaluationHandler()
  );

  return router;
};

module.exports = { createEvaluationRoutes };
