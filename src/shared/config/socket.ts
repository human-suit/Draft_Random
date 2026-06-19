export function resolveSocketUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const fromServer = process.env.SOCKET_SERVER_URL?.trim();
  return fromPublic || fromServer || "http://localhost:3002";
}
