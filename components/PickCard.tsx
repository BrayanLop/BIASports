"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import type { FeedItem } from "@/types";

function ResultBadge({ result }: { result: string }) {
  const styles: Record<string, string> = {
    WON: "bg-green-500/20 text-green-400 border-green-500/30",
    LOST: "bg-red-500/20 text-red-400 border-red-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    VOID: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  const labels: Record<string, string> = {
    WON: "Ganado", LOST: "Perdido", PENDING: "Pendiente", VOID: "Nulo",
  };

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[result] || styles.PENDING}`}>
      {labels[result] || result}
    </span>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function PickCard({ pick }: { pick: FeedItem }) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(pick.isLiked);
  const [likesCount, setLikesCount] = useState(pick._count.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ id: string; content: string; user: { username: string; name: string | null; image: string | null } }[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const handleLike = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/picks/${pick.id}/like`, { method: "POST" });
      const data = await res.json();
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    } catch { /* ignore */ }
  };

  const loadComments = async () => {
    if (!showComments) {
      setShowComments(true);
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/picks/${pick.id}/comments`);
        const data = await res.json();
        setComments(data.data || []);
      } catch { /* ignore */ }
      setLoadingComments(false);
    } else {
      setShowComments(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session) return;
    try {
      const res = await fetch(`/api/picks/${pick.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      if (data.data) {
        setComments((prev) => [data.data, ...prev]);
        setNewComment("");
      }
    } catch { /* ignore */ }
  };

  const matchDate = new Date(pick.match.matchDate);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
      {/* User header */}
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/profile/${pick.user.username}`} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-sm font-bold text-white">
            {pick.user.image ? (
              <img src={pick.user.image} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              pick.user.name?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div>
            <span className="font-medium text-white">{pick.user.name || pick.user.username}</span>
            <p className="text-xs text-zinc-500">@{pick.user.username} · {formatDate(pick.createdAt)}</p>
          </div>
        </Link>
        <ResultBadge result={pick.result} />
      </div>

      {/* Match info */}
      <div className="mb-3 rounded-lg bg-zinc-800/50 p-3">
        <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
          <span>{pick.sport.icon} {pick.sport.name}</span>
          {pick.match.league && <span>· {pick.match.league.name}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white">
            {pick.match.homeTeam} vs {pick.match.awayTeam}
          </div>
          {pick.match.homeScore !== null && (
            <span className="text-sm font-bold text-green-400">
              {pick.match.homeScore} - {pick.match.awayScore}
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {matchDate.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Pick details */}
      <div className="mb-3 flex flex-wrap gap-3">
        <div className="rounded-lg bg-zinc-800 px-3 py-1.5">
          <span className="text-xs text-zinc-500">Mercado</span>
          <p className="text-sm font-medium text-white">{pick.market}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 px-3 py-1.5">
          <span className="text-xs text-zinc-500">Cuota</span>
          <p className="text-sm font-medium text-yellow-400">{pick.odds.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 px-3 py-1.5">
          <span className="text-xs text-zinc-500">Stake</span>
          <p className="text-sm font-medium text-white">{pick.stake}/10</p>
        </div>
      </div>

      {/* Comment */}
      {pick.comment && (
        <p className="mb-3 text-sm text-zinc-300">{pick.comment}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-zinc-800 pt-3">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition ${liked ? "text-red-400" : "text-zinc-500 hover:text-red-400"}`}
        >
          <svg className="h-5 w-5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          {likesCount > 0 && likesCount}
        </button>
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-blue-400"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          {pick._count.comments > 0 && pick._count.comments}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          {session && (
            <form onSubmit={submitComment} className="mb-3 flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
              />
              <button type="submit" className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-500">
                Enviar
              </button>
            </form>
          )}
          {loadingComments ? (
            <p className="text-center text-sm text-zinc-500">Cargando...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">No hay comentarios</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-zinc-800/50 px-3 py-2">
                  <span className="text-xs font-medium text-green-400">@{c.user.username}</span>
                  <p className="text-sm text-zinc-300">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
