import PostList from "@/components/PostList";
import { requireUser } from "@/lib/auth";
import { getPosts } from "@/lib/data";

export const metadata = { title: "Guardados" };

export default async function Bookmarks() {
  const me = await requireUser();
  const posts = await getPosts(me, { bookmarked: true });
  return (
    <>
      <div className="ph"><h1>Guardados</h1></div>
      <PostList posts={posts} me={me} empty="Guarda posts con el ícono de marcador para leerlos después." />
    </>
  );
}
