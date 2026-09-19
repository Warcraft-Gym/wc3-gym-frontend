// Clerk's Frontend API served from this domain: the production instance cannot own a
// vercel.app subdomain by DNS, so /__clerk/* is forwarded here (proxy mode).
const FRONTEND_API = "https://frontend-api.clerk.dev";

async function handler(request: Request, ctx: { params: Promise<{ p: string[] }> }) {
  const url = new URL(request.url);
  const path = (await ctx.params).p.join("/");

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("Clerk-Proxy-Url", process.env.NEXT_PUBLIC_CLERK_PROXY_URL ?? "");
  headers.set("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY ?? "");
  headers.set("X-Forwarded-For", request.headers.get("x-forwarded-for") || "");

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const answer = await fetch(`${FRONTEND_API}/${path}${url.search}`, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? "half" : undefined,
    redirect: "manual",
  } as RequestInit);

  // Node fetch asks for a compressed answer and unpacks it, so the two headers that describe the packed body go
  const answerHeaders = new Headers(answer.headers);
  answerHeaders.delete("content-encoding");
  answerHeaders.delete("content-length");
  return new Response(answer.body, { status: answer.status, statusText: answer.statusText, headers: answerHeaders });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as HEAD, handler as OPTIONS };
