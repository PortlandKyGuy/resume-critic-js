const summaryConcisenessCritic = (jobDescription, resume, extra) => {
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
    userPrompt += `TAILORED SUMMARY TO EVALUATE:
        ${tailoredSummary}
        
        Evaluate the conciseness and clarity of this tailored summary.
        `;
  } else {
    userPrompt += `RESUME:
        ${resume}
        
        Evaluate the conciseness of the resume summary (if present).
        If no summary exists, return score 0.0 and note the absence.
        `;
  }

  userPrompt += `
        Analyze:
        - Length: Is it appropriately brief (2-4 sentences, 50-100 words ideal)?
        - Density: Does every word contribute meaningful information?
        - Clarity: Can it be understood in a single quick read?
        - Focus: Does it stick to the most important points?
        - Readability: Is it easy to scan and digest?
        
        Identify:
        - Filler words or phrases that add no value
        - Redundant information that could be consolidated
        - Complex sentences that could be simplified
        - Vague statements that could be more specific
        - Any content that belongs elsewhere in the resume
        
        Remember: The summary is prime real estate. Every word must earn its place.
        
        Provide specific editing suggestions to maximize impact with minimum words.`;

  return {
    systemPrompt: `You are an expert resume reviewer specializing in concise, effective professional summaries.
        
        Evaluate the summary's conciseness and clarity:
        1. Is it the right length (typically 2-4 sentences, 50-100 words)?
        2. Does every word add value, or is there fluff?
        3. Is the message clear and easy to understand quickly?
        4. Does it avoid redundancy and repetition?
        5. Is it scannable and digestible for busy recruiters?
        
        Output JSON: {
            "score": 0.0-1.0,  // Conciseness and clarity score
            "conciseness_metrics": {
                "word_count": 0,           // Total words in summary
                "sentence_count": 0,       // Number of sentences
                "filler_words": [],        // Unnecessary words identified
                "redundancies": [],        // Repeated or redundant content
                "clarity_issues": []       // Unclear or confusing phrases
            },
            "strengths": [],  // Where the summary is concise and clear
            "issues": [],     // Conciseness or clarity problems
            "suggestions": [] // Specific edits for improvement
        }`,

    userPrompt
  };
};

module.exports = { summaryConcisenessCritic };
