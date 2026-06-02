
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface AnalysisResult {
    assetId: string;
    description: string;
}

export interface GenerationRequest {
    type: 'image' | 'video';
    prompt: string;
    aspectRatio: string;
    styleReference?: string;
    model?: string;
    sourceImage?: string; // Base64 for Image-to-Image refinement
    contentParts?: any[]; // For Direct Mode
    videoConfig?: {
        durationSeconds: string;
        resolution: string;
        fps: string;
        withAudio: boolean;
    };
}

export const geminiService = {
    // Step 1: Analyze Assets
    async analyzeImageAssets(assets: { id: string; base64: string; type: string }[]): Promise<AnalysisResult[]> {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const results: AnalysisResult[] = [];

        for (const asset of assets) {
            try {
                const prompt = `Describe this ${asset.type} in detail for use in a cinematic production pipeline. Focus on visual traits, lighting, and mood.`;
                const base64Data = asset.base64.split(',')[1];

                const result = await model.generateContent([
                    prompt,
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                ]);
                const response = await result.response;
                results.push({ assetId: asset.id, description: response.text() });
            } catch (error) {
                console.error(`Error analyzing asset ${asset.id}:`, error);
                results.push({ assetId: asset.id, description: "Failed to analyze asset." });
            }
        }
        return results;
    },

    // Step 2: Refine Prompt
    async refinePromptForGeneration(
        inputs: {
            script?: string;
            characterDetails?: string;
            locationDetails?: string;
            actionCamera?: string;
            visualStyle?: string;
            assetDescriptions: string[];
        }
    ): Promise<{ technical_prompt: string; reasoning: string }> {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // LOGGING FOR VERIFICATION
        console.group("🎨 ContentFlow Prompt Inputs");
        console.log("Script:", inputs.script || "N/A");
        console.log("Character Details:", inputs.characterDetails || "N/A");
        console.log("Location Details:", inputs.locationDetails || "N/A");
        console.log("Visual Style:", inputs.visualStyle || "N/A");
        console.log("Asset Analysis:", inputs.assetDescriptions);
        console.groupEnd();

        const prompt = `
      You are a Creative Production Co-Pilot. Your goal is to create a hig-fidelity technical prompt for an AI media generator (like Imagen 3 or Veo).
      
      Inputs:
      - Script Context: ${inputs.script || "N/A"}
      - Character Details: ${inputs.characterDetails || "N/A"}
      - Location Details: ${inputs.locationDetails || "N/A"}
      - Action/Camera: ${inputs.actionCamera || "N/A"}
      - Visual Style: ${inputs.visualStyle || "N/A"}
      - Asset Analysis: ${inputs.assetDescriptions.join('\n')}

      Task:
      Synthesize these inputs into a cohesive, visually descriptive prompt. 
      Ensure consistency in lighting, mood, and style.
      Output ONLY valid JSON with keys: "technical_prompt" and "reasoning".
    `;

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });
            const response = await result.response;
            return JSON.parse(response.text());
        } catch (error) {
            console.error("Error refining prompt:", error);
            return { technical_prompt: "Error exploring prompt.", reasoning: "API Failure" };
        }
    },

    // Step 3: Generate Media
    async generateMedia(request: GenerationRequest): Promise<string> {
        // Map UI model names to real Model IDs based on official docs
        const modelMap: Record<string, string> = {
            "Gemini 3 Pro Image (Nano-Banana Pro)": "gemini-3-pro-image-preview",
            "Gemini 2.5 Flash Image": "gemini-2.5-flash-image",
            "Gemini 2.0 Flash Exp": "gemini-2.0-flash-exp",
            // Legacy/Fallbacks
            "Nano-Banana Pro": "gemini-3-pro-image-preview",
            "Nano-Banana": "gemini-2.5-flash-image"
        };

        const modelId = request.model ? (modelMap[request.model] || request.model) : "gemini-2.5-flash-image";
        const model = genAI.getGenerativeModel({ model: modelId });

        if (request.type === 'image') {
            try {
                console.log(`[Real Gen] Generating image with ${modelId}`);

                let parts: any[] = [];

                if (request.contentParts && request.contentParts.length > 0) {
                    // Direct Mode: Use provided parts
                    console.log("🎨 Direct Mode Input Structure:");
                    request.contentParts.forEach((part, index) => {
                        if (part.text) {
                            console.log(`  [Part ${index}] Text: "${part.text.substring(0, 100)}${part.text.length > 100 ? '...' : ''}"`);
                        } else if (part.inlineData) {
                            console.log(`  [Part ${index}] Image: ${part.inlineData.mimeType} (Base64 Length: ${part.inlineData.data.length})`);
                        } else {
                            console.log(`  [Part ${index}] Unknown Type:`, part);
                        }
                    });

                    parts = request.contentParts;
                    // Append AR if text part exists, or just append as new text part
                    parts.push({ text: ` --ar ${request.aspectRatio}` });
                } else {
                    // Prompt Mode: Standard Text (+ optional Refine Image)
                    console.log(`[Real Gen] Prompt: ${request.prompt}`);
                    parts = [{ text: request.prompt + ` --ar ${request.aspectRatio}` }];

                    // Image-to-Image Refinement
                    if (request.sourceImage) {
                        console.log("[Real Gen] Mode: Image-to-Image Refinement");
                        const base64Image = request.sourceImage.includes(',')
                            ? request.sourceImage.split(',')[1]
                            : request.sourceImage;

                        parts.push({
                            inlineData: {
                                data: base64Image,
                                mimeType: "image/png"
                            }
                        });
                    } else {
                        console.log("[Real Gen] Mode: Text-to-Image");
                    }
                }

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts }]
                });

                const response = await result.response;

                // Handle different response structures for Image Generation models
                // 1. Check for inline data (standard for some endpoints)
                const generatedImage = (response as any).candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
                if (generatedImage) {
                    return `data:${generatedImage.inlineData.mimeType};base64,${generatedImage.inlineData.data}`;
                }

                // 2. Check for 'images' property if using specific Imagen-style response
                // (Note: The JS SDK often normalizes this, but we check just in case)
                // @ts-ignore
                if (response.images && response.images.length > 0) {
                    // @ts-ignore
                    return `data:image/png;base64,${response.images[0]}`;
                }

                // 3. Fallback: Check text output for URL
                const textOutput = response.text();
                if (textOutput && textOutput.startsWith('http')) return textOutput;

                throw new Error(`Model ${modelId} returned text instead of image data. Response: ${textOutput.substring(0, 100)}...`);

            } catch (e: any) {
                console.error(`Image gen failed with ${modelId}:`, e);
                // Propagate the specific error message (e.g. "404 Not Found") so the user can debug
                throw new Error(`[${modelId}] Generation Failed: ${e.message || e}`);
            }
        } else {
            // VIDEO (Veo) - Using @google/genai SDK (Official Veo Support)
            console.group("🎬 Video Generation Request (Veo - @google/genai)");
            console.log("Model:", modelId);
            console.log("Prompt:", request.prompt);

            const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

            // Construct Configuration
            const config: any = {
                numberOfVideos: 1,
                resolution: request.videoConfig?.resolution === "1920x1080" ? "1080p" : "720p",
                // fps: request.videoConfig?.fps // Note: SDK might not expose FPS directly in basic config yet, checking types usage
            };

            const payload: any = {
                model: modelId,
                config: config,
                prompt: request.prompt
            };

            // Handle Image Input (Image-to-Video)
            if (request.contentParts) {
                const imagePart = request.contentParts.find(p => p.inlineData);
                if (imagePart) {
                    payload.image = {
                        imageBytes: imagePart.inlineData.data,
                        mimeType: imagePart.inlineData.mimeType || "image/png"
                    };
                    console.log("Attached Start Frame");
                }
            }

            console.log("Payload:", JSON.stringify(payload, null, 2));
            console.groupEnd();

            try {
                // 1. Initiate Generation
                let operation = await ai.models.generateVideos(payload);
                console.log('Video generation operation started:', operation);

                // 2. Poll for Completion
                // The @google/genai SDK provides helper or we loop checking done
                while (!operation.done) {
                    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s poll
                    console.log('...Polling Veo Status...');
                    operation = await ai.operations.getVideosOperation({ operation: operation });
                }

                // 3. Retrieve Result
                if (operation?.response && operation.response.generatedVideos && operation.response.generatedVideos.length > 0) {
                    const videos = operation.response.generatedVideos;
                    const firstVideo = videos[0];
                    if (!firstVideo?.video?.uri) {
                        throw new Error('Generated video is missing a URI.');
                    }

                    const videoUri = firstVideo.video.uri;
                    console.log('Video URI received:', videoUri);

                    // Fetch the actual video bytes to return a playable blob/base64
                    // Note: The URI is typically accessible with the API Key
                    const res = await fetch(`${videoUri}&key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`);

                    if (!res.ok) {
                        throw new Error(`Failed to fetch video content: ${res.status} ${res.statusText}`);
                    }

                    const arrayBuffer = await res.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    return `data:video/mp4;base64,${base64}`;

                } else if (operation.error) {
                    // Specific API Error from LRO
                    console.error('Veo Operation Failed with Error:', operation.error);
                    const errorCode = operation.error.code || 'Unknown Code';
                    const errorMessage = operation.error.message || 'Unknown Error';
                    throw new Error(`Veo API Error (${errorCode}): ${errorMessage}`);
                } else {
                    // Completed but no result and no explicit error
                    console.error('Operation completed nicely but returned no videos:', operation);
                    throw new Error('Generation completed but no videos were returned. This often means the request was blocked by safety filters.');
                }

            } catch (error: any) {
                console.error("Veo SDK Error:", error);

                // Enhanced error formatting
                let readableError = error.message || "Unknown error";

                // If it's a 400 bad request, it usually has details in the response body which might be hidden in the error object
                if (readableError.includes("400")) {
                    readableError += " (Check if parameters like Resolution/Duration match the model's capabilities)";
                }

                throw new Error(`Veo Generation Failed: ${readableError}`);
            }
        }
    }
};
