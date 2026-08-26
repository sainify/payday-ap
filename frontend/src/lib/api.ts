const BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText || "Request failed";

    try {
      const body = await res.json();
      message =
        (body as { error?: string }).error ||
        message;
    } catch {
      // ignore
    }

    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

async function download(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new ApiError(
      res.statusText || "Download failed",
      res.status
    );
  }

  return res.blob();
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),

  del: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),

  download,
};
