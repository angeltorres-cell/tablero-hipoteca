"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ConversionDataPoint } from "@/lib/types";

interface BarConfig {
  dataKey: keyof ConversionDataPoint;
  name: string;
  color: string;
}

interface LineConfig {
  dataKey: keyof ConversionDataPoint;
  name: string;
  color: string;
}

interface ConversionChartProps {
  data: ConversionDataPoint[];
  bars: BarConfig[];
  line: LineConfig;
  title: string;
  subtitle?: string;
}

export default function ConversionChart({
  data,
  bars,
  line,
  title,
  subtitle,
}: ConversionChartProps) {
  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <div className="mb-4">
        <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-sm text-zinc-400">
          Sin datos para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 40, left: 0, bottom: 40 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.6}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              angle={-30}
              textAnchor="end"
              height={52}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              unit="%"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {bars.map((b) => (
              <Bar
                key={b.dataKey}
                yAxisId="left"
                dataKey={b.dataKey}
                name={b.name}
                fill={b.color}
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
            ))}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 3, fill: line.color }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
