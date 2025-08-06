const readabilityCritic = (jobDescription, resume) => {
  // Calculate approximate word count
  const wordCount = (resume.match(/\w+/g) || []).length;

  return {
    systemPrompt: `You are a resume readability expert who evaluates how easy resumes are to scan and comprehend.
        Your task is to analyze a resume's structural readability and complexity.
        
        Focus on these aspects:
        1. Overall length and conciseness
        2. White space and visual organization
        3. Bullet point effectiveness
        4. Sentence and bullet point length
        5. Reading level and complexity (Flesch-Kincaid grade level)
        6. Scanability for busy recruiters
        
        Output JSON: {
            "appropriateness_score": 0.0-1.0, // Holistic score (0-1) of readability appropriateness for the target role/industry
            "pages": float,  // Estimated pages (based on word count)
            "word_count": int, // Total word count
            "avg_bullet_length": float, // Average words per bullet point
            "fk_grade": float, // Estimated Flesch-Kincaid grade level (for informational purposes)
            "issues": [], // List of specific readability issues (e.g., "dense paragraphs", "long sentences", "poor whitespace")
            "suggestions": [] // Specific suggestions for improving readability for the target audience
        }
        Example: {"appropriateness_score": 0.8, "pages": 1.5, "word_count": 650, "avg_bullet_length": 15.2, "fk_grade": 10.5, "issues": ["Some bullet points are lengthy"], "suggestions": ["Shorten bullet points under 'Project X' for quicker scanning."]}`,

    userPrompt: ` JOB DESCRIPTION:
        ${jobDescription}
        
        RESUME:
        ${resume}
        
        Evaluate the readability of this resume, considering:
        - Overall length (the resume has approximately ${wordCount} words)
        - Structure and organization of information
        - Effective use of bullet points
        - Sentence and bullet point length
        - Reading level complexity (Estimate Flesch-Kincaid grade level for reference)
        - White space and visual organization for scanability

        Considering the industry and role described in the JOB DESCRIPTION:
        1. Evaluate the overall readability appropriateness. Is it too dense, too simplistic, or well-balanced for a recruiter in this field? Provide a holistic 'appropriateness_score' from 0.0 (very poor) to 1.0 (excellent).
        2. Estimate the Flesch-Kincaid grade level ('fk_grade').
        3. Estimate the number of pages ('pages', assuming ~450 words/page).
        4. Calculate the total 'word_count' and average words per bullet point ('avg_bullet_length').
        5. Identify specific 'issues' hindering readability (e.g., long paragraphs, jargon overload, inconsistent formatting, overly long sentences/bullets).
        6. Provide actionable 'suggestions' to improve readability for the target audience.`
  };
};

module.exports = { readabilityCritic };
