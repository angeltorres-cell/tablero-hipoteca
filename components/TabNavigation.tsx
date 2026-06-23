"use client";

const TABS = [
  "Funnel",
  "Conversión",
  "Interés → Encuesta",
  "Respuestas encuestas",
];

interface TabNavigationProps {
  activeTab: number;
  onTabChange: (index: number) => void;
}

export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto scrollbar-none">
      {TABS.map((tab, i) => (
        <button
          key={tab}
          onClick={() => onTabChange(i)}
          className={`px-4 py-2.5 text-sm rounded-t-lg whitespace-nowrap transition-colors ${
            activeTab === i
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium border-b-2 border-indigo-500"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
