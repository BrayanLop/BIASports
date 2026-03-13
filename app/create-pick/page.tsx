"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { NormalizedMatch } from "@/lib/sports-api";

const MARKETS = [
  "1X2 - Local", "1X2 - Empate", "1X2 - Visitante",
  "Over 0.5", "Over 1.5", "Over 2.5", "Over 3.5",
  "Under 0.5", "Under 1.5", "Under 2.5", "Under 3.5",
  "Ambos Marcan - Sí", "Ambos Marcan - No",
  "Handicap -1", "Handicap +1", "Handicap -2", "Handicap +2",
  "Doble Oportunidad 1X", "Doble Oportunidad X2", "Doble Oportunidad 12",
];

export default function CreatePickPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<NormalizedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedMatch, setSelectedMatch] = useState<NormalizedMatch | null>(null);
  const [market, setMarket] = useState("");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("5");
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const controller = new AbortController();
    const q = search.trim();

    // Debounce typing so we don't spam the API.
    const t = setTimeout(() => {
      setLoading(true);

      const url = q.length >= 2
        ? `/api/matches?q=${encodeURIComponent(q)}&days=60`
        : "/api/matches?days=14";

      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setMatches(data.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !market || !odds) {
      setError("Selecciona un partido, mercado y cuota");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      // First, we need to ensure the match & sport exist in DB
      // The API will need to handle this, for now we pass the external data
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatch.id,
          // Provide a match snapshot so the API can persist it even if the external
          // provider is rate-limited or temporarily unavailable at POST time.
          match: {
            externalId: selectedMatch.externalId,
            homeTeam: selectedMatch.homeTeam,
            awayTeam: selectedMatch.awayTeam,
            homeScore: selectedMatch.homeScore,
            awayScore: selectedMatch.awayScore,
            leagueName: selectedMatch.leagueName,
            leagueLogo: selectedMatch.leagueLogo,
            country: selectedMatch.country,
            matchDate: selectedMatch.matchDate,
            status: selectedMatch.status,
          },
          sportId: "football",
          market,
          odds: parseFloat(odds),
          stake: parseInt(stake),
          comment: comment || undefined,
        }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear el pick");
      }
    } catch {
      setError("Error de conexión");
    }
    setSubmitting(false);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
      </div>
    );
  }

  if (!session) return null;

  const isSearching = search.trim().length >= 2;
  const q = search.trim().toLowerCase();
  const visibleMatches = matches
    .filter((m) => m.status === "SCHEDULED")
    // When searching, the server already filtered, but keep a client-side guard.
    .filter((m) => {
      if (!isSearching) return true;
      const haystack = `${m.homeTeam} ${m.awayTeam} ${m.leagueName} ${m.country}`.toLowerCase();
      return haystack.includes(q);
    });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Crear Predicción</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Match selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            Selecciona un partido
          </label>
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por equipo, liga o país"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
            />

            <div className="max-h-56 space-y-2 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
                </div>
              ) : visibleMatches.length === 0 ? (
                <p className="text-center text-sm text-zinc-500">
                  {isSearching
                    ? "No hay resultados para tu búsqueda"
                    : "No hay partidos disponibles"}
                </p>
              ) : (
                visibleMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setSelectedMatch(match)}
                    className={`w-full rounded-lg p-3 text-left transition ${
                      selectedMatch?.id === match.id
                        ? "border border-green-500 bg-green-500/10"
                        : "border border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-xs text-zinc-500">
                      {match.leagueName} · {match.country}
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {match.homeTeam} vs {match.awayTeam}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {new Date(match.matchDate).toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Market */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400">Mercado</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-green-500 focus:outline-none"
          >
            <option value="">Seleccionar mercado</option>
            {MARKETS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Odds & Stake */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">Cuota</label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              required
              placeholder="1.85"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Stake ({stake}/10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="mt-3 w-full accent-green-500"
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            Comentario (opcional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Análisis o razón de tu predicción..."
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Preview */}
        {selectedMatch && market && odds && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">Vista previa</h3>
            <p className="text-white">{selectedMatch.homeTeam} vs {selectedMatch.awayTeam}</p>
            <p className="text-sm text-zinc-400">Mercado: <span className="text-white">{market}</span></p>
            <p className="text-sm text-zinc-400">
              Cuota: <span className="text-yellow-400">{odds}</span> · Stake: <span className="text-white">{stake}/10</span>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !selectedMatch || !market || !odds}
          className="w-full rounded-lg bg-green-600 py-3 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
        >
          {submitting ? "Publicando..." : "Publicar Predicción"}
        </button>
      </form>
    </div>
  );
}
