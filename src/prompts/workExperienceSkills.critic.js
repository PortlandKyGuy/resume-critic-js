const workExperienceSkillsCritic = (jobDescription, resume, extra) => {
    if (!extra || !extra.work_experience) {
        return {
            systemPrompt: '',
            userPrompt: ''
        };
    }
    
    const workExperience = extra.work_experience;
    const requiredTerms = extra.required_terms || '';
    const experienceText = formatWorkExperience(workExperience);

    return {
    systemPrompt: `You are an expert in skills assessment.

Analyze how well the work experience demonstrates required skills:
1. Technical skills mentioned in job description
2. Soft skills and leadership capabilities
3. Industry-specific competencies
4. Tools and technologies used
5. Certifications or specialized training mentioned

Score from 0.0 to 1.0, where:
- 1.0 = All required skills clearly demonstrated
- 0.8 = Most key skills demonstrated with evidence
- 0.6 = Some skills shown but key gaps exist
- 0.4 = Limited skills demonstration
- 0.2 = Major skills gaps

Provide your evaluation in JSON format:
{
    "score": <float>,
    "reasoning": "<explanation>",
    "skills_demonstrated": ["<skill1>", "<skill2>"],
    "missing_skills": ["<skill1>", "<skill2>"],
    "suggestions": ["<improvement 1>", "<improvement 2>"]
}`,

    userPrompt: `Job Description:
${jobDescription}

Important Skills/Terms: ${requiredTerms}

Work Experience:
${experienceText}

Evaluate how well this work experience demonstrates the required skills.`
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

module.exports = { workExperienceSkillsCritic }