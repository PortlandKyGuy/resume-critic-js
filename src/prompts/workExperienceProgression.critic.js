const workExperienceProgressionCritic = (jobDescription, resume, extra) => {
    if (!extra || !extra.work_experience) {
        return {
            systemPrompt: '',
            userPrompt: ''
        };
    }
    
    const workExperience = extra.work_experience;
    const experienceText = formatWorkExperience(workExperience);

    return {
    systemPrompt: `You are an expert in career development and progression.

Evaluate:
1. Clear career progression and increased responsibilities
2. Logical transitions between roles
3. Skills development over time
4. Industry or functional expertise building
5. Leadership growth (if applicable)

Score from 0.0 to 1.0, where:
- 1.0 = Excellent progression with clear growth trajectory
- 0.8 = Strong progression with minor gaps
- 0.6 = Some progression evident but inconsistent
- 0.4 = Limited progression or lateral moves
- 0.2 = No clear progression or concerning gaps

Provide your evaluation in JSON format:
{
    "score": <float>,
    "reasoning": "<explanation>",
    "progression_highlights": ["<highlight 1>", "<highlight 2>"],
    "concerns": ["<concern 1>", "<concern 2>"],
    "suggestions": ["<improvement 1>", "<improvement 2>"]
}`,

    userPrompt: `Job Description:
${jobDescription}

Work Experience:
${experienceText}

Evaluate the career progression demonstrated in this work experience.`
    };
}

function formatWorkExperience(experienceData) {
    let experiences;
    if (typeof experienceData === 'object' && experienceData.experiences) {
        experiences = experienceData.experiences;
    } else {
        experiences = experienceData;
    }
    
    const textParts = [];
    for (const exp of experiences) {
        textParts.push(`\n${exp.title || 'Unknown Title'} - ${exp.company || 'Unknown Company'}`);
        textParts.push(`${exp.dates || 'No dates provided'}`);
        if (exp.responsibilities) {
            for (const resp of exp.responsibilities) {
                textParts.push(`  • ${resp}`);
            }
        }
    }
    
    return textParts.join('\n');
}

module.exports = { workExperienceProgressionCritic }