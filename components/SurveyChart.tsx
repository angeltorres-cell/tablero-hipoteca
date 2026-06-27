"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { LogEncuesta } from "@/lib/types";

interface SurveyChartProps {
  encuestas: LogEncuesta[];
}

const ANSWER_COLORS = [
  "#3F3D91",
  "#1D9E75",
  "#EF9F27",
  "#E24B4A",
  "#89C4E8",
  "#8B5E9B",
];

export default function SurveyChart({ encuestas }: SurveyChartProps) {
  if (!encuestas.length) {
    return (
      <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 text-center text-sm text-zinc-400">
        Sin respuestas de encuesta disponibles
      </div>
    );
  }

  // Group by question
  const grouped = new Map<string, Map<string, number>>();
  for (const row of encuestas) {
    if (!grouped.has(row.question)) grouped.set(row.question, new Map());
    const ansMap = grouped.get(row.question)!;
    ansMap.set(row.answer, (ansMap.get(row.answer) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([question, answerMap]) => {
        const chartData = [...answerMap.entries()]
          .map(([answer, count]) => ({ answer, count }))
          .sort((a, b) => b.count - a.count);

        const maxCount = Math.max(...chartData.map((d) => d.count));

        return (
          <div
            key={question}
            className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4"
          >
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">
              {question}
            </h3>
            <ResponsiveContainer width="100%" height={chartData.length * 44 + 24}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e5e7eb"
                  strokeOpacity={0.6}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  allowDecimals={false}
                  domain={[0, maxCount + 1]}
                />
                <YAxis
                  type="category"
                  dataKey="answer"
                  width={140}
                  tick={{ fontSize: 11, fill: "#374151" }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                  formatter={(value) => [value, "Respuestas"]}
                />
                <Bar dataKey="count" name="Respuestas" radius={[0, 4, 4, 0]} barSize={22}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={ANSWER_COLORS[index % ANSWER_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
