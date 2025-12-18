import { MousePointer, Minus, Ruler, Move, Copy } from "lucide-react";

interface ToolbarProps {
  activeTool: "select" | "line" | "ruler" | "move" | "copy";
  onToolChange: (tool: "select" | "line" | "ruler" | "move" | "copy") => void;
  hasMeasurements:boolean
}

export function Toolbar({ activeTool, onToolChange,hasMeasurements }: ToolbarProps) {
  const tools = [
    { id: "select" as const, icon: MousePointer, label: "Select" },
    { id: "line" as const, icon: Minus, label: "Line" },
    { id: "ruler" as const, icon: Ruler, label: "Ruler" },
    { id: "move" as const, icon: Move, label: "Move",disabled:!hasMeasurements },
  ];

  return (
    <div className="flex gap-2 p-4 bg-white border-b border-gray-200">
      {tools.map((tool) => (
        <button
          key={tool.id}
           onClick={() => !tool.disabled && onToolChange(tool.id)}
           className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTool === tool.id
              ? 'bg-blue-600 text-white'
              : tool.disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={tool.disabled ? 'Add measurements first' : tool.label}
          disabled={tool.disabled}
        >
          <tool.icon className="w-5 h-5" />
          <span className="font-medium">{tool.label}</span>
        </button>
      ))}
    </div>
  );
}
