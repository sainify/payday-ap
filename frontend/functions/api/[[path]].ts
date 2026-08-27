export async function onRequest(context: any) {
  const request: Request = context.request;
  const url = new URL(request.url);

  const workerUrl =
    "https://payday-ap.sainify.workers.dev/api/" +
    url.pathname.replace(/^\/api\//, "") +
    url.search;

  const headers = new Headers(request.headers);

  // Worker ko production Pages origin milega
  headers.set("Origin", "https://payday-ap.pages.dev");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstream = await fetch(workerUrl, init);

  const responseHeaders = new Headers(upstream.headers);

  // Browser ab same Pages domain se API call kar raha hai
  responseHeaders.delete("Access-Control-Allow-Origin");
  responseHeaders.delete("Access-Control-Allow-Credentials");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
