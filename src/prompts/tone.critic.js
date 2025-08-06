const toneCritic = (coverLetter, resume) => ({
  systemPrompt: `You are a communications expert.  Assess the tone of this cover letter: is it professional, engaging, and appropriately enthusiastic? 
            Respond with a JSON object with fields 'score' (integer 1-5) and 'feedback' (string). 
            Example: {"score":4,"feedback":"Well-balanced tone with professional enthusiasm."}`,

  userPrompt: `Cover Letter:
${coverLetter}

Also see this resume for context:
${resume}

Rate the tone from 1 (very poor) to 5 (excellent) and explain briefly.`
});

module.exports = { toneCritic };
