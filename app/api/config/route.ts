import { resolveSocketUrl } from "@shared/config/socket";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ socketUrl: resolveSocketUrl() });
}
