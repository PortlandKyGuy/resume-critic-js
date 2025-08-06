const { keywordCritic } = require('./keyword.critic');
const { relevanceCritic } = require('./relevance.critic');
const { languageCritic } = require('./language.critic');
const { readabilityCritic } = require('./readability.critic');
const { comparisonCritic } = require('./comparison.critic');
const { relatedAccomplishmentsCritic } = require('./relatedAccomplishments.critic');

module.exports = {
  keywordCritic,
  relevanceCritic,
  languageCritic,
  readabilityCritic,
  comparisonCritic,
  relatedAccomplishmentsCritic
};
