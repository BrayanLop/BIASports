"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RankingUser, RankingMetric } from "@/types";

const metrics: { key: RankingMetric; label: string }[] = [
  { key: "roi", label: "ROI" },
  { key: "winrate", label: "Win Rate" },
  { key: "profit", label: "Profit" },
];

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [metric, setMetric] = useState<RankingMetric>("roi");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ranking?metric=${metric}`)
      .then((r) => r.json())
      .then((data) => setRanking(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [metric]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🏆 Ranking de Tipsters</h1>
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                metric === m.key ? "bg-green-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
        </div>
      ) : ranking.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <p className="text-4xl">📊</p>
          <p className="mt-2 text-lg font-medium text-white">No hay rankings aún</p>
          <p className="text-sm text-zinc-500">Se necesitan mínimo 5 picks para aparecer</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-zinc-500">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Tipster</div>
            <div className="col-span-2 text-right">ROI</div>
            <div className="col-span-2 text-right">Win Rate</div>
            <div className="col-span-2 text-right">Profit</div>
            <div className="col-span-1 text-right">Picks</div>
          </div>

          {ranking.map((item) => (
            <Link
              key={item.user.id}
              href={`/profile/${item.user.username}`}
              className="grid grid-cols-12 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-800/50"
            >
              <div className="col-span-1">
                <span className={`text-lg font-bold ${
                  item.rank === 1 ? "text-yellow-400" :
                  item.rank === 2 ? "text-zinc-300" :
                  item.rank === 3 ? "text-orange-400" : "text-zinc-500"
                }`}>
                  {item.rank <= 3 ? ["🥇", "🥈", "🥉"][item.rank - 1] : item.rank}
                </span>
              </div>
              <div className="col-span-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-sm font-bold text-white">
                  {item.user.image ? (
                    <img src={item.user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    item.user.name?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.user.name || item.user.username}</p>
                  <p className="text-xs text-zinc-500">@{item.user.username}</p>
                </div>
              </div>
              <div className={`col-span-2 text-right text-sm font-medium ${item.stats.roi >= 0 ? "text-green-400" : "text-red-400"}`}>
                {item.stats.roi.toFixed(1)}%
              </div>
              <div className="col-span-2 text-right text-sm text-white">
                {item.stats.winRate.toFixed(1)}%
              </div>
              <div className={`col-span-2 text-right text-sm font-medium ${item.stats.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                {item.stats.totalProfit >= 0 ? "+" : ""}{item.stats.totalProfit.toFixed(2)}
              </div>
              <div className="col-span-1 text-right text-sm text-zinc-400">
                {item.stats.totalPicks}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
