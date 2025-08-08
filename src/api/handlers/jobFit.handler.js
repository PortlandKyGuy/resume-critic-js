const { pipeAsync } = require('../../utils/functional');
const { asyncHandler } = require('../../utils/errors');
const { createLLMClient } = require('../../llm/client');
const prompts = require('../../prompts/prompts');
const { getConfig } = require('../../utils/config');
const { logger } = require('../../utils/logger');
const { parseJsonResponse } = require('../../utils/json-parser');

// Pure function to extract job fit parameters
const extractJobFitParams = body => {
  const params = {
    job_description: body.job_description,
    resume: body.resume,
    original_resume: body.original_resume || null,
    provider: body.provider || getConfig('llm.provider', 'openai'),
    model: body.model || getConfig('llm.model', 'gpt-4o-mini'),
    temperature: body.temperature || getConfig('llm.temperature', 0.7),
    process_markdown: body.process_markdown !== false
  };

  // Only add topP if it's explicitly provided in body or config
  const topP = body.top_p !== undefined ? body.top_p : getConfig('llm.top_p');
  if (topP !== undefined) {
    params.topP = topP;
  }

  return params;
};

// Pure function to determine improvement recommendation
const determineImprovementRecommendation = jobFitScore => {
  if (jobFitScore >= 0.8) {
    return {
      should_improve: false,
      improvement_strategy: null,
      improvement_potential: 'minimal'
    };
  }

  if (jobFitScore >= 0.6) {
    return {
      should_improve: true,
      improvement_strategy: 'enhance_relevant_experience',
      improvement_potential: 'moderate'
    };
  }

  if (jobFitScore >= 0.4) {
    return {
      should_improve: true,
      improvement_strategy: 'focus_transferable_skills',
      improvement_potential: 'high'
    };
  }

  return {
    should_improve: true,
    improvement_strategy: 'major_restructuring_required',
    improvement_potential: 'low'
  };
};

// Pure function to generate recommendations based on gaps and strengths
const generateRecommendations = (keyGaps, transferableStrengths, jobFitScore) => {
  const recommendations = [];

  if (jobFitScore >= 0.8) {
    recommendations.push('Your resume shows excellent alignment with the job requirements');
    if (keyGaps.length > 0) {
      recommendations.push(`Consider addressing minor gaps: ${keyGaps.slice(0, 2).join(', ')}`);
    }
  } else if (jobFitScore >= 0.6) {
    recommendations.push('Focus on highlighting experiences that directly relate to the job requirements');
    if (transferableStrengths.length > 0) {
      recommendations.push(`Emphasize your transferable skills: ${transferableStrengths.slice(0, 3).join(', ')}`);
    }
    if (keyGaps.length > 0) {
      recommendations.push(`Address key missing requirements: ${keyGaps.slice(0, 3).join(', ')}`);
    }
  } else if (jobFitScore >= 0.4) {
    recommendations.push('Your background shows some alignment but needs significant enhancement');
    recommendations.push('Consider tailoring your resume to better match the job requirements');
    if (transferableStrengths.length > 0) {
      recommendations.push(`Build upon your transferable strengths: ${transferableStrengths.join(', ')}`);
    }
  } else {
    recommendations.push('Consider whether this role aligns with your career goals and experience');
    if (transferableStrengths.length > 0) {
      recommendations.push(`Your transferable skills (${transferableStrengths.join(', ')}) may help bridge some gaps`);
    }
    recommendations.push('Significant resume restructuring would be needed to improve alignment');
  }

  return recommendations;
};

// Pure function to build response
const buildJobFitResponse = (result, recommendation, recommendations, executionTime, clientInfo, processMarkdown) => ({
  // Core job fit results
  job_fit_score: result.job_fit_score,
  match_category: result.match_category,
  recommendation: result.recommendation,

  // V2 enhancements
  should_improve: recommendation.should_improve,
  improvement_strategy: recommendation.improvement_strategy,
  improvement_potential: recommendation.improvement_potential,

  // Gaps and strengths
  key_gaps: result.key_gaps,
  transferable_strengths: result.transferable_strengths,
  fit_summary: result.fit_summary,

  // New recommendations array
  recommendations,

  // Detailed scores breakdown
  breakdown: {
    experience_score: result.experience_score,
    skills_score: result.skills_score,
    industry_score: result.industry_score,
    level_score: result.level_score,
    essential_requirements_score: result.essential_requirements_score
  },

  // Match flags
  experience_level_match: result.experience_level_match,
  core_skills_match: result.core_skills_match,
  industry_match: result.industry_match,

  // Metadata
  execution_time: executionTime,
  llm_provider: clientInfo.provider,
  llm_model: clientInfo.model,
  llm_temperature: clientInfo.temperature,
  process_markdown: processMarkdown,
  version: getConfig('version', '0.22.0'),
  api_version: 'v2'
});

// Composed async pipeline for job fit evaluation
const evaluateJobFit = pipeAsync(
  // Step 1: Create LLM client
  async params => {
    const client = await createLLMClient({
      provider: params.provider,
      model: params.model,
      temperature: params.temperature,
      topP: params.topP,
      useMock: getConfig('llm.useMock', false)
    });
    return { ...params, client };
  },

  // Step 2: Determine which resume to use for evaluation
  async context => {
    const resumeForEvaluation = context.original_resume || context.resume;
    return { ...context, resumeForEvaluation };
  },

  // Step 3: Build and execute job fit critic
  async context => {
    const critic = prompts.jobFitCritic(context.job_description, context.resumeForEvaluation);

    logger.debug('Calling job fit critic', {
      systemPromptLength: critic.systemPrompt.length,
      userPromptLength: critic.userPrompt.length,
      usingOriginalResume: !!context.original_resume
    });

    const response = await context.client.complete({
      system: critic.systemPrompt,
      user: critic.userPrompt
    });

    return { ...context, response };
  },

  // Step 4: Parse response
  async ({ response, ...rest }) => {
    const parsed = parseJsonResponse(response);

    if (!parsed) {
      logger.error('Failed to parse job fit critic response', {
        responsePreview: response.substring(0, 200)
      });
      throw new Error('Failed to parse job fit response');
    }

    logger.debug('Successfully parsed job fit response', {
      parsedKeys: Object.keys(parsed),
      jobFitScore: parsed.job_fit_score,
      matchCategory: parsed.match_category
    });

    return { ...rest, result: parsed };
  },

  // Step 5: Determine improvement recommendation
  async ({ result, ...rest }) => {
    const recommendation = determineImprovementRecommendation(result.job_fit_score);
    return { ...rest, result, recommendation };
  },

  // Step 6: Generate specific recommendations
  async ({ result, recommendation, ...rest }) => {
    const recommendations = generateRecommendations(
      result.key_gaps || [],
      result.transferable_strengths || [],
      result.job_fit_score
    );
    return { ...rest, result, recommendation, recommendations };
  }
);

// Main handler using functional composition
const createJobFitHandler = () => asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const params = extractJobFitParams(req.body);

  try {
    // Execute the evaluation pipeline
    const evaluationResult = await evaluateJobFit(params);

    // Calculate execution time
    const executionTime = (Date.now() - startTime) / 1000;

    // Build and send response
    const response = buildJobFitResponse(
      evaluationResult.result,
      evaluationResult.recommendation,
      evaluationResult.recommendations,
      executionTime,
      evaluationResult.client,
      evaluationResult.process_markdown
    );

    logger.info('V2 Job Fit Evaluation completed', {
      job_fit_score: response.job_fit_score,
      match_category: response.match_category,
      should_improve: response.should_improve,
      execution_time: executionTime
    });

    res.json(response);
  } catch (error) {
    logger.error('V2 Job Fit Evaluation failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

module.exports = { createJobFitHandler };
