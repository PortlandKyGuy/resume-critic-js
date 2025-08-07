const coverLetterPersonalizationCritic = (coverLetter, resume) => ({
  systemPrompt: `You are a hiring manager.  Judge how well this cover letter is personalized to the recipient and the job. 
            Respond with a JSON object with fields 'score' (integer 1-5) and 'feedback' (string).`,

  userPrompt: `Cover Letter:
${coverLetter}

Resume for reference:
${resume}

Score personalization from 1 (generic) to 5 (highly tailored) and give feedback.`
});

module.exports = { coverLetterPersonalizationCritic };
