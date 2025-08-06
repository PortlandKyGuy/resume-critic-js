const comparisonCritic = (jobDescription, resume, originalResume) => {
    if (!originalResume) {
        throw new Error("Original resume must be provided as third parameter");
    }

    return {
    systemPrompt: `You are an expert resume analyst who specializes in comparing an original resume with 
        a tailored version of that resume. Your job is to identify two key aspects:
        
        1. Important content from the original resume that should have been kept or emphasized in the tailored version
        2. Content that appears in the tailored resume but doesn't exist in the original resume (potentially fabricated)
        
        Focus on significant differences related to:
        - Work experience (roles, responsibilities, achievements, dates)
        - Education details
        - Skills and certifications
        - Project descriptions
        
        You MUST output VALID JSON in the exact format shown below:
        
        {
            "missing_important_content": [
                {
                    "content": "string description of missing content",
                    "reason": "string explanation of why it's important"
                }
            ],
            "potentially_fabricated": [
                {
                    "content": "string description of possibly fabricated content",
                    "reason": "string explanation of why it appears fabricated"
                }
            ],
            "fabrication_risk_score": 0.0,
            "recommendations": ["string recommendation 1", "string recommendation 2"]
        }
        Example: {"missing_important_content":[],"potentially_fabricated":[],"fabrication_risk_score":0.0,"recommendations":["Consider retaining key metrics."]}
        
        Notes:
        - The fabrication_risk_score should be a float between 0.0 and 1.0
        - Lists can be empty if no issues are found
        - Recommendations should always include at least one item
        - Return ONLY the JSON object without any additional explanation or text`,

    userPrompt: ` JOB DESCRIPTION:
        ${jobDescription}
        
        ORIGINAL RESUME:
        ${originalResume}
        
        TAILORED RESUME:
        ${resume}
        
        Compare the original resume with the tailored version, and identify:
        
        1. Important content from the original resume that should have been kept but was omitted or significantly altered
        in the tailored version. Focus on details that:
           - Demonstrate significant achievements or experience
           - Show relevant skills for the job description
           - Establish credibility or qualification
           - Provide important context about the candidate's background
        
        2. Content that appears in the tailored resume but doesn't exist in the original resume. Look for:
           - New jobs, roles, or responsibilities not mentioned in the original
           - Enhanced or exaggerated achievements
           - Added skills, certifications, or education not present in the original
           - Significantly altered dates, titles, or company information
        
        Be reasonable in your assessment - minor rephrasing for clarity or relevance is acceptable.
        Focus on substantial differences that could be considered fabrication or misrepresentation.
        
        Provide a fabrication risk score between 0.0 and 1.0:
        - 0.0: No fabrication, only appropriate tailoring
        - 0.3: Minor embellishments or additions
        - 0.5: Moderate concerns, some significant additions
        - 0.7: Major concerns, substantial fabrication
        - 1.0: Severe fabrication, completely different resume
        
        Also include specific recommendations for how to better tailor the resume while maintaining authenticity.`
    };
}

module.exports = { comparisonCritic }