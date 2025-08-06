const workExperienceImpactCritic = (jobDescription, resume, extra) => {
  if (!extra || !extra.work_experience) {
    return {
      systemPrompt: '',
      userPrompt: ''
    };
  }

  const workExperience = extra.work_experience;
  const experienceText = formatWorkExperience(workExperience);

  return {
    systemPrompt: `You are an expert evaluator of professional impact and achievements.

Evaluate the work experience based on:
1. Use of quantifiable metrics and results
2. Demonstration of meaningful business impact
3. Use of strong action verbs
4. Clear achievements vs. just listing duties
5. Level of responsibility and scope demonstrated

Score from 0.0 to 1.0, where:
- 1.0 = Exceptional impact demonstrated with clear metrics throughout
- 0.8 = Most experiences show strong impact and achievements
- 0.6 = Some achievements present but many duties without impact
- 0.4 = Limited demonstration of impact
- 0.2 = Mostly duties with no clear achievements

Provide your evaluation in JSON format:
{
    "score": <float>,
    "reasoning": "<explanation>",
    "strong_achievements": ["<achievement 1>", "<achievement 2>"],
    "weak_areas": ["<area 1>", "<area 2>"],
    "suggestions": ["<improvement 1>", "<improvement 2>"]
}`,

    userPrompt: `Work Experience:
${experienceText}

Evaluate the impact and achievements demonstrated in this work experience.`
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

module.exports = { workExperienceImpactCritic };
