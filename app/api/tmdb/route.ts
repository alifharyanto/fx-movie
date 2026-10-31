import { fetchTmdb } from "@/lib/tmdb";

const validTypes = new Set(["movie", "tv"]);

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const action = search.get("action");
  const type = search.get("type") ?? "movie";

  try {
    if (action === "trending") {
      const trendingType = type === "movie" || type === "tv" ? type : "all";
      return Response.json(await fetchTmdb(`trending/${trendingType}/week`));
    }

    if (action === "search") {
      const query = search.get("query")?.trim();
      if (!query) return Response.json({ results: [] });
      return Response.json(await fetchTmdb("search/multi", { query, include_adult: "false" }));
    }

    if (action === "discover") {
      if (!validTypes.has(type)) return Response.json({ error: "Jenis konten tidak valid." }, { status: 400 });
      const genre = search.get("genre");
      const params: Record<string, string> = { sort_by: "popularity.desc", include_adult: "false" };
      if (genre && /^\d+$/.test(genre)) params.with_genres = genre;
      return Response.json(await fetchTmdb(`discover/${type}`, params));
    }

    if (action === "genres") {
      if (!validTypes.has(type)) return Response.json({ error: "Jenis konten tidak valid." }, { status: 400 });
      return Response.json(await fetchTmdb(`genre/${type}/list`));
    }

    if (action === "details") {
      const id = search.get("id");
      if (!id || !/^\d+$/.test(id) || !validTypes.has(type)) {
        return Response.json({ error: "ID atau jenis konten tidak valid." }, { status: 400 });
      }
      return Response.json(await fetchTmdb(`${type}/${id}`, { append_to_response: "videos,credits" }));
    }

    if (action === "recommendations") {
      const id = search.get("id");
      if (!id || !/^\d+$/.test(id) || !validTypes.has(type)) {
        return Response.json({ error: "ID atau jenis konten tidak valid." }, { status: 400 });
      }
      return Response.json(await fetchTmdb(`${type}/${id}/recommendations`));
    }

    if (action === "season") {
      const id = search.get("id");
      const season = search.get("season");
      if (!id || !/^\d+$/.test(id) || type !== "tv" || !season || !/^\d+$/.test(season)) {
        return Response.json({ error: "ID series atau nomor season tidak valid." }, { status: 400 });
      }
      return Response.json(await fetchTmdb(`tv/${id}/season/${season}`));
    }

    return Response.json({ error: "Aksi TMDB tidak dikenal." }, { status: 400 });
  } catch (error) {
    const missingKey = error instanceof Error && error.message === "TMDB_API_KEY_MISSING";
    return Response.json(
      { error: missingKey ? "TMDB_API_KEY_MISSING" : "TMDB sedang tidak bisa dihubungi." },
      { status: missingKey ? 503 : 502 },
    );
  }
}