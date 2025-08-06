const axios = require('axios');

async function testEvaluateRoute() {
  try {
    // Test with mock LLM
    process.env.USE_MOCK_LLM = 'true';
    
    const response = await axios.post('http://localhost:8000/evaluate', {
      job_description: 'We are seeking a Senior Software Engineer with 5+ years of experience in Python, FastAPI, and cloud technologies. The ideal candidate will have strong expertise in building scalable microservices and RESTful APIs.',
      resume: 'John Doe\nSenior Software Engineer\n\nExperience:\n- 7 years developing Python applications\n- Built microservices using FastAPI and Django\n- Deployed applications on AWS and Azure\n\nSkills: Python, FastAPI, Django, AWS, Docker, PostgreSQL'
    });
    
    console.log('Success! Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status === 422) {
      console.error('Validation errors:', error.response.data);
    }
  }
}

// Only run if server is running
console.log('Make sure the server is running on port 8000');
console.log('Testing /evaluate endpoint...');
testEvaluateRoute();