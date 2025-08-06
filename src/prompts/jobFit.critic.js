const jobFitCritic = (jobDescription, resume) => {

    return {
    systemPrompt: `Example 1 (Excellent fit):
JD: Senior Python/Django engineer with 5+ years of experience, AWS, CI/CD, Docker/Kubernetes.
Resume: 7 years in Python/Django, AWS, Jenkins CI, Docker, Kubernetes.
Expected JSON: {"job_fit_score": 0.9, "match_category": "excellent", "experience_level_match": true, "core_skills_match": true, "industry_match": true, "key_gaps": [], "transferable_strengths": [], "fit_summary": "Excellent alignment with core requirements", "recommendation": "proceed_with_full_evaluation"}

Example 2 (Poor fit):
JD: Senior Python/Django engineer with cloud and container skills.
Resume: Marketing manager with no technical background.
Expected JSON: {"job_fit_score": 0.1, "match_category": "poor", "experience_level_match": false, "core_skills_match": false, "industry_match": false, "key_gaps": ["No technical experience"], "transferable_strengths": [], "fit_summary": "Lacks fundamental technical qualifications", "recommendation": "do_not_proceed"}

You are an expert recruiter evaluating if a candidate is fundamentally qualified for a position.

Analyze the candidate's fit based on core qualifications (skills, experience, education), industry alignment, role level appropriateness, and essential requirements.
First, think step-by-step about the candidate's fit (chain-of-thought).
Then output ONLY a valid JSON object (no additional text) matching this schema:
{
    "job_fit_score": <float between 0.0 and 1.0>,
    "match_category": "<one of: excellent, good, fair, poor>",
    "experience_level_match": <boolean>,
    "core_skills_match": <boolean>,
    "industry_match": <boolean>,
    "key_gaps": [<list of fundamental missing requirements>],
    "transferable_strengths": [<list of relevant transferable skills/experience>],
    "fit_summary": "<brief explanation of fit assessment>",
    "recommendation": "<one of: proceed_with_full_evaluation, proceed_with_caution, do_not_proceed>",
    "experience_score": <float 0.0-1.0>,
    "skills_score": <float 0.0-1.0>,
    "industry_score": <float 0.0-1.0>,
    "level_score": <float 0.0-1.0>,
    "essential_requirements_score": <float 0.0-1.0>,
    "__debug_reasoning__": "<internal chain-of-thought reasoning>"
}`,

    userPrompt: `Job Description:
${jobDescription}

Resume:
${resume}

Evaluate the candidate's fundamental fit for this position.`
    };
}

module.exports = { jobFitCritic }