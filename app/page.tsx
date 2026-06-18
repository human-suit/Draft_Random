import { Suspense } from "react";
import HomePageClient from "@features/room/ui/HomePageClient";
import DotaLoader from "@shared/ui/DotaLoader";

export default function Home() {
  return (
    <Suspense fallback={<DotaLoader message="Подготовка арены" />}>
      <HomePageClient />
    </Suspense>
  );
}
