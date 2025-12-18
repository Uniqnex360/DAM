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
    const {
      imageId,
      imageUrl,
      operation,
      originalName,
      options,
      resourceType,
    } = await req.json();

    if (!imageId || !imageUrl || !operation) {
      throw new Error(
        "Missing required fields: imageId, imageUrl, or operation"
      );
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
    } else if (operation === "retouch") {
      opSuffix = "enchanced";
      fileExt = "jpg";
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
    } else if (
      operation === "resize" ||
      operation === "compress" ||
      operation == "retouch"
    ) {
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
      } else if (operation === "retouch") {
        transformStr = `e_upscale`;
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const strToSign = `timestamp=${timestamp}${API_SECRET}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        "SHA-1",
        encoder.encode(strToSign)
      );
      const signature = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

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

      const processedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformStr}/v${uploadData.version}/${uploadData.public_id}`;
      console.log(`Fetching processed result: ${processedUrl}`);

      const resultRes = await fetch(processedUrl);
      if (!resultRes.ok) throw new Error("Failed to download processed image");
      resultBlob = await resultRes.blob();
    } else if (operation === "3d-model") {
      console.log(`Processing ${imageId}: Generating 3D Model...`);

      const MESHY_API_KEY = Deno.env.get("MESHY_API_KEY");
      if (!MESHY_API_KEY) throw new Error("Meshy API Key missing");

      const startRes = await fetch("https://api.meshy.ai/v2/image-to-3d", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MESHY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: imageUrl, enable_pbr: true }),
      });

      if (!startRes.ok)
        throw new Error(`Meshy Start Failed: ${await startRes.text()}`);
      const startData = await startRes.json();
      const taskId = startData.result;

      let attempts = 0;
      let modelUrl = null;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const checkRes = await fetch(
          `https://api.meshy.ai/v2/image-to-3d/${taskId}`,
          {
            headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
          }
        );
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

      const modelRes = await fetch(modelUrl);
      resultBlob = await modelRes.blob();

      fileExt = "glb";
      opSuffix = "3d";
    } else if (operation === "pdf-extract") {
      const CONVERTAPI_API_KEY = Deno.env.get("CONVERTAPI_API_KEY");
      if (!CONVERTAPI_API_KEY)
        throw new Error("CONVERTAPI_API_KEY is missing!");

      console.log(`Processing PDF extraction for ${imageId}`);
      console.log(`Original URL: ${imageUrl}`);
      console.log(`Resource Type: ${resourceType || "unknown"}`);

      let pdfResponse = null;

      if (imageUrl.includes("supabase")) {
        console.log(`Detected Supabase URL, extracting path...`);

        const pathMatch = imageUrl.match(
          /\/storage\/v1\/object\/public\/images\/(.+)$/
        );
        if (pathMatch) {
          const filePath = pathMatch[1];
          console.log(`Extracted path: ${filePath}`);

          const { data, error } = await supabaseAdmin.storage
            .from("images")
            .download(filePath);

          if (!error && data) {
            pdfResponse = new Response(data);
            console.log(`Successfully downloaded from Supabase storage`);
          } else {
            console.error(`Supabase storage error: ${error?.message}`);
          }
        }
      } else {
        try {
          pdfResponse = await fetch(imageUrl, {
            headers: {
              Accept: "application/pdf,application/octet-stream,*/*",
            },
          });

          if (!pdfResponse.ok) {
            console.log(`Direct fetch failed: ${pdfResponse.status}`);
            pdfResponse = null;
          }
        } catch (e) {
          console.error(`Fetch error: ${e.message}`);
        }
      }

      if (!pdfResponse) {
        console.log(`Trying to find storage path in database...`);

        const { data: imageRecord } = await supabaseAdmin
          .from("images")
          .select("file_path, storage_path")
          .eq("id", imageId)
          .single();

        if (imageRecord?.file_path || imageRecord?.storage_path) {
          const storagePath = imageRecord.file_path || imageRecord.storage_path;
          console.log(`Found storage path: ${storagePath}`);

          const { data, error } = await supabaseAdmin.storage
            .from("images")
            .download(storagePath);

          if (!error && data) {
            pdfResponse = new Response(data);
            console.log(
              `Successfully downloaded from Supabase storage using path from DB`
            );
          }
        }
      }

      if (!pdfResponse || !pdfResponse.ok) {
        throw new Error(
          `Failed to fetch PDF. Please ensure the PDF is accessible in Supabase storage.`
        );
      }

      if (!pdfResponse || !pdfResponse.body) {
        throw new Error("PDF response or response body is undefined");
      }

      const contentType = pdfResponse.headers.get("content-type") || "";
      console.log(`Content-Type received: ${contentType}`);

      let pdfArrayBuffer;
      try {
        pdfArrayBuffer = await pdfResponse.arrayBuffer();

        if (!pdfArrayBuffer || pdfArrayBuffer.byteLength === 0) {
          throw new Error("PDF file is empty (0 bytes)");
        }

        console.log(`PDF size: ${pdfArrayBuffer.byteLength} bytes`);
      } catch (error) {
        console.error("Error reading PDF data:", error);
        throw new Error(`Failed to read PDF data: ${error.message}`);
      }

      let pdfBase64 = "";
      const bytes = new Uint8Array(pdfArrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i += 1024) {
        const chunk = bytes.slice(i, Math.min(i + 1024, len));
        pdfBase64 += String.fromCharCode.apply(null, chunk);
      }
      pdfBase64 = btoa(pdfBase64);

      console.log("Calling ConvertAPI to extract images from PDF...");
      const apiRes = await fetch(
        `https://v2.convertapi.com/convert/pdf/to/extract-images?Secret=${CONVERTAPI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Parameters: [
              {
                Name: "File",
                FileValue: { Name: "document.pdf", Data: pdfBase64 },
              },
            ],
          }),
        }
      );

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`ConvertAPI failed: ${errText}`);
      }

      const result = await apiRes.json();
      if (!result.Files || result.Files.length === 0) {
        throw new Error("No images were extracted from the PDF");
      }

      const imageCount = result.Files.length;
      console.log(`ConvertAPI extracted ${imageCount} images from PDF`);

      const extractedImages = [];
      const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
      const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
      const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

      const authHeader = req.headers.get("Authorization");
      const token = authHeader ? authHeader.split(" ")[1] : null;
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token || "");

      const { data: originalImage } = await supabaseAdmin
        .from("images")
        .select("upload_id, user_id")
        .eq("id", imageId)
        .single();

      const uploadId = originalImage?.upload_id;
      const userId = originalImage?.user_id || user?.id;

      for (let i = 0; i < result.Files.length; i++) {
        const imageFile = result.Files[i];
        let imageBlob;

        // Get image data
        if (imageFile.Url) {
          console.log(
            `Downloading image ${i + 1}/${imageCount} from URL: ${imageFile.Url
            }`
          );
          const imageResponse = await fetch(imageFile.Url);
          if (!imageResponse.ok) {
            console.error(
              `Failed to fetch image ${i + 1}: ${imageResponse.status}`
            );
            continue;
          }
          imageBlob = await imageResponse.blob();
        } else if (imageFile.FileData) {
          console.log(`Processing image ${i + 1}/${imageCount} from FileData`);
          const base64Data = imageFile.FileData;
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let j = 0; j < byteCharacters.length; j++) {
            byteNumbers[j] = byteCharacters.charCodeAt(j);
          }
          const byteArray = new Uint8Array(byteNumbers);
          imageBlob = new Blob([byteArray], {
            type: imageFile.ContentType || "image/png",
          });
        } else {
          console.error(`Image ${i + 1} has no URL or FileData`);
          continue;
        }

        const pageNum = i + 1;
        const pageFileName = `${safeName}_extracted_page${pageNum}.png`;
        const pagePath = `processed/${pageFileName}`;

        console.log(`Uploading image ${i + 1} to Supabase: ${pagePath}`);
        const imageArrayBuffer = await imageBlob.arrayBuffer();
        const { error: uploadError } = await supabaseAdmin.storage
          .from("images")
          .upload(pagePath, imageArrayBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(
            `Error uploading image ${i + 1} to Supabase:`,
            uploadError
          );
          continue;
        }

        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from("images").getPublicUrl(pagePath);

        let cloudinaryUrl = null;
        let cloudinaryPublicId = null;

        if (CLOUD_NAME && API_KEY && API_SECRET) {
          console.log(`Uploading image ${i + 1} to Cloudinary`);
          const timestamp = Math.round(new Date().getTime() / 1000);
          const pagePublicId = `${safeName}_extracted_page${pageNum}`;
          const folder = "dam/processed";
          const strToSign = `folder=${folder}&public_id=${pagePublicId}&timestamp=${timestamp}${API_SECRET}`;
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest(
            "SHA-1",
            encoder.encode(strToSign)
          );
          const signature = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          const cloudinaryForm = new FormData();
          cloudinaryForm.append("file", imageBlob);
          cloudinaryForm.append("api_key", API_KEY);
          cloudinaryForm.append("timestamp", timestamp.toString());
          cloudinaryForm.append("signature", signature);
          cloudinaryForm.append("folder", folder);
          cloudinaryForm.append("public_id", pagePublicId);

          try {
            const cloudRes = await fetch(
              `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
              { method: "POST", body: cloudinaryForm }
            );
            const cloudData = await cloudRes.json();
            if (!cloudData.error) {
              cloudinaryUrl = cloudData.secure_url;
              cloudinaryPublicId = cloudData.public_id;
            } else {
              console.error(
                `Cloudinary error for image ${i + 1}:`,
                cloudData.error
              );
            }
          } catch (error) {
            console.error(
              `Error uploading image ${i + 1} to Cloudinary:`,
              error
            );
          }
        }

        if (i === 0) {
          await supabaseAdmin
            .from("images")
            .update({
              processed_url: cloudinaryUrl || publicUrl,
              cloudinary_public_id: cloudinaryPublicId,
              processing_status: "completed",
              operations_applied: [operation],
              resource_type: "image",
            })
            .eq("id", imageId);

          extractedImages.push({
            id: imageId,
            url: cloudinaryUrl || publicUrl,
            page: pageNum,
          });
        } else {
          try {
            const { data: newImage, error: insertError } = await supabaseAdmin
              .from("images")
              .insert({
                user_id: userId,
                upload_id: uploadId,
                url: publicUrl,
                processed_url: cloudinaryUrl || publicUrl,
                cloudinary_public_id: cloudinaryPublicId,
                processing_status: "completed",
                operations_applied: [operation],
                resource_type: "image",
                name: `${originalName || "document"} - Page ${pageNum}`,
                parent_id: imageId, // Reference to the original PDF image
              })
              .select()
              .single();

            if (insertError) {
              console.error(
                `Error creating record for image ${i + 1}:`,
                insertError
              );
            } else if (newImage) {
              extractedImages.push({
                id: newImage.id,
                url: cloudinaryUrl || publicUrl,
                page: pageNum,
              });
            }
          } catch (dbError) {
            console.error(`Database error for image ${i + 1}:`, dbError);
          }
        }
      }

      // Return all extracted images
      return new Response(
        JSON.stringify({
          success: true,
          images: extractedImages,
          totalImages: extractedImages.length,
          originalId: imageId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (operation === 'recolor') {
      const CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME')
      const API_KEY = Deno.env.get('CLOUDINARY_API_KEY')
      const API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')
      if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
        throw new Error("Cloudinary keys are missing for recoloring!")
      }
      const fromColor = options?.fromColor || "#000000"
      const toColor = options?.toColor || "#ff0000"
      const tolerance = options?.tolerance || 20
      const fromColorHex = fromColor.replace('#', "").toLowerCase()
      const toColorHex = toColor.replace("#", "").toLowerCase()
      const transformStr = `e_replace_color:${toColorHex}:${tolerance}:${fromColorHex}`;
      const timestamp = Math.round(new Date().getTime() / 1000)
      const strToSign = `timestamp=${timestamp}&transformation=${transformStr}${API_SECRET}`;
      const encoder = new TextEncoder()
      const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(strToSign))
      const signature = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join("")
      let fileToUpload
      if(imageUrl.startsWith('blob:'))
      {
        const imageResponse=await fetch(imageUrl)
        if(!imageResponse.ok)
        {
          throw new Error(`Failed to fetch blob image :${imageResponse.status}`)
        }
        const imageBlob=await imageResponse.blob()
        const ext=originalName?.split('.').pop()?.toLowerCase()||'png'
        const mimeType=ext==='jpg'||ext==='jpeg'?'image/jpeg':'image/png'
        fileToUpload = new File([imageBlob], `image.${ext}`, { type: mimeType });
      }
      else
      {
        fileToUpload=imageUrl
      }
      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('api_key', API_KEY)
      formData.append('timestamp', timestamp.toString())
      formData.append('signature', signature)
      formData.append('transformation', transformStr);
      
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Cloudinary upload failed: ${uploadRes.status} - ${errorText}`);}
      const uploadData = await uploadRes.json()
      if (uploadData.error) {
      throw new Error(uploadData.error.message || "Cloudinary processing failed");}
      const processedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformStr}/v${uploadData.version}/${uploadData.public_id}`;
      const resultRes = await fetch(processedUrl)
      if (!resultRes.ok) {
        console.error(`Recoloring failed for ${resultRes.status} ${resultRes.statusText}`)
        throw new Error("Failed to apply color")
      }
      resultBlob = await resultRes.blob()
      opSuffix = 'recolored'
      fileExt = 'png'

    }
    else {
      throw new Error(`Operation ${operation} not supported!`);
    }

    const filePath = `processed/${finalFileName}`;
    const arrayBuffer = await resultBlob.arrayBuffer();

    const contentType = fileExt === "jpg" ? "image/jpeg" : "image/png";

    const { error: uploadError } = await supabaseAdmin.storage
      .from("images")
      .upload(filePath, arrayBuffer, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl: sbPublicUrl },
    } = supabaseAdmin.storage.from("images").getPublicUrl(filePath);

    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

    if (CLOUD_NAME && API_KEY && API_SECRET) {
      console.log(`Uploading final result to Cloudinary as: ${finalPublicId}`);
      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = "dam/processed";

      const strToSign = `folder=${folder}&public_id=${finalPublicId}&timestamp=${timestamp}${API_SECRET}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        "SHA-1",
        encoder.encode(strToSign)
      );
      const signature = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

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
