"use client";

import { SocketProvider } from "@features/room/lib/SocketProvider";
import { LoadingProvider } from "@shared/ui/LoadingProvider";

export default function Providers({
  children,
  socketUrl,
}: {
  children: React.ReactNode;
  socketUrl: string;
}) {
  return (
    <LoadingProvider>
      <SocketProvider socketUrl={socketUrl}>{children}</SocketProvider>
    </LoadingProvider>
  );
}
