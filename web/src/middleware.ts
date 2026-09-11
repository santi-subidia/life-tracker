import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://your-project.supabase.co";

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "your-supabase-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refrescar y validar sesión usando getUser() de Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Helper para redireccionar preservando cookies de sesión actualizadas
  const redirectWithCookies = (destination: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    const redirectRes = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectRes;
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

  // 1. Si NO hay sesión y la ruta es protegida -> redirige a /login
  if (!user && !isPublicRoute) {
    return redirectWithCookies("/login");
  }

  // 2. Si hay sesión activa: aplicar RBAC
  if (user) {
    const rawRole =
      user.app_metadata?.role || user.user_metadata?.role || "user";
    const role = String(rawRole).toLowerCase();

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
        return redirectWithCookies("/admin");
      }
    } else {
      // Si es user:
      // Al entrar a /login -> redirige a /hoy
      if (pathname === "/login") {
        return redirectWithCookies("/hoy");
      }
      // Al intentar entrar a /admin o /admin/* -> redirige a /hoy
      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        return redirectWithCookies("/hoy");
      }
    }
  }

  return response;
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
