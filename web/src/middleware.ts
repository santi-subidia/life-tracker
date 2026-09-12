import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("soma_token")?.value;
  const rawRole = request.cookies.get("soma_role")?.value;
  const role = rawRole ? rawRole.toLowerCase() : "user";
  const { pathname } = request.nextUrl;

  // Helper para redireccionar
  const redirect = (destination: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    return NextResponse.redirect(url);
  };

  // Rutas públicas y recursos estáticos
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/brand") ||
    pathname.includes(".");

  // 1. Si NO hay token y la ruta es protegida -> redirige a /login
  if (!token && !isPublicRoute) {
    return redirect("/login");
  }

  // 2. Si hay token activo: aplicar RBAC
  if (token) {
    const isLifeOsRoute =
      pathname === "/" ||
      pathname === "/hoy" ||
      pathname.startsWith("/hoy/") ||
      pathname === "/habitos" ||
      pathname.startsWith("/habitos/") ||
      pathname === "/salud" ||
      pathname.startsWith("/salud/") ||
      pathname === "/notas" ||
      pathname.startsWith("/notas/") ||
      pathname === "/trabajo" ||
      pathname.startsWith("/trabajo/") ||
      pathname === "/academia" ||
      pathname.startsWith("/academia/") ||
      pathname === "/finanzas" ||
      pathname.startsWith("/finanzas/") ||
      pathname === "/entrenamientos" ||
      pathname.startsWith("/entrenamientos/") ||
      pathname === "/asistente" ||
      pathname.startsWith("/asistente/") ||
      pathname === "/perfil" ||
      pathname.startsWith("/perfil/");

    if (role === "admin") {
      // Si es admin: Al entrar a /login o rutas del Life OS -> redirige a /admin
      if (pathname === "/login" || isLifeOsRoute) {
        return redirect("/admin");
      }
    } else {
      // Si es user:
      // Al entrar a /login -> redirige a /hoy
      if (pathname === "/login") {
        return redirect("/hoy");
      }
      // Al intentar entrar a /admin o /admin/* -> redirige a /hoy
      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        return redirect("/hoy");
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, manifest.json
     * - static images and assets
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
