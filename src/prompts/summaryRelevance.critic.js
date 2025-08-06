const summaryRelevanceCritic = (jobDescription, resume, extra) => {
    let tailoredSummary = '';
    let originalResume = resume;
    
    if (extra && typeof extra === 'object') {
        tailoredSummary = extra.tailored_summary || '';
        originalResume = extra.original_resume || resume;
    }
    
    let userPrompt = ` JOB DESCRIPTION:
        ${jobDescription}
        
        `;
    
    if (tailoredSummary) {
        userPrompt += `ORIGINAL RESUME:
        ${originalResume}
        
        TAILORED SUMMARY TO EVALUATE:
        ${tailoredSummary}
        
        Evaluate how well this tailored summary aligns with the job requirements.
        `;
    } else {
        userPrompt += `RESUME:
        ${resume}
        
        Evaluate the resume summary (if present) for alignment with this specific job.
        If no summary exists, return score 0.0 and suggest adding one.
        `;
    }
    
    userPrompt += `
        Focus on:
        - Does the summary immediately demonstrate fit for THIS role?
        - Are the most critical job requirements addressed?
        - Does it use language and terminology from the job description appropriately?
        - Does it prioritize the most relevant experience and skills?
        - Are there any obvious misalignments or irrelevant information?
        
        Provide specific, actionable suggestions for improvement.`;

    return {
    systemPrompt: `You are an expert resume reviewer specializing in evaluating professional summaries for job relevance.
        
        Evaluate the resume summary based on alignment with the target job requirements:
        1. Does it highlight skills and experience directly relevant to the job?
        2. Does it mention the right industry/domain expertise?
        3. Does it emphasize the most important qualifications for the role?
        4. Does it demonstrate understanding of the job's key requirements?
        5. Does it position the candidate as a strong fit for this specific role?
        
        Output JSON: {
            "score": 0.0-1.0,  // How well the summary aligns with job requirements
            "job_alignment": {
                "matched_requirements": [],  // Key job requirements addressed in summary
                "missing_requirements": [],  // Important job requirements not mentioned
                "relevant_keywords": []      // Job-relevant keywords used effectively
            },
            "strengths": [],  // What makes the summary relevant
            "weaknesses": [],  // Relevance gaps or misalignments
            "suggestions": []  // Specific improvements for better job alignment
        }`,

    userPrompt: userPrompt
    };
}

module.exports = { summaryRelevanceCritic }