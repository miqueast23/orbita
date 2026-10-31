import { isStaff, type User } from "@/lib/auth";
import { fmtDate, type PostView } from "@/lib/data";
import PostCard from "./PostCard";

export default function PostList({ posts, me, empty }: { posts: PostView[]; me: User; empty: string }) {
  if (posts.length === 0) return <div className="card empty">{empty}</div>;
  const lite = { initials: me.initials, color: me.color, staff: isStaff(me) };
  return <>{posts.map((p) => <PostCard key={p.id} p={p} me={lite} when={fmtDate(p.created_at)} />)}</>;
}
