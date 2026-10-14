import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerToken } from "./lib/token";

export async function middleware(req: NextRequest) {
  const sessao = await lerToken(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!sessao) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next|favicon.ico|api/health).*)"],
};
