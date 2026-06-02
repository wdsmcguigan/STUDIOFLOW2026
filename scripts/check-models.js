
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    try {
        console.log("Fetching models...");
        // For listing models we use the model manager (not exposed directly in simple client usually?)
        // Actually typically it is via generic client or fetch.
        // The SDK typically exposes it via `getGenerativeModel` but listing is separate.
        // Let's rely on the SDK if it has `listModels` on a generic manager.
        // Wait, typical SDK usage is:
        // const results = await fetch(...)

        // Using simple fetch to be sure.
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.name.includes("veo") || m.name.includes("video")) {
                    console.log(`VIDEO MODEL: ${m.name} (Methods: ${m.supportedGenerationMethods})`);
                } else {
                    console.log(`Model: ${m.name}`);
                }
            });
        } else {
            console.error("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
