import Link from "next/link";
import { NewPostNotice } from "@/components/Controls";
import PostCard from "@/components/PostCard";
import { isStaff, requireUser } from "@/lib/auth";
import { fmtDate, getPosts } from "@/lib/data";

export default async function PostPage(props: PageProps<"/c/[space]/[post]">) {
  const me = await requireUser();
  const { post } = await props.params;
  const id = Number(post);
  const p = Number.isInteger(id) && id > 0 ? (await getPosts(me, { postId: id }))[0] : undefined;
  if (!p) return <div className="card empty">Este post ya no existe.</div>;
  return (
    <>
      <NewPostNotice />
      <Link className="btn ghost" style={{ alignSelf: "flex-start" }} href={`/c/${p.space_slug}`}>← {p.space_name}</Link>
      <PostCard p={p} me={{ initials: me.initials, color: me.color, staff: isStaff(me) }} full when={fmtDate(p.created_at)} />
    </>
  );
}
