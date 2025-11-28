"use client";

import { useMemo } from "react";
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
import { ArrowRight, ArrowDown, Circle } from "lucide-react";

// ============= TYPE DEFINITIONS =============

// Chart types
export interface ChartData {
  visual_type: "chart";
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

// Flowchart / Process diagram
export interface FlowchartData {
  visual_type: "flowchart";
  title: string;
  direction?: "horizontal" | "vertical";
  nodes: Array<{
    id: string;
    label: string;
    description?: string;
    type?: "start" | "process" | "decision" | "end";
  }>;
  connections?: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
}

// Concept map / Mind map
export interface ConceptMapData {
  visual_type: "concept_map";
  title: string;
  central_concept: string;
  branches: Array<{
    topic: string;
    description?: string;
    color?: string;
    subtopics?: Array<{
      name: string;
      detail?: string;
    }>;
  }>;
}

// Hierarchy / Tree diagram
export interface HierarchyData {
  visual_type: "hierarchy";
  title: string;
  root: {
    label: string;
    children?: HierarchyNode[];
  };
}

interface HierarchyNode {
  label: string;
  description?: string;
  children?: HierarchyNode[];
}

// Timeline
export interface TimelineData {
  visual_type: "timeline";
  title: string;
  events: Array<{
    label: string;
    description?: string;
    date?: string;
  }>;
}

// Comparison table
export interface ComparisonData {
  visual_type: "comparison";
  title: string;
  items: Array<{
    name: string;
    properties: Record<string, string>;
  }>;
}

// Union type for all visuals
export type VisualData = 
  | ChartData 
  | FlowchartData 
  | ConceptMapData 
  | HierarchyData 
  | TimelineData 
  | ComparisonData;

// ============= COLOR PALETTE =============

const COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#14b8a6", // teal-500
  "#a855f7", // purple-500
];

// Node colors for flowcharts - keeping for future use
// const NODE_COLORS = {
//   start: "#10b981",
//   process: "#3b82f6",
//   decision: "#f59e0b",
//   end: "#ef4444",
//   default: "#6b7280",
// };

// ============= CHART RENDERER =============

function ChartRenderer({ data }: { data: ChartData }) {
  const formattedData = data.data_points.map((point, index) => ({
    name: point.label,
    value: point.value,
    fill: point.color || COLORS[index % COLORS.length],
  }));

  const renderChart = () => {
    switch (data.chart_type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
              <XAxis
                dataKey="name"
                stroke="#a3a3a3"
                tick={{ fill: "#a3a3a3", fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#a3a3a3" tick={{ fill: "#a3a3a3", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#262626", border: "1px solid #404040", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#10b981" }}
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
              <XAxis dataKey="name" stroke="#a3a3a3" tick={{ fill: "#a3a3a3", fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a3a3a3" tick={{ fill: "#a3a3a3", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#262626", border: "1px solid #404040", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }} />
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
                dataKey="value"
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#262626", border: "1px solid #404040", borderRadius: "8px" }} />
              <Legend wrapperStyle={{ color: "#a3a3a3" }} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-neutral-900/50 rounded-xl p-4 border border-neutral-700">
      {data.title && <h3 className="text-white font-semibold text-center mb-4">{data.title}</h3>}
      {renderChart()}
    </div>
  );
}

// ============= FLOWCHART RENDERER =============

function FlowchartRenderer({ data }: { data: FlowchartData }) {
  const isVertical = data.direction === "vertical";

  return (
    <div className="w-full bg-neutral-900/50 rounded-xl p-5 border border-neutral-700">
      {data.title && <h3 className="text-white font-semibold text-center mb-6">{data.title}</h3>}
      
      <div className={`flex ${isVertical ? "flex-col" : "flex-row flex-wrap"} items-center justify-center gap-2`}>
        {data.nodes.map((node, index) => (
          <div key={node.id} className={`flex ${isVertical ? "flex-col" : "flex-row"} items-center`}>
            {/* Node */}
            <div
              className={`
                px-4 py-3 rounded-lg border-2 text-center min-w-[120px] max-w-[200px]
                ${node.type === "start" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : ""}
                ${node.type === "end" ? "bg-red-500/20 border-red-500 text-red-400" : ""}
                ${node.type === "decision" ? "bg-amber-500/20 border-amber-500 text-amber-400 rotate-0" : ""}
                ${node.type === "process" || !node.type ? "bg-blue-500/20 border-blue-500 text-blue-400" : ""}
              `}
            >
              <p className="font-medium text-sm">{node.label}</p>
              {node.description && (
                <p className="text-xs opacity-70 mt-1">{node.description}</p>
              )}
            </div>
            
            {/* Arrow (if not last node) */}
            {index < data.nodes.length - 1 && (
              <div className={`${isVertical ? "py-2" : "px-2"} text-neutral-500`}>
                {isVertical ? <ArrowDown className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= CONCEPT MAP RENDERER =============

function ConceptMapRenderer({ data }: { data: ConceptMapData }) {
  return (
    <div className="w-full bg-neutral-900/50 rounded-xl p-5 border border-neutral-700">
      {data.title && <h3 className="text-white font-semibold text-center mb-6">{data.title}</h3>}
      
      {/* Central concept */}
      <div className="flex flex-col items-center">
        <div className="px-6 py-4 bg-emerald-500/20 border-2 border-emerald-500 rounded-xl text-emerald-400 font-bold text-lg text-center mb-6">
          {data.central_concept}
        </div>
        
        {/* Branches */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {data.branches.map((branch, index) => (
            <div
              key={index}
              className="rounded-lg border p-4 transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: `${branch.color || COLORS[index % COLORS.length]}15`,
                borderColor: branch.color || COLORS[index % COLORS.length],
              }}
            >
              <h4 
                className="font-semibold text-sm mb-2"
                style={{ color: branch.color || COLORS[index % COLORS.length] }}
              >
                {branch.topic}
              </h4>
              {branch.description && (
                <p className="text-neutral-400 text-xs mb-3">{branch.description}</p>
              )}
              
              {/* Subtopics */}
              {branch.subtopics && branch.subtopics.length > 0 && (
                <div className="space-y-2 mt-2 border-t border-neutral-700 pt-2">
                  {branch.subtopics.map((sub, subIndex) => (
                    <div key={subIndex} className="flex items-start gap-2">
                      <Circle 
                        className="h-2 w-2 mt-1.5 shrink-0" 
                        style={{ color: branch.color || COLORS[index % COLORS.length] }}
                        fill="currentColor"
                      />
                      <div>
                        <span className="text-neutral-300 text-xs font-medium">{sub.name}</span>
                        {sub.detail && (
                          <span className="text-neutral-500 text-xs ml-1">- {sub.detail}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= HIERARCHY RENDERER =============

function HierarchyNode({ node, level = 0 }: { node: HierarchyNode; level?: number }) {
  const color = COLORS[level % COLORS.length];
  
  return (
    <div className="ml-4">
      <div 
        className="flex items-center gap-2 py-1.5 px-3 rounded-lg mb-1 border-l-2"
        style={{ borderColor: color, backgroundColor: `${color}10` }}
      >
        <Circle className="h-2 w-2" style={{ color }} fill="currentColor" />
        <span className="text-neutral-200 text-sm font-medium">{node.label}</span>
        {node.description && (
          <span className="text-neutral-500 text-xs">- {node.description}</span>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="ml-2 border-l border-neutral-700 pl-2">
          {node.children.map((child, index) => (
            <HierarchyNode key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyRenderer({ data }: { data: HierarchyData }) {
  return (
    <div className="w-full bg-neutral-900/50 rounded-xl p-5 border border-neutral-700">
      {data.title && <h3 className="text-white font-semibold text-center mb-4">{data.title}</h3>}
      
      <div className="py-2">
        <div className="flex items-center gap-2 py-2 px-4 bg-emerald-500/20 border border-emerald-500 rounded-lg mb-3">
          <Circle className="h-3 w-3 text-emerald-500" fill="currentColor" />
          <span className="text-emerald-400 font-semibold">{data.root.label}</span>
        </div>
        {data.root.children && data.root.children.map((child, index) => (
          <HierarchyNode key={index} node={child} level={0} />
        ))}
      </div>
    </div>
  );
}

// ============= TIMELINE RENDERER =============

function TimelineRenderer({ data }: { data: TimelineData }) {
  return (
    <div className="w-full bg-neutral-900/50 rounded-xl p-5 border border-neutral-700">
      {data.title && <h3 className="text-white font-semibold text-center mb-6">{data.title}</h3>}
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-blue-500 to-violet-500" />
        
        {/* Events */}
        <div className="space-y-4">
          {data.events.map((event, index) => (
            <div key={index} className="flex items-start gap-4 pl-2">
              {/* Dot */}
              <div 
                className="w-5 h-5 rounded-full border-2 bg-neutral-900 shrink-0 z-10"
                style={{ borderColor: COLORS[index % COLORS.length] }}
              />
              
              {/* Content */}
              <div 
                className="flex-1 p-3 rounded-lg border"
                style={{ 
                  borderColor: `${COLORS[index % COLORS.length]}50`,
                  backgroundColor: `${COLORS[index % COLORS.length]}10`
                }}
              >
                {event.date && (
                  <span 
                    className="text-xs font-medium"
                    style={{ color: COLORS[index % COLORS.length] }}
                  >
                    {event.date}
                  </span>
                )}
                <h4 className="text-neutral-200 font-medium text-sm">{event.label}</h4>
                {event.description && (
                  <p className="text-neutral-400 text-xs mt-1">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= COMPARISON TABLE RENDERER =============

function ComparisonRenderer({ data }: { data: ComparisonData }) {
  // Get all unique properties
  const allProperties = useMemo(() => {
    const props = new Set<string>();
    data.items.forEach(item => {
      Object.keys(item.properties).forEach(key => props.add(key));
    });
    return Array.from(props);
  }, [data.items]);

  return (
    <div className="w-full bg-neutral-900/50 rounded-xl p-5 border border-neutral-700 overflow-x-auto">
      {data.title && <h3 className="text-white font-semibold text-center mb-4">{data.title}</h3>}
      
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-700">
            <th className="text-left py-2 px-3 text-neutral-400 font-medium">Feature</th>
            {data.items.map((item, index) => (
              <th 
                key={index} 
                className="text-center py-2 px-3 font-semibold"
                style={{ color: COLORS[index % COLORS.length] }}
              >
                {item.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allProperties.map((prop, propIndex) => (
            <tr key={propIndex} className="border-b border-neutral-800">
              <td className="py-2 px-3 text-neutral-300">{prop}</td>
              {data.items.map((item, itemIndex) => (
                <td key={itemIndex} className="text-center py-2 px-3 text-neutral-400">
                  {item.properties[prop] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============= MAIN VISUAL RENDERER =============

interface VisualRendererProps {
  visual: VisualData;
}

export function VisualRenderer({ visual }: VisualRendererProps) {
  switch (visual.visual_type) {
    case "chart":
      return <ChartRenderer data={visual} />;
    case "flowchart":
      return <FlowchartRenderer data={visual} />;
    case "concept_map":
      return <ConceptMapRenderer data={visual} />;
    case "hierarchy":
      return <HierarchyRenderer data={visual} />;
    case "timeline":
      return <TimelineRenderer data={visual} />;
    case "comparison":
      return <ComparisonRenderer data={visual} />;
    default:
      return null;
  }
}

// ============= PARSER =============

export function parseVisualFromContent(content: string): { text: string; visual: VisualData | null } {
  try {
    // Look for JSON code block
    const jsonBlockMatch = content.match(/```(?:json|chart|visual)\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1].trim());
        
        // Detect visual type and normalize
        if (parsed.visual_type) {
          const text = content.replace(/```(?:json|chart|visual)\s*[\s\S]*?```/, "").trim();
          return { text, visual: normalizeVisual(parsed) };
        }
        
        // Legacy chart format (chart_type without visual_type)
        if (parsed.chart_type && parsed.data_points) {
          const visual: ChartData = {
            visual_type: "chart",
            chart_type: parsed.chart_type,
            title: parsed.title || "",
            x_axis_label: parsed.x_axis_label,
            y_axis_label: parsed.y_axis_label,
            data_points: parsed.data_points.map((dp: { label?: string; name?: string; value?: number; color?: string }) => ({
              label: dp.label || dp.name || "Unknown",
              value: Number(dp.value || 0),
              color: dp.color
            }))
          };
          const text = content.replace(/```(?:json|chart|visual)\s*[\s\S]*?```/, "").trim();
          return { text, visual };
        }
      } catch {
        console.log("Failed to parse visual JSON");
      }
    }

    return { text: content, visual: null };
  } catch {
    return { text: content, visual: null };
  }
}

interface ParsedVisual {
  visual_type?: string;
  chart_type?: string;
  title?: string;
  x_axis_label?: string;
  y_axis_label?: string;
  data_points?: Array<{ label?: string; name?: string; value?: number; color?: string }>;
  nodes?: Array<unknown>;
  connections?: Array<unknown>;
  branches?: Array<unknown>;
  root?: { label: string };
  events?: Array<unknown>;
  items?: Array<unknown>;
}

function normalizeVisual(parsed: ParsedVisual): VisualData {
  switch (parsed.visual_type) {
    case "chart":
      return {
        ...parsed,
        visual_type: "chart",
        chart_type: (parsed as ChartData).chart_type || "bar",
        title: parsed.title || "",
        data_points: parsed.data_points?.map((dp: { label?: string; name?: string; value?: number; color?: string }) => ({
          label: dp.label || dp.name || "Unknown",
          value: Number(dp.value || 0),
          color: dp.color
        })) || []
      } as ChartData;
    case "flowchart":
      return {
        ...parsed,
        visual_type: "flowchart",
        title: parsed.title || "",
        nodes: parsed.nodes || [],
        connections: parsed.connections || []
      } as FlowchartData;
    case "concept_map":
      return {
        ...parsed,
        visual_type: "concept_map",
        title: parsed.title || "",
        central_concept: (parsed as ConceptMapData).central_concept || "",
        branches: parsed.branches || []
      } as ConceptMapData;
    case "hierarchy":
      return {
        ...parsed,
        visual_type: "hierarchy",
        title: parsed.title || "",
        root: parsed.root || { label: "Root" }
      } as HierarchyData;
    case "timeline":
      return {
        ...parsed,
        visual_type: "timeline",
        title: parsed.title || "",
        events: parsed.events || []
      } as TimelineData;
    case "comparison":
      return {
        ...parsed,
        visual_type: "comparison",
        title: parsed.title || "",
        items: parsed.items || []
      } as ComparisonData;
    default:
      return parsed as VisualData;
  }
}
