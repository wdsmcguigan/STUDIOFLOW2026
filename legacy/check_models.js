
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    try {
        // Note: The Node SDK might not expose listModels directly on the main client in all versions,
        // but let's try the standard pattern or a direct fetch if needed.
        // Actually, for the SDK, we often just try to get a model. 
        // But let's verify connectivity first.

        console.log("Checking available models...");

        // Since listModels isn't always straightforward in the helper, 
        // I'll try to hit the API endpoint directly using the key if the SDK method isn't obvious 
        // or I'll try to 'count tokens' on a few candidate IDs to see which exist.

        const candidates = [
            "gemini-3.0-pro",
            "gemini-3.0-pro-image",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "imagen-3.0-generate-001"
        ];

        for (const modelId of candidates) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                await model.countTokens("Test");
                console.log(`✅ AVAILABLE: ${modelId}`);
            } catch (e) {
                console.log(`❌ NOT FOUND: ${modelId} (${e.message.split('[')[0]})`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
