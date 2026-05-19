const localDatabaseUrl = "postgresql://ezto:ezto@localhost:5432/ezto?schema=public";

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || localDatabaseUrl;

  if (process.env.EZTO_DOCKER === "true") {
    return url;
  }

  return url.replace("@postgres:", "@localhost:");
}
