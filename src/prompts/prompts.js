const { keywordCritic } = require('./keyword.critic');
const { relevanceCritic } = require('./relevance.critic');
const { languageCritic } = require('./language.critic');
const { readabilityCritic } = require('./readability.critic');
const { comparisonCritic } = require('./comparison.critic');
const { relatedAccomplishmentsCritic } = require('./relatedAccomplishments.critic');
const { toneCritic } = require('./tone.critic');
const { personalizationCritic } = require('./personalization.critic');
const { opportunityCritic } = require('./opportunity.critic');
const { coverLetterFidelityCritic } = require('./fidelity.critic');

module.exports = {
  keywordCritic,
  relevanceCritic,
  languageCritic,
  readabilityCritic,
  comparisonCritic,
  relatedAccomplishmentsCritic,
  toneCritic,
  personalizationCritic,
  opportunityCritic,
  coverLetterFidelityCritic
};
