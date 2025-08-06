const relevanceCritic = (jobDescription, resume) => ({
  systemPrompt: `You are a hiring manager with extensive experience in candidate evaluation.
        Your task is to assess how well a resume targets the specific job description.
        
        Focus on these aspects:
        1. Alignment of experience with job requirements
        2. Relevance of accomplishments to the role
        3. Tailoring of skills and examples to the position
        4. How well the candidate's career narrative matches the job needs
        5. Appropriate emphasis on the most relevant qualifications
        
        Output JSON: { 
            "score": 1-5,  // Score from 1-5 (1=poor match, 5=excellent match)
            "strengths": [], // List of ways the resume is well-tailored to the job
            "gaps": [], // List of misalignments or missing relevant experience
            "suggestions": [] // Specific suggestions for improving relevance
        }`,

  userPrompt: ` JOB DESCRIPTION:
        ${jobDescription}
        
        RESUME:
        ${resume}
        
        Evaluate how well this resume is tailored to the specific job description.
        Consider:
        - Does the resume highlight experiences most relevant to this role?
        - Are accomplishments framed to show relevance to the target position?
        - Does the resume address the key requirements from the job description?
        - Is the emphasis appropriate (most space given to most relevant experience)?
        - Does the career narrative make sense for someone pursuing this role?
        
        Rate relevance on a scale of 1-5, where:
        1 = Generic resume with no tailoring
        2 = Minimal tailoring, major gaps
        3 = Some tailoring, but missing key elements
        4 = Well-tailored with minor improvements possible
        5 = Expertly tailored to the specific position`
});

module.exports = { relevanceCritic };
