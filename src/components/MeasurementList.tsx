import { Trash2, Edit3 } from "lucide-react";
import { Measurement } from "../lib/supabase";

interface MeasurementListProps {
  measurements: Measurement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Measurement>) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editValues: {
    actual_value: string;
    label: string;
    color: string;
    point_style: "round" | "arrow" | "square" | "diamond";
    text_position: "top" | "bottom" | "left" | "right";
    line_width: number;
    font_size: number;
    pointer_width: number;
  } | null;
  setEditValues: (
    values: {
      actual_value: string;
      label: string;
      color: string;
      point_style: "round" | "arrow" | "square" | "diamond";
      text_position: "top" | "bottom" | "left" | "right";
      line_width: number;
      font_size: number;
      pointer_width: number;
    } | null
  ) => void;
}
export function MeasurementList({
  measurements,
  selectedId,
  onSelect,
  onDelete,
  onUpdate,
  editingId,
  setEditValues,
  setEditingId,
  editValues,
}: MeasurementListProps) {
  // const [editingId, setEditingId] = useState<string | null>(null);
  // const [editValues, setEditValues] = useState<{
  //   actual_value: string;
  //   // unit: string;
  //   label: string;
  //   color: string;
  //   point_style: "round" | "arrow" | "square" | "diamond";
  //   text_position: "top" | "bottom" | "left" | "right";
  //   line_width: number;
  //   font_size: number;
  //   pointer_width: number;
  // }>({
  //   actual_value: "",
  //   // unit: 'cm',
  //   label: "",
  //   color: "#000000",
  //   point_style: "round",
  //   font_size: 14,
  //   text_position: "top",
  //   pointer_width: 5,
  //   line_width: 2,
  // });

  const handleEdit = (m: Measurement) => {
    setEditingId(m.id);
    setEditValues({
      actual_value: m.actual_value?.toString() || "",
      // unit: m.unit,
      label: m.label || "",
      color: m.color,
      point_style: m.point_style,
      text_position: m.text_position,
      line_width: m.line_width,
      pointer_width: m.pointer_width || 5,
      font_size: m.font_size || 14,
    });
  };

  const handleSave = (id: string) => {
    if (!editValues) return;
    onUpdate(id, {
      actual_value: editValues?.actual_value || null,
      // unit: editValues.unit,
      label: editValues.label || null,
      color: editValues.color,
      point_style: editValues.point_style,
      text_position: editValues.text_position,
      line_width: editValues.line_width,
      font_size: editValues.font_size,
      pointer_width: editValues.pointer_width,
    });
    setEditingId(null);
    setEditValues(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues(null);
  };

  if (measurements.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No measurements yet</p>
        <p className="text-sm mt-2">Use the tools above to add measurements</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {measurements.map((m, index) => (
        <div
          key={m.id}
          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
            selectedId === m.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
          }`}
          onClick={() => onSelect(m.id)}
        >
          {editingId === m.id && editValues ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">
                  Measurement #{index + 1}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={editValues.label}
                    onChange={(e) =>
                      setEditValues({ ...editValues, label: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional label"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value(Press enter for new line)
                    </label>
                    <textarea
                      value={editValues.actual_value}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          actual_value: e.target.value,
                        })
                      }
                      onKeyDown={(e)=>{
                        if(e.key==='Enter')
                        {
                          e.stopPropagation()
                        }
                      }}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Enter value(press Enter for new line)" rows={3}
                    />
                  </div>

                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      value={editValues.unit}
                      onChange={(e) =>
                        setEditValues({ ...editValues, unit: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="px">Pixels</option>
                      <option value="cm">Centimeters</option>
                      <option value="mm">Millimeters</option>
                      <option value="in">Inches</option>
                      <option value="m">Meters</option>
                      <option value="ft">Feet</option>
                    </select>
                  </div> */}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line Color
                    </label>
                    <input
                      type="color"
                      value={editValues.color}
                      onChange={(e) =>
                        setEditValues({ ...editValues, color: e.target.value })
                      }
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line Width
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={editValues.line_width}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          line_width: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Size
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="48"
                    value={editValues.font_size}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        font_size: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pointer Size
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={editValues.pointer_width}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        pointer_width: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Point Style
                    </label>
                    <select
                      value={editValues.point_style}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          point_style: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="round">Round</option>
                      <option value="square">Square</option>
                      <option value="diamond">Diamond</option>
                      <option value="arrow">Arrow</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text Position
                    </label>
                    <select
                      value={editValues.text_position}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          text_position: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(m.id)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700">
                  Measurement #{index + 1}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(m);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(m.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                {m.label && (
                  <div className="text-gray-900 font-medium">{m.label}</div>
                )}
                <div className="text-gray-600">
                  Pixel Length: {m.pixel_length.toFixed(2)}px
                </div>
                {m.actual_value && (
                  <div className="text-gray-900 font-medium whitespace-pre-line">
                    Actual: {m.actual_value}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <div
                    className="w-4 h-4 border border-gray-400 rounded"
                    style={{ backgroundColor: m.color }}
                  />
                  <span>Color: {m.color}</span>
                </div>
                <div className="text-gray-500 text-xs">
                  Style: {m.point_style} • Position: {m.text_position}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
