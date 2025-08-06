const opportunityCritic = (jobDescription, coverLetter, resume) => ({
  systemPrompt: `You are a career coach. Given a job description, a cover letter, and a resume, 
            identify 2–3 achievements or experiences from the resume that the cover letter 
            does NOT yet mention but would strongly strengthen the candidate's narrative. 
            Respond with JSON: {
            "score": <integer 1-5 for how many high-impact items are missing>, 
            "suggestions": [<each suggestion string>] }`,

  userPrompt: `JOB DESCRIPTION:
${jobDescription}

COVER LETTER:
${coverLetter}

ORIGINAL RESUME:
${resume}`
});

module.exports = { opportunityCritic };
