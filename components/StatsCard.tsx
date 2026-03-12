import type { UserStats } from "@/types";

export default function StatsCard({ stats }: { stats: UserStats | null }) {
  if (!stats) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-center text-sm text-zinc-500">Sin estadísticas aún</p>
      </div>
    );
  }

  const statItems = [
    { label: "Total Picks", value: stats.totalPicks, color: "text-white" },
    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: "text-green-400" },
    { label: "ROI", value: `${stats.roi.toFixed(1)}%`, color: stats.roi >= 0 ? "text-green-400" : "text-red-400" },
    { label: "Yield", value: `${stats.yield.toFixed(1)}%`, color: stats.yield >= 0 ? "text-green-400" : "text-red-400" },
    { label: "Profit", value: stats.totalProfit.toFixed(2), color: stats.totalProfit >= 0 ? "text-green-400" : "text-red-400" },
    { label: "Racha", value: stats.currentStreak > 0 ? `+${stats.currentStreak}` : `${stats.currentStreak}`, color: stats.currentStreak >= 0 ? "text-green-400" : "text-red-400" },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Estadísticas</h3>
      <div className="grid grid-cols-3 gap-3">
        {statItems.map((item) => (
          <div key={item.label} className="text-center">
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-zinc-500">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-zinc-800 pt-3 text-xs text-zinc-500">
        <span>Ganados: {stats.wonPicks}</span>
        <span>Perdidos: {stats.lostPicks}</span>
        <span>Pendientes: {stats.pendingPicks}</span>
      </div>
      {/* Win rate bar */}
      <div className="mt-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
            style={{ width: `${Math.min(stats.winRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
