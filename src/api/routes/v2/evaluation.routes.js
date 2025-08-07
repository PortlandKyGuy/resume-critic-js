const express = require('express');
const { asyncHandler } = require('../../../utils/errors');
const { sanitizeRequest } = require('../../middleware/validation.middleware');
const { createEvaluationValidator, createCoverLetterValidator } = require('../../validators/evaluation.validators');
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

  // Cover letter evaluation handler
  const createCoverLetterEvaluationHandler = () => asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { job_description: jobDescription, original_resume: originalResume, cover_letter: coverLetter, provider = 'openai', model = 'gpt-4o-mini', temperature = 0.1 } = req.body;

    try {
      // Create LLM client
      const client = await createLLMClient({
        provider,
        model,
        temperature,
        useMock: getConfig('llm.useMock', false)
      });

      // Build all cover letter critics
      const critics = [
        // Core cover letter critics
        prompts.toneCritic(coverLetter, originalResume),
        prompts.personalizationCritic(coverLetter, originalResume),
        prompts.languageCritic(jobDescription, coverLetter),
        prompts.relevanceCritic(jobDescription, coverLetter),
        prompts.opportunityCritic(jobDescription, coverLetter, originalResume)
      ];

      // Execute all critics in parallel
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

      // Execute fidelity check separately (different response format)
      const fidelityResult = await client.complete({
        system: prompts.coverLetterFidelityCritic(jobDescription, coverLetter, originalResume).systemPrompt,
        user: prompts.coverLetterFidelityCritic(jobDescription, coverLetter, originalResume).userPrompt
      }).then(response => {
        try {
          const cleaned = response
            .trim()
            .replace(/^```(?:json)?\s*\n?/, '')
            .replace(/\n?```\s*$/, '');
          return JSON.parse(cleaned);
        } catch (error) {
          logger.error('Failed to parse fidelity response', {
            error: error.message,
            response: response.substring(0, 200)
          });
          return null;
        }
      });

      // Parse results
      const [toneResult, personalizationResult, languageResult, relevanceResult, opportunityResult] = results;

      // Calculate scores
      const qualityScore = (
        (((toneResult?.score || 0) - 1) / 4) * 0.2
        + (((personalizationResult?.score || 0) - 1) / 4) * 0.25
        + (((languageResult?.score || 0) - 1) / 4) * 0.25
        + (((relevanceResult?.score || 0) - 1) / 4) * 0.3
      );

      const jobFitScore = (
        (((relevanceResult?.score || 0) - 1) / 4) * 0.5
        + (((personalizationResult?.score || 0) - 1) / 4) * 0.5
      );

      const opportunityScore = opportunityResult?.suggestions?.length > 0
        ? 0.5 + (3 - Math.min(opportunityResult.suggestions.length, 3)) * 0.167
        : 1.0;

      const fidelityScore = fidelityResult?.total_claims_count > 0
        ? fidelityResult.aligned_claims_count / fidelityResult.total_claims_count
        : 1.0;

      const compositeScore = (qualityScore + jobFitScore + fidelityScore) / 3;

      const shouldImprove = compositeScore < 0.9 || opportunityScore < 0.8;

      const executionTime = (Date.now() - startTime) / 1000;

      // Build response matching legacy format
      const response = {
        composite_score: compositeScore,
        quality_score: qualityScore,
        job_fit_score: jobFitScore,
        fidelity_score: fidelityScore,
        should_improve: shouldImprove,
        improvement_strategy: shouldImprove ? 'add_highlighted_experiences' : null,
        max_achievable_score: 1.0,
        stop_reason: null,
        recommendations: {
          overall_strategy: compositeScore >= 0.75
            ? 'Good job fit! Focus on polishing the cover letter quality to maximize impact.'
            : 'Focus on better aligning your cover letter with the job requirements.',
          improvement_areas: [
            ...(languageResult?.score < 5 ? [{
              area: 'Language',
              current_score: languageResult.score,
              target_score: 0.8,
              impact: 'high',
              suggestion: 'Improve grammar, spelling, and sentence structure. Consider professional proofreading.'
            }] : []),
            ...(relevanceResult?.score < 5 ? [{
              area: 'Relevance',
              current_score: relevanceResult.score,
              target_score: 0.8,
              impact: 'high',
              suggestion: 'Directly address more job requirements and use keywords from the job description.'
            }] : []),
            ...(opportunityResult?.suggestions?.length > 0 ? [{
              area: 'Opportunity',
              current_score: opportunityResult.score,
              target_score: 0.8,
              impact: 'high',
              suggestion: 'Consider incorporating the Enhancement Suggestions to spotlight additional high-impact achievements and strengthen your narrative.'
            }] : [])
          ],
          strengths: [
            ...(toneResult?.score >= 5 ? [{
              area: 'Tone',
              score: toneResult.score,
              impact: 'medium'
            }] : []),
            ...(personalizationResult?.score >= 5 ? [{
              area: 'Personalization',
              score: personalizationResult.score,
              impact: 'high'
            }] : [])
          ],
          priority_actions: []
        },
        enhancement_suggestions: opportunityResult?.suggestions || [],
        opportunity_score: opportunityScore,
        detailed_feedback: {
          tone: {
            score: toneResult?.score || 0,
            feedback: toneResult?.feedback || '',
            weight: 20
          },
          personalization: {
            score: personalizationResult?.score || 0,
            feedback: personalizationResult?.feedback || '',
            weight: 25
          },
          language: {
            score: languageResult?.score || 0,
            feedback: languageResult?.feedback || '',
            weight: 25
          },
          opportunity: {
            score: opportunityResult?.score || 0,
            feedback: (opportunityResult?.suggestions || []).join('; '),
            weight: 30
          },
          relevance: {
            score: relevanceResult?.score || 0,
            feedback: relevanceResult?.feedback || '',
            weight: 30
          }
        },
        job_fit_analysis: {
          score: jobFitScore,
          feedback: '',
          evaluation_criteria: {},
          overall_assessment: ''
        },
        fidelity_analysis: {
          score: fidelityScore,
          aligned_claims_count: fidelityResult?.aligned_claims_count || 0,
          total_claims_count: fidelityResult?.total_claims_count || 0,
          unsupported_claims_count: fidelityResult?.unsupported_claims_count || 0,
          hallucinated_claims: fidelityResult?.unsupported_claims || [],
          feedback: `All ${fidelityResult?.total_claims_count || 0} claims are supported by the original document.`
        },
        errors: null,
        evaluation_time_seconds: executionTime,
        execution_time: executionTime,
        llm_provider: client.provider,
        llm_model: client.model,
        llm_temperature: temperature,
        process_markdown: true,
        max_workers: 8,
        version: '0.22.0',
        api_version: 'v2',
        pass: compositeScore >= 0.75,
        threshold: 0.75
      };

      logger.info('V2 Cover Letter Evaluation completed', {
        composite_score: compositeScore,
        pass: response.pass,
        execution_time: executionTime
      });

      res.json(response);
    } catch (error) {
      logger.error('V2 Cover Letter Evaluation failed', { error: error.message });
      throw error;
    }
  });

  router.post(
    '/evaluate',
    createEvaluationValidator(),
    sanitizeRequest,
    createEvaluationHandler()
  );

  router.post(
    '/evaluate/cover-letter',
    createCoverLetterValidator(),
    sanitizeRequest,
    createCoverLetterEvaluationHandler()
  );

  return router;
};

module.exports = { createEvaluationRoutes };
