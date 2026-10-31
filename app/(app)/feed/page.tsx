import { ComposeCard, NewPostButton, SortSelect } from "@/components/Controls";
import PostList from "@/components/PostList";
import { requireUser } from "@/lib/auth";
import { getPosts } from "@/lib/data";

export const metadata = { title: "Feed" };

export default async function Feed(props: PageProps<"/feed">) {
  const me = await requireUser();
  const sort = (await props.searchParams).orden === "popular" ? "popular" : "latest";
  const posts = await getPosts(me, { sort });
  return (
    <>
      <div className="ph"><h1>Feed</h1><NewPostButton /></div>
      <ComposeCard me={me} />
      <SortSelect value={sort} count={posts.length} />
      <PostList posts={posts} me={me} empty="Aún no hay publicaciones." />
    </>
  );
}
