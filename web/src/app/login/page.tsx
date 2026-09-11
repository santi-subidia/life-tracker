"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SomaLogo } from "@/components/ui/SomaLogo";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, role, isLoading: isAuthLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (!isAuthLoading && user) {
      if (role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/hoy");
      }
    }
  }, [user, role, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Por favor ingresa tu correo electrónico.");
      return;
    }

    if (!password) {
      setErrorMessage("Por favor ingresa tu contraseña.");
      return;
    }

    try {
      setIsSubmitting(true);
      const { role: authenticatedRole } = await signIn(cleanEmail, password);

      // Redirección condicionada por RBAC
      if (authenticatedRole === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/hoy";
      }
    } catch (err: unknown) {
      const error = err as Error;
      let friendlyMessage = "Error al iniciar sesión. Por favor verifica tus datos.";
      const msg = error?.message?.toLowerCase() || "";

      if (
        msg.includes("invalid login credentials") ||
        msg.includes("invalid_grant") ||
        msg.includes("user not found")
      ) {
        friendlyMessage = "Credenciales incorrectas. Verifica tu email y contraseña.";
      } else if (msg.includes("email not confirmed")) {
        friendlyMessage = "Tu correo no ha sido confirmado aún.";
      } else if (msg.includes("too many requests")) {
        friendlyMessage = "Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.";
      }

      setErrorMessage(friendlyMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-neutral-800">
      {/* Luces de fondo ambientales */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-[130px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Tarjeta de Autenticación */}
      <div className="w-full max-w-md bg-neutral-900/70 border border-neutral-800/80 backdrop-blur-xl rounded-3xl p-7 sm:p-9 shadow-2xl relative z-10 space-y-6">
        {/* Cabecera con Logotipo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <SomaLogo href="/login" size="md" variant="horizontal" />
          <div className="space-y-1 pt-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Iniciar Sesión
            </h1>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Ingresa tus credenciales para acceder al sistema operativo y tus módulos.
            </p>
          </div>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@soma.local"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider"
              >
                Contraseña
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 focus:outline-none transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={isSubmitting || isAuthLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-indigo-700 hover:from-sky-400 hover:to-indigo-600 text-white text-xs font-semibold uppercase tracking-wider shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Acceder a SOMA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Leyenda de Sistema Privado */}
        <div className="pt-2">
          <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 flex items-start gap-3 text-neutral-400 text-xs">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <div className="font-semibold text-neutral-300 text-[11px] uppercase tracking-wider">
                Sistema Privado y Restringido
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Acceso exclusivo para usuarios autorizados. Las cuentas son gestionadas por el
                administrador del sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Pie de página con versión y badges */}
        <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-2 border-t border-neutral-800/70 font-mono">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            SOMA Core
          </span>
          <span>RBAC Activo</span>
        </div>
      </div>
    </div>
  );
}
