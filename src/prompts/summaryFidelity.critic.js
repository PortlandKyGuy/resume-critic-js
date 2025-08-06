const summaryFidelityCritic = (jobDescription, resume, extra) => {
    let tailoredSummary = '';
    let originalResume = resume;
    
    if (extra && typeof extra === 'object') {
        tailoredSummary = extra.tailored_summary || '';
        originalResume = extra.original_resume || resume;
    }
    
    let userPrompt;
    
    if (!tailoredSummary) {
        userPrompt = ` JOB DESCRIPTION:
        ${jobDescription}
        
        RESUME:
        ${resume}
        
        This resume does not have a separate tailored summary to evaluate.
        If there's a summary in the resume, evaluate its truthfulness.
        If no summary exists, return score 1.0 (no fidelity issues in non-existent summary).`;
    } else {
        userPrompt = ` JOB DESCRIPTION:
        ${jobDescription}
        
        ORIGINAL RESUME:
        ${originalResume}
        
        TAILORED SUMMARY TO EVALUATE:
        ${tailoredSummary}
        
        Verify that the tailored summary accurately represents the candidate's experience.
        
        Check for:
        - Claims about skills: Are they demonstrated in the original resume?
        - Years of experience: Do they match the resume timeline?
        - Industry expertise: Is it supported by actual work history?
        - Achievements: Are they based on real accomplishments?
        - Technical skills: Are proficiency levels accurate?
        
        The summary can emphasize relevant aspects and use persuasive language,
        but it must remain truthful and not misrepresent the candidate's background.
        
        Provide specific examples of any concerns and suggestions for maintaining
        both truthfulness and effectiveness.`;
    }

    return {
    systemPrompt: `You are an expert resume reviewer specializing in verifying the accuracy and truthfulness of professional summaries.
        
        Evaluate the summary's fidelity to the original experience:
        1. Does it accurately represent the candidate's actual experience?
        2. Are all claims substantiated by the original resume?
        3. Does it avoid exaggeration or misrepresentation?
        4. Does it maintain professional integrity while being persuasive?
        5. Are skill levels and expertise represented honestly?
        
        Output JSON: {
            "score": 0.0-1.0,  // How truthful and accurate the summary is
            "fidelity_assessment": {
                "accurate_claims": [],      // Claims that are well-supported
                "questionable_claims": [],  // Claims that may be exaggerated
                "unsupported_claims": []    // Claims not backed by the resume
            },
            "strengths": [],  // Where the summary maintains integrity well
            "concerns": [],   // Potential fidelity issues
            "suggestions": [] // How to improve while maintaining truthfulness
        }`,

    userPrompt: userPrompt
    };
}

module.exports = { summaryFidelityCritic }