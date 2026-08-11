export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  COOKIE_DOMAIN: string;
}

export interface Ctx {
  req: Request;
  env: Env;
  url: URL;
  origin: string;
  userId: string;
}
