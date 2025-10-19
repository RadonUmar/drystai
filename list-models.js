// List available Gemini models
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Manually load .env.local
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    console.log('🔍 Fetching available Gemini models...\n');

    // Try to list models via the API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('📋 Available models:\n');

    if (data.models && data.models.length > 0) {
      data.models.forEach(model => {
        console.log(`✅ ${model.name}`);
        console.log(`   Display name: ${model.displayName}`);
        console.log(`   Description: ${model.description}`);
        console.log(`   Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        console.log('');
      });

      // Find models that support generateContent
      console.log('\n🎯 Models that support generateContent with vision:\n');
      const visionModels = data.models.filter(m =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        (m.name.includes('vision') || m.name.includes('pro') || m.name.includes('flash'))
      );

      visionModels.forEach(model => {
        console.log(`   📸 ${model.name.replace('models/', '')}`);
      });

    } else {
      console.log('❌ No models found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('401')) {
      console.error('\n💡 Your API key might be invalid or expired');
    }
  }
}

listModels();
