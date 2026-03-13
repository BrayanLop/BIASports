"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const oauthError = searchParams.get("error");
  const oauthErrorMessage = (() => {
    if (!oauthError) return "";

    switch (oauthError) {
      case "OAuthAccountNotLinked":
        return "Ese email ya está registrado con otro método. Inicia sesión con el método original (por ejemplo, email/contraseña) o usa el mismo proveedor con el que te registraste.";
      case "Configuration":
        return "Configuración inválida de autenticación. Revisa variables de entorno (AUTH_URL/AUTH_SECRET/GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET) y vuelve a intentar.";
      case "OAuthCallback":
      case "OAuthSignin":
      case "Callback":
        return "Falló el inicio de sesión con el proveedor. Revisa la URL del sitio (AUTH_URL) y la base de datos (DATABASE_URL) y vuelve a intentar.";
      case "AccessDenied":
        return "Acceso denegado. Revisa permisos e intenta de nuevo.";
      default:
        return "No se pudo iniciar sesión. Intenta de nuevo.";
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email o contraseña incorrectos");
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-2xl">⚽</span>{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              BIA Sports
            </span>
          </h1>
          <p className="mt-2 text-zinc-400">Inicia sesión en tu cuenta</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          {/* SSO */}
          <div className="space-y-3">
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm text-white transition hover:bg-zinc-700"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>
            <button
              onClick={() => signIn("facebook", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm text-white transition hover:bg-zinc-700"
            >
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continuar con Facebook
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">o con email</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {(oauthErrorMessage || error) && (
              <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {oauthErrorMessage || error}
                {oauthError && process.env.NODE_ENV !== "production" && (
                  <div className="mt-1 text-xs text-red-300/80">Código: {oauthError}</div>
                )}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Iniciar Sesión"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-500">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-green-400 hover:text-green-300">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
