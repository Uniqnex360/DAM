import { X, Save, Download, Images } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Toolbar } from "./Toolbar";
import { MeasurementList } from "./MeasurementList";
import { MeasurementCanvas } from "./MeasurementCanvas";
import { Measurement } from "../lib/supabase";


interface MeasurementModalProps {
  imageUrl: string;
  imageName: string;
  existingMeasurements?:Measurement[];
  onClose: () => void;
  onSave: (measurements: Measurement[], annotatedImageUrl: string) => void;
}

export function MeasurementModal({
  imageUrl,
  imageName,
  existingMeasurements=[],
  onClose,
  onSave,
}: MeasurementModalProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>(existingMeasurements);
  const [activeTool, setActiveTool] = useState<"select" | "line" | "ruler"|"move"|'copy'>("line");
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  useEffect(()=>{
    if(existingMeasurements && existingMeasurements.length>0)
    {
        setMeasurements(existingMeasurements)
    }
  },[existingMeasurements])
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    actual_value: string;
    label: string;
    color: string;
    point_style: "round" | "arrow" | "square" | "diamond";
    text_position: "top" | "bottom" | "left" | "right";
    line_width: number;
    font_size: number;
    pointer_width: number;
  } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleMeasurementAdd = (measurement: Omit<Measurement, "id">) => {
    const newMeasurement: Measurement = {
      ...measurement,
      id: `measurement-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };
    setMeasurements([...measurements, newMeasurement]);
  };
  const handleCopyMeasurements=(id:string)=>{
    const measurementCopy=measurements.find(m=>m.id===id)
    if(!measurementCopy)return
    const newMeasurement:Measurement={
      ...measurementCopy,
      id:`measurement-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
      start_x:measurementCopy.start_x+20,
      start_y:measurementCopy.start_y+20,
      end_x:measurementCopy.end_x+20,
      end_y:measurementCopy.end_y+20
    }
    setMeasurements([...measurements,newMeasurement])
    setSelectedMeasurementId(newMeasurement.id)
  }
  
  console.log('measurement modal called')
  const handleMeasurementUpdate = (
    id: string,
    updates: Partial<Measurement>
  ) => {
    setMeasurements(
      measurements.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const handleMeasurementDelete = (id: string) => {
    setMeasurements(measurements.filter((m) => m.id !== id));
    if (selectedMeasurementId === id) {
      setSelectedMeasurementId(null);
    }
  };

const handleSave = () => {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = imageSize.width;
  exportCanvas.height = imageSize.height;
  const ctx = exportCanvas.getContext('2d');
  
  if (ctx) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, imageSize.width, imageSize.height);
      
      // Calculate scale factor - this tells us how much bigger the export is vs display
      const displayCanvasWidth = canvasContainerRef.current?.clientWidth || 800;
      const displayScale = Math.min(
        (displayCanvasWidth - 40) / imageSize.width,
        ((canvasContainerRef.current?.clientHeight || 600) - 40) / imageSize.height,
        1
      );
      
      measurements.forEach((m) => {
        // Scale UP visual properties for export (they were designed for display size)
        const scaledLineWidth = (m.line_width || 2) / displayScale;
        const scaledPointerSize = (m.pointer_width || 5) / displayScale;
        const scaledFontSize = (m.font_size || 14) / displayScale;
        const scaledLineHeight = scaledFontSize + (4 / displayScale);
        const scaledOffsetDistance = 20 / displayScale;
        
        // Draw line using original image coordinates
        ctx.strokeStyle = m.color || '#000000';
        ctx.lineWidth = scaledLineWidth;
        ctx.beginPath();
        ctx.moveTo(m.start_x, m.start_y);
        ctx.lineTo(m.end_x, m.end_y);
        ctx.stroke();
        
        // Draw endpoints
        ctx.fillStyle = m.color || '#000000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 / displayScale;
        
        ctx.beginPath();
        ctx.arc(m.start_x, m.start_y, scaledPointerSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(m.end_x, m.end_y, scaledPointerSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw label
        const midX = (m.start_x + m.end_x) / 2;
        const midY = (m.start_y + m.end_y) / 2;
        
        const valueText = m.actual_value || `${m.pixel_length.toFixed(1)}px`;
        const labelSuffix = m.label ? ` - ${m.label}` : '';
        const fullText = `${valueText}${labelSuffix}`;
        const lines = fullText.split('\n');
        
        let baseX = midX;
        let baseY = midY;
        
        if (m.text_offset_x !== undefined && m.text_offset_y !== undefined) {
          baseX = midX + m.text_offset_x;
          baseY = midY + m.text_offset_y;
        } else {
          switch (m.text_position) {
            case 'top':
              baseY = midY - scaledOffsetDistance;
              break;
            case 'bottom':
              baseY = midY + scaledOffsetDistance;
              break;
            case 'left':
              baseX = midX - scaledOffsetDistance;
              break;
            case 'right':
              baseX = midX + scaledOffsetDistance;
              break;
          }
        }
        
        baseY = baseY - ((lines.length - 1) * scaledLineHeight) / 2;
        
        ctx.font = `bold ${scaledFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        lines.forEach((line, index) => {
          const textY = baseY + (index * scaledLineHeight);
          
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3 / displayScale;
          ctx.strokeText(line, baseX, textY);
          
          ctx.fillStyle = '#000';
          ctx.fillText(line, baseX, textY);
        });
      });
      
      const annotatedImageURL = exportCanvas.toDataURL('image/png');
      onSave(measurements, annotatedImageURL);
    };
    img.src = imageUrl;
  } else {
    onSave(measurements, imageUrl);
  }
};
const handleExport = () => {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = imageSize.width;
  exportCanvas.height = imageSize.height;
  const ctx = exportCanvas.getContext('2d');

  if (!ctx) {
    console.error('Could not get canvas context');
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0, imageSize.width, imageSize.height);
    
    // Calculate display scale - how much the image is scaled down in the display
    const displayCanvasWidth = canvasContainerRef.current?.clientWidth || 800;
    const displayCanvasHeight = canvasContainerRef.current?.clientHeight || 600;
    const displayScale = Math.min(
      (displayCanvasWidth - 40) / imageSize.width,
      (displayCanvasHeight - 40) / imageSize.height,
      1
    );

    measurements.forEach((m) => {
      // Scale UP visual properties for export (they were designed for display size)
      const scaledLineWidth = (m.line_width || 2) / displayScale;
      const scaledPointerSize = (m.pointer_width || 5) / displayScale;
      const scaledFontSize = (m.font_size || 14) / displayScale;
      const scaledLineHeight = scaledFontSize + (4 / displayScale);
      const scaledOffsetDistance = 20 / displayScale;

      // Draw line using original image coordinates
      ctx.strokeStyle = m.color || '#000000';
      ctx.lineWidth = scaledLineWidth;
      ctx.beginPath();
      ctx.moveTo(m.start_x, m.start_y);
      ctx.lineTo(m.end_x, m.end_y);
      ctx.stroke();
    const dx = m.end_x - m.start_x;
const dy = m.end_y - m.start_y;
const lineAngle = Math.atan2(dy, dx);
      // Draw endpoints with scaling
      drawExportPoint(
  ctx, 
  m.start_x, 
  m.start_y, 
  m.point_style, 
  m.color || '#000000', 
  1 / displayScale, 
  scaledPointerSize,
  true,      // ← ADD: This is the start point
  lineAngle  // ← ADD: Line angle for rotation
);
      
drawExportPoint(
  ctx, 
  m.end_x, 
  m.end_y, 
  m.point_style, 
  m.color || '#000000', 
  1 / displayScale, 
  scaledPointerSize,
  false,     // ← ADD: This is the end point  
  lineAngle  // ← ADD: Same line angle
);

      // Draw label
      const midX = (m.start_x + m.end_x) / 2;
      const midY = (m.start_y + m.end_y) / 2;

      const valueText = m.actual_value || `${m.pixel_length.toFixed(1)}px`;
      const labelSuffix = m.label ? ` - ${m.label}` : '';
      const fullText = `${valueText}${labelSuffix}`;
      const lines = fullText.split('\n');

      let baseX = midX;
      let baseY = midY;

      if (m.text_offset_x !== undefined && m.text_offset_y !== undefined) {
        baseX = midX + m.text_offset_x;
        baseY = midY + m.text_offset_y;
      } else {
        switch (m.text_position) {
          case 'top':
            baseY = midY - scaledOffsetDistance;
            break;
          case 'bottom':
            baseY = midY + scaledOffsetDistance;
            break;
          case 'left':
            baseX = midX - scaledOffsetDistance;
            break;
          case 'right':
            baseX = midX + scaledOffsetDistance;
            break;
        }
      }

      baseY = baseY - ((lines.length - 1) * scaledLineHeight) / 2;

      ctx.font = `bold ${scaledFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      lines.forEach((line, index) => {
        const textY = baseY + index * scaledLineHeight;

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3 / displayScale;
        ctx.strokeText(line, baseX, textY);

        ctx.fillStyle = '#000';
        ctx.fillText(line, baseX, textY);
      });
    });

    const originalExtension = imageName.split('.').pop()?.toLowerCase() || 'png';
    
    let mimeType = 'image/png';
    let extension = 'png';
    
    if (originalExtension === 'jpg' || originalExtension === 'jpeg') {
      mimeType = 'image/jpeg';
      extension = 'jpg';
    } else if (originalExtension === 'webp') {
      mimeType = 'image/webp';
      extension = 'webp';
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) {
        console.error('Could not create blob');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${imageName.replace(/\.[^/.]+$/, '')}_annotated.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, mimeType, 0.95);
  };

  img.onerror = () => {
    console.error('Failed to load image for export');
  };

  img.src = imageUrl;
};
// Helper function to draw points in export
const drawExportPoint = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: string,
  color: string,
  scaleFactor: number,
  size: number = 5,
  isStart: boolean = false,
  lineAngle: number = 0,
) => {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2 * scaleFactor;
  
  switch (style) {
    case 'round':
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'square':
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
      ctx.strokeRect(x - size, y - size, size * 2, size * 2);
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
case 'arrow':
  const arrowAngle = isStart ? lineAngle + Math.PI : lineAngle;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(arrowAngle);
  ctx.beginPath();
  // Simple triangle pointing RIGHT
  ctx.moveTo(size, 0);        // Tip at right
  ctx.lineTo(-size, -size);   // Top-left
  ctx.lineTo(-size, size);    // Bottom-left
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  break;
      
    default:
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }
};
const displayCanvasWidth = canvasContainerRef.current?.clientWidth || 800;
const scaleFactor=imageSize.width/displayCanvasWidth
  if (imageSize.width === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Line Diagram Tool
            </h2>
            <p className="text-sm text-slate-600">{imageName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save & Close
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            <Toolbar activeTool={activeTool} onToolChange={setActiveTool} hasMeasurements={measurements.length > 0}/>
            <div ref={canvasContainerRef} className="flex-1 p-4 bg-slate-100">
              <MeasurementCanvas
                imageUrl={imageUrl}
                imageWidth={imageSize.width}
                imageHeight={imageSize.height}
                measurements={measurements}
                activeTool={activeTool}
                onMeasurementAdd={handleMeasurementAdd}
                onMeasurementSelect={setSelectedMeasurementId}
                onMeasurementUpdate={handleMeasurementUpdate}
                selectedMeasurementId={selectedMeasurementId}
                editingId={editingId}
                editValues={editValues}
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-80 bg-white border-l border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                Measurements ({measurements.length})
              </h3>
            </div>
            <MeasurementList
              measurements={measurements}
              selectedId={selectedMeasurementId}
              onSelect={setSelectedMeasurementId}
              onDelete={handleMeasurementDelete}
              onUpdate={handleMeasurementUpdate}
              editingId={editingId}
              onCopy={handleCopyMeasurements}
              setEditingId={setEditingId}
              editValues={editValues}
              setEditValues={setEditValues}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
