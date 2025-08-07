const workExperienceClarityFormatCritic = (jobDescription, resume, extra) => {
  if (!extra || !extra.work_experience) {
    return {
      systemPrompt: '',
      userPrompt: ''
    };
  }

  const workExperience = extra.work_experience;
  const experienceText = formatWorkExperience(workExperience);

  return {
    systemPrompt: `You are an expert in resume formatting and clarity.

Evaluate:
1. Clear and consistent formatting
2. Proper use of action verbs
3. Concise yet descriptive bullet points
4. Chronological order (reverse chronological typically)
5. Complete information (dates, company, location, title)

Score from 0.0 to 1.0, where:
- 1.0 = Perfect clarity and formatting
- 0.8 = Well-formatted with minor improvements possible
- 0.6 = Generally clear but some formatting issues
- 0.4 = Clarity or formatting problems affecting readability
- 0.2 = Poor formatting or unclear descriptions

Provide your evaluation in JSON format:
{
    "score": <float>,
    "reasoning": "<explanation>",
    "well_formatted_elements": ["<element 1>", "<element 2>"],
    "issues": ["<issue 1>", "<issue 2>"],
    "suggestions": ["<improvement 1>", "<improvement 2>"]
}`,

    userPrompt: `Work Experience:
${experienceText}

Evaluate the clarity and formatting of this work experience section.`
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

module.exports = { workExperienceClarityFormatCritic };
