"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useFeedStore } from "@/store";
import PickCard from "./PickCard";
import type { FeedFilterType, SportFilterType, FeedItem } from "@/types";

const filters: { key: FeedFilterType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "following", label: "Siguiendo" },
];

const sports: { key: SportFilterType; label: string; icon: string }[] = [
  { key: "football", label: "Fútbol", icon: "⚽" },
];

export default function Feed() {
  const { data: session } = useSession();
  const {
    items, isLoading, hasMore, cursor, filter, sportFilter,
    setItems, appendItems, setLoading, setHasMore, setCursor,
    setFilter, setSportFilter, reset,
  } = useFeedStore();
  const [initialLoaded, setInitialLoaded] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(
    async (isRefresh = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("filter", filter);
        params.set("sport", sportFilter);
        if (!isRefresh && cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/feed?${params}`);
        const data = await res.json();

        if (isRefresh) {
          setItems(data.data || []);
        } else {
          appendItems(data.data || []);
        }
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      } catch {
        /* ignore */
      }
      setLoading(false);
    },
    [filter, sportFilter, cursor, setItems, appendItems, setLoading, setHasMore, setCursor]
  );

  useEffect(() => {
    reset();
    setInitialLoaded(false);
  }, [filter, sportFilter, reset]);

  useEffect(() => {
    if (!initialLoaded) {
      loadFeed(true);
      setInitialLoaded(true);
    }
  }, [initialLoaded, loadFeed]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadFeed();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadFeed]);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              disabled={f.key === "following" && !session}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                filter === f.key
                  ? "bg-green-600 text-white"
                  : "text-zinc-400 hover:text-white disabled:opacity-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {sports.map((s) => (
            <button
              key={s.key}
              onClick={() => setSportFilter(s.key)}
              className={`rounded-lg px-2.5 py-1.5 text-sm transition ${
                sportFilter === s.key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {items.map((item: FeedItem) => (
          <PickCard key={item.id} pick={item} />
        ))}

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
            <p className="text-4xl">🏟️</p>
            <p className="mt-2 text-lg font-medium text-white">No hay picks aún</p>
            <p className="text-sm text-zinc-500">
              {session
                ? "¡Sé el primero en publicar una predicción!"
                : "Inicia sesión para ver el feed personalizado"}
            </p>
          </div>
        )}

        <div ref={loaderRef} className="h-4" />
      </div>
    </div>
  );
}
