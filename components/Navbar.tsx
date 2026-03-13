"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const username = (session?.user as { username?: string })?.username;

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <img src="/icon.svg" alt="BIA Sports" className="h-7 w-7" />
          <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            BIA Sports
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Feed
          </Link>
          <Link
            href="/ranking"
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Ranking
          </Link>
          {session ? (
            <>
              <Link
                href="/create-pick"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500"
              >
                + Nuevo Pick
              </Link>
              <div className="relative ml-2">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white transition hover:bg-zinc-700"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    session.user?.name?.[0]?.toUpperCase() || "U"
                  )}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 w-48 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
                    {username && (
                      <Link
                        href={`/profile/${username}`}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        Mi Perfil
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-2 text-zinc-400 hover:text-white md:hidden"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 md:hidden">
          <Link href="/" className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>
            Feed
          </Link>
          <Link href="/ranking" className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>
            Ranking
          </Link>
          {session ? (
            <>
              <Link href="/create-pick" className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>
                + Nuevo Pick
              </Link>
              {username && (
                <Link href={`/profile/${username}`} className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>
                  Mi Perfil
                </Link>
              )}
              <button onClick={() => signOut()} className="block w-full rounded-lg px-3 py-2 text-left text-red-400 hover:bg-zinc-800">
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link href="/login" className="block rounded-lg px-3 py-2 text-green-400 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>
              Iniciar Sesión
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
