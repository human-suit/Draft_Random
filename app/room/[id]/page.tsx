import RoomPageClient from "@features/room/ui/RoomPageClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params;
  return <RoomPageClient roomId={id} />;
}
