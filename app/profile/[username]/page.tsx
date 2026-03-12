"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import StatsCard from "@/components/StatsCard";
import PickCard from "@/components/PickCard";
import type { UserStats, FeedItem } from "@/types";

interface ProfileUser {
  id: string;
  email: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  createdAt: string;
  stats: UserStats | null;
  isFollowing: boolean;
  _count: { followers: number; following: number; picks: number };
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [picks, setPicks] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const isOwnProfile = session && (session.user as { username?: string })?.username === username;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/users/${username}`).then((r) => r.json()),
      fetch(`/api/users/${username}/picks`).then((r) => r.json()),
    ])
      .then(([userData, picksData]) => {
        setProfile(userData.data || null);
        setPicks(picksData.data || []);
        setFollowing(userData.data?.isFollowing ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  const handleFollow = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      const data = await res.json();
      setFollowing(data.following);
      if (profile) {
        setProfile({
          ...profile,
          _count: {
            ...profile._count,
            followers: profile._count.followers + (data.following ? 1 : -1),
          },
        });
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="text-4xl">😢</p>
        <p className="mt-2 text-lg font-medium text-white">Usuario no encontrado</p>
        <Link href="/" className="mt-4 text-sm text-green-400 hover:text-green-300">
          Volver al feed
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Profile header */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-2xl font-bold text-white">
            {profile.image ? (
              <img src={profile.image} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              profile.name?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">{profile.name || profile.username}</h1>
                <p className="text-sm text-zinc-500">@{profile.username}</p>
              </div>
              {!isOwnProfile && session && (
                <button
                  onClick={handleFollow}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    following
                      ? "border border-zinc-700 bg-zinc-800 text-white hover:border-red-500 hover:text-red-400"
                      : "bg-green-600 text-white hover:bg-green-500"
                  }`}
                >
                  {following ? "Siguiendo" : "Seguir"}
                </button>
              )}
            </div>
            {profile.bio && <p className="mt-2 text-sm text-zinc-300">{profile.bio}</p>}
            <div className="mt-3 flex gap-4 text-sm">
              <span className="text-zinc-400">
                <span className="font-medium text-white">{profile._count.followers}</span> seguidores
              </span>
              <span className="text-zinc-400">
                <span className="font-medium text-white">{profile._count.following}</span> siguiendo
              </span>
              <span className="text-zinc-400">
                <span className="font-medium text-white">{profile._count.picks}</span> picks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <StatsCard stats={profile.stats} />
      </div>

      {/* Picks */}
      <h2 className="mb-4 text-lg font-medium text-white">Predicciones</h2>
      {picks.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-12 text-center">
          <p className="text-zinc-500">No hay predicciones publicadas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {picks.map((pick) => (
            <PickCard key={pick.id} pick={pick} />
          ))}
        </div>
      )}
    </div>
  );
}
