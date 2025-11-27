"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Chart data structure matching backend schema
export interface ChartData {
  chart_type: "bar" | "line" | "pie";
  title: string;
  x_axis_label?: string;
  y_axis_label?: string;
  data_points: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
}

interface ChartRendererProps {
  chart: ChartData;
}

// Color palette for charts
const COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

export function ChartRenderer({ chart }: ChartRendererProps) {
  const { chart_type, title, x_axis_label, y_axis_label, data_points } = chart;

  // Transform data for recharts
  const formattedData = data_points.map((point, index) => ({
    name: point.label,
    value: point.value,
    fill: point.color || COLORS[index % COLORS.length],
  }));

  const renderChart = () => {
    switch (chart_type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
              <XAxis
                dataKey="name"
                stroke="#a3a3a3"
                tick={{ fill: "#a3a3a3", fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                label={x_axis_label ? { value: x_axis_label, position: "bottom", fill: "#a3a3a3", offset: 40 } : undefined}
              />
              <YAxis
                stroke="#a3a3a3"
                tick={{ fill: "#a3a3a3", fontSize: 12 }}
                label={y_axis_label ? { value: y_axis_label, angle: -90, position: "insideLeft", fill: "#a3a3a3" } : undefined}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#262626",
                  border: "1px solid #404040",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
              <XAxis
                dataKey="name"
                stroke="#a3a3a3"
                tick={{ fill: "#a3a3a3", fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                label={x_axis_label ? { value: x_axis_label, position: "bottom", fill: "#a3a3a3", offset: 40 } : undefined}
              />
              <YAxis
                stroke="#a3a3a3"
                tick={{ fill: "#a3a3a3", fontSize: 12 }}
                label={y_axis_label ? { value: y_axis_label, angle: -90, position: "insideLeft", fill: "#a3a3a3" } : undefined}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#262626",
                  border: "1px solid #404040",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={formattedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#262626",
                  border: "1px solid #404040",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend
                wrapperStyle={{ color: "#a3a3a3" }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <p className="text-neutral-400">Unknown chart type</p>;
    }
  };

  return (
    <div className="w-full bg-neutral-900 rounded-xl p-4 border border-neutral-700">
      {title && (
        <h3 className="text-white font-semibold text-center mb-4">{title}</h3>
      )}
      {renderChart()}
    </div>
  );
}

// Helper to check if content contains a chart
export function parseChartFromContent(content: string): { text: string; chart: ChartData | null } {
  try {
    // Look for JSON code block with chart data (```json or ```chart)
    const jsonBlockMatch = content.match(/```(?:json|chart)\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      try {
        const chartJson = jsonBlockMatch[1].trim();
        const parsed = JSON.parse(chartJson);
        
        // Validate it's a chart object
        if (parsed.chart_type && parsed.data_points && Array.isArray(parsed.data_points)) {
          // Normalize data_points to use 'label' key
          const normalizedChart: ChartData = {
            chart_type: parsed.chart_type,
            title: parsed.title || "",
            x_axis_label: parsed.x_axis_label,
            y_axis_label: parsed.y_axis_label,
            data_points: parsed.data_points.map((dp: any) => ({
              label: dp.label || dp.name || dp.category || String(dp.x) || "Unknown",
              value: Number(dp.value || dp.y || dp.count || 0),
              color: dp.color
            }))
          };
          
          // Remove the JSON block from text
          const text = content.replace(/```(?:json|chart)\s*[\s\S]*?```/, "").trim();
          return { text, chart: normalizedChart };
        }
      } catch (e) {
        console.log("Failed to parse chart JSON:", e);
      }
    }

    // Try to find inline JSON chart object (without code blocks)
    const inlineJsonMatch = content.match(/\{[^{}]*"chart_type"\s*:\s*"(?:bar|line|pie)"[^{}]*"data_points"\s*:\s*\[[^\]]*\][^{}]*\}/);
    if (inlineJsonMatch) {
      try {
        const parsed = JSON.parse(inlineJsonMatch[0]);
        if (parsed.chart_type && parsed.data_points) {
          const normalizedChart: ChartData = {
            chart_type: parsed.chart_type,
            title: parsed.title || "",
            x_axis_label: parsed.x_axis_label,
            y_axis_label: parsed.y_axis_label,
            data_points: parsed.data_points.map((dp: any) => ({
              label: dp.label || dp.name || dp.category || "Unknown",
              value: Number(dp.value || dp.count || 0),
              color: dp.color
            }))
          };
          const text = content.replace(inlineJsonMatch[0], "").trim();
          return { text, chart: normalizedChart };
        }
      } catch {
        // Not valid chart JSON
      }
    }

    return { text: content, chart: null };
  } catch (e) {
    return { text: content, chart: null };
  }
}
