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

  // V2 weights including job fit and fidelity
  const V2_WEIGHTS = {
    job_fit: 0.20, // fundamental compatibility
    relevance: 0.20, // alignment with requirements
    keyword: 0.20, // important terms coverage
    language: 0.10, // writing quality
    readability: 0.05, // structure and clarity
    fidelity: 0.10, // truthfulness consistency
    opportunity: 0.15 // missing key achievements
  };

  // Check if resume contains a Related Accomplishments section
  const hasRelatedAccomplishmentsSection = resume => {
    const resumeLower = resume.toLowerCase();
    const patterns = [
      'related accomplishments',
      'related achievements',
      'key accomplishments',
      'notable accomplishments',
      'selected accomplishments'
    ];
    return patterns.some(pattern => resumeLower.includes(pattern));
  };

  // Extract evaluation parameters from request
  const extractEvaluationParams = body => (
    ({
      job_description: body.job_description,
      resume: body.resume,
      original_resume: body.original_resume || null,
      required_terms: body.required_terms || null,
      provider: body.provider || getConfig('llm.provider', 'openai'),
      model: body.model || getConfig('llm.model', 'gpt-4o-mini'),
      temperature: body.temperature || getConfig('llm.temperature', 0.7),
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

  // Aggregate scores and calculate composite - v2 version with named results
  const aggregateScoresV2 = (namedResults, weights) => {
    const normalizedScores = {};
    const rawResults = {};
    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(namedResults).forEach(([criticName, result]) => {
      if (result && weights[criticName]) {
        // Store raw result
        rawResults[criticName] = result;

        // Normalize score based on critic type
        let normalized = 0;
        if (criticName === 'job_fit') {
          normalized = result.job_fit_score || 0;
        } else if (criticName === 'fidelity') {
          normalized = result.score || 1.0;
        } else if (criticName === 'opportunity') {
          // Opportunity uses 1-5 scale, convert to 0-1
          const oppScore = result.score || 5;
          normalized = (oppScore - 1) / 4;
        } else {
          const scoreValue = extractScoreValue(result);
          normalized = normalizeScore(criticName, scoreValue);
        }

        normalizedScores[criticName] = normalized;

        // Add to weighted sum
        weightedSum += normalized * weights[criticName];
        totalWeight += weights[criticName];
      }
    });

    const compositeScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      composite_score: compositeScore,
      normalized_scores: normalizedScores,
      raw_results: rawResults
    };
  };

  // Original aggregate scores for backward compatibility
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

  // Determine improvement recommendation based on scores
  const determineImprovementRecommendation = (jobFit, quality, composite, fidelity) => {
    // Fidelity gate: prevent further changes if truthfulness risk is high
    const fidelityThreshold = jobFit > 0.6 ? 0.85 : 0.90;
    if (fidelity < fidelityThreshold) {
      const stopReason = jobFit < 0.4 ? 'low_fit_fidelity_risk' : 'low_fidelity_risk';
      return {
        should_improve: false,
        strategy: null,
        stop_reason: stopReason
      };
    }

    // GATE: Poor fit with fidelity risk (<0.95)
    if (jobFit < 0.4 && fidelity < 0.95) {
      return {
        should_improve: false,
        strategy: null,
        stop_reason: 'low_fit_fidelity_risk'
      };
    }

    // GATE: Already optimized (no further meaningful gains)
    if (quality >= 0.85 && composite >= 0.9) {
      return {
        should_improve: false,
        strategy: null,
        stop_reason: 'already_optimized'
      };
    }

    // Determine strategy based on fit and quality
    if (jobFit >= 0.7 && quality < 0.7) {
      return {
        should_improve: true,
        strategy: 'major_quality_improvements',
        max_achievable: Math.min(0.95, jobFit + 0.1)
      };
    } if (jobFit >= 0.4) {
      return {
        should_improve: true,
        strategy: 'focus_transferable_skills',
        max_achievable: jobFit * 0.9
      };
    }
    // Very low job fit but passed fidelity gates
    return {
      should_improve: true,
      strategy: 'minimal_adjustments_only',
      max_achievable: jobFit * 0.8
    };
  };

  // Identify specific quality issues from critic results
  const identifyQualityGaps = results => {
    const gaps = [];

    // Check language critic
    if (results.language) {
      const languageScore = normalizeScore('language', extractScoreValue(results.language));
      if (languageScore < 0.8) {
        gaps.push('Grammar and spelling issues detected');
      }
    }

    // Check readability
    if (results.readability) {
      const readabilityScore = normalizeScore('readability', extractScoreValue(results.readability));
      if (readabilityScore < 0.7) {
        gaps.push('Complex sentence structure affecting readability');
      }
    }

    // Check keyword coverage
    if (results.keyword) {
      const keywordScore = normalizeScore('keyword', extractScoreValue(results.keyword));
      if (keywordScore < 0.6) {
        gaps.push('Missing important keywords from job description');
      }
    }

    // Check relevance
    if (results.relevance) {
      const relevanceScore = normalizeScore('relevance', extractScoreValue(results.relevance));
      if (relevanceScore < 0.7) {
        gaps.push('Weak alignment with job requirements');
      }
    }

    return gaps.length > 0 ? gaps : ['No significant quality gaps identified'];
  };

  // Identify strengths from critic results
  const identifyStrengths = (results, normalizedScores) => {
    const strengths = [];

    if (normalizedScores.job_fit >= 0.8) {
      strengths.push({
        area: 'Job Fit',
        score: normalizedScores.job_fit,
        impact: 'high'
      });
    }

    if (normalizedScores.relevance >= 0.8) {
      strengths.push({
        area: 'Relevance',
        score: normalizedScores.relevance,
        impact: 'high'
      });
    }

    if (normalizedScores.keyword >= 0.8) {
      strengths.push({
        area: 'Keywords',
        score: normalizedScores.keyword,
        impact: 'medium'
      });
    }

    if (normalizedScores.language >= 0.9) {
      strengths.push({
        area: 'Language Quality',
        score: normalizedScores.language,
        impact: 'medium'
      });
    }

    return strengths;
  };

  // Determine specific areas to focus improvement efforts
  const getImprovementFocus = (jobFit, quality, results) => {
    const focusAreas = [];

    if (jobFit >= 0.7) {
      // Good fit, focus on quality improvements
      if (results.keyword && normalizeScore('keyword', extractScoreValue(results.keyword)) < 0.8) {
        focusAreas.push('Add more relevant keywords and technical terms');
      }
      if (results.language && normalizeScore('language', extractScoreValue(results.language)) < 0.8) {
        focusAreas.push('Improve grammar and professional language');
      }
      if (quality < 0.7) {
        focusAreas.push('Quantify achievements and impact');
        focusAreas.push('Use stronger action verbs');
      }
    } else if (jobFit >= 0.4) {
      // Medium fit, focus on transferable skills
      focusAreas.push('Highlight transferable skills and experiences');
      focusAreas.push('Emphasize relevant accomplishments');
      focusAreas.push('Bridge skill gaps with related experience');
    } else {
      // Poor fit, minimal changes only
      focusAreas.push('Minor formatting and clarity improvements only');
      focusAreas.push('Avoid adding unrelated experience');
    }

    return focusAreas.length > 0 ? focusAreas : ['Resume is well-optimized'];
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

      // Extract keywords if not provided
      let requiredTerms = params.required_terms;
      if (!requiredTerms) {
        logger.info('Extracting keywords from job description');
        const keywordPrompt = prompts.keywordExtractor(params.job_description);
        requiredTerms = await client.complete({
          system: keywordPrompt.systemPrompt,
          user: keywordPrompt.userPrompt
        });
        logger.debug('Extracted keywords', { keywords: requiredTerms });
      }

      // Check for Related Accomplishments section
      const hasRelatedAccomplishments = hasRelatedAccomplishmentsSection(params.resume);
      if (!hasRelatedAccomplishments) {
        logger.info('Related Accomplishments section not found in resume - skipping RelatedAccomplishmentsCritic');
      }

      // Build all critic prompts
      const critics = [
        prompts.jobFitCritic(params.job_description, params.resume),
        prompts.keywordCritic(params.job_description, params.resume, requiredTerms),
        prompts.readabilityCritic(params.job_description, params.resume),
        prompts.relevanceCritic(params.job_description, params.resume),
        prompts.languageCritic(params.job_description, params.resume)
      ];

      // Add related accomplishments critic if section exists
      if (hasRelatedAccomplishments) {
        critics.push(prompts.relatedAccomplishmentsCritic(params.job_description, params.resume));
      }

      // Add fidelity critic if original resume provided
      if (params.original_resume) {
        critics.push(prompts.fidelityCritic(params.job_description, params.resume, params.original_resume));
        // Add opportunity critic to find missing high-impact achievements
        critics.push(prompts.opportunityCritic(params.job_description, params.resume, params.original_resume));
      }

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

      // Parse results and extract scores dynamically based on critics used
      let criticIndex = 0;
      const jobFitResult = results[criticIndex];
      criticIndex += 1;
      const keywordResult = results[criticIndex];
      criticIndex += 1;
      const readabilityResult = results[criticIndex];
      criticIndex += 1;
      const relevanceResult = results[criticIndex];
      criticIndex += 1;
      const languageResult = results[criticIndex];
      criticIndex += 1;
      const relatedAccomplishmentsResult = hasRelatedAccomplishments ? results[criticIndex] : null;
      if (hasRelatedAccomplishments) criticIndex += 1;
      const fidelityResult = params.original_resume ? results[criticIndex] : null;
      if (params.original_resume) criticIndex += 1;
      const opportunityResult = params.original_resume ? results[criticIndex] : null;

      // Extract job fit score
      const jobFitScore = jobFitResult?.job_fit_score || 0.0;

      // Calculate fidelity score
      const fidelityScore = fidelityResult ? (fidelityResult.score || 1.0) : 1.0;

      // Map results to named structure
      const namedResults = {
        job_fit: jobFitResult,
        keyword: keywordResult,
        readability: readabilityResult,
        relevance: relevanceResult,
        language: languageResult
      };

      if (relatedAccomplishmentsResult) {
        namedResults.related_accomplishments = relatedAccomplishmentsResult;
      }

      if (fidelityResult) {
        namedResults.fidelity = fidelityResult;
      }

      if (opportunityResult) {
        namedResults.opportunity = opportunityResult;
      }

      // Calculate composite score using V2 weights
      const v2Weights = params.original_resume ? V2_WEIGHTS : {
        job_fit: 0.25,
        relevance: 0.25,
        keyword: 0.25,
        language: 0.15,
        readability: 0.10
      };

      const { composite_score: compositeScore, normalized_scores: normalizedScores, raw_results: rawResults } = aggregateScoresV2(
        namedResults,
        v2Weights
      );

      // Calculate quality score (excluding job fit and fidelity)
      const qualityResults = [keywordResult, readabilityResult, relevanceResult, languageResult];
      const { composite_score: qualityScore } = aggregateScores(qualityResults, DEFAULT_WEIGHTS);

      // Determine improvement recommendation
      const recommendation = determineImprovementRecommendation(
        jobFitScore,
        qualityScore,
        compositeScore,
        fidelityScore
      );

      // Build v2 response
      const threshold = getConfig('evaluation.threshold', 0.75);
      const executionTime = (Date.now() - startTime) / 1000;

      const response = {
        composite_score: compositeScore,
        job_fit_score: jobFitScore,
        quality_score: qualityScore,
        fidelity_score: fidelityScore,
        should_improve: recommendation.should_improve,
        improvement_strategy: recommendation.strategy,
        max_achievable_score: recommendation.max_achievable || null,
        stop_reason: recommendation.stop_reason || null,
        recommendations: {
          overall_strategy: recommendation.strategy
            ? `Focus on ${recommendation.strategy.replace(/_/g, ' ')}`
            : 'Resume is well-optimized',
          improvement_areas: identifyQualityGaps(namedResults),
          strengths: identifyStrengths(namedResults, normalizedScores),
          priority_actions: getImprovementFocus(jobFitScore, qualityScore, namedResults)
        },
        normalized_scores: normalizedScores,
        raw_results: rawResults,
        extracted_keywords: requiredTerms,
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
    const {
      job_description: jobDescription,
      original_resume: originalResume,
      cover_letter: coverLetter,
      provider = getConfig('llm.provider', 'openai'),
      model = getConfig('llm.model', 'gpt-4o-mini'),
      temperature = 0.1
    } = req.body;

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
        prompts.coverLetterToneCritic(coverLetter, originalResume),
        prompts.coverLetterPersonalizationCritic(coverLetter, originalResume),
        prompts.coverLetterLanguageCritic(jobDescription, coverLetter),
        prompts.coverLetterRelevanceCritic(jobDescription, coverLetter),
        prompts.coverLetterOpportunityCritic(jobDescription, coverLetter, originalResume)
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
