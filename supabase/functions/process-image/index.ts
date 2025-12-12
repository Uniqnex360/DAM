// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers":
//     "authorization, x-client-info, apikey, content-type",
// };
// serve(async (req) => {
//   if (req.method === "OPTIONS") {
//     return new Response("ok", { headers: corsHeaders });
//   }
//   try {
//     const { imageId, imageUrl, operation, originalName, options } =
//       await req.json();
//     if (!imageId || !imageUrl || !operation) {
//       throw new Error("Missing required fields:imageId,imageUrl, or operation");
//     }
//     const baseName = originalName
//       ? originalName.replace(/\.[^/.]+$/, "")
//       : `image_${imageId}`;
//     const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");
//     let opSuffix = "";
//     let fileExt = "png";
//     if (operation === "bg-remove" || operation === "remove-bg") {
//       opSuffix = "no-bg"
//       fileExt = "png"; 
//     } else if (operation === "resize") {
//       opSuffix = "resized";
//       fileExt = "jpg";
//     } else if (operation==='compress')
//     {
//       opSuffix='compress'
//       fileExt = "jpg";
//     }
//     else {
//       opSuffix = operation;
//     }
//     let finalCloudinaryUrl = null;
//     let finalCloudinaryPublicId = null;
//     const finalPublicId = `${safeName}_${opSuffix}`;
//     const finalFileName = `${finalPublicId}.${fileExt}`;
//     const supabaseAdmin = createClient(
//       Deno.env.get("SUPABASE_URL") ?? "",
//       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
//     );
//     let resultBlob: Blob;
//     if (operation === "bg-remove") {
//       const REMOVE_BG_API_KEY = Deno.env.get("REMOVE_BG_API_KEY");
//       if (!REMOVE_BG_API_KEY) throw new Error("Remove  BG API KEY missing!");
//       console.log(`Processing ${imageId} with remove bg....`);
//       const formData = new FormData();
//       formData.append("image_url", imageUrl);
//       formData.append("size", "auto");
//       const apiRes = await fetch("https://api.remove.bg/v1.0/removebg", {
//         method: "POST",
//         headers: { "X-Api-Key": REMOVE_BG_API_KEY },
//         body: formData,
//       });
//       if (!apiRes.ok) {
//         const errText = await apiRes.text();
//         throw new Error(`Remove BG API failed: ${errText}`);
//       }
//       resultBlob = await apiRes.blob();
//     } else if (operation === "resize") {
//       console.log(`Processing ${imageId}: Resizing...`);
//       const width = options?.width || 1920;
//       const height = options?.height || 1080;
//       // 1. We upload to Cloudinary FIRST to let them handle the resizing engine
//       const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
//       const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
//       const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

//       if (!CLOUD_NAME || !API_KEY || !API_SECRET)
//         throw new Error("Cloudinary keys missing for resizing");

//       const timestamp = Math.round(new Date().getTime() / 1000);
//       const transformation = `w_${width},h_${height},c_scale`;
//       const strToSign = `timestamp=${timestamp}&transformation=${transformation}${API_SECRET}`;

//       const encoder = new TextEncoder();
//       const data = encoder.encode(strToSign);
//       const hashBuffer = await crypto.subtle.digest("SHA-1", data);
//       const hashArray = Array.from(new Uint8Array(hashBuffer));
//       const signature = hashArray
//         .map((b) => b.toString(16).padStart(2, "0"))
//         .join("");

//       const formData = new FormData();
//       formData.append("file", imageUrl); // Cloudinary can fetch from URL
//       formData.append("api_key", API_KEY);
//       formData.append("timestamp", timestamp.toString());
//       formData.append("signature", signature);
//       formData.append("transformation", transformation);
//       // TRANSFORM ON UPLOAD: Limit width to 1920px (Standard Web HD)

//       const cloudRes = await fetch(
//         `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
//         {
//           method: "POST",
//           body: formData,
//         }
//       );

//       const cloudData = await cloudRes.json();
//       if (cloudData.error)
//         throw new Error(`Resize failed: ${cloudData.error.message}`);

//       // 2. Download the result so we can save it to Supabase
//       const resultRes = await fetch(cloudData.secure_url);
//       resultBlob = await resultRes.blob();
//       finalCloudinaryUrl = cloudData.secure_url;
//       finalCloudinaryPublicId = cloudData.public_id;
//     }
//     else if (operation === 'compress') {
//       // --- COMPRESSION LOGIC ---
//       console.log(`Processing ${imageId}: Compressing to ${options?.quality}%...`);

//       const CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME');
//       const API_KEY = Deno.env.get('CLOUDINARY_API_KEY');
//       const API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET');

//       if (!CLOUD_NAME || !API_KEY || !API_SECRET) throw new Error('Cloudinary keys missing');

//       const quality = options?.quality || 80;
//       const timestamp = Math.round((new Date()).getTime() / 1000);
      
//       // Cloudinary Transformation: q_{quality}
//       // We also use c_limit with original width to ensure we don't upscale, just compress
//       const transformation = `q_${quality},f_jpg`; 
      
//       const strToSign = `timestamp=${timestamp}&transformation=${transformation}${API_SECRET}`;
      
//       const encoder = new TextEncoder();
//       const data = encoder.encode(strToSign);
//       const hashBuffer = await crypto.subtle.digest('SHA-1', data);
//       const hashArray = Array.from(new Uint8Array(hashBuffer));
//       const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

//       const formData = new FormData();
//       formData.append('file', imageUrl);
//       formData.append('api_key', API_KEY);
//       formData.append('timestamp', timestamp.toString());
//       formData.append('signature', signature);
//       formData.append('transformation', transformation);

//       const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
//         method: 'POST',
//         body: formData
//       });

//       const cloudData = await cloudRes.json();
//       if (cloudData.error) throw new Error(`Compression failed: ${cloudData.error.message}`);

//       // Download result
//       const resultRes = await fetch(cloudData.secure_url);
//       resultBlob = await resultRes.blob();

//       finalCloudinaryUrl = cloudData.secure_url;
//       finalCloudinaryPublicId = cloudData.public_id;
//     } 
//      else {
//       throw new Error(`Operation ${operation} not supported!`);
//     }
//     const filePath = `processed/${finalFileName}`;
//     const arrayBuffer = await resultBlob.arrayBuffer();
//     const { error: uploadError } = await supabaseAdmin.storage
//       .from("images")
//       .upload(filePath, arrayBuffer, {
//         contentType: "image/png",
//         upsert: true,
//       });
//     if (uploadError) throw uploadError;
//     const {
//       data: { publicUrl: sbPublicUrl },
//     } = supabaseAdmin.storage.from("images").getPublicUrl(filePath);
//     const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
//     const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
//     const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

//     if (CLOUD_NAME && API_KEY && API_SECRET) {
//       console.log(`Uploading to Cloudinary as :${finalPublicId}`);
//       const timestamp = Math.round(new Date().getTime() / 1000);
//       const folder = "dam/processed";
//       const strToSign = `folder=${folder}&public_id=${finalPublicId}&timestamp=${timestamp}${API_SECRET}`;
//       const encoder = new TextEncoder();
//       const data = encoder.encode(strToSign);
//       const hashBuffer = await crypto.subtle.digest("SHA-1", data);
//       const hashArray = Array.from(new Uint8Array(hashBuffer));
//       const signature = hashArray
//         .map((b) => b.toString(16).padStart(2, "0"))
//         .join("");
//       const cloudinaryForm = new FormData();
//       cloudinaryForm.append("file", resultBlob);
//       cloudinaryForm.append("api_key", API_KEY);
//       cloudinaryForm.append("timestamp", timestamp.toString());
//       cloudinaryForm.append("signature", signature);
//       cloudinaryForm.append("folder", folder);
//       cloudinaryForm.append("public_id", finalPublicId);
//       const cloudRes = await fetch(
//         `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
//         { method: "POST", body: cloudinaryForm }
//       );
//       const cloudData = await cloudRes.json();
//       if (cloudData.error) {
//         console.error("Cloudinary upload error:", cloudData.error);
//       } else {
//         finalCloudinaryUrl = cloudData.secure_url;
//         finalCloudinaryPublicId = cloudData.public_id;
//       }
//     }
//     const finalUrl = finalCloudinaryUrl || sbPublicUrl;
//     await supabaseAdmin
//       .from("images")
//       .update({
//         processed_url: finalUrl,
//         cloudinary_public_id: finalCloudinaryPublicId,
//         processing_status: "completed",
//         operations_applied: [operation],
//       })
//       .eq("id", imageId);
//     return new Response(
//       JSON.stringify({ success: true, url: finalUrl, name: finalFileName }),
//       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
//     );
//   } catch (error: any) {
//     console.error("Edge function error", error);
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }
// });
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageId, imageUrl, operation, originalName, options } =
      await req.json();

    if (!imageId || !imageUrl || !operation) {
      throw new Error("Missing required fields: imageId, imageUrl, or operation");
    }

    const baseName = originalName
      ? originalName.replace(/\.[^/.]+$/, "")
      : `image_${imageId}`;
    const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");
    
    let opSuffix = operation;
    let fileExt = "png"; 

    if (operation === "bg-remove" || operation === "remove-bg") {
      opSuffix = "no-bg";
      fileExt = "png"; 
    } else if (operation === "resize") {
      opSuffix = "resized";
      fileExt = "png"; 
    } else if (operation === "compress") {
      opSuffix = "compressed";
      fileExt = "jpg"; 
    }
    else if(operation==='retouch')
    {
      opSuffix='enchanced'
      fileExt='jpg'
    }

    const finalPublicId = `${safeName}_${opSuffix}`;
    const finalFileName = `${finalPublicId}.${fileExt}`;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let resultBlob: Blob;
    let finalCloudinaryUrl = null;
    let finalCloudinaryPublicId = null;

    if (operation === "bg-remove" || operation === "remove-bg") {
      const REMOVE_BG_API_KEY = Deno.env.get("REMOVE_BG_API_KEY");
      if (!REMOVE_BG_API_KEY) throw new Error("Remove BG API KEY missing!");
      
      console.log(`Processing ${imageId}: Removing background...`);
      
      const formData = new FormData();
      formData.append("image_url", imageUrl);
      formData.append("size", "auto");
      
      const apiRes = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": REMOVE_BG_API_KEY },
        body: formData,
      });
      
      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`Remove BG API failed: ${errText}`);
      }
      resultBlob = await apiRes.blob();

    } else if (operation === "resize" || operation === "compress" || operation=='retouch') {
      console.log(`Processing ${imageId}: ${operation}...`);

      const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
      const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
      const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

      if (!CLOUD_NAME || !API_KEY || !API_SECRET)
        throw new Error("Cloudinary keys missing");

      let transformStr = "";
      if (operation === "resize") {
        const width = options?.width || 1920;
        const height = options?.height || 1080;
        transformStr = `w_${width},h_${height},c_scale`;
      } else if (operation === "compress") {
        const quality = options?.quality || 80;
        transformStr = `q_${quality},f_jpg`; 
      }
      else if (operation === "retouch") {
        transformStr = `e_upscale`; 
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const strToSign = `timestamp=${timestamp}${API_SECRET}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(strToSign));
      const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const formData = new FormData();
      formData.append("file", imageUrl);
      formData.append("api_key", API_KEY);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      const uploadData = await uploadRes.json();
      if (uploadData.error) throw new Error(uploadData.error.message);

      // C. Manually Construct URL to fetch the processed version
      const processedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformStr}/v${uploadData.version}/${uploadData.public_id}`;
      console.log(`Fetching processed result: ${processedUrl}`);

      // D. Download the Processed Blob
      const resultRes = await fetch(processedUrl);
      if (!resultRes.ok) throw new Error("Failed to download processed image");
      resultBlob = await resultRes.blob();

    }else if (operation === "3d-model") {
      console.log(`Processing ${imageId}: Generating 3D Model...`);
      
      const MESHY_API_KEY = Deno.env.get("MESHY_API_KEY");
      if (!MESHY_API_KEY) throw new Error("Meshy API Key missing");

      // 1. Start Task
      const startRes = await fetch("https://api.meshy.ai/v2/image-to-3d", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${MESHY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image_url: imageUrl, enable_pbr: true }),
      });

      if (!startRes.ok) throw new Error(`Meshy Start Failed: ${await startRes.text()}`);
      const startData = await startRes.json();
      const taskId = startData.result;

      // 2. Poll for Completion (Max 60s)
      let attempts = 0;
      let modelUrl = null;
      while (attempts < 30) { 
        await new Promise(r => setTimeout(r, 2000));
        const checkRes = await fetch(`https://api.meshy.ai/v2/image-to-3d/${taskId}`, {
          headers: { "Authorization": `Bearer ${MESHY_API_KEY}` }
        });
        const checkData = await checkRes.json();
        if (checkData.status === "SUCCEEDED") {
          modelUrl = checkData.model_urls.glb;
          break;
        } else if (checkData.status === "FAILED") {
          throw new Error(`Meshy Failed: ${checkData.task_error?.message}`);
        }
        attempts++;
      }
      if (!modelUrl) throw new Error("3D Generation Timed Out");

      // 3. Download Result
      const modelRes = await fetch(modelUrl);
      resultBlob = await modelRes.blob();
      
      fileExt = "glb";
      opSuffix = "3d";
     } else {
      throw new Error(`Operation ${operation} not supported!`);
    }

    // --- 4. UPLOAD TO SUPABASE (Backup) ---
    const filePath = `processed/${finalFileName}`;
    const arrayBuffer = await resultBlob.arrayBuffer();
    
    // Dynamic Content Type
    const contentType = fileExt === 'jpg' ? "image/jpeg" : "image/png";

    const { error: uploadError } = await supabaseAdmin.storage
      .from("images")
      .upload(filePath, arrayBuffer, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;
    
    const { data: { publicUrl: sbPublicUrl } } = supabaseAdmin.storage
      .from("images")
      .getPublicUrl(filePath);


    // --- 5. UPLOAD TO CLOUDINARY (Final Storage) ---
    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

    if (CLOUD_NAME && API_KEY && API_SECRET) {
      console.log(`Uploading final result to Cloudinary as: ${finalPublicId}`);
      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = "dam/processed";
      
      const strToSign = `folder=${folder}&public_id=${finalPublicId}&timestamp=${timestamp}${API_SECRET}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(strToSign));
      const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const cloudinaryForm = new FormData();
      cloudinaryForm.append("file", resultBlob); // Processed Blob
      cloudinaryForm.append("api_key", API_KEY);
      cloudinaryForm.append("timestamp", timestamp.toString());
      cloudinaryForm.append("signature", signature);
      cloudinaryForm.append("folder", folder);
      cloudinaryForm.append("public_id", finalPublicId);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: cloudinaryForm }
      );
      const cloudData = await cloudRes.json();
      if (cloudData.error) {
        console.error("Cloudinary upload error:", cloudData.error);
      } else {
        finalCloudinaryUrl = cloudData.secure_url;
        finalCloudinaryPublicId = cloudData.public_id;
      }
    }

    // --- 6. UPDATE DB ---
    const finalUrl = finalCloudinaryUrl || sbPublicUrl;
    
    await supabaseAdmin
      .from("images")
      .update({
        processed_url: finalUrl,
        cloudinary_public_id: finalCloudinaryPublicId,
        processing_status: "completed",
        operations_applied: [operation],
      })
      .eq("id", imageId);

    return new Response(
      JSON.stringify({ success: true, url: finalUrl, name: finalFileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Edge function error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});