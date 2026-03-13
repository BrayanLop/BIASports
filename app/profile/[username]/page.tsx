"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

type MeData = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  hasPassword: boolean;
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { data: session, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [picks, setPicks] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [me, setMe] = useState<MeData | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [uploading, setUploading] = useState(false);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState(false);

  const isOwnProfile = session && (session.user as { username?: string })?.username === username;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/users/${username}`).then((r) => r.json()),
      fetch(`/api/users/${username}/picks`).then((r) => r.json()),
      isOwnProfile ? fetch(`/api/me`).then((r) => r.json()) : Promise.resolve(null),
    ])
      .then(([userData, picksData, meData]) => {
        const nextProfile = userData.data || null;
        setProfile(nextProfile);
        setPicks(picksData.data || []);
        setFollowing(userData.data?.isFollowing ?? false);

        const mePayload = meData?.data ? (meData.data as MeData) : null;
        setMe(mePayload);

        if (mePayload) {
          setEditName(mePayload.name || "");
          setEditUsername(mePayload.username || "");
        } else if (nextProfile) {
          setEditName(nextProfile.name || "");
          setEditUsername(nextProfile.username || "");
        }

        setEditOpen(false);
        setSaveOk(false);
        setSaveError("");
        setPwOk(false);
        setPwError("");
        setPwCurrent("");
        setPwNext("");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username, isOwnProfile]);

  const handleSaveProfile = async () => {
    setSaveOk(false);
    setSaveError("");
    setSaving(true);
    try {
      const payload = {
        name: editName.trim().length > 0 ? editName.trim() : null,
        username: editUsername.trim(),
      };

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data?.error || "No se pudo guardar");
        return;
      }

      setSaveOk(true);
      try {
        await update();
      } catch {
        // ignore
      }

      const newUsername = String(data?.data?.username || "").trim();
      if (newUsername && newUsername !== username) {
        router.push(`/profile/${newUsername}`);
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      setSaveError("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    setSaveOk(false);
    setSaveError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data?.error || "No se pudo subir la imagen");
        return;
      }

      if (profile) {
        setProfile({ ...profile, image: String(data?.data?.image || "") || null });
      }

      if (me) {
        setMe({ ...me, image: String(data?.data?.image || "") || null });
      }
      setSaveOk(true);
      try {
        await update();
      } catch {
        // ignore
      }
      router.refresh();
    } catch {
      setSaveError("No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwOk(false);
    setPwError("");

    if (!pwCurrent || !pwNext) {
      setPwError("Completa la contraseña actual y la nueva");
      return;
    }
    if (pwNext.length < 6) {
      setPwError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data?.error || "No se pudo cambiar la contraseña");
        return;
      }
      setPwOk(true);
      setPwCurrent("");
      setPwNext("");
    } catch {
      setPwError("No se pudo cambiar la contraseña");
    } finally {
      setPwSaving(false);
    }
  };

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
              {isOwnProfile && (
                <button
                  onClick={() => setEditOpen((v) => !v)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:border-green-600"
                >
                  {editOpen ? "Cerrar" : "Editar"}
                </button>
              )}
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

      {/* Edit profile (own profile only) */}
      {isOwnProfile && editOpen && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Editar perfil</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-zinc-400">Nombre</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-green-600"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">Usuario</label>
              <input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-green-600"
                placeholder="tu_usuario"
              />
              <p className="mt-1 text-xs text-zinc-500">Solo letras, números y _ (3-20)</p>
            </div>
            <div>
              <label className="text-sm text-zinc-400">Foto</label>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-xs text-zinc-400">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = "";
                      if (!f) return;
                      handleUploadAvatar(f);
                    }}
                  />
                  <span
                    className={`inline-flex cursor-pointer select-none items-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white transition hover:border-green-600 ${
                      uploading ? "opacity-60" : ""
                    }`}
                  >
                    {uploading ? "Subiendo..." : "Subir archivo"}
                  </span>
                </label>
                <span className="text-xs text-zinc-500">PNG/JPG/WEBP/GIF (máx 1.5MB)</span>
              </div>
            </div>

            {saveError && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {saveError}
              </div>
            )}
            {saveOk && !saveError && (
              <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
                Guardado
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* Change password (credentials users only) */}
      {isOwnProfile && editOpen && me?.hasPassword && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Cambiar contraseña</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-zinc-400">Contraseña actual</label>
              <input
                type="password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">Nueva contraseña</label>
              <input
                type="password"
                value={pwNext}
                onChange={(e) => setPwNext(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-green-600"
              />
            </div>

            {pwError && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {pwError}
              </div>
            )}
            {pwOk && !pwError && (
              <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
                Contraseña actualizada
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:border-green-600 disabled:opacity-60"
            >
              {pwSaving ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        </div>
      )}

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
