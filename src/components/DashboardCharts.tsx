import React, { useState } from "react";
import { Order, Purchase, Expense } from "../types";
import { formatCurrency } from "../data";

interface ChartsProps {
  sales: Order[];
  purchases: Purchase[];
  expenses: Expense[];
}

export const DashboardCharts: React.FC<ChartsProps> = ({ sales, purchases, expenses }) => {
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [hoveredDoughnutIndex, setHoveredDoughnutIndex] = useState<number | null>(null);

  // ----------------------------------------------------
  // CHART 1: Daily Sales & Profit (Area / Line Chart)
  // ----------------------------------------------------
  // Extract last 7 days of active sales
  const dailyData: { [date: string]: { sales: number; profit: number } } = {};
  
  // Only look at Delivered sales for revenue, and calculate benefit
  sales.forEach(s => {
    let d = s["Order date"] || "-";
    if (d === "-") return;
    if (d.includes("T")) {
      d = d.split("T")[0];
    } else if (d.includes(" ")) {
      d = d.split(" ")[0];
    }
    if (!dailyData[d]) dailyData[d] = { sales: 0, profit: 0 };
    
    if (s.delivery === "Delivered") {
      dailyData[d].sales += (s["Total price"] || 0);
      dailyData[d].profit += (s["Bénéfice"] || 0);
    }
  });

  const sortedDates = Object.keys(dailyData).sort().slice(-7);
  const chart1Data = sortedDates.map(date => ({
    date: date.substring(5), // MM-DD
    fullDate: date,
    sales: dailyData[date].sales,
    profit: dailyData[date].profit
  }));

  const maxVal = Math.max(...chart1Data.map(d => Math.max(d.sales, d.profit, 100)), 1000);

  // ----------------------------------------------------
  // CHART 2: Condition / Delivery Distribution (Doughnut)
  // ----------------------------------------------------
  const conditionDistribution: { [cond: string]: number } = {};
  sales.forEach(s => {
    const status = s.delivery || s.Condition || "أخرى";
    if (status) {
      conditionDistribution[status] = (conditionDistribution[status] || 0) + 1;
    }
  });

  const doughnutColors: { [key: string]: string } = {
    "Delivered": "#10b981", // green
    "Retour": "#ec4899", // pink
    "annuler": "#ef4444", // red
    "Client Injoignable": "#f97316", // orange
    "Annulé Au Téléphone": "#dc2626", // strong red
    "Annulé Sur Place": "#b91c1c", // dark red
    "Confirmed": "#06b6d4", // cyan
    "Call again": "#f59e0b", // yellow
    "WHATSAPP": "#25d366", // whatsapp green
    "Ne repond pas": "#6366f1", // purple
    "Anule": "#ef4444" // red
  };

  const doughnutData = Object.keys(conditionDistribution).map(key => ({
    name: key,
    count: conditionDistribution[key],
    color: doughnutColors[key] || "#aaaaaa"
  })).sort((a, b) => b.count - a.count);

  const totalDoughnutCount = doughnutData.reduce((acc, d) => acc + d.count, 0);

  // Calculate Doughnut Segments
  let cumulativePercent = 0;
  const segments = doughnutData.map(d => {
    const percent = totalDoughnutCount > 0 ? d.count / totalDoughnutCount : 0;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    return {
      ...d,
      startPercent,
      percent
    };
  });

  // ----------------------------------------------------
  // CHART 3: Top 10 Cities (Horizontal Bar)
  // ----------------------------------------------------
  const cityCounts: { [city: string]: number } = {};
  sales.forEach(s => {
    if (s.City) {
      cityCounts[s.City] = (cityCounts[s.City] || 0) + 1;
    }
  });

  const topCities = Object.keys(cityCounts)
    .map(city => ({ name: city, count: cityCounts[city] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Section 9, Rule 17: "Top cities chart = 10 entries"

  const maxCityCount = Math.max(...topCities.map(c => c.count), 1);

  // ----------------------------------------------------
  // CHART 4: Operational Costs Breakdown (Vertical comparison)
  // ----------------------------------------------------
  // Compare total Achat costs vs delivery fees vs profit on Delivered sales
  let totalDeliveredAchatCost = 0;
  let totalDeliveredShippingCost = 0;
  let totalDeliveredProfit = 0;

  sales.forEach(s => {
    if (s.delivery === "Delivered") {
      totalDeliveredAchatCost += (s["Fourni price"] || 0);
      totalDeliveredShippingCost += (s["Frais livraison"] || 40);
      totalDeliveredProfit += (s["Bénéfice"] || 0);
    }
  });

  const financialStats = [
    { label: "تكلفة المنتج (Achat)", value: totalDeliveredAchatCost, color: "bg-rose-500", svgColor: "#f43f5e" },
    { label: "شحن (Frais Livraison)", value: totalDeliveredShippingCost, color: "bg-amber-500", svgColor: "#f59e0b" },
    { label: "صافي ربح المبيعات", value: totalDeliveredProfit, color: "bg-emerald-500", svgColor: "#10b981" }
  ];

  const maxFinVal = Math.max(...financialStats.map(f => f.value), 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-charts-grid">
      {/* Chart 1: Daily Revenue & Benefit */}
      <div className="bg-[#111930]/65 border border-white/5 rounded-2xl p-5 shadow-xl transition-all hover:border-white/10 glass-effect">
        <h3 className="text-gray-200 text-sm font-medium mb-4 flex items-center justify-between">
          <span>المبيعات اليومية والأرباح (آخر 7 أيام)</span>
          <span className="text-xs text-blue-400 font-mono">اليومية</span>
        </h3>
        {chart1Data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500 text-xs">لا توجد بيانات كافية لعرض المبيعات اليومية</div>
        ) : (
          <div className="relative">
            <svg viewBox="0 0 500 240" className="w-full h-64 overflow-visible">
              {/* Grid Lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={i}
                  x1="40"
                  y1={30 + i * 40}
                  x2="480"
                  y2={30 + i * 40}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}

              {/* Grid Values Left */}
              {[0, 1, 2, 3, 4].map((i) => {
                const val = Math.round(maxVal - (maxVal / 4) * i);
                return (
                  <text
                    key={i}
                    x="10"
                    y={35 + i * 40}
                    fill="rgba(156,163,175,0.6)"
                    fontSize="10"
                    fontFamily="Outfit"
                    textAnchor="start"
                  >
                    {val}
                  </text>
                );
              })}

              {/* Area & Line path for Sales (Revenue) */}
              <path
                d={chart1Data.reduce((acc, curr, index) => {
                  const x = 50 + index * 70;
                  const y = 190 - (curr.sales / maxVal) * 150;
                  return acc + (index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
                }, "") + ` L ${50 + (chart1Data.length - 1) * 70} 190 L 50 190 Z`}
                fill="url(#salesGrad)"
                opacity="0.15"
              />
              <path
                d={chart1Data.reduce((acc, curr, index) => {
                  const x = 50 + index * 70;
                  const y = 190 - (curr.sales / maxVal) * 150;
                  return acc + (index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
                }, "")}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Area & Line path for Profit */}
              <path
                d={chart1Data.reduce((acc, curr, index) => {
                  const x = 50 + index * 70;
                  const y = 190 - (curr.profit / maxVal) * 150;
                  return acc + (index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
                }, "") + ` L ${50 + (chart1Data.length - 1) * 70} 190 L 50 190 Z`}
                fill="url(#profitGrad)"
                opacity="0.15"
              />
              <path
                d={chart1Data.reduce((acc, curr, index) => {
                  const x = 50 + index * 70;
                  const y = 190 - (curr.profit / maxVal) * 150;
                  return acc + (index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
                }, "")}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Interactive Points */}
              {chart1Data.map((d, index) => {
                const x = 50 + index * 70;
                const ySales = 190 - (d.sales / maxVal) * 150;
                const yProfit = 190 - (d.profit / maxVal) * 150;
                const isHovered = hoveredLineIndex === index;

                return (
                  <g key={index} onMouseEnter={() => setHoveredLineIndex(index)} onMouseLeave={() => setHoveredLineIndex(null)} className="cursor-pointer">
                    {/* Sales Point */}
                    <circle cx={x} cy={ySales} r={isHovered ? 6 : 4} fill="#3b82f6" stroke="#070a13" strokeWidth="2" />
                    {/* Profit Point */}
                    <circle cx={x} cy={yProfit} r={isHovered ? 6 : 4} fill="#10b981" stroke="#070a13" strokeWidth="2" />
                    
                    {/* Date label */}
                    <text x={x} y="215" fill="rgba(156,163,175,0.8)" fontSize="10" fontFamily="Outfit" textAnchor="middle">
                      {d.date}
                    </text>
                  </g>
                );
              })}

              {/* Gradients */}
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" className="text-emerald-500" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Hover Tooltip inside lines */}
            {hoveredLineIndex !== null && chart1Data[hoveredLineIndex] && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#0d1426] border border-white/10 rounded-lg p-2.5 shadow-xl flex gap-4 text-[11px] text-right font-sans glass-effect animate-fade-in z-10 font-medium">
                <div>
                  <span className="text-gray-400">التاريخ: </span>
                  <span className="text-gray-200 font-mono">{chart1Data[hoveredLineIndex].fullDate}</span>
                </div>
                <div className="border-r border-white/5 pr-4">
                  <span className="text-blue-400">المبيعات: </span>
                  <span className="text-gray-100 font-mono">{formatCurrency(chart1Data[hoveredLineIndex].sales)}</span>
                </div>
                <div className="border-r border-white/5 pr-4">
                  <span className="text-emerald-400">الربح: </span>
                  <span className="text-gray-100 font-mono">{formatCurrency(chart1Data[hoveredLineIndex].profit)}</span>
                </div>
              </div>
            )}
            
            {/* Chart Legend */}
            <div className="flex gap-4 items-center justify-center mt-2 text-xs">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-3 h-1.5 rounded bg-blue-500 block"></span> المبيعات الإجمالية
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-3 h-1.5 rounded bg-emerald-50 block"></span> صافي الأرباح
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chart 2: Conditions / Distribution Pie */}
      <div className="bg-[#111930]/65 border border-white/5 rounded-2xl p-5 shadow-xl transition-all hover:border-white/10 glass-effect">
        <h3 className="text-gray-200 text-sm font-medium mb-4 flex items-center justify-between">
          <span>الحالات ونسب التوصيل</span>
          <span className="text-xs text-pink-400 font-mono">الحالـة</span>
        </h3>
        {doughnutData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500 text-xs">لا تتوفر طلبيات لحساب النسب</div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* SVG Doughnut */}
            <div className="relative w-44 h-44 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {segments.map((seg, idx) => {
                  const r = 35;
                  const c = 2 * Math.PI * r;
                  const strokeDasharray = `${seg.percent * c} ${c}`;
                  const strokeDashoffset = -seg.startPercent * c;
                  const isHovered = hoveredDoughnutIndex === idx;

                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r={r}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 12 : 9}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredDoughnutIndex(idx)}
                      onMouseLeave={() => setHoveredDoughnutIndex(null)}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold font-mono text-gray-100">{totalDoughnutCount}</span>
                <span className="text-[10px] text-gray-400 font-medium">إجمالي الطلبيات</span>
              </div>
            </div>

            {/* Legends & Details */}
            <div className="flex-1 w-full max-h-56 overflow-y-auto space-y-2 pr-2">
              {segments.map((seg, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredDoughnutIndex(idx)}
                  onMouseLeave={() => setHoveredDoughnutIndex(null)}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                    hoveredDoughnutIndex === idx ? "bg-white/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: seg.color }}></span>
                    <span className="text-gray-300 font-medium truncate max-w-28">{seg.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-gray-400">
                    <span className="text-gray-200">{seg.count}</span>
                    <span className="text-gray-500 text-[10px]/none">({Math.round(seg.percent * 100)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chart 3: Top Cities (Horizontal Bar Progress Grid) */}
      <div className="bg-[#111930]/65 border border-white/5 rounded-2xl p-5 shadow-xl transition-all hover:border-white/10 glass-effect">
        <h3 className="text-gray-200 text-sm font-medium mb-4 flex items-center justify-between">
          <span>أعلى 10 مدن نشاطاً من حيث الطلب</span>
          <span className="text-xs text-cyan-400 font-mono">المدن</span>
        </h3>
        {topCities.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500 text-xs">لا تتوفر بيانات مدن كافية</div>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {topCities.map((city, idx) => {
              const widthPct = (city.count / maxCityCount) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-200 font-medium flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 font-mono">#{idx + 1}</span>
                      {city.name}
                    </span>
                    <span className="text-gray-400 font-mono font-semibold">{city.count} طلبيات</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart 4: Financial Operations Comparison */}
      <div className="bg-[#111930]/65 border border-white/5 rounded-2xl p-5 shadow-xl transition-all hover:border-white/10 glass-effect">
        <h3 className="text-gray-200 text-sm font-medium mb-4 flex items-center justify-between">
          <span>المقارنة والتحليل المالي للمبيعات المستلمة</span>
          <span className="text-xs text-amber-400 font-mono">التحليل المالي</span>
        </h3>
        <div className="h-64 flex items-end gap-8 px-4 pb-2">
          {financialStats.map((item, idx) => {
            const hPct = maxFinVal > 0 ? (item.value / maxFinVal) * 100 : 0;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                {/* Value Label */}
                <div className="text-[10px] font-mono text-gray-300 font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {formatCurrency(item.value)}
                </div>
                
                {/* Visual Bar with transition and glowing colors */}
                <div className="w-full bg-white/5 rounded-t-xl overflow-hidden flex flex-col justify-end" style={{ height: "65%" }}>
                  <div
                    className={`${item.color} w-full rounded-t-xl transition-all duration-1000 origin-bottom`}
                    style={{ height: `${hPct}%`, boxShadow: "0 -4px 12px rgba(0,0,0,0.1)" }}
                  />
                </div>

                {/* Subtitle Label */}
                <div className="text-center text-[11px] text-gray-400 font-medium line-clamp-1 truncate max-w-full">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
