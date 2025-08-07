const fidelityCritic = (jobDescription, resume, originalResume) => {
  if (!originalResume) {
    throw new Error('Original resume must be provided as third parameter for fidelity checking');
  }

  return {
    systemPrompt: `You must reply with exactly one JSON object and nothing else.
You are an integrity auditor comparing a tailored resume against its job description (with the original resume for reference).

Your task:
1. Parse the Job Description to extract its key requirements: skills, responsibilities, metrics.
2. Extract discrete claims (sentences or bullets) from the Tailored Resume.
3. For each claim:
   - **Alignment check**: does it map to at least one JD requirement?
   - **Accuracy check**: does it use only facts—dates, metrics, roles, achievements—from the Original Resume?
   - **Semantic equivalence**: if a claim paraphrases or uses synonyms of information in the Original Resume, consider it accurate and supported.
4. Flag any claim that:
   - **Misalignment** → no corresponding JD requirement
   - **Inaccuracy** → introduces new dates, metrics, headcounts, dollars, or accomplishments not in the Original Resume
5. Return exactly:
\`\`\`json
{
  "aligned_claims_count": <integer>,
  "total_claims_count": <integer>,
  "unsupported_claims_count": <integer>,
  "misaligned_claims": [
    {
      "claim": "<the full sentence or bullet>",
      "missing_requirements": [
        "<the specific JD skills/responsibilities/metrics this claim fails to address>",
        …
      ]
    },
    …
  ],
  "hallucinated_claims": [
    {
      "claim": "<the full sentence or bullet>",
      "unsupported_parts": [
        "<the exact phrase or clause not found in the Original Resume>",
        …
      ]
    },
    …
  ]
}
\`\`\``,

    userPrompt: `JD:
${jobDescription}

RESUME:
${resume}

Original Resume:
${originalResume}`
  };
};

const fidelitySimpleCritic = (jobDescription, resume, originalResume) => {
  if (!originalResume) {
    throw new Error('Original resume must be provided as third parameter for fidelity checking');
  }

  return {
    systemPrompt: `You must reply with exactly one JSON object and nothing else.
You are an integrity auditor comparing a tailored resume against its original resume.

Your task:
1. Extract discrete claims (sentences or bullets) from the tailored resume.
2. For each claim:
   - Check accuracy: does it use only facts—dates, metrics, roles, achievements—from the original?
   - Consider synonyms or paraphrases that preserve the same meaning as accurate and supported.
3. Flag any claim that:
   - Introduces new dates, metrics, headcounts, dollars, or accomplishments not in the original.
4. Return exactly:
\`\`\`json
{
  "aligned_claims_count": <integer>,
  "total_claims_count": <integer>,
  "unsupported_claims_count": <integer>,
  "hallucinated_claims": [
    {
      "claim": "<the full sentence or bullet>",
      "unsupported_parts": [
        "<exact phrase or clause not found in the original resume>",
        …
      ]
    },
    …
  ]
}`,

    userPrompt: `Original Resume:
${originalResume}

Tailored Resume:
${resume}`
  };
};

const coverLetterFidelityCritic = (jobDescription, coverLetter, originalResume) => {
  if (!originalResume) {
    throw new Error('Original resume must be provided as third parameter for cover letter fidelity checking');
  }

  return {
    systemPrompt: `You must reply with exactly one JSON object and nothing else.
You are an integrity auditor comparing a tailored cover letter against its original resume.

Your task:
1. Extract discrete claims (sentences or bullets) from the tailored cover letter.
2. For each claim:
   - Check accuracy: does it use only facts—dates, metrics, roles, achievements—from the original resume?
3. Flag any claim that:
   - Introduces new dates, metrics, headcounts, dollars, or accomplishments not in the original resume.
4. Return exactly:
\`\`\`json
{
  "aligned_claims_count": <integer>,
  "total_claims_count": <integer>,
  "unsupported_claims_count": <integer>,
  "hallucinated_claims": [
    {
      "claim": "<the full sentence or bullet>",
      "unsupported_parts": [
        "<exact phrase or clause not found in the original resume>",
        …
      ]
    },
    …
  ]
}
\`\`\``,

    userPrompt: `Original Resume:
${originalResume}

Cover Letter:
${coverLetter}`
  };
};

module.exports = { fidelityCritic, fidelitySimpleCritic, coverLetterFidelityCritic };
