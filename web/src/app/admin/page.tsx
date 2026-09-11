"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Plus,
  Search,
  KeyRound,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Lock,
  Mail,
  User,
  Sparkles,
  ArrowUpDown,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  LifeTrackerApiClient,
  type AdminUser,
  type CreateAdminUserPayload,
} from "@/lib/api-client";
import { SomaLogo } from "@/components/ui/SomaLogo";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, role, fullName, isLoading: isAuthLoading, signOut } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  // Modal: Crear Usuario
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminUserPayload>({
    email: "",
    password: "",
    fullName: "",
    role: "user",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal: Resetear Contraseña
  const [resetTargetUser, setResetTargetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Guard de ruta: sólo admin puede ver esta página
  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.replace("/login");
      } else if (role !== "admin") {
        router.replace("/hoy");
      }
    }
  }, [user, role, isAuthLoading, router]);

  // Cargar usuarios al montar
  useEffect(() => {
    if (role === "admin") {
      fetchUsers();
    }
  }, [role]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await LifeTrackerApiClient.getAdminUsers();
      setUsers(data);
    } catch (err: unknown) {
      const error = err as Error;
      showFeedback("error", error.message || "Error al cargar la lista de usuarios.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Cálculo de Métricas
  const metrics = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role?.toLowerCase() === "admin").length;
    const somaUsers = users.filter((u) => u.role?.toLowerCase() !== "admin").length;
    const active = users.filter((u) => u.isActive).length;
    return { total, admins, somaUsers, active };
  }, [users]);

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && u.role?.toLowerCase() === "admin") ||
        (roleFilter === "user" && u.role?.toLowerCase() !== "admin");

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Generador de contraseñas temporales
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
    let pwd = "Soma!";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Crear Usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.email.trim() || !createForm.password.trim()) {
      setCreateError("Email y contraseña temporal son requeridos.");
      return;
    }

    if (createForm.password.length < 6) {
      setCreateError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setIsCreating(true);
      const created = await LifeTrackerApiClient.createAdminUser({
        email: createForm.email.trim(),
        password: createForm.password,
        fullName: createForm.fullName?.trim() || undefined,
        role: createForm.role || "user",
      });

      setUsers((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setCreateForm({ email: "", password: "", fullName: "", role: "user" });
      showFeedback("success", `Cuenta creada con éxito para ${created.email}`);
    } catch (err: unknown) {
      const error = err as Error;
      setCreateError(error.message || "Error al crear la cuenta.");
    } finally {
      setIsCreating(false);
    }
  };

  // Cambiar Rol (admin <-> user)
  const handleToggleRole = async (targetUser: AdminUser) => {
    const newRole = targetUser.role?.toLowerCase() === "admin" ? "user" : "admin";
    const confirmMsg = `¿Cambiar el rol de ${targetUser.email} a "${newRole.toUpperCase()}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await LifeTrackerApiClient.updateAdminUserRole(targetUser.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      showFeedback(
        "success",
        `Rol de ${targetUser.email} actualizado a ${newRole.toUpperCase()}`
      );
    } catch (err: unknown) {
      const error = err as Error;
      showFeedback("error", error.message || "Error al actualizar rol.");
    }
  };

  // Activar / Desactivar Cuenta
  const handleToggleStatus = async (targetUser: AdminUser) => {
    const nextState = !targetUser.isActive;
    const actionName = nextState ? "activar" : "suspender";
    if (!window.confirm(`¿Estás seguro de ${actionName} la cuenta de ${targetUser.email}?`)) {
      return;
    }

    try {
      await LifeTrackerApiClient.toggleAdminUserStatus(targetUser.id, nextState);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: nextState } : u))
      );
      showFeedback(
        "success",
        `Cuenta de ${targetUser.email} ${nextState ? "activada" : "suspendida"}.`
      );
    } catch (err: unknown) {
      const error = err as Error;
      showFeedback("error", error.message || "Error al cambiar estado.");
    }
  };

  // Resetear Contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setResetError(null);

    if (!newPassword || newPassword.length < 6) {
      setResetError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setIsResetting(true);
      await LifeTrackerApiClient.resetAdminUserPassword(resetTargetUser.id, newPassword);
      setResetTargetUser(null);
      setNewPassword("");
      showFeedback(
        "success",
        `Contraseña restablecida exitosamente para ${resetTargetUser.email}`
      );
    } catch (err: unknown) {
      const error = err as Error;
      setResetError(error.message || "Error al restablecer la contraseña.");
    } finally {
      setIsResetting(false);
    }
  };

  if (isAuthLoading || (role !== "admin" && user)) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="text-sm font-medium">Verificando credenciales de administrador...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-neutral-800">
      {/* Header Superior Administrativo */}
      <header className="border-b border-neutral-800/90 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* SOMA Logo + Modo Admin Badge */}
          <div className="flex items-center gap-3">
            <SomaLogo href="/admin" size="sm" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <Shield className="w-3.5 h-3.5" />
              <span>Modo Administrador</span>
            </span>
          </div>

          {/* Admin User Info & Logout Button */}
          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-[10px]">
                {fullName ? fullName.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="text-neutral-300 font-medium">{fullName || user?.email}</span>
            </div>

            <button
              type="button"
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-rose-950/30 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-300 transition flex items-center gap-1.5 font-medium active:scale-95 cursor-pointer"
              title="Cerrar sesión administrativa"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-8">
        {/* Banner de Feedback flotante/inline */}
        {actionFeedback && (
          <div
            role="status"
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
              actionFeedback.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Encabezado y Acción Principal */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Gestión de Cuentas & RBAC</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Administración centralizada de identidades, roles de acceso y credenciales de SOMA.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition active:scale-95 disabled:opacity-50"
              title="Recargar usuarios"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateForm({
                  email: "",
                  password: generateRandomPassword(),
                  fullName: "",
                  role: "user",
                });
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold uppercase tracking-wider shadow-lg shadow-purple-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nueva Cuenta</span>
            </button>
          </div>
        </section>

        {/* Tarjetas de Resumen Métrico */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Usuarios */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider">Total Usuarios</span>
              <div className="w-8 h-8 rounded-xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {loadingUsers ? <span className="text-neutral-600">--</span> : metrics.total}
            </div>
            <p className="text-[11px] text-neutral-500">Cuentas registradas en Supabase</p>
          </div>

          {/* Administradores */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider">Administradores</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-300 font-mono">
              {loadingUsers ? <span className="text-neutral-600">--</span> : metrics.admins}
            </div>
            <p className="text-[11px] text-neutral-500">Gestión de cuentas y RBAC</p>
          </div>

          {/* Usuarios SOMA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider">Usuarios SOMA</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-300 font-mono">
              {loadingUsers ? <span className="text-neutral-600">--</span> : metrics.somaUsers}
            </div>
            <p className="text-[11px] text-neutral-500">Acceso a módulos personales</p>
          </div>

          {/* Cuentas Activas */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider">Cuentas Activas</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-sky-300 font-mono">
              {loadingUsers ? <span className="text-neutral-600">--</span> : metrics.active}
            </div>
            <p className="text-[11px] text-neutral-500">Habilitadas para iniciar sesión</p>
          </div>
        </section>

        {/* Filtros & Barra de Búsqueda */}
        <section className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Búsqueda */}
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por email o nombre..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-purple-500/80 transition-all"
            />
          </div>

          {/* Pestañas de Filtro por Rol */}
          <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-xl border border-neutral-800 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                roleFilter === "all"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Todos ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("user")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                roleFilter === "user"
                  ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Usuarios ({metrics.somaUsers})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                roleFilter === "admin"
                  ? "bg-purple-950/50 text-purple-300 border border-purple-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Admins ({metrics.admins})
            </button>
          </div>
        </section>

        {/* Tabla Interactiva de Cuentas */}
        <section className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/90 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Usuario / Nombre
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Rol
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3.5 hidden md:table-cell">
                    Fecha de Creación
                  </th>
                  <th scope="col" className="px-4 py-3.5 hidden lg:table-cell">
                    Último Acceso
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {loadingUsers ? (
                  // Skeleton Loaders
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-5 py-4">
                        <div className="h-4 bg-neutral-800 rounded w-44 mb-1.5" />
                        <div className="h-3 bg-neutral-900 rounded w-28" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 bg-neutral-800 rounded-full w-16" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 bg-neutral-800 rounded-full w-16" />
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="h-3.5 bg-neutral-800 rounded w-24" />
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="h-3.5 bg-neutral-800 rounded w-24" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-7 bg-neutral-800 rounded-xl w-28 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      No se encontraron cuentas que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdmin = u.role?.toLowerCase() === "admin";
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-neutral-900/60 transition-colors group"
                      >
                        {/* Nombre & Email */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isAdmin
                                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {(u.fullName || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-neutral-100 truncate">
                                {u.fullName || "Sin nombre registrado"}
                              </div>
                              <div className="text-[11px] text-neutral-400 font-mono truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Rol */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isAdmin
                                ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {isAdmin ? (
                              <Shield className="w-3 h-3" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            {isAdmin ? "Admin" : "User"}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                              u.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-neutral-800/80 text-neutral-400 border-neutral-700/60"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.isActive ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"
                              }`}
                            />
                            {u.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        {/* Fecha de Creación */}
                        <td className="px-4 py-3.5 hidden md:table-cell text-[11px] text-neutral-400 font-mono">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* Último Acceso */}
                        <td className="px-4 py-3.5 hidden lg:table-cell text-[11px] text-neutral-400 font-mono">
                          {u.lastSignInAt
                            ? new Date(u.lastSignInAt).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : u.updatedAt
                            ? new Date(u.updatedAt).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                              })
                            : "Nunca"}
                        </td>

                        {/* Acciones por fila */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Cambiar Rol */}
                            <button
                              type="button"
                              onClick={() => handleToggleRole(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition text-[11px] font-medium"
                              title={isAdmin ? "Degradar a Usuario" : "Promover a Admin"}
                            >
                              {isAdmin ? "Hacer User" : "Hacer Admin"}
                            </button>

                            {/* Activar / Suspender */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition ${
                                u.isActive
                                  ? "bg-neutral-900 hover:bg-rose-950/40 border-neutral-800 hover:border-rose-500/30 text-neutral-400 hover:text-rose-300"
                                  : "bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 text-emerald-300"
                              }`}
                              title={u.isActive ? "Suspender cuenta" : "Activar cuenta"}
                            >
                              {u.isActive ? "Suspender" : "Activar"}
                            </button>

                            {/* Resetear Contraseña */}
                            <button
                              type="button"
                              onClick={() => {
                                setResetTargetUser(u);
                                setNewPassword(generateRandomPassword());
                                setResetError(null);
                              }}
                              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-amber-950/30 border border-neutral-800 hover:border-amber-500/40 text-neutral-400 hover:text-amber-300 transition"
                              title="Restablecer Contraseña"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODAL 1: Crear Nueva Cuenta */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Crear Nueva Cuenta</h3>
                  <p className="text-xs text-neutral-400">Alta de usuario administrado en SOMA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    placeholder="nuevo.usuario@soma.local"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Nombre Completo */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={createForm.fullName || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, fullName: e.target.value })
                    }
                    placeholder="Ej. Santiago Subi"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Contraseña Temporal */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Contraseña Temporal *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({
                        ...createForm,
                        password: generateRandomPassword(),
                      })
                    }
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Generar segura
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 font-mono placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Selector de Rol */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Rol de Acceso *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: "user" })}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      createForm.role === "user"
                        ? "bg-emerald-950/40 border-emerald-500/40 text-white"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Usuario SOMA</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      Acceso al Life OS y módulos personales
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: "admin" })}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      createForm.role === "admin"
                        ? "bg-purple-950/40 border-purple-500/40 text-white"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-purple-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Administrador</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      Solo gestión de cuentas y RBAC
                    </span>
                  </button>
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 transition"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <span>Crear Cuenta</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Resetear Contraseña */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Restablecer Contraseña</h3>
                  <p className="text-xs text-neutral-400 truncate max-w-[220px]">
                    {resetTargetUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Nueva Contraseña *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                  >
                    Generar segura
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 font-mono placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
                Esta acción actualizará la credencial del usuario en Supabase Auth inmediatamente.
                Asegúrate de copiarla para proporcionársela al usuario.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 transition"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <span>Confirmar Restablecimiento</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
