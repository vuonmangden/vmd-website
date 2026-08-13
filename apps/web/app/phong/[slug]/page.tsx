import { RoomDetail } from './room-detail';
export default async function RoomDetailPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) { const { slug } = await params; return <RoomDetail slug={slug} />; }
