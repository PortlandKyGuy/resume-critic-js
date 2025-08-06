const relatedAccomplishmentsCritic = (jobDescription, resume) => {

    return {
    systemPrompt: `You are an expert resume reviewer focused on the 'Related Accomplishments' section.
        Evaluate how well the accomplishments are categorized and selected to position the candidate for the target role.
        
        Focus on these critical aspects:
        1. Category-job alignment: Do the category names directly relate to key requirements in the job description?
        2. Accomplishment-category fit: Does each accomplishment belong in its assigned category?
        3. Selection quality: Are these the most impactful and relevant accomplishments to showcase for this specific role?
        4. Metrics and results: Do accomplishments include quantifiable outcomes and measurable results?
        
        Output JSON: {
            "score": 1-5,          // 1 = poor alignment/selection, 5 = excellent strategic categorization and selection
            "feedback": [],        // What works well
            "suggestions": []      // How to improve categorization and accomplishment selection
        }`,

    userPrompt: ` JOB DESCRIPTION:
        ${jobDescription}
        
        RESUME:
        ${resume}
        
        Analyze the 'Related Accomplishments' section with these specific criteria:
        
        1. CATEGORY-JOB ALIGNMENT: Examine if the category names (e.g., "Leadership", "Technical Innovation", etc.) 
           directly address the key requirements and priorities mentioned in the job description.
        
        2. ACCOMPLISHMENT-CATEGORY FIT: Verify that each accomplishment is correctly placed under its category 
           and truly represents that skill or competency area.
        
        3. SELECTION QUALITY: Assess whether these are the most powerful accomplishments the candidate could showcase 
           for THIS specific role. Are there likely better examples that would resonate more with this employer?
        
        4. METRICS AND RESULTS: Check if accomplishments include quantifiable impacts, measurable outcomes, 
           or specific results that demonstrate the value the candidate delivered.
        
        Score from 1-5 where:
        1 = Categories misaligned with job; accomplishments poorly chosen or miscategorized
        2 = Some alignment but significant missed opportunities in categorization or selection
        3 = Adequate categorization with decent accomplishments, but not optimally targeted
        4 = Strong category alignment and well-selected accomplishments with good metrics
        5 = Exceptional strategic categorization with highly relevant, quantified accomplishments that perfectly target the role
        
        Focus your feedback on category strategy and accomplishment selection rather than writing style.`
    };
}

module.exports = { relatedAccomplishmentsCritic }