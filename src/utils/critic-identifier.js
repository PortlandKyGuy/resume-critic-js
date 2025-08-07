/**
 * Identify critic name from system prompt
 * @param {string} systemPrompt - The system prompt to analyze
 * @param {number} index - The critic index
 * @returns {string} The identified critic name
 */
const identifyCritic = (systemPrompt, index) => {
  const promptStart = systemPrompt.substring(0, 200).toLowerCase();

  // Resume critics
  if (promptStart.includes('job fit') || promptStart.includes('recruiter evaluating')) {
    return 'jobFit';
  }
  if (promptStart.includes('keyword') || promptStart.includes('technical recruiter')) {
    return 'keyword';
  }
  if (promptStart.includes('readability')) {
    return 'readability';
  }
  if (promptStart.includes('relevance') || promptStart.includes('hiring manager')) {
    return 'relevance';
  }
  if (promptStart.includes('language') || promptStart.includes('grammar')) {
    return 'language';
  }
  if (promptStart.includes('fidelity') || promptStart.includes('truthfulness')) {
    return 'fidelity';
  }
  if (promptStart.includes('opportunity') || promptStart.includes('missing achievements')) {
    return 'opportunity';
  }
  if (promptStart.includes('related accomplishments')) {
    return 'relatedAccomplishments';
  }

  // Cover letter critics
  if (promptStart.includes('tone')) {
    return 'coverLetterTone';
  }
  if (promptStart.includes('personalization')) {
    return 'coverLetterPersonalization';
  }

  return `critic${index}`;
};

module.exports = { identifyCritic };
