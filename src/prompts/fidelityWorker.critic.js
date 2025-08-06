const { fidelitySimpleCritic } = require('./fidelity.critic');

const fidelityWorkerCritic = (jobDescription, resume, originalResume) => {
    // This is a wrapper around fidelitySimpleCritic that can work within the standard evaluation pipeline.
    // It runs as part of the comprehensive evaluation to check fidelity without JD alignment.
    // Uses fidelitySimpleCritic to focus only on truthfulness/accuracy checks.
    
    if (!originalResume) {
        // If no original resume provided, skip fidelity check
        return null;
    }
    
    // Run the fidelity evaluation (fidelitySimpleCritic ignores the JD parameter)
    return fidelitySimpleCritic(jobDescription, resume, originalResume);
}

module.exports = { fidelityWorkerCritic }