import { useEffect, useRef, useState } from "react";
import { Measurement } from "../lib/supabase";

interface MeasurementCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  measurements: Measurement[];
  activeTool: "select" | "line" | "ruler";
  onMeasurementAdd: (
    measurement: Omit<Measurement, "id" | "project_id" | "created_at">
  ) => void;
  onMeasurementSelect: (id: string | null) => void;
  onMeasurementUpdate: (id: string, updates: Partial<Measurement>) => void;
  selectedMeasurementId: string | null;
  editingId: string | null;
  editValues: {
    actual_value: string;
    label: string;
    color: string;
    point_style: "round" | "arrow" | "square" | "diamond";
    text_position: "bottom" | "top" | "left" | "right";
    line_width: number;
    font_size: number;
    pointer_width: number;
  } | null;
}

type DraggingPoint = "start" | "end" | null;

export function MeasurementCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  measurements,
  activeTool,
  onMeasurementAdd,
  onMeasurementSelect,
  onMeasurementUpdate,
  selectedMeasurementId,
  editingId,
  editValues,
}: MeasurementCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggingTextId,setDraggingTextId]=useState<string|null>(null)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentPoint, setCurrentPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [draggingPoint, setDraggingPoint] = useState<DraggingPoint>(null);
  const [draggingMeasurementId, setDraggingMeasurementId] = useState<
    string | null
  >(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
 const isNearText = (
  mouseX: number,
  mouseY: number,
  m: Measurement
): boolean => {
  const x1 = m.start_x * scale + offset.x;
  const y1 = m.start_y * scale + offset.y;
  const x2 = m.end_x * scale + offset.x;
  const y2 = m.end_y * scale + offset.y;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  let textX = midX;
  let textY = midY;

  // Check for custom offset
  if (m.text_offset_x !== undefined && m.text_offset_y !== undefined) {
    textX = midX + m.text_offset_x * scale;
    textY = midY + m.text_offset_y * scale;
  } else {
    const offsetDistance = 20;
    switch (m.text_position) {
      case "top": textY = midY - offsetDistance; break;
      case "bottom": textY = midY + offsetDistance; break;
      case "left": textX = midX - offsetDistance; break;
      case "right": textX = midX + offsetDistance; break;
    }
  }

  const threshold = 30;
  return (
    mouseX >= textX - threshold &&
    mouseX <= textX + threshold &&
    mouseY >= textY - threshold &&
    mouseY <= textY + threshold
  );
};
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      fitImageToCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const fitImageToCanvas = () => {
    if (!containerRef.current || !imageRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scaleX = (containerWidth - 40) / imageWidth;
    const scaleY = (containerHeight - 40) / imageHeight;
    const newScale = Math.min(scaleX, scaleY, 1);

    setScale(newScale);
    setOffset({
      x: (containerWidth - imageWidth * newScale) / 2,
      y: (containerHeight - imageHeight * newScale) / 2,
    });
  };

  useEffect(() => {
    fitImageToCanvas();
    window.addEventListener("resize", fitImageToCanvas);
    return () => window.removeEventListener("resize", fitImageToCanvas);
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    drawCanvas();
  }, [
    measurements,
    currentPoint,
    scale,
    offset,
    selectedMeasurementId,
    draggingPoint,
    editingId,
    editValues,
    draggingMeasurementId,
    draggingTextId
  ]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageRef.current) return;

    canvas.width = containerRef.current?.clientWidth || 800;
    canvas.height = containerRef.current?.clientHeight || 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      imageRef.current,
      offset.x,
      offset.y,
      imageWidth * scale,
      imageHeight * scale
    );

    measurements.forEach((m) => {
      const isSelected = m.id === selectedMeasurementId;
      if (m.id === editingId && editValues) {
        const previewMeasurement: Measurement = {
          ...m,
          actual_value: editValues.actual_value || null,
          label: editValues.label || null,
          color: editValues.color,
          point_style: editValues.point_style,
          text_position: editValues.text_position,
          line_width: editValues.line_width,
          font_size: editValues.font_size,
          pointer_width: editValues.pointer_width,
        };
        drawMeasurement(ctx, previewMeasurement, isSelected);
      } else {
        drawMeasurement(ctx, m, isSelected);
      }
    });

    if (startPoint && currentPoint && activeTool !== "select") {
      drawTemporaryLine(ctx, startPoint, currentPoint);
    }
  };

  const drawMeasurement = (
    ctx: CanvasRenderingContext2D,
    m: Measurement,
    isSelected: boolean
  ) => {
    const x1 = m.start_x * scale + offset.x;
    const y1 = m.start_y * scale + offset.y;
    const x2 = m.end_x * scale + offset.x;
    const y2 = m.end_y * scale + offset.y;

    ctx.strokeStyle = isSelected ? "#00ff00" : m.color;
    ctx.lineWidth = isSelected ? Math.max(3, m.line_width + 1) : m.line_width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const pointerSize = m.pointer_width || 5;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    drawPoint(
      ctx,
      x1,
      y1,
      m.point_style,
      isSelected ? "#00ff00" : m.color,
      pointerSize,
      angle - Math.PI / 2
    );
    drawPoint(
      ctx,
      x2,
      y2,
      m.point_style,
      isSelected ? "#00ff00" : m.color,
      pointerSize,
      angle + Math.PI / 2
    );

    if (isSelected) {
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x1 - 8, y1 - 8, 16, 16);
      ctx.strokeRect(x2 - 8, y2 - 8, 16, 16);
      ctx.setLineDash([]);
    }

    drawLabel(ctx, m, x1, y1, x2, y2);
  };

  const drawPoint = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    style: string,
    color: string,
    size: number = 5,
    angle: number = 0
  ) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    switch (style) {
      case "round":
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case "square":
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
        ctx.strokeRect(x - size, y - size, size * 2, size * 2);
        break;
      case "diamond":
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "arrow":
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, size);
        ctx.lineTo(-size, size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
    }
  };

const drawLabel = (
  ctx: CanvasRenderingContext2D,
  m: Measurement,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const text = m.actual_value
    ? `${m.actual_value}${m.label ? ` - ${m.label}` : ""}`
    : `${m.pixel_length.toFixed(1)}px${m.label ? ` - ${m.label}` : ""}`;

  let textX = midX;
  let textY = midY;

  // Check for custom offset (dragged position)
  if (m.text_offset_x !== undefined && m.text_offset_y !== undefined) {
    // Use custom dragged position (scale the offset for display)
    textX = midX + m.text_offset_x * scale;
    textY = midY + m.text_offset_y * scale;
  } else {
    // Use default position based on text_position setting
    const offsetDistance = 20;
    switch (m.text_position) {
      case "top": textY = midY - offsetDistance; break;
      case "bottom": textY = midY + offsetDistance; break;
      case "left": textX = midX - offsetDistance; break;
      case "right": textX = midX + offsetDistance; break;
    }
  }

  // Rest of drawing code...
  const fontSize = m.font_size || 14;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = text.split('\n');
  const lineHeight = fontSize + 4;

  lines.forEach((line, index) => {
    const lineY = textY + (index - (lines.length - 1) / 2) * lineHeight;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeText(line, textX, lineY);
    ctx.fillStyle = "#000";
    ctx.fillText(line, textX, lineY);
  });
};
  const drawTemporaryLine = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const pixelDistance = distance / scale;

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    const text = `${pixelDistance.toFixed(1)}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(
      text,
      (start.x + end.x) / 2 + 10,
      (start.y + end.y) / 2 - 10
    );
    ctx.fillText(text, (start.x + end.x) / 2 + 10, (start.y + end.y) / 2 - 10);
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getImageCoordinates = (canvasX: number, canvasY: number) => {
    return {
      x: (canvasX - offset.x) / scale,
      y: (canvasY - offset.y) / scale,
    };
  };

  const isNearPoint = (
    px: number,
    py: number,
    x: number,
    y: number,
    threshold = 10
  ) => {
    const dx = px - x;
    const dy = py - y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasCoords = getCanvasCoordinates(e);
    for(const m of measurements)
    {
        if(isNearText(canvasCoords.x,canvasCoords.y,m))
        {
            setDraggingTextId(m.id)
            onMeasurementSelect(m.id)
            return
        }
    }
    if (activeTool === "select") {
      const selectedMeasurement = measurements.find(
        (m) => m.id === selectedMeasurementId
      );
      if (selectedMeasurement) {
        const x1 = selectedMeasurement.start_x * scale + offset.x;
        const y1 = selectedMeasurement.start_y * scale + offset.y;
        const x2 = selectedMeasurement.end_x * scale + offset.x;
        const y2 = selectedMeasurement.end_y * scale + offset.y;

        if (isNearPoint(canvasCoords.x, canvasCoords.y, x1, y1)) {
          setDraggingPoint("start");
          setDraggingMeasurementId(selectedMeasurementId);
          return;
        }
        if (isNearPoint(canvasCoords.x, canvasCoords.y, x2, y2)) {
          setDraggingPoint("end");
          setDraggingMeasurementId(selectedMeasurementId);
          return;
        }
      }

      const clicked = measurements.find((m) => {
        const x1 = m.start_x * scale + offset.x;
        const y1 = m.start_y * scale + offset.y;
        const x2 = m.end_x * scale + offset.x;
        const y2 = m.end_y * scale + offset.y;

        const distance = distanceToLineSegment(
          canvasCoords.x,
          canvasCoords.y,
          x1,
          y1,
          x2,
          y2
        );
        return distance < 10;
      });

      onMeasurementSelect(clicked?.id || null);
    } else {
      setIsDrawing(true);
      setStartPoint(canvasCoords);
      setCurrentPoint(canvasCoords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e);
     if (draggingTextId) {
    const m = measurements.find((m) => m.id === draggingTextId);
    if (m) {
      const x1 = m.start_x * scale + offset.x;
      const y1 = m.start_y * scale + offset.y;
      const x2 = m.end_x * scale + offset.x;
      const y2 = m.end_y * scale + offset.y;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const offsetX=(coords.x-midX)/scale
      const offsetY=(coords.y-midY)/scale
      onMeasurementUpdate(draggingTextId,{
        text_offset_y:offsetY,
        text_offset_x:offsetX
      })
    }
    return;
  }

  // Update cursor based on what's being hovered
  let cursorSet = false;
  for (const m of measurements) {
    if (isNearText(coords.x, coords.y, m)) {
      canvas.style.cursor = "move";
      cursorSet = true;
      break;
    }
  }
  if (!cursorSet) {
    canvas.style.cursor = activeTool === "select" ? "default" : "crosshair";
  }

    if (draggingPoint && draggingMeasurementId) {
      const measurement = measurements.find(
        (m) => m.id === draggingMeasurementId
      );
      if (!measurement) return;

      const imageCoords = getImageCoordinates(coords.x, coords.y);

      if (draggingPoint === "start") {
        const pixelLength = Math.sqrt(
          Math.pow(measurement.end_x - imageCoords.x, 2) +
            Math.pow(measurement.end_y - imageCoords.y, 2)
        );
        onMeasurementUpdate(draggingMeasurementId, {
          start_x: imageCoords.x,
          start_y: imageCoords.y,
          pixel_length: pixelLength,
        });
      } else {
        const pixelLength = Math.sqrt(
          Math.pow(imageCoords.x - measurement.start_x, 2) +
            Math.pow(imageCoords.y - measurement.start_y, 2)
        );
        onMeasurementUpdate(draggingMeasurementId, {
          end_x: imageCoords.x,
          end_y: imageCoords.y,
          pixel_length: pixelLength,
        });
      }
      return;
    }

    if (!isDrawing || activeTool === "select") return;
    setCurrentPoint(coords);

    if (activeTool === "select") {
      const selectedMeasurement = measurements.find(
        (m) => m.id === selectedMeasurementId
      );
      if (selectedMeasurement) {
        const x1 = selectedMeasurement.start_x * scale + offset.x;
        const y1 = selectedMeasurement.start_y * scale + offset.y;
        const x2 = selectedMeasurement.end_x * scale + offset.x;
        const y2 = selectedMeasurement.end_y * scale + offset.y;

        if (
          isNearPoint(coords.x, coords.y, x1, y1) ||
          isNearPoint(coords.x, coords.y, x2, y2)
        ) {
          canvas.style.cursor = "grab";
        } else {
          canvas.style.cursor = "crosshair";
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (draggingTextId) {
    setDraggingTextId(null);
    return;
  }
    if (draggingPoint) {
      setDraggingPoint(null);
      setDraggingMeasurementId(null);
      return;
    }

    if (!isDrawing || !startPoint || !currentPoint || activeTool === "select") {
      setIsDrawing(false);
      return;
    }

    const startImg = getImageCoordinates(startPoint.x, startPoint.y);
    const endImg = getImageCoordinates(currentPoint.x, currentPoint.y);

    const pixelLength = Math.sqrt(
      Math.pow(endImg.x - startImg.x, 2) + Math.pow(endImg.y - startImg.y, 2)
    );

    if (pixelLength > 5) {
      onMeasurementAdd({
        tool_type: activeTool,
        start_x: startImg.x,
        start_y: startImg.y,
        end_x: endImg.x,
        end_y: endImg.y,
        pixel_length: pixelLength,
        actual_value: null,
        unit: "px",
        label: null,
        color: "#000000",
        point_style: "round",
        text_position: "top",
        line_width: 2,
        font_size: 14,
        pointer_width: 5,
      });
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const distanceToLineSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-100 rounded-lg overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className={
          activeTool === "select" && selectedMeasurementId
            ? "cursor-grab"
            : "cursor-crosshair"
        }
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
