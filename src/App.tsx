/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  ReferenceLine,
  ReferenceDot,
  Label
} from 'recharts';
import { format, isValid, parse } from 'date-fns';
import { AlertCircle, Clock, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RAW_DATA } from './data';

interface DataPoint {
  date: string;
  value: number;
}

// Helper to format date safely
const formatDate = (dateStr: string, formatStr: string) => {
  const date = new Date(dateStr);
  return isValid(date) ? format(date, formatStr) : dateStr;
};

// Custom Label Component for Max/Min points with refined positioning
const CustomAnnotation = (props: any) => {
  const { cx, cy, value, date, color, type, viewBox } = props;
  if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) return null;
  
  const isMax = type === 'max';
  const boxWidth = 100;
  const boxHeight = 40;
  const offset = 40; // Distance from point to box
  
  // Constrain box within chart boundaries
  const chartWidth = viewBox?.width || 800;
  const chartHeight = viewBox?.height || 400;
  
  let boxX = cx - boxWidth / 2;
  // Keep box within left/right bounds
  if (boxX < 0) boxX = 5;
  if (boxX + boxWidth > chartWidth) boxX = chartWidth - boxWidth - 5;
  
  let boxY = isMax ? cy - offset - boxHeight : cy + offset;
  // Keep box within top/bottom bounds
  if (boxY < 0) boxY = 5;
  if (boxY + boxHeight > chartHeight) boxY = chartHeight - boxHeight - 5;
  
  // Arrow line start/end
  const arrowYStart = isMax ? cy - 5 : cy + 5;
  const arrowYEnd = isMax ? boxY + boxHeight : boxY;

  return (
    <g>
      {/* Arrow Line */}
      <line 
        x1={cx} 
        y1={arrowYStart} 
        x2={cx} 
        y2={arrowYEnd} 
        stroke={color} 
        strokeWidth={1.5} 
        strokeDasharray="2 2"
      />
      {/* Arrow Head */}
      <path 
        d={isMax 
          ? `M ${cx-4} ${arrowYStart-4} L ${cx} ${arrowYStart} L ${cx+4} ${arrowYStart-4}` 
          : `M ${cx-4} ${arrowYStart+4} L ${cx} ${arrowYStart} L ${cx+4} ${arrowYStart+4}`
        }
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      
      {/* Box */}
      <rect 
        x={boxX} 
        y={boxY} 
        width={boxWidth} 
        height={boxHeight} 
        rx={6} 
        fill="white" 
        stroke={color} 
        strokeWidth={1}
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
      />
      <text 
        x={boxX + boxWidth / 2} 
        y={boxY + 16} 
        textAnchor="middle" 
        fontSize={11} 
        fontWeight="bold" 
        fill="#374151"
      >
        {formatDate(date, 'yyyy/MM/dd')}
      </text>
      <text 
        x={boxX + boxWidth / 2} 
        y={boxY + 32} 
        textAnchor="middle" 
        fontSize={12} 
        fill={color}
        fontWeight="bold"
      >
        {value.toFixed(2)}%
      </text>
    </g>
  );
};

export default function App() {
  const processedInitialData = useMemo(() => {
    return RAW_DATA.map(([dateVal, value]) => {
      let normalizedDate = '';
      try {
        const d = new Date(dateVal);
        if (isValid(d)) {
          normalizedDate = format(d, 'yyyy-MM-dd');
        } else {
          normalizedDate = String(dateVal);
        }
      } catch {
        normalizedDate = String(dateVal);
      }
      return {
        date: normalizedDate,
        value: value * 100 // Convert to percentage
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  const [rawData] = useState<DataPoint[]>(processedInitialData);
  
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const latestDate = processedInitialData[processedInitialData.length - 1].date;
    const defaultStart = '2023-01-01';
    return {
      start: processedInitialData[0].date > defaultStart ? processedInitialData[0].date : defaultStart,
      end: latestDate
    };
  });

  const filteredData = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return rawData;
    return rawData.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);
  }, [rawData, dateRange]);

  const globalStats = useMemo(() => {
    if (rawData.length === 0 || filteredData.length === 0) return null;

    const latest = rawData[rawData.length - 1];
    const prev = rawData.length > 1 ? rawData[rawData.length - 2] : null;
    const change = prev ? latest.value - prev.value : 0;
    
    const sortedValues = [...rawData].map(d => d.value).sort((a, b) => a - b);
    const latestIdx = sortedValues.indexOf(latest.value);
    const percentile = rawData.length > 1 
      ? (latestIdx / (sortedValues.length - 1)) * 100 
      : 100;

    // Use filteredData for max and min to match chart annotations
    let maxObj = filteredData[0];
    let minObj = filteredData[0];
    filteredData.forEach(d => {
      if (d.value > maxObj.value) maxObj = d;
      if (d.value < minObj.value) minObj = d;
    });

    return {
      latest,
      change,
      percentile: percentile.toFixed(2),
      max: maxObj,
      min: minObj,
      count: rawData.length
    };
  }, [rawData, filteredData]);

  const visibleStats = useMemo(() => {
    if (filteredData.length === 0) return null;
    let maxObj = filteredData[0];
    let minObj = filteredData[0];
    filteredData.forEach(d => {
      if (d.value > maxObj.value) maxObj = d;
      if (d.value < minObj.value) minObj = d;
    });
    return { max: maxObj, min: minObj };
  }, [filteredData]);

  const latestValue = globalStats?.latest.value || 0;
  const latestChange = globalStats?.change || 0;
  const latestPercentile = globalStats?.percentile || '0.00';

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-[1400px] mx-auto flex flex-col">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="logo-group">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-bento-primary">
              PremiumTracker <span className="font-light text-slate-400">V1.2</span>
            </h1>
          </div>
          <p className="text-sm text-bento-text-muted">可转债百元溢价率数据可视化分析工具</p>
        </div>
        <div className="hidden md:block font-mono text-[11px] text-bento-text-muted bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          SYSTEM READY | CSV_XLSX_LOADER
        </div>
      </header>

      <main className="flex-grow">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
              <div className="lg:col-span-8 bento-card flex flex-col min-h-[500px]">
                <div className="card-title">
                  <span className="dot"></span>
                  百元溢价率趋势图 (Premium Rate)
                </div>
                <div className="flex-grow mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={filteredData}
                      margin={{ top: 60, right: 120, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        dy={10}
                        tickFormatter={(val) => formatDate(val, 'yyyy/MM')}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        tickFormatter={(val) => `${val.toFixed(2)}%`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '12px', 
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                        labelFormatter={(val) => formatDate(val, 'yyyy/MM/dd')}
                        formatter={(val: number) => [`${val.toFixed(2)}%`, '溢价率']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        name="百元溢价率"
                        stroke="#2563eb" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        animationDuration={1000}
                      />
                      <ReferenceLine 
                        y={latestValue} 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        strokeDasharray="5 5" 
                      />
                      
                      {globalStats && filteredData.some(d => d.date === globalStats.latest.date) && (
                        <ReferenceDot 
                          x={globalStats.latest.date} 
                          y={globalStats.latest.value} 
                          r={0} 
                          isFront={true}
                          shape={(props: any) => {
                            const { cx, cy, viewBox } = props;
                            if (cx === undefined || cy === undefined) return null;
                            
                            const chartWidth = viewBox?.width || 800;
                            const labelWidth = 110;
                            let labelX = cx + 10;
                            
                            if (labelX + labelWidth > chartWidth) {
                              labelX = cx - labelWidth - 10;
                            }

                            return (
                              <g>
                                <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                                <g transform={`translate(${labelX}, ${cy - 20})`}>
                                  <rect 
                                    x="-5" 
                                    y="-15" 
                                    width={labelWidth} 
                                    height="55" 
                                    fill="white" 
                                    fillOpacity={0.9} 
                                    rx="6" 
                                    stroke="#ef4444"
                                    strokeWidth="0.5"
                                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                  />
                                  <text fill="#ef4444" fontSize={12} fontWeight="bold">
                                    最新: {latestValue.toFixed(2)}%
                                  </text>
                                  <text fill="#64748b" fontSize={10} dy={16} fontWeight="medium">
                                    环比 {latestChange >= 0 ? '+' : ''}{latestChange.toFixed(2)}%
                                  </text>
                                  <text fill="#64748b" fontSize={10} dy={32} fontWeight="medium">
                                    {latestPercentile}% 分位
                                  </text>
                                </g>
                              </g>
                            );
                          }}
                        />
                      )}
                      {visibleStats && (
                        <>
                          <ReferenceDot 
                            x={visibleStats.max.date} 
                            y={visibleStats.max.value} 
                            r={0} 
                            isFront={true}
                            shape={(props) => <CustomAnnotation {...props} value={visibleStats.max.value} date={visibleStats.max.date} color="#ef4444" type="max" />}
                          />
                          <ReferenceDot 
                            x={visibleStats.min.date} 
                            y={visibleStats.min.value} 
                            r={0} 
                            isFront={true}
                            shape={(props) => <CustomAnnotation {...props} value={visibleStats.min.value} date={visibleStats.min.date} color="#10b981" type="min" />}
                          />
                        </>
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-8 pt-6 border-t border-bento-border">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-bento-text-muted uppercase tracking-wider">
                      <Clock size={14} /> 时间范围控制
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer px-2"
                      />
                      <ArrowRight size={14} className="text-slate-400" />
                      <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer px-2"
                      />
                    </div>
                    <button 
                      onClick={() => setDateRange({ start: rawData[0].date, end: rawData[rawData.length - 1].date })}
                      className="text-[11px] font-bold text-bento-primary hover:underline"
                    >
                      重置范围
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-6">
                {globalStats && (
                  <div className="bento-card flex-grow">
                    <div className="card-title">核心指标摘要</div>
                    <div className="space-y-1">
                      <StatRow 
                        label="最新溢价率" 
                        value={`${globalStats.latest.value.toFixed(2)}%`} 
                        subValue={`分位数: ${globalStats.percentile}%`}
                        color="text-bento-primary" 
                      />
                      <StatRow 
                        label="最高溢价率" 
                        value={`${globalStats.max.value.toFixed(2)}%`} 
                        subValue={`日期: ${formatDate(globalStats.max.date, 'yyyy/MM/dd')}`}
                        color="text-red-500" 
                        icon={<ChevronUp size={14} className="text-red-400" />}
                      />
                      <StatRow 
                        label="最低溢价率" 
                        value={`${globalStats.min.value.toFixed(2)}%`} 
                        subValue={`日期: ${formatDate(globalStats.min.date, 'yyyy/MM/dd')}`}
                        color="text-emerald-500" 
                        icon={<ChevronDown size={14} className="text-emerald-400" />}
                      />
                      <StatRow label="样本总数" value={globalStats.count.toString()} />
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-12 bento-card overflow-hidden p-0">
                <div className="px-6 py-4 border-b border-bento-border bg-slate-50/50 flex justify-between items-center">
                  <div className="card-title mb-0">数据列表预览 (全部数据)</div>
                  <div className="text-[11px] font-bold text-bento-text-muted">共 {rawData.length} 条记录</div>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-slate-50 text-bento-text-muted uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 border-b border-bento-border">交易日期</th>
                        <th className="px-6 py-3 border-b border-bento-border text-right">百元溢价率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bento-border">
                      {rawData.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 text-bento-text-main font-mono">{formatDate(row.date, 'yyyy/MM/dd')}</td>
                          <td className="px-6 py-3 text-right font-bold text-bento-primary">{row.value.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
        </motion.div>
      </main>

      <footer className="mt-12 py-6 border-t border-bento-border flex justify-between items-center text-[11px] text-bento-text-muted font-medium uppercase tracking-widest">
        <p>© 2024 PremiumTracker Engine</p>
        <p>Built with React & Recharts</p>
      </footer>
    </div>
  );
}

function StatRow({ label, value, subValue, color = "text-bento-text-main", icon }: { label: string, value: string, subValue?: string, color?: string, icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-bento-border last:border-0">
      <div className="flex gap-2">
        {icon && <div className="mt-0.5">{icon}</div>}
        <div>
          <span className="text-[13px] text-bento-text-muted block">{label}</span>
          {subValue && <span className="text-[10px] text-slate-400 font-medium">{subValue}</span>}
        </div>
      </div>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}

