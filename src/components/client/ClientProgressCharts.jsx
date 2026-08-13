import React from 'react';
import { useGymState } from '../../context/GymStateContext';
import { TrendingDown, Scale, Ruler, Award, CheckCircle2 } from 'lucide-react';

export default function ClientProgressCharts() {
  const { activeClient } = useGymState();

  if (!activeClient) return null;

  const history = activeClient.metricsHistory || [];

  // SVG Chart drawing helper for Weight
  const drawWeightChart = () => {
    if (history.length === 0) return null;

    // Chart dimensions
    const width = 340;
    const height = 150;
    const padding = 30;

    const weights = history.map(h => h.weight);
    const maxWeight = Math.max(...weights) + 2;
    const minWeight = Math.min(...weights) - 2;
    const weightRange = maxWeight - minWeight;

    // Map weights to SVG coordinates
    const points = history.map((h, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (history.length - 1);
      const y = height - padding - ((h.weight - minWeight) * (height - 2 * padding)) / weightRange;
      return { x, y, data: h };
    });

    // Build the SVG path string
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Build the gradient fill path string
    const fillPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9f29" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ff9f29" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines and label axis */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="1.5" />

        {/* Gradient fill */}
        <path d={fillPath} fill="url(#weightGrad)" />

        {/* Path line */}
        <path d={linePath} fill="none" stroke="#ff9f29" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="#white" stroke="#ff9f29" strokeWidth="2.5" className="cursor-pointer" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[10px] font-extrabold text-gray-700">
              {p.data.weight} lbs
            </text>
            <text x={p.x} y={height - 10} textAnchor="middle" className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              {p.data.date}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  // SVG Chart drawing helper for Measurements (Chest & Waist)
  const drawMeasurementsChart = () => {
    if (history.length === 0) return null;

    const width = 340;
    const height = 150;
    const padding = 30;

    // Combine values to find min/max
    const allVals = history.flatMap(h => [h.chest, h.waist]);
    const maxVal = Math.max(...allVals) + 2;
    const minVal = Math.min(...allVals) - 2;
    const valRange = maxVal - minVal;

    // Map to coordinates for Chest
    const chestPoints = history.map((h, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (history.length - 1);
      const y = height - padding - ((h.chest - minVal) * (height - 2 * padding)) / valRange;
      return { x, y, val: h.chest, label: h.date };
    });

    // Map to coordinates for Waist
    const waistPoints = history.map((h, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (history.length - 1);
      const y = height - padding - ((h.waist - minVal) * (height - 2 * padding)) / valRange;
      return { x, y, val: h.waist };
    });

    const chestPath = chestPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const waistPath = waistPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid base line */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="1.5" />

        {/* Chest Line (Teal) */}
        <path d={chestPath} fill="none" stroke="#00af87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Waist Line (Orange) */}
        <path d={waistPath} fill="none" stroke="#ff9f29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Chest dots and labels */}
        {chestPoints.map((p, idx) => (
          <g key={`c-${idx}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="#white" stroke="#00af87" strokeWidth="2" />
            <text x={p.x - 2} y={p.y - 8} textAnchor="end" className="text-[8px] font-extrabold text-[#00af87]">
              {p.val}"
            </text>
            <text x={p.x} y={height - 10} textAnchor="middle" className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              {p.label}
            </text>
          </g>
        ))}

        {/* Waist dots and labels */}
        {waistPoints.map((p, idx) => (
          <g key={`w-${idx}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="#white" stroke="#ff9f29" strokeWidth="2" />
            <text x={p.x + 2} y={p.y + 12} textAnchor="start" className="text-[8px] font-extrabold text-[#ff9f29]">
              {p.val}"
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      {/* Weight History Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff9f29] flex items-center justify-center">
              <Scale size={16} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">Weight Loss Trend</h4>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Body Weight over last 3 months</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#ff9f29] bg-orange-50 px-2.5 py-1 rounded-xl flex items-center gap-1">
            <TrendingDown size={12} /> -5 lbs
          </span>
        </div>

        <div className="py-2">
          {drawWeightChart()}
        </div>
      </div>

      {/* Measurements Card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00af87] flex items-center justify-center">
              <Ruler size={16} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">Size Measurements</h4>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Chest (Teal) vs Waist (Orange)</p>
            </div>
          </div>
          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Inches (")</span>
        </div>

        <div className="py-2">
          {drawMeasurementsChart()}
        </div>
      </div>

      {/* Goal Checklists card */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100">
        <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-1.5 mb-4">
          <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
          My Goals Progress
        </h4>

        <div className="space-y-3">
          {activeClient.goals.map((goal, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
              {idx === 0 ? (
                <div className="w-5 h-5 rounded-full bg-[#00af87] text-white flex items-center justify-center shadow-sm">
                  <CheckCircle2 size={13} className="fill-current text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-orange-100/50 text-[#ff9f29] flex items-center justify-center shadow-sm font-bold text-[10px]">
                  {idx + 1}
                </div>
              )}
              <span className={`text-xs font-semibold ${idx === 0 ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {goal}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
