const workExperienceRelevanceCritic = (jobDescription, resume, extra) => {
  if (!extra || !extra.work_experience) {
    return {
      systemPrompt: '',
      userPrompt: ''
    };
  }

  const workExperience = extra.work_experience;
  const experienceText = formatWorkExperience(workExperience);

  return {
    systemPrompt: `You are an expert evaluator of work experience.

Analyze how well the work experience aligns with the job requirements.

Consider:
1. Direct match between past roles and target position
2. Relevance of industries and company types
3. Level of responsibility compared to job requirements
4. Progression and career trajectory
5. Recency of relevant experience

Score from 0.0 to 1.0, where:
- 1.0 = Work experience perfectly aligned with all key job requirements
- 0.8 = Strong alignment with most requirements
- 0.6 = Moderate alignment, some gaps
- 0.4 = Limited alignment
- 0.2 = Poor alignment

Provide your evaluation in JSON format:
{
    "score": <float>,
    "reasoning": "<explanation>",
    "well_aligned_experiences": ["<company1 - role1>", "<company2 - role2>"],
    "gaps": ["<missing experience 1>", "<missing experience 2>"],
    "suggestions": ["<improvement 1>", "<improvement 2>"]
}`,

    userPrompt: `Job Description:
${jobDescription}

Work Experience:
${experienceText}

Evaluate the relevance of this work experience to the job requirements.`
  };
};

function formatWorkExperience(experienceData) {
  const experiences = (typeof experienceData === 'object' && experienceData.experiences)
    ? experienceData.experiences
    : experienceData;

  const textParts = experiences.flatMap(exp => [
    `\n${exp.title || 'Unknown Title'} - ${exp.company || 'Unknown Company'}`,
    `${exp.dates || 'No dates provided'}`,
    ...(exp.responsibilities || []).map(resp => `  • ${resp}`)
  ]);

  return textParts.join('\n');
}

module.exports = { workExperienceRelevanceCritic };
