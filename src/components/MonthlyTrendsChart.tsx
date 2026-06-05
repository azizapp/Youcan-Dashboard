import React, { useState } from "react";
import { Order } from "../types";
import { formatCurrency } from "../data";
import { Calendar, TrendingUp, DollarSign, Activity, Percent } from "lucide-react";

interface MonthlyTrendsChartProps {
  sales: Order[];
}

const ARABIC_MONTHS: { [key: number]: string } = {
  1: "يناير (Jan)",
  2: "فبراير (Feb)",
  3: "مارس (Mar)",
  4: "أبريل (Apr)",
  5: "ماي (May)",
  6: "يونيو (Jun)",
  7: "يوليو (Jul)",
  8: "أغسطس (Aug)",
  9: "سبتمبر (Sep)",
  10: "أكتوبر (Oct)",
  11: "نوفمبر (Nov)",
  12: "ديسمبر (Dec)"
};

export const MonthlyTrendsChart: React.FC<MonthlyTrendsChartProps> = ({ sales }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 1. Determine target Year & Month based on sales data or fallback to current local date
  let targetYear = 2026;
  let targetMonth = 5; // May

  const salesWithDates = sales.filter(s => s["Order date"] && s["Order date"].match(/^\d{4}-\d{2}-\d{2}/));
  if (salesWithDates.length > 0) {
    // Sort and grab latest
    const sortedDates = salesWithDates.map(s => {
      const d = s["Order date"];
      return d.includes("T") ? d.split("T")[0] : d.split(" ")[0];
    }).sort();
    const latestDateStr = sortedDates[sortedDates.length - 1];
    const parts = latestDateStr.split("-");
    targetYear = parseInt(parts[0], 10);
    targetMonth = parseInt(parts[1], 10);
  } else {
    const now = new Date();
    targetYear = now.getFullYear();
    targetMonth = now.getMonth() + 1;
  }

  // Calculate days in target month
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const yearStr = targetYear.toString();
  const monthStr = targetMonth.toString().padStart(2, '0');

  // 2. Aggregate data for all days in this target month
  const dailyData = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dayStr = day.toString().padStart(2, '0');
    const dateKey = `${yearStr}-${monthStr}-${dayStr}`;

    const daySales = sales.filter(s => {
      if (!s["Order date"]) return false;
      const cleanDate = s["Order date"].includes("T") ? s["Order date"].split("T")[0] : s["Order date"].split(" ")[0];
      return cleanDate === dateKey;
    });
    const deliveredSales = daySales.filter(s => s.delivery === "Delivered");

    const salesSum = deliveredSales.reduce((acc, s) => acc + (s["Total price"] || 0), 0);
    const profitSum = deliveredSales.reduce((acc, s) => acc + (s["Bénéfice"] || 0), 0);
    const orderCount = daySales.length;
    const deliveredCount = deliveredSales.length;

    return {
      day,
      dateLabel: `${dayStr}/${monthStr}`,
      fullDate: dateKey,
      sales: salesSum,
      profit: profitSum,
      orderCount,
      deliveredCount
    };
  });

  // 3. Find Monthly Summary Metrics
  const monthSalesTotal = dailyData.reduce((acc, d) => acc + d.sales, 0);
  const monthProfitTotal = dailyData.reduce((acc, d) => acc + d.profit, 0);
  const totalMonthOrders = dailyData.reduce((acc, d) => acc + d.orderCount, 0);
  const totalMonthDelivered = dailyData.reduce((acc, d) => acc + d.deliveredCount, 0);
  const monthlyDeliveryRate = totalMonthOrders > 0 ? (totalMonthDelivered / totalMonthOrders) * 100 : 0;

  // 4. Calculate Max value for scaling SVG vertical Axis
  const maxVal = Math.max(...dailyData.map(d => Math.max(d.sales, d.profit, 100)), 1000);

  // SVG dimensions
  const svgWidth = 900;
  const svgHeight = 280;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 40;
  const paddingBottom = 50;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinate getters
  const getX = (index: number) => {
    return paddingLeft + (index * chartWidth) / (daysInMonth - 1);
  };

  const getY = (value: number) => {
    return svgHeight - paddingBottom - (value / maxVal) * chartHeight;
  };

  // Generate path coordinates
  const salesPoints = dailyData.map((d, i) => ({ x: getX(i), y: getY(d.sales) }));
  const profitPoints = dailyData.map((d, i) => ({ x: getX(i), y: getY(d.profit) }));

  // Create SVG path strings
  const getLinePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
  };

  const getAreaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    const line = getLinePath(points);
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baseY = svgHeight - paddingBottom;
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const salesLinePath = getLinePath(salesPoints);
  const salesAreaPath = getAreaPath(salesPoints);

  const profitLinePath = getLinePath(profitPoints);
  const profitAreaPath = getAreaPath(profitPoints);

  return (
    <div className="bg-[#111930]/65 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden glass-effect transition-all hover:border-white/10 text-right dir-rtl">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-gray-100 text-base font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>مخطط تطور المبيعات والأرباح اليومية</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            متابعة حركة الأداء المالي والربحي المفصل لشهر <span className="text-indigo-400 font-semibold">{ARABIC_MONTHS[targetMonth]} {targetYear}</span>
          </p>
        </div>

        {/* Small badge legends */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block"></span>
            <span className="text-gray-300">إجمالي المبيعات:</span>
            <span className="text-blue-400 font-bold font-mono">{formatCurrency(monthSalesTotal)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
            <span className="text-gray-300">صافي الأرباح:</span>
            <span className="text-emerald-400 font-bold font-mono">{formatCurrency(monthProfitTotal)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-xs">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-300">نسبة الاستلام:</span>
            <span className="text-cyan-400 font-bold font-mono">{monthlyDeliveryRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Grid Summary widgets inside chart block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl text-right">
          <span className="text-[10px] text-gray-500 font-bold block mb-1">الربحية الاجمالية (هذا الشهر)</span>
          <div className="text-base font-bold font-mono text-emerald-400">{formatCurrency(monthProfitTotal)}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl text-right">
          <span className="text-[10px] text-gray-500 font-bold block mb-1 font-sans">قيمة الشحنات المسلمة</span>
          <div className="text-base font-bold font-mono text-blue-400">{formatCurrency(monthSalesTotal)}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl text-right">
          <span className="text-[10px] text-gray-500 font-bold block mb-1">معدل البيع الأنسب يومياً</span>
          <div className="text-base font-bold font-mono text-cyan-300">
            {formatCurrency(monthSalesTotal > 0 ? monthSalesTotal / daysInMonth : 0)}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl text-right">
          <span className="text-[10px] text-gray-500 font-bold block mb-1">حمولة الطلبات الكلية للمستودع</span>
          <div className="text-base font-bold font-mono text-purple-400">{totalMonthOrders} طلبية شحن</div>
        </div>
      </div>

      {/* SVG Charts area */}
      <div className="relative overflow-x-auto select-none no-scrollbar">
        <div className="min-w-[800px] w-full">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible" style={{ direction: "ltr" }}>
            <defs>
              <linearGradient id="monthSalesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="monthProfitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Line Y indicators */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yVal = paddingTop + ratio * chartHeight;
              const valueLabel = Math.round(maxVal - (maxVal * ratio));
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={yVal}
                    x2={svgWidth - paddingRight}
                    y2={yVal}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 12}
                    y={yVal + 3}
                    fill="rgba(156,163,175,0.5)"
                    fontSize="9"
                    fontFamily="Outfit, sans-serif"
                    textAnchor="end"
                  >
                    {valueLabel} DH
                  </text>
                </g>
              );
            })}

            {/* Vertical grid lines for key days */}
            {dailyData.map((d, i) => {
              if (i % 3 !== 0 && i !== daysInMonth - 1) return null; // reduce clutter
              const xPos = getX(i);
              return (
                <line
                  key={i}
                  x1={xPos}
                  y1={paddingTop}
                  x2={xPos}
                  y2={svgHeight - paddingBottom}
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Filled Areas */}
            {salesAreaPath && (
              <path d={salesAreaPath} fill="url(#monthSalesGrad)" />
            )}
            {profitAreaPath && (
              <path d={profitAreaPath} fill="url(#monthProfitGrad)" />
            )}

            {/* Stroked Lines */}
            {salesLinePath && (
              <path d={salesLinePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {profitLinePath && (
              <path d={profitLinePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Hover Guides */}
            {hoveredIndex !== null && (
              <g>
                <line
                  x1={getX(hoveredIndex)}
                  y1={paddingTop - 10}
                  x2={getX(hoveredIndex)}
                  y2={svgHeight - paddingBottom}
                  stroke="rgba(99, 102, 241, 0.3)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </g>
            )}

            {/* Touch interactive overlay transparent rectangles for easy hit tests */}
            {dailyData.map((d, i) => {
              const xPos = getX(i);
              // Width of trigger is the space between midpoint triggers
              const itemWidth = chartWidth / (daysInMonth - 1);
              return (
                <rect
                  key={i}
                  x={xPos - itemWidth / 2}
                  y={paddingTop - 10}
                  width={itemWidth}
                  height={chartHeight + 20}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}

            {/* Chart circle nodes for hovering highlighting */}
            {dailyData.map((d, i) => {
              const xPos = getX(i);
              const ySales = getY(d.sales);
              const yProfit = getY(d.profit);
              const isSelected = hoveredIndex === i;

              // Only show circles if selected or if they have non-zero value to keep the line clean
              const hasSales = d.sales > 0;
              const hasProfit = d.profit > 0;

              return (
                <g key={i}>
                  {hasSales && (
                    <circle
                      cx={xPos}
                      cy={ySales}
                      r={isSelected ? 6 : 3}
                      fill="#3b82f6"
                      stroke="#070a13"
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-all duration-150 pointer-events-none"
                    />
                  )}
                  {hasProfit && (
                    <circle
                      cx={xPos}
                      cy={yProfit}
                      r={isSelected ? 6 : 3}
                      fill="#10b981"
                      stroke="#070a13"
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-all duration-150 pointer-events-none"
                    />
                  )}
                </g>
              );
            })}

            {/* X-Axis bottom Day Labels */}
            {dailyData.map((d, i) => {
              // Show label for every 3 days to maintain spacious spacing on the axis
              const shouldShowLabel = i % 3 === 0 || i === daysInMonth - 1;
              if (!shouldShowLabel) return null;

              return (
                <text
                  key={i}
                  x={getX(i)}
                  y={svgHeight - paddingBottom + 20}
                  fill="rgba(156,163,175,0.7)"
                  fontSize="10"
                  fontFamily="Outfit, sans-serif"
                  textAnchor="middle"
                >
                  {d.day}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Floating Detailed Interactive Tooltip absolute box */}
      {hoveredIndex !== null && dailyData[hoveredIndex] && (
        <div 
          className="absolute top-26 left-4 md:left-6 md:top-6 bg-[#0a0f1d]/95 border border-white/10 p-4 rounded-xl shadow-2xl z-20 w-64 text-right animate-fade-in font-sans font-medium" 
          dir="rtl"
          id={`detailed-tooltip-day-${hoveredIndex}`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs text-indigo-400 font-bold">تفاصيل التاريخ اليومية</span>
            <span className="text-xs text-gray-400 font-mono font-bold">
              {dailyData[hoveredIndex].day} / {monthStr} / {yearStr}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-white/[0.02] p-1.5 rounded">
              <span className="text-gray-400">إجمالي المبيعات (المستلمة):</span>
              <span className="text-blue-400 font-bold font-mono">{formatCurrency(dailyData[hoveredIndex].sales)}</span>
            </div>
            <div className="flex justify-between items-center bg-white/[0.02] p-1.5 rounded">
              <span className="text-gray-400">صافي الأرباح:</span>
              <span className="text-emerald-400 font-bold font-mono">{formatCurrency(dailyData[hoveredIndex].profit)}</span>
            </div>
            <div className="flex justify-between items-center bg-white/[0.02] p-1.5 rounded">
              <span className="text-gray-400">طلبيات اليوم:</span>
              <span className="text-purple-400 font-bold font-mono">{dailyData[hoveredIndex].orderCount} طلبات</span>
            </div>
            <div className="flex justify-between items-center bg-white/[0.02] p-1.5 rounded">
              <span className="text-gray-400">الطلبيات المستلمة بنجاح:</span>
              <span className="text-cyan-400 font-bold font-mono">{dailyData[hoveredIndex].deliveredCount} شحنة</span>
            </div>
          </div>
        </div>
      )}

      {/* Touch helper label */}
      <p className="text-[10px] text-gray-500 text-center mt-3 select-none">
        * قم بتمرير مؤشر الفأرة (Hover) فوق نقاط المخطط لعرض التفاصيل اليومية بالكامل للتاريخ المختار
      </p>

    </div>
  );
};
