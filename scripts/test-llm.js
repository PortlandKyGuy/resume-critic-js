#!/usr/bin/env node

/**
 * Test script for LLM connections
 * Usage: node scripts/test-llm.js [provider]
 */

const { createLLMClient } = require('../src/llm/client');
const { checkOllamaAvailability, listOllamaModels } = require('../src/llm/providers/ollama');

// Load configuration
require('dotenv').config();

async function testLLM(providerName) {
  console.log(`\n🧪 Testing ${providerName || 'default'} LLM provider...\n`);
  
  try {
    // Special handling for Ollama
    if (providerName === 'ollama') {
      console.log('Checking Ollama availability...');
      const isAvailable = await checkOllamaAvailability();
      
      if (!isAvailable) {
        console.error('❌ Ollama is not running. Please start Ollama first.');
        console.log('\nTo start Ollama:');
        console.log('  1. Install Ollama from https://ollama.ai');
        console.log('  2. Run: ollama serve');
        console.log('  3. Pull a model: ollama pull llama2');
        return;
      }
      
      console.log('✓ Ollama is running');
      
      try {
        const models = await listOllamaModels();
        console.log('Available models:', models.map(m => m.name).join(', '));
      } catch (error) {
        console.log('Could not list models:', error.message);
      }
    }
    
    // Create LLM client
    const config = {
      provider: providerName,
      useMock: false
    };
    
    if (providerName) {
      config.provider = providerName;
    }
    
    const client = createLLMClient(config);
    
    console.log(`Provider: ${client.provider}`);
    console.log(`Model: ${client.model}`);
    console.log('');
    
    // Test simple completion
    console.log('Testing simple completion...');
    const startTime = Date.now();
    
    const response = await client.complete({
      system: 'You are a helpful assistant. Please respond concisely.',
      user: 'Say "Hello, World!" and tell me what 2 + 2 equals.',
      temperature: 0.7,
      maxTokens: 100
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ LLM connection successful!');
    console.log(`Response time: ${duration}s`);
    console.log('\nResponse:');
    console.log('-'.repeat(50));
    console.log(response);
    console.log('-'.repeat(50));
    
    // Test batch evaluation format
    console.log('\n\nTesting batch evaluation format...');
    
    const batchResponse = await client.complete({
      system: `You are an expert resume evaluator. Respond in JSON format with the structure:
{
  "evaluations": [
    {
      "critic": "critic_name",
      "score": 0-100,
      "feedback": "detailed feedback"
    }
  ]
}`,
      user: `Evaluate this test resume for the keyword critic only:
Resume: John Doe - Software Engineer with 5 years of experience in JavaScript, Python, and AWS.
Job Description: Looking for a senior developer with React and Node.js experience.`,
      temperature: 0.7,
      maxTokens: 200
    });
    
    console.log('\nBatch evaluation response:');
    console.log('-'.repeat(50));
    console.log(batchResponse);
    console.log('-'.repeat(50));
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(batchResponse);
      console.log('\n✅ Response is valid JSON');
      console.log('Evaluations found:', parsed.evaluations?.length || 0);
    } catch (error) {
      console.log('\n⚠️  Response is not valid JSON (may need prompt adjustment)');
    }
    
  } catch (error) {
    console.error('\n❌ LLM connection failed!');
    console.error('Error:', error.message);
    
    if (error.originalError) {
      console.error('Original error:', error.originalError.message);
    }
    
    // Provide helpful error messages
    if (error.message.includes('API key')) {
      console.log('\n💡 Tip: Make sure your API key is set:');
      console.log(`   export ${providerName?.toUpperCase() || 'OPENAI'}_API_KEY=your-api-key`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Tip: Make sure the service is running and accessible');
    }
    
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const provider = args[0];

// Show available providers if none specified
if (!provider) {
  console.log('Usage: node scripts/test-llm.js [provider]');
  console.log('\nAvailable providers:');
  console.log('  - openai (default)');
  console.log('  - gemini');
  console.log('  - ollama');
  console.log('  - mock');
  console.log('\nExample: node scripts/test-llm.js gemini');
}

// Run the test
testLLM(provider).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});