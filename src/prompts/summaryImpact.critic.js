const summaryImpactCritic = (jobDescription, resume, extra) => {
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
        
        Evaluate the impact and persuasiveness of this tailored summary.
        `;
  } else {
    userPrompt += `RESUME:
        ${resume}
        
        Evaluate the impact of the resume summary (if present).
        If no summary exists, return score 0.0 and explain the missed opportunity.
        `;
  }

  userPrompt += `
        Assess:
        - Opening strength: Does it grab attention immediately?
        - Value clarity: Is the candidate's unique value crystal clear?
        - Achievement focus: Are accomplishments highlighted effectively?
        - Language power: Is the language compelling and professional?
        - Differentiation: Does it set the candidate apart from others?
        
        Look for:
        - Specific numbers, percentages, or quantifiable results
        - Industry-specific expertise or certifications
        - Unique combinations of skills or experience
        - Clear statements of what the candidate offers
        
        Avoid generic phrases like "results-driven," "team player," or "self-motivated"
        in favor of specific, demonstrable qualities.
        
        Provide concrete suggestions to maximize impact while maintaining professionalism.`;

  return {
    systemPrompt: `You are an expert resume reviewer specializing in creating impactful professional summaries.
        
        Evaluate the summary's impact and persuasiveness:
        1. Does it create a strong first impression?
        2. Does it clearly communicate the candidate's unique value proposition?
        3. Does it use powerful, action-oriented language?
        4. Does it highlight quantifiable achievements or specific expertise?
        5. Does it compel the reader to continue reading the resume?
        
        Output JSON: {
            "score": 0.0-1.0,  // Overall impact and persuasiveness score
            "impact_analysis": {
                "strong_elements": [],      // Elements that create impact
                "weak_elements": [],        // Elements that dilute impact
                "unique_value_props": [],   // Clear value propositions identified
                "action_words_used": []     // Powerful verbs and descriptors
            },
            "strengths": [],  // What makes the summary impactful
            "weaknesses": [], // What reduces its impact
            "suggestions": [] // Specific improvements for greater impact
        }`,

    userPrompt
  };
};

module.exports = { summaryImpactCritic };
