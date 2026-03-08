export interface Env {
  DATABASE_URL: string;
  PAPERS_CACHE: KVNamespace; // This name must match wrangler.toml
}