const summaryKeywordCritic = (jobDescription, resume, extra) => {
  const tailoredSummary = (extra && typeof extra === 'object') ? (extra.tailored_summary || '') : '';

  const basePrompt = ` JOB DESCRIPTION:
        ${jobDescription}
        
        `;

  const contentPrompt = tailoredSummary
    ? `TAILORED SUMMARY TO EVALUATE:
        ${tailoredSummary}
        
        Evaluate keyword usage in this tailored summary.
        `
    : `RESUME:
        ${resume}
        
        Evaluate keyword usage in the resume summary (if present).
        If no summary exists, return score 0.0 and note critical missing keywords.
        `;

  const userPrompt = `${basePrompt}${contentPrompt}
        Identify and evaluate:
        
        1. Critical Technical Keywords:
           - Programming languages, frameworks, tools
           - Specific technologies or platforms
           - Technical methodologies or practices
        
        2. Role-Specific Keywords:
           - Job title variations
           - Key responsibilities mentioned
           - Required certifications or qualifications
        
        3. Industry Keywords:
           - Domain-specific terminology
           - Industry standards or regulations
           - Sector-specific tools or processes
        
        4. Soft Skill Keywords (if emphasized in JD):
           - Leadership, collaboration, communication
           - Only if specifically highlighted as important
        
        Assess:
        - Are the most important keywords present?
        - Are they used naturally in context?
        - Is there a good balance without over-optimization?
        - Do they enhance rather than detract from readability?
        
        Avoid keyword stuffing - keywords should flow naturally within meaningful sentences.
        
        Provide suggestions for incorporating missing critical keywords naturally.`;

  return {
    systemPrompt: `You are an expert resume reviewer specializing in keyword optimization for ATS systems and recruiter scanning.
        
        Evaluate the summary's use of important keywords from the job description:
        1. Does it include critical technical skills and tools mentioned in the JD?
        2. Does it use industry-specific terminology appropriately?
        3. Does it incorporate job title variations and related terms?
        4. Are keywords used naturally without keyword stuffing?
        5. Does it balance keywords with readability?
        
        Output JSON: {
            "score": 0.0-1.0,  // Keyword optimization score
            "keyword_analysis": {
                "critical_keywords_found": [],    // Important JD keywords in summary
                "critical_keywords_missing": [],  // Important JD keywords not used
                "keyword_density": 0.0,          // Percentage of keywords vs total words
                "natural_usage": true/false,     // Whether keywords flow naturally
                "industry_terms_used": []        // Industry-specific terminology
            },
            "strengths": [],  // Effective keyword usage
            "issues": [],     // Keyword problems (missing, stuffing, etc.)
            "suggestions": [] // How to improve keyword presence naturally
        }`,

    userPrompt
  };
};

module.exports = { summaryKeywordCritic };
