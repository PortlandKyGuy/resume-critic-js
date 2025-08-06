const keywordCritic = (jobDescription, resume, requiredTerms = null) => {
    // If specific terms are provided, use them. Otherwise, ask LLM to infer.
    const requiredTermsGuidance = requiredTerms 
        ? `REQUIRED TERMS (provided):\n${requiredTerms}`
        : "REQUIRED TERMS: Please infer 'must-have' and 'nice-to-have' terms from the Job Description based on their centrality to the role.";

    return {
    systemPrompt: `You are an expert at checking if all required skills and terms are in a resume. 
        You have extensive experience in HR and technical recruiting.
        
        Analyze the resume to determine if it includes the required keywords from the job description, differentiating between 'must-have' and 'nice-to-have' terms based on the JD context.
        
        Output JSON: {
            "score": 0.0-1.0,  // Weighted score reflecting presence of important terms (must-haves weighted higher)
            "missing_must_have": [], // List of critical 'must-have' terms not found
            "missing_nice_to_have": [], // List of 'nice-to-have' terms not found
            "present_terms": [], // List of important terms found (both types)
            "suggestions": [] // Specific suggestions for improving keyword presence, focusing on missing must-haves
        }
        Example: {"score":0.85,"missing_must_have":["Kubernetes"],"missing_nice_to_have":["Grafana"],"present_terms":["Python", "Docker", "AWS"],"suggestions":["Consider adding experience with Kubernetes if applicable."]}`,

    userPrompt: ` JOB DESCRIPTION:
        ${jobDescription}
        
        RESUME:
        ${resume}
        
        ${requiredTermsGuidance}

        Instructions:
        1. Identify 'must-have' keywords (essential qualifications, core technologies/skills) and 'nice-to-have' keywords (preferred qualifications, secondary tools) from the JD or the provided list.
        2. Check the RESUME for the presence of these keywords (including synonyms, related terms, and different word forms like "manage", "management").
        3. Calculate a weighted score (0.0-1.0) where finding 'must-have' terms contributes significantly more to the score than finding 'nice-to-have' terms. A score of 1.0 means all must-haves and most nice-to-haves are present. Missing even one must-have should noticeably lower the score.
        4. List the missing 'must-have' and 'nice-to-have' terms separately.
        5. List all important terms found.
        6. Provide actionable suggestions, prioritizing how to incorporate missing 'must-have' terms if possible.`
    };
}

module.exports = { keywordCritic }