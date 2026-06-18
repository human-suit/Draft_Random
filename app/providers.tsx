"use client";

import { SocketProvider } from "@features/room/lib/SocketProvider";
import { LoadingProvider } from "@shared/ui/LoadingProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LoadingProvider>
      <SocketProvider>{children}</SocketProvider>
    </LoadingProvider>
  );
}
