import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secretString =
  process.env.AUTH_SECRET ||
  "dev-only-secret-troque-em-producao-0123456789";
const secret = new TextEncoder().encode(secretString);

async function getPapel(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { papel?: string };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  const session = await getPapel(token);

  const isConsultorArea = pathname.startsWith("/consultor");
  const isClienteArea = pathname.startsWith("/cliente");

  if ((isConsultorArea || isClienteArea) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isConsultorArea && session?.papel !== "consultor") {
    const url = req.nextUrl.clone();
    url.pathname = "/cliente/carteira";
    return NextResponse.redirect(url);
  }

  if (isClienteArea && session?.papel !== "cliente") {
    const url = req.nextUrl.clone();
    url.pathname = "/consultor/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/consultor/:path*", "/cliente/:path*"],
};
