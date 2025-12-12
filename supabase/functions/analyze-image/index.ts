import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, fileName, fileSize, width, height } = await req.json();
    
    // 1. Check for Key
    const GOOGLE_GEMINI_KEY = Deno.env.get('GOOGLE_GEMINI_KEY');
    if (!GOOGLE_GEMINI_KEY) throw new Error('GOOGLE_GEMINI_KEY is not configured');

    // 2. Prepare Image Data (Strip prefix if present)
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    console.log(`Analyzing: ${fileName} (${width}x${height})`);

    // 3. Construct the Exact Prompt from your example
    // We combine System + User instructions to ensure strict JSON output
    const prompt = `
      You are an expert e-commerce product image analyst. 
      Analyze this image and provide data. Do not modify the image.
      
      Image Details:
      - Name: ${fileName}
      - Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB
      - Dims: ${width}x${height}px

      Evaluate:
      1. Quality (sharpness, light, color)
      2. Background (is it clean/white?)
      3. Compliance (Amazon/eBay/Shopify standards)
      4. Suggestions (Upscale? Remove BG? Compress?)

      RETURN ONLY RAW JSON. NO MARKDOWN. NO \`\`\`json WRAPPERS.
      
      Target JSON Structure:
      {
        "qualityScore": number (0-100),
        "issues": [
          {
            "type": "string (crop|background|resolution|lighting|blur|file-size)",
            "severity": "string (low|medium|high)",
            "description": "string",
            "suggestedAction": "string"
          }
        ],
        "compliance": {
          "amazon": { "isCompliant": boolean, "violations": ["string"], "recommendations": ["string"] },
          "shopify": { "isCompliant": boolean, "violations": ["string"], "recommendations": ["string"] }
        },
        "suggestions": {
          "backgroundRemoval": boolean,
          "upscaling": boolean,
          "cropping": boolean,
          "enhancement": boolean,
          "compression": boolean
        },
        "productCategory": "string",
        "backgroundAnalysis": {
          "type": "string (white|solid|complex|transparent)",
          "quality": "string (clean|needs-work)"
        }
      }
    `;

    // 4. Call Google Gemini 1.5 Flash (Direct API)
// In your analyze-image function, update this line:
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { 
            mime_type: "image/jpeg", 
            data: cleanBase64 
          }}
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json"
      }
    })
  }
);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API Error: ${err}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error("AI returned empty response");

    // 5. Parse JSON (Handle potential markdown wrapping safely)
    const jsonString = rawText.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(jsonString);

    // 6. Return exact format your frontend expects
    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Analysis failed:', error);
    
    // Fallback JSON so the frontend doesn't crash on error
    const fallback = {
        qualityScore: 0,
        issues: [{ type: "error", severity: "high", description: "AI Analysis Failed", suggestedAction: "Check API Key" }],
        compliance: {},
        suggestions: { backgroundRemoval: false, upscaling: false, compression: false },
        productCategory: "unknown",
        backgroundAnalysis: { type: "unknown", quality: "unknown" }
    };

    return new Response(JSON.stringify({ analysis: fallback, error: error.message }), {
      status: 200, // Return 200 with error info so UI handles it gracefully
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});