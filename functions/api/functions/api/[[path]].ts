export async function onRequest(context: any) {
  const request: Request = context.request;
  const incomingUrl = new URL(request.url);

  const targetUrl =
    "https://payday-ap.sainify.workers.dev" +
    incomingUrl.pathname +
    incomingUrl.search;

  const headers = new Headers(request.headers);

  headers.set("Origin", "https://payday-ap.pages.dev");
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstream = await fetch(targetUrl, init);

  const responseHeaders = new Headers(upstream.headers);

  responseHeaders.delete("Access-Control-Allow-Origin");
  responseHeaders.delete("Access-Control-Allow-Credentials");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
