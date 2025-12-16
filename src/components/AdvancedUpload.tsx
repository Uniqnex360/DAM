import { useState, useCallback } from "react";
import {
  Upload,
  Link,
  FileText,
  Cloud,
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  Wand2,
  Crop,
  Ruler,
} from "lucide-react";
import { api } from "../services/api";
import { ImageCropModal } from "./ImageCropModal";
import { supabase } from "../lib/supabase";
import { MeasurementModal } from "./MeasurementModal";
interface ImageItem {
  id: string;
  url: string;
  name: string;
  file?: File;
  preview?: string;
  isProcessed?: boolean;
  isAutoFixed?: boolean;
  processedOperations?: string[];
  failedOperations?: string[];
  autoFixOperations?: string[];
  processingStatus?: "pending" | "success" | "partial_failure" | "failed";
  autoFixStatus?: "pending" | "success" | "partial_failure" | "failed";
  cloudinaryUrl?: string;
}
type UploadSource = "files" | "urls" | "csv" | "product-page" | "cloud";
const PROCESSING_OPTIONS = [
  {
    id: "resize",
    label: "Image Resizing",
    description: "Resize to specific dimensions",
  },
  {
    id: "bg-remove",
    label: "Background Removal",
    description: "Remove background automatically",
  },
  {
    id: "retouch",
    label: "Image Retouch / Enhancer",
    description: "Enhance image quality",
  },
  {
    id: "crop",
    label: "Image Cropping / Reframing",
    description: "Smart cropping",
  },
  {
    id: "compress",
    label: "Image Compression & Optimization",
    description: "Optimize file size",
  },
  {
    id: "lifestyle",
    label: "Lifestyle Image Creation",
    description: "Create lifestyle scenes",
  },
  {
    id: "infographic",
    label: "Infographic Creation",
    description: "Generate infographics",
  },
  {
    id: "line-diagram",
    label: "Line Diagram",
    description: "Technical line drawings",
  },
  {
    id: "swatch",
    label: "Material Swatch Creation",
    description: "Generate material swatches",
  },
  {
    id: "color-analysis",
    label: "Color Analysis",
    description: "Analyze colors",
  },
  { id: "3d-model", label: "3D Modeling", description: "Generate 3D models" },
  {
    id: "360-spin",
    label: "360° Product Spin Video",
    description: "Turntable videos",
  },
  {
    id: "recolor",
    label: "Image Re-coloring",
    description: "Change product colors",
  },
  {
    id: "configurator",
    label: "3D Product Configurator",
    description: "Create configurator",
  },
  {
    id: "pdf-extract",
    label: "Image Extraction from PDF",
    description: "Extract from PDFs",
  },
];
export function AdvancedUpload() {
  const [uploadSource, setUploadSource] = useState<UploadSource>("files");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMeasurementTool, setShowMeasurementTool] = useState(false);
  const [measurementImage, setMeasurementImage] = useState<ImageItem | null>(
    null
  );
  const [lineDiagramResults, setLineDiagramResults] = useState<any[]>([]);
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [autoDetect, setAutoDetect] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [compressionQuality, setCompressionQuality] = useState(80);
  const [selectedProcessing, setSelectedProcessing] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [resizeDims, setResizeDims] = useState({ width: 1920, height: 1080 });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixResults, setAutoFixResults] = useState<any[]>([]);
  const [autoFixError, setAutoFixError] = useState<string | null>(null);
  const [productPageUrl, setProductPageUrl] = useState("");
  const [isGeneratingInfographic, setIsGeneratingInfographic] = useState(false);
  const [isAnalyzingForInfographic, setIsAnalyzingForInfographic] =
    useState(false);
  const [cloudProvider, setCloudProvider] = useState<
    "dropbox" | "google-drive"
  >("dropbox");
  const [cloudPath, setCloudPath] = useState("");
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) =>
        file.type.startsWith("image/") ||
        file.type === "text/csv" ||
        file.name.endsWith(".xlsx")
    );
    if (
      droppedFiles.some(
        (f) => f.type === "text/csv" || f.name.endsWith(".xlsx")
      )
    ) {
      setCsvFile(droppedFiles[0]);
      setUploadSource("csv");
      parseCsvFile(droppedFiles[0]);
    } else {
      handleFileSelect(droppedFiles);
    }
  }, []);
  const handleFileSelect = (files: File[]) => {
    const newImages = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      url: URL.createObjectURL(file),
      name: file.name,
      preview: URL.createObjectURL(file),
      file: file,
    }));
    setImages((prev) => [...prev, ...newImages]);
  };
  const urlToFile = async (url: string, filename: string): Promise<File> => {
    try {
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type });
    } catch (e) {
      console.warn("Could not convert URL to File (CORS restriction):", url);
      throw e;
    }
  };
  const handleLineDiagramClick = (image: ImageItem) => {
    setMeasurementImage(image);
    setShowMeasurementTool(true);
  };
  const handleMeasurementSave = (
    measurements: any[],
    annotatedImageUrl: string
  ) => {
    if (measurementImage) {
      setLineDiagramResults((prev) => {
        const existingIndex = prev.findIndex(
          (r) => r.imageId === measurementImage.id
        );

        if (existingIndex >= 0) {
          // Update existing entry
          const updated = [...prev];
          updated[existingIndex] = {
            imageId: measurementImage.id,
            imageName: measurementImage.name,
            measurements,
            annotatedImageUrl,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              imageId: measurementImage.id,
              imageName: measurementImage.name,
              measurements,
              annotatedImageUrl,
            },
          ];
        }
      });
    }
    setShowMeasurementTool(false);
    setMeasurementImage(null);
  };
  const runAutoDetection = async () => {
    const itemToAnalyze = images.find((img) => img.file);
    if (!itemToAnalyze || !itemToAnalyze.file) return;
    setIsAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.readAsDataURL(itemToAnalyze.file!);
        r.onload = () => resolve(r.result as string);
      });
      const img = new Image();
      await new Promise((r) => {
        img.onload = r;
        img.src = URL.createObjectURL(itemToAnalyze.file!);
      });
      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: {
          imageBase64: base64,
          fileName: itemToAnalyze.name,
          fileSize: itemToAnalyze.file!.size,
          width: img.width,
          height: img.height,
        },
      });
      if (error || !data.analysis) throw error;
      const analysis = data.analysis;
      console.log("Full AI Analysis:", analysis);
      setCurrentAnalysis(analysis);
      const newOps = new Set<string>();
      if (analysis.suggestions.backgroundRemoval) newOps.add("bg-remove");
      if (analysis.suggestions.upscaling || analysis.qualityScore < 80)
        newOps.add("retouch");
      if (analysis.suggestions.compression) {
        newOps.add("compress");
        setCompressionQuality(80);
      }
      if (analysis.suggestions.cropping) newOps.add("crop");
      setSelectedProcessing(Array.from(newOps));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleCropSave = (newFile: File) => {
    if (!editingImage) return;
    const newUrl = URL.createObjectURL(newFile);
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === editingImage.id) {
          return {
            ...img,
            url: newUrl,
            preview: newUrl,
            file: newFile,
            name: newFile.name,
          };
        }
        return img;
      })
    );
    setEditingImage(null);
  };
  const handleUrlsAdd = async () => {
    const urls = urlInput.split("\n").filter((u) => u.trim());
    const tempIds = urls.map((_, i) => `url-${Date.now()}-${i}`);
    const placeholders = urls.map((url, idx) => ({
      id: tempIds[idx],
      url: url.trim(),
      name: `Image ${idx + 1}`,
      preview: url.trim(),
      file: undefined,
    }));
    setImages((prev) => [...prev, ...placeholders]);
    setUrlInput("");
    placeholders.forEach(async (item) => {
      try {
        console.log("Proxying:", item.url);
        const file = await api.proxyUrlToFile(item.url, item.name + ".jpg");
        const localPreview = URL.createObjectURL(file);
        setImages((currentImages) =>
          currentImages.map((img) =>
            img.id === item.id
              ? { ...img, file: file, preview: localPreview, url: localPreview }
              : img
          )
        );
      } catch (e) {
        console.error("Could not fetch URL for cropping:", e);
      }
    });
  };
  const parseCsvFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").slice(1);
    const urls = lines
      .map((line) => {
        const cols = line.split(",");
        return cols[0]?.trim();
      })
      .filter(Boolean);
    const newImages = urls.map((url, idx) => ({
      id: `csv-${Date.now()}-${idx}`,
      url,
      name: `CSV Image ${idx + 1}`,
    }));
    setImages((prev) => [...prev, ...newImages]);
  };
  const toggleProcessing = (processingId: string) => {
    setSelectedProcessing((prev) =>
      prev.includes(processingId)
        ? prev.filter((p) => p !== processingId)
        : [...prev, processingId]
    );
  };
  const handleUpload = async () => {
    if (images.length === 0 && uploadSource === "files") return;
    setUploading(true);
    setError("");
    setUploadResult(null);

    try {
      let result;
      const isOnlyLineDiagram = 
      selectedProcessing.length === 1 && 
      selectedProcessing.includes("line-diagram") &&
      lineDiagramResults.length > 0;

    if (isOnlyLineDiagram) {
      // Upload only the annotated images
      console.log("Uploading annotated images only...");
      
      const annotatedFiles = await Promise.all(
        lineDiagramResults.map(async (diagramResult) => {
          if (diagramResult.annotatedImageUrl) {
            const response = await fetch(diagramResult.annotatedImageUrl);
            const blob = await response.blob();
            return new File(
              [blob],
              `${diagramResult.imageName.replace(/\.[^/.]+$/, "")}_annotated.png`,
              { type: "image/png" }
            );
          }
          return null;
        })
      );

      const validFiles = annotatedFiles.filter((f): f is File => f !== null);
      
      if (validFiles.length > 0) {
        result = await api.uploadImages(validFiles);
        
        // Add measurement data to each uploaded image
        if (result?.images) {
          result.images = result.images.map((img: any, index: number) => ({
            ...img,
            hasLineDiagram: true,
            measurements: lineDiagramResults[index]?.measurements || [],
            measurementCount: lineDiagramResults[index]?.measurements?.length || 0,
          }));
          
          result.lineDiagramSummary = {
            totalProcessed: result.images.length,
            images: result.images.map((img: any) => ({
              id: img.id,
              originalUrl: img.url,
              annotatedUrl: img.cloudinaryUrl || img.url,
              measurementCount: img.measurementCount,
              measurements: img.measurements,
            })),
          };
        }
      }
    }
    else
      { 
      switch (uploadSource) {
        case "files": {
          const files = await Promise.all(
            images.map(async (img) => {
              if (img.file) return img.file;
              if (img.preview) {
                const response = await fetch(img.url);
                const blob = await response.blob();
                return new File([blob], img.name, { type: blob.type });
              }
              return null;
            })
          );
          const validFiles = files.filter((f): f is File => f !== null);
          result = await api.uploadImages(validFiles);
          break;
        }
        case "urls": {
          const filesToUpload: File[] = [];
          const urlsToUpload: string[] = [];

          await Promise.all(
            images.map(async (img) => {
              if (img.file) {
                filesToUpload.push(img.file);
                return;
              }
              if (img.url.startsWith("blob:")) {
                try {
                  const res = await fetch(img.url);
                  const blob = await res.blob();
                  const file = new File([blob], img.name, { type: blob.type });
                  filesToUpload.push(file);
                } catch (e) {
                  console.error("Failed to convert blob to file", e);
                }
                return;
              }
              urlsToUpload.push(img.url);
            })
          );

          let fileResults = { images: [], uploadId: null };
          let urlResults = { images: [], uploadId: null };

          if (filesToUpload.length > 0) {
            fileResults = await api.uploadImages(filesToUpload);
          }

          if (urlsToUpload.length > 0) {
            urlResults = await api.uploadFromUrls(urlsToUpload);
          }

          result = {
            uploadId: fileResults.uploadId || urlResults.uploadId,
            images: [
              ...(fileResults.images || []),
              ...(urlResults.images || []),
            ],
          };
          break;
        }
        case "product-page": {
          result = await api.uploadFromProductPage(productPageUrl);
          break;
        }
        case "cloud": {
          result = await api.uploadFromCloudStorage(cloudProvider, cloudPath);
          break;
        }
        default:
          throw new Error("Invalid upload source");
      }
    }
      const activeOperations: (
        | "bg-remove"
        | "resize"
        | "compress"
        | "3d-model"
        | "retouch"
      )[] = [];

      if (!autoDetect) {
        if (selectedProcessing.includes("retouch"))
          activeOperations.push("retouch");
        if (selectedProcessing.includes("bg-remove"))
          activeOperations.push("bg-remove");
        if (selectedProcessing.includes("resize"))
          activeOperations.push("resize");
        if (selectedProcessing.includes("compress"))
          activeOperations.push("compress");
        if (selectedProcessing.includes("3d-model"))
          activeOperations.push("3d-model");
      }

      if (activeOperations.length > 0 && result?.images) {
        try {
          console.log(`Initiating processes: ${activeOperations.join(", ")}`);
          await Promise.all(
            result.images.map(async (uploadedImage: any, index: number) => {
              let currentSourceUrl =
                uploadedImage.cloudinaryUrl || uploadedImage.url;
              let originalName = uploadedImage.id;

              if (uploadSource === "files") {
                if (images[index]) originalName = images[index].name;
              } else if (uploadSource === "urls") {
                const parts = images[index]?.url.split("/");
                const lastPart = parts[parts.length - 1];
                if (lastPart) originalName = lastPart;
              }

              // Track processed operations
              const processedOps: string[] = [];
              const failedOps: string[] = [];

              for (const op of activeOperations) {
                console.log(`Running ${op} on ${originalName}...`);
                let options = {};
                if (op === "resize") options = resizeDims;
                if (op === "compress")
                  options = { quality: compressionQuality };
                try {
                  const response = await api.processImageAI(
                    uploadedImage.id,
                    currentSourceUrl,
                    op,
                    originalName,
                    options
                  );

                  if (response && response.url) {
                    currentSourceUrl = response.url;
                    processedOps.push(op);
                  } else {
                    throw new Error(`No output URL from ${op}`);
                  }
                } catch (error: any) {
                  console.error(
                    ` Operation "${op}" FAILED on ${originalName}:`,
                    error.message
                  );
                  failedOps.push(op);
                }
              }

              // Update the image URL with the final processed result
              if (failedOps.length === 0 && processedOps.length > 0) {
                uploadedImage.cloudinaryUrl = currentSourceUrl;
                uploadedImage.url = currentSourceUrl;
                uploadedImage.isProcessed = true;
                uploadedImage.processedOperations = processedOps;
                uploadedImage.processingStatus = "success";
              } else {
                uploadedImage.isProcessed = false;
                uploadedImage.processingStatus =
                  failedOps.length === activeOperations.length
                    ? "failed"
                    : "partial_failure";
                uploadedImage.processedOperations = processedOps;
                uploadedImage.failedOperations = failedOps;
                setError((prev) =>
                  prev
                    ? `${prev}\n${originalName}: ${failedOps.join(", ")}`
                    : `${originalName}: ${failedOps.join(", ")}`
                );
              }
            })
          );
          console.log("All AI tasks finished.");
        } catch (processError: any) {
          console.error("AI Processing failed", processError);
        }
      }

      // ========== LINE DIAGRAM PROCESSING ==========
      if (selectedProcessing.includes("line-diagram") && result?.images) {
        try {
          console.log("Processing line diagrams...");

          await Promise.all(
            result.images.map(async (uploadedImage: any, index: number) => {
              const originalImage = images[index];
              if (!originalImage) return;

              // Check if this image has measurements saved
              const diagramResult = lineDiagramResults.find(
                (r) => r.imageId === originalImage.id
              );

              if (diagramResult && diagramResult.annotatedImageUrl) {
                console.log(
                  `Uploading annotated image for: ${originalImage.name}`
                );

                try {
                  // Convert the annotated image data URL to a File
                  const response = await fetch(diagramResult.annotatedImageUrl);
                  const blob = await response.blob();
                  const annotatedFile = new File(
                    [blob],
                    `${originalImage.name.replace(
                      /\.[^/.]+$/,
                      ""
                    )}_annotated.png`,
                    { type: "image/png" }
                  );

                  // Upload the annotated image
                  const annotatedUploadResult = await api.uploadImages([
                    annotatedFile,
                  ]);

                  if (annotatedUploadResult?.images?.[0]) {
                    // Store the annotated image URL in the result
                    uploadedImage.annotatedImageUrl =
                      annotatedUploadResult.images[0].cloudinaryUrl ||
                      annotatedUploadResult.images[0].url;
                    uploadedImage.hasLineDiagram = true;
                    uploadedImage.measurements = diagramResult.measurements;

                    console.log(
                      `Annotated image uploaded: ${uploadedImage.annotatedImageUrl}`
                    );
                  }
                } catch (annotatedError: any) {
                  console.error(
                    `Failed to upload annotated image for ${originalImage.name}:`,
                    annotatedError
                  );
                  // Still include the local annotated image URL as fallback
                  uploadedImage.annotatedImageUrl =
                    diagramResult.annotatedImageUrl;
                  uploadedImage.hasLineDiagram = true;
                  uploadedImage.measurements = diagramResult.measurements;
                }
              }
            })
          );

          // Add line diagram summary to result
          const imagesWithDiagrams = result.images.filter(
            (img: any) => img.hasLineDiagram
          );
          if (imagesWithDiagrams.length > 0) {
            result.lineDiagramSummary = {
              totalProcessed: imagesWithDiagrams.length,
              images: imagesWithDiagrams.map((img: any) => ({
                id: img.id,
                originalUrl: img.url,
                annotatedUrl: img.annotatedImageUrl,
                measurementCount: img.measurements?.length || 0,
                measurements: img.measurements,
              })),
            };
          }

          console.log("Line diagram processing complete.");
        } catch (lineDiagramError: any) {
          console.error("Line diagram processing failed:", lineDiagramError);
          setError((prev) =>
            prev
              ? `${prev}\nLine diagram: ${lineDiagramError.message}`
              : `Line diagram: ${lineDiagramError.message}`
          );
        }
      }
      // ========== END LINE DIAGRAM PROCESSING ==========

      // Infographic processing
      if (selectedProcessing.includes("infographic") && images.length > 0) {
        try {
          setIsGeneratingInfographic(true);
          setIsAnalyzingForInfographic(true);

          const imageToAnalyze = images[0];
          if (!imageToAnalyze.file) throw new Error("No file to analyze");

          const infographicResult = await api.generateInfographicFromImage(
            imageToAnalyze.file
          );

          // Initialize uploadResult if it doesn't exist yet
          const updatedResult = {
            ...result,
            infographics: result?.infographics
              ? [
                  ...result.infographics,
                  {
                    imageUrl: infographicResult.imageUrl,
                    sourceImageId: imageToAnalyze.id,
                    analysis: infographicResult.analysis,
                  },
                ]
              : [
                  {
                    imageUrl: infographicResult.imageUrl,
                    sourceImageId: imageToAnalyze.id,
                    analysis: infographicResult.analysis,
                  },
                ],
          };

          // Update result with infographics
          result = updatedResult;

          window.dispatchEvent(
            new CustomEvent("infographic-generated", {
              detail: infographicResult,
            })
          );
        } catch (err: any) {
          console.error("Infographic generation failed:", err);
          setError("Failed to generate infographic: " + err.message);
        } finally {
          setIsGeneratingInfographic(false);
          setIsAnalyzingForInfographic(false);
        }
      }

      const otherProcessing = selectedProcessing.filter(
        (p) =>
          p !== "bg-remove" &&
          p !== "resize" &&
          p !== "compress" &&
          p !== "line-diagram"
      );

      if (!autoDetect && otherProcessing.length > 0) {
        const imageProcessing: Record<string, string[]> = {};
        images.forEach((img) => {
          imageProcessing[img.id] = otherProcessing;
        });
        await api.createBatchProcessingJob(result.uploadId, imageProcessing);
      }

      // AUTO-DETECTION AND AUTO-FIX LOGIC
      if (
        autoDetect &&
        currentAnalysis &&
        result?.images &&
        result.images.length > 0
      ) {
        setIsAutoFixing(true);
        setAutoFixResults([]);
        setAutoFixError(null);

        try {
          console.log("Applying auto-detected fixes...");

          // Determine which operations to apply based on analysis
          const autoFixOperations: string[] = [];
          if (currentAnalysis.suggestions.backgroundRemoval)
            autoFixOperations.push("bg-remove");
          if (
            currentAnalysis.suggestions.upscaling ||
            currentAnalysis.qualityScore < 80
          )
            autoFixOperations.push("retouch");
          if (currentAnalysis.suggestions.compression)
            autoFixOperations.push("compress");
          if (currentAnalysis.suggestions.cropping)
            autoFixOperations.push("crop");

          if (autoFixOperations.length > 0) {
            console.log(`Auto-fix operations: ${autoFixOperations.join(", ")}`);

            // Process each image with auto-fix operations
            const processedImages = await Promise.all(
              result.images.map(async (uploadedImage: any, index: number) => {
                // Start with the original uploaded image URL
                let currentSourceUrl =
                  uploadedImage.cloudinaryUrl || uploadedImage.url;
                let originalName = uploadedImage.id;

                if (uploadSource === "files") {
                  if (images[index]) originalName = images[index].name;
                } else if (uploadSource === "urls") {
                  const parts = images[index]?.url.split("/");
                  const lastPart = parts[parts.length - 1];
                  if (lastPart) originalName = lastPart;
                }

                const operations: any[] = [];
                const failedOps: string[] = [];

                for (const op of autoFixOperations) {
                  try {
                    console.log(`Auto-applying ${op} to ${originalName}...`);
                    let options = {};
                    if (op === "resize") options = resizeDims;
                    if (op === "compress")
                      options = { quality: compressionQuality };

                    const response = await api.processImageAI(
                      uploadedImage.id,
                      currentSourceUrl,
                      op,
                      originalName,
                      options
                    );

                    if (response && response.url) {
                      // Store the operation result
                      operations.push({
                        operation: op,
                        status: "success",
                        url: response.url,
                      });

                      // Update the source URL for the next operation
                      currentSourceUrl = response.url;
                    }
                  } catch (opError: any) {
                    console.error(
                      `Auto-fix failed for ${op} on ${originalName}:`,
                      opError
                    );
                    operations.push({
                      operation: op,
                      status: "failed",
                      error: opError.message,
                    });
                    failedOps.push(op);
                  }
                }

                // Update the uploaded image with the final processed URL
                if (
                  failedOps.length === 0 &&
                  operations.some((op) => op.status === "success")
                ) {
                  uploadedImage.cloudinaryUrl = currentSourceUrl;
                  uploadedImage.url = currentSourceUrl;
                  uploadedImage.isAutoFixed = true;
                  uploadedImage.autoFixOperations = operations
                    .filter((op) => op.status === "success")
                    .map((op) => op.operation);
                } else {
                  uploadedImage.isAutoFixed = false;
                  uploadedImage.autoFixStatus = "partial_failure";
                }

                return {
                  imageId: uploadedImage.id,
                  originalName,
                  operations,
                  finalUrl: currentSourceUrl,
                  isFixed: operations.some((op) => op.status === "success"),
                };
              })
            );

            setAutoFixResults(processedImages);

            // Update result summary
            result.isAutoFixed = processedImages.some((img) => img.isFixed);
            result.autoFixSummary = {
              totalImages: processedImages.length,
              successfullyFixed: processedImages.filter((img) => img.isFixed)
                .length,
              totalOperations: autoFixOperations.length,
              appliedOperations: autoFixOperations,
            };
          }
        } catch (autoFixErr: any) {
          setAutoFixError(autoFixErr.message || "Auto-fix failed");
          console.error("Auto-fix error:", autoFixErr);
        } finally {
          setIsAutoFixing(false);
        }
      }

      setUploadResult(result);
      setLineDiagramResults([]); // Clear line diagram results after upload
      setImages([]);
      setProductPageUrl("");
      setCloudPath("");

      // Dispatch event with the processed result
      window.dispatchEvent(
        new CustomEvent("upload-complete", {
          detail: result,
        })
      );
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };
  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Advanced Upload
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Upload Source
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <button
                  onClick={() => setUploadSource("files")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    uploadSource === "files"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Upload className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                  <span className="text-sm font-medium">Files</span>
                </button>
                <button
                  onClick={() => setUploadSource("urls")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    uploadSource === "urls"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Link className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                  <span className="text-sm font-medium">URLs</span>
                </button>
                <button
                  onClick={() => setUploadSource("csv")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    uploadSource === "csv"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <FileText className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                  <span className="text-sm font-medium">CSV</span>
                </button>
                <button
                  onClick={() => setUploadSource("product-page")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    uploadSource === "product-page"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Globe className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                  <span className="text-sm font-medium">Page</span>
                </button>
                <button
                  onClick={() => setUploadSource("cloud")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    uploadSource === "cloud"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Cloud className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                  <span className="text-sm font-medium">Cloud</span>
                </button>
              </div>
            </div>
            {uploadSource === "files" && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <Upload
                  className={`w-12 h-12 mx-auto mb-4 ${
                    dragActive ? "text-blue-500" : "text-slate-400"
                  }`}
                />
                <p className="text-lg font-medium text-slate-700 mb-2">
                  Drag and drop images
                </p>
                <p className="text-slate-500 mb-4">or</p>
                <label className="inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files &&
                      handleFileSelect(Array.from(e.target.files))
                    }
                    className="hidden"
                  />
                  <span className="px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors inline-block">
                    Browse Files
                  </span>
                </label>
              </div>
            )}
            {uploadSource === "urls" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Image URLs (one per line)
                </label>
                <textarea
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.example.com/"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                />
                <button
                  onClick={handleUrlsAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add URLs
                </button>
              </div>
            )}
            {uploadSource === "csv" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Upload CSV/XLSX File
                </label>
                <p className="text-sm text-slate-600 mb-3">
                  CSV format: First column should contain image URLs
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCsvFile(file);
                      parseCsvFile(file);
                    }
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            )}
            {uploadSource === "product-page" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Product Page URL
                </label>
                <input
                  type="url"
                  value={productPageUrl}
                  onChange={(e) => setProductPageUrl(e.target.value)}
                  placeholder="https://www.example.com/"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-slate-600">
                  Auto-extract all product images from this page
                </p>
              </div>
            )}
            {uploadSource === "cloud" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cloud Provider
                  </label>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setCloudProvider("dropbox")}
                      className={`flex-1 px-4 py-3 border-2 rounded-lg ${
                        cloudProvider === "dropbox"
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200"
                      }`}
                    >
                      Dropbox
                    </button>
                    <button
                      onClick={() => setCloudProvider("google-drive")}
                      className={`flex-1 px-4 py-3 border-2 rounded-lg ${
                        cloudProvider === "google-drive"
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200"
                      }`}
                    >
                      Google Drive
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Folder Path
                  </label>
                  <input
                    type="text"
                    value={cloudPath}
                    onChange={(e) => setCloudPath(e.target.value)}
                    placeholder="/Furniture/Products"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            {editingImage && (
              <ImageCropModal
                imageSrc={editingImage.url}
                fileName={editingImage.name}
                onClose={() => setEditingImage(null)}
                onSave={handleCropSave}
              />
            )}
            {images.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Images ({images.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative">
                        {" "}
                        {image.preview ? (
                          <img
                            src={image.preview}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Globe className="w-12 h-12 text-slate-400" />
                          </div>
                        )}
                        {(image.processingStatus || image.autoFixStatus) && (
                          <div className="absolute top-2 left-2 z-10">
                            {image.processingStatus === "success" && (
                              <div className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded">
                                Processed
                              </div>
                            )}
                            {image.processingStatus === "partial_failure" && (
                              <div
                                className="px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded"
                                title={image.failedOperations?.join(", ")}
                              >
                                Partial
                              </div>
                            )}
                            {image.processingStatus === "failed" && (
                              <div
                                className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded"
                                title={image.failedOperations?.join(", ")}
                              >
                                Failed
                              </div>
                            )}
                            {image.autoFixStatus === "success" &&
                              !image.processingStatus && (
                                <div className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                                  Auto-Fixed
                                </div>
                              )}
                          </div>
                        )}
                        {currentAnalysis && (
                          <div className="absolute top-2 left-2">
                            <div className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                              Score: {currentAnalysis.qualityScore}
                            </div>
                          </div>
                        )}
                        {/* HOVER BUTTONS - Keep this after the badge */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          {/* Edit/Crop Button */}
                          {selectedProcessing.includes("crop") && (
                            <button
                              onClick={() => setEditingImage(image)}
                              className="p-2 bg-white rounded-full hover:bg-blue-50 transition-colors"
                              title="Crop Image"
                            >
                              <Crop className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {selectedProcessing.includes("line-diagram") && (
                            <button
                              onClick={() => {
                                handleLineDiagramClick(image);
                              }}
                              className="p-2 bg-white rounded-full hover:bg-purple-50 transition-colors"
                              title="Add measurements"
                            >
                              <Ruler className="w-4 h-4 text-purple-500" />
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <p className="mt-2 text-xs text-slate-600 truncate">
                        {image.name}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading || isAutoFixing}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {uploading ||
                  isAutoFixing ||
                  isGeneratingInfographic ||
                  isAnalyzingForInfographic ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>
                        {uploading ? "Uploading..." : "Auto-fixing Images..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>
                        Upload {images.length} Image
                        {images.length > 1 ? "s" : ""}
                        {autoDetect
                          ? " (Auto-detect)"
                          : ` (${selectedProcessing.length} operations)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
            {uploadResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-green-700 font-semibold text-lg">
                      Upload successful!
                    </p>
                    <p className="text-green-600 text-sm mt-2">
                      {uploadResult.images?.length || 0} image(s) uploaded and
                      stored
                    </p>
                    {isAutoFixing && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                          <span className="text-blue-700 font-medium">
                            Applying auto-detected fixes...
                          </span>
                        </div>
                      </div>
                    )}
                    {autoFixResults.length > 0 && (
                      <p className="text-green-600 text-sm mt-2">
                        Auto-fix complete:{" "}
                        {
                          autoFixResults.filter((r) =>
                            r.operations.some((op) => op.status === "success")
                          ).length
                        }{" "}
                        image(s) processed successfully
                      </p>
                    )}
                    {autoFixError && (
                      <p className="text-red-600 text-sm mt-2">
                        Some auto-fix operations failed: {autoFixError}
                      </p>
                    )}
                    {autoDetect &&
                      !isAutoFixing &&
                      autoFixResults.length === 0 && (
                        <p className="text-blue-600 text-sm mt-2">
                          Auto-detection enabled - no fixes needed for these
                          images
                        </p>
                      )}
                    <p className="text-green-700 text-sm mt-3 font-medium">
                      Scroll down to view your uploaded images in the gallery
                      below
                    </p>
                  </div>
                </div>
              </div>
            )}
            {autoFixResults.length > 0 && !isAutoFixing && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Auto-Fix Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-sm font-medium text-slate-900">
                      Total Images
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {autoFixResults.length}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-sm font-medium text-slate-900">
                      Successful Fixes
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {
                        autoFixResults.filter((r) =>
                          r.operations.some((op) => op.status === "success")
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
            {autoFixError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 font-semibold">Auto-Fix Error</p>
                  <p className="text-red-600 text-sm mt-1">{autoFixError}</p>
                </div>
              </div>
            )}
            {/* AI Analysis Results Display */}
            {currentAnalysis && (
              <div className="mt-6 p-6 bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Wand2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        AI Image Analysis
                      </h3>
                      <p className="text-sm text-slate-600">
                        Detailed assessment of your product image
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-slate-900">
                        {currentAnalysis.qualityScore}
                        <span className="text-sm text-slate-500">/100</span>
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        Quality Score
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isAutoFixing ? (
                        <>
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          <span className="text-blue-700 font-medium">
                            Applying Auto-Fixes
                          </span>
                        </>
                      ) : autoFixResults.length > 0 ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-700 font-medium">
                            Auto-Fixes Applied
                          </span>
                        </>
                      ) : autoFixError ? (
                        <>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="text-red-700 font-medium">
                            Auto-Fix Error
                          </span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5 text-blue-600" />
                          <span className="text-blue-700 font-medium">
                            Auto-Fixes Ready
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {isAutoFixing
                        ? "Processing..."
                        : autoFixResults.length > 0
                        ? `${autoFixResults.length} image(s) processed`
                        : "Ready to apply"}
                    </div>
                  </div>
                </div>
                {/* Product Category */}
                <div className="mb-6 p-4 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-500">
                        Product Category
                      </div>
                      <div className="text-lg font-semibold text-slate-900">
                        {currentAnalysis.productCategory}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-500">
                        Background Type
                      </div>
                      <div className="text-lg font-semibold text-slate-900">
                        {currentAnalysis.backgroundAnalysis.type}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Issues List */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">
                    Detected Issues ({currentAnalysis.issues.length})
                  </h4>
                  <div className="space-y-3">
                    {currentAnalysis.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-4 border-l-4 rounded-r-lg ${
                          issue.severity === "high"
                            ? "border-red-500 bg-red-50"
                            : issue.severity === "medium"
                            ? "border-yellow-500 bg-yellow-50"
                            : "border-blue-500 bg-blue-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  issue.severity === "high"
                                    ? "bg-red-100 text-red-800"
                                    : issue.severity === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {issue.severity.toUpperCase()}
                              </span>
                              <span className="text-sm font-medium text-slate-900">
                                {issue.type}
                              </span>
                            </div>
                            <p className="text-slate-700">
                              {issue.description}
                            </p>
                          </div>
                          {issue.severity === "high" && (
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <div className="text-sm font-medium text-slate-900">
                            Suggested Action:
                          </div>
                          <p className="text-sm text-slate-700">
                            {issue.suggestedAction}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Compliance Status */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`p-4 border-2 rounded-lg ${
                      currentAnalysis.compliance.amazon.isCompliant
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {currentAnalysis.compliance.amazon.isCompliant ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-semibold text-slate-900">
                          Amazon
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          currentAnalysis.compliance.amazon.isCompliant
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {currentAnalysis.compliance.amazon.isCompliant
                          ? "COMPLIANT"
                          : "NON-COMPLIANT"}
                      </span>
                    </div>
                    {currentAnalysis.compliance.amazon.violations.length >
                      0 && (
                      <div>
                        <div className="text-sm font-medium text-slate-700 mb-1">
                          Violations:
                        </div>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {currentAnalysis.compliance.amazon.violations
                            .slice(0, 3)
                            .map((violation, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2">•</span>
                                {violation}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div
                    className={`p-4 border-2 rounded-lg ${
                      currentAnalysis.compliance.shopify.isCompliant
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {currentAnalysis.compliance.shopify.isCompliant ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-semibold text-slate-900">
                          Shopify
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          currentAnalysis.compliance.shopify.isCompliant
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {currentAnalysis.compliance.shopify.isCompliant
                          ? "COMPLIANT"
                          : "NON-COMPLIANT"}
                      </span>
                    </div>
                    {currentAnalysis.compliance.shopify.violations.length >
                      0 && (
                      <div>
                        <div className="text-sm font-medium text-slate-700 mb-1">
                          Violations:
                        </div>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {currentAnalysis.compliance.shopify.violations
                            .slice(0, 3)
                            .map((violation, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2">•</span>
                                {violation}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                {/* AI Suggestions */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">
                    AI Recommendations
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(currentAnalysis.suggestions).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className={`p-3 border-2 rounded-lg text-center transition-all ${
                            value
                              ? "border-green-500 bg-green-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="text-sm font-medium text-slate-900 capitalize">
                            {key.replace(/([A-Z])/g, " $1")}
                          </div>
                          <div className="mt-1">
                            {value ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-400 mx-auto" />
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {value ? "Recommended" : "Not needed"}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Wand2 className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-900">
                      Auto-applied Operations
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">
                    Based on this analysis, the following operations have been
                    automatically selected:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentAnalysis.suggestions.backgroundRemoval && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        Background Removal
                      </span>
                    )}
                    {currentAnalysis.suggestions.upscaling && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        Image Upscaling
                      </span>
                    )}
                    {currentAnalysis.suggestions.cropping && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        Smart Cropping
                      </span>
                    )}
                    {currentAnalysis.suggestions.enhancement && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        Image Enhancement
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {uploadResult?.infographics &&
              uploadResult.infographics.map((ig, idx) => (
                <div
                  key={idx}
                  className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <h4 className="font-bold text-slate-800">
                      📊 Generated Marketing Poster
                    </h4>
                  </div>
                  <img
                    src={ig.imageUrl}
                    alt="Generated poster"
                    className="w-full max-h-[800px] object-contain rounded-lg border shadow-sm"
                  />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-slate-700">
                        Product Type
                      </div>
                      <div>{ig.analysis?.productType}</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">
                        Target Audience
                      </div>
                      <div>{ig.analysis?.targetAudience}</div>
                    </div>
                  </div>
                  <a
                    href={ig.imageUrl}
                    download={`poster-${ig.sourceImageId}.png`}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download High-Resolution Poster
                  </a>
                </div>
              ))}
            {uploadResult?.lineDiagramSummary && (
              <div className="mt-6 p-6 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-center space-x-2 mb-4">
                  <Ruler className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Uploaded Line Diagrams (
                    {uploadResult.lineDiagramSummary.totalProcessed})
                  </h3>
                </div>
                <div className="space-y-4">
                  {uploadResult.lineDiagramSummary.images.map(
                    (img: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 bg-white rounded-lg border border-purple-100"
                      >
                        {/* Annotated Image */}
                        {img.annotatedUrl && (
                          <div className="mb-4">
                            <img
                              src={img.annotatedUrl}
                              alt={`Annotated diagram ${idx + 1}`}
                              className="w-full max-h-[400px] object-contain rounded-lg border border-purple-200 bg-slate-50"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-slate-900">
                            Diagram {idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              {img.measurementCount} measurement(s)
                            </span>
                            {img.annotatedUrl && (
                              <a
                                href={img.annotatedUrl}
                                download={`diagram_${idx + 1}_annotated.png`}
                                className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        </div>

                        {img.measurements && img.measurements.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-slate-700 mb-2">
                              Measurements:
                            </div>
                            {img.measurements.map((m: any, mIdx: number) => (
                              <div
                                key={mIdx}
                                className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg text-sm"
                              >
                                <span className="text-slate-700">
                                  {m.label || `Measurement ${mIdx + 1}`}
                                </span>
                                <span className="font-mono font-medium text-slate-900">
                                  {m.actual_value ||
                                    `${m.pixel_length?.toFixed(1) || 0}px`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Processing Options
              </h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setAutoDetect(isChecked);
                    if (isChecked) {
                      runAutoDetection();
                    } else {
                      setSelectedProcessing([]);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex items-center space-x-1">
                  <Wand2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Auto
                  </span>
                </div>
              </label>
            </div>
            {autoDetect ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  AI will automatically detect and apply the best processing
                  operations for each image.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 mb-3">
                  Select operations to apply:
                </p>
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {PROCESSING_OPTIONS.map((option) => (
                    <div key={option.id}>
                      {/* The Checkbox Row */}
                      <label
                        className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedProcessing.includes(option.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProcessing.includes(option.id)}
                          onChange={() => toggleProcessing(option.id)}
                          className="w-4 h-4 text-blue-600 rounded mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {option.label}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {option.description}
                          </p>
                        </div>
                      </label>
                      {option.id === "resize" &&
                        selectedProcessing.includes("resize") && (
                          <div className="mt-2 ml-8 p-3 bg-white border border-slate-200 rounded-lg shadow-sm grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-semibold text-slate-500">
                                Width (px)
                              </label>
                              <input
                                type="number"
                                value={resizeDims.width}
                                onChange={(e) =>
                                  setResizeDims((prev) => ({
                                    ...prev,
                                    width: Number(e.target.value),
                                  }))
                                }
                                className="w-full mt-1 px-2 py-1 text-sm border rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-500">
                                Height (px)
                              </label>
                              <input
                                type="number"
                                value={resizeDims.height}
                                onChange={(e) =>
                                  setResizeDims((prev) => ({
                                    ...prev,
                                    height: Number(e.target.value),
                                  }))
                                }
                                className="w-full mt-1 px-2 py-1 text-sm border rounded"
                              />
                            </div>
                          </div>
                        )}
                      {option.id === "compress" &&
                        selectedProcessing.includes("compress") && (
                          <div className="mt-2 ml-8 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div className="flex justify-between mb-1">
                              <label className="text-xs font-semibold text-slate-500">
                                Quality
                              </label>
                              <span className="text-xs font-bold text-blue-600">
                                {compressionQuality}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              step="5"
                              value={compressionQuality}
                              onChange={(e) =>
                                setCompressionQuality(Number(e.target.value))
                              }
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                              Lower % = Smaller file size, lower quality.
                            </p>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
                {selectedProcessing.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-700">
                      {selectedProcessing.length} operation
                      {selectedProcessing.length > 1 ? "s" : ""} selected
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showMeasurementTool && measurementImage && (
        <MeasurementModal
          imageUrl={measurementImage.preview || measurementImage.url}
          imageName={measurementImage.name}
          existingMeasurements={
            lineDiagramResults.find((r) => r.imageId === measurementImage.id)
              ?.measurements || []
          }
          onClose={() => {
            setShowMeasurementTool(false);
            setMeasurementImage(null);
          }}
          onSave={handleMeasurementSave}
        />
      )}
    </>
  );
}
