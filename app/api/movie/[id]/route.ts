import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const searchParams = request.nextUrl.searchParams;

  const type = searchParams.get("type") || "movie"; // 'movie' atau 'tv'
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  if (!id) {
    return NextResponse.json(
      { error: "ID media (TMDB ID) wajib diisi." },
      { status: 400 }
    );
  }

  // Pola URL VidLink dan MultiEmbed
  const embedUrls = {
    vidlink:
      type === "tv"
        ? `https://vidlink.pro/tv/${id}/${season}/${episode}`
        : `https://vidlink.pro/movie/${id}`,
    multiembed:
      type === "tv"
        ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
  };

  return NextResponse.json({
    id,
    type,
    season: type === "tv" ? season : null,
    episode: type === "tv" ? episode : null,
    sources: embedUrls,
  });
}