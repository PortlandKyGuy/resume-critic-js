const { keywordCritic } = require('./keyword.critic.js');
const { relevanceCritic } = require('./relevance.critic.js');
const { languageCritic } = require('./language.critic.js');
const { readabilityCritic } = require('./readability.critic.js');
const { comparisonCritic } = require('./comparison.critic.js');
const { relatedAccomplishmentsCritic } = require('./relatedAccomplishments.critic.js');

module.exports = {
    keywordCritic,
    relevanceCritic,
    languageCritic,
    readabilityCritic,
    comparisonCritic,
    relatedAccomplishmentsCritic
}