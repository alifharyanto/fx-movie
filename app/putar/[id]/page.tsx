import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PlayerExperience } from "@/components/fx-watch";
import type { TmdbMediaType } from "@/lib/tmdb";

export default function PlayerPage(props: PageProps<"/putar/[id]">) {
  return <Suspense fallback={<main className="fx-page-pad">Menyiapkan player...</main>}><PlayerContent {...props} /></Suspense>;
}

async function PlayerContent({ params, searchParams }: PageProps<"/putar/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const type: TmdbMediaType = query.type === "tv" ? "tv" : "movie";
  const requestedSeason = Number(query.season);
  const requestedEpisode = Number(query.episode);
  const seasonNumber = Number.isSafeInteger(requestedSeason) && requestedSeason > 0 ? requestedSeason : undefined;
  const episodeNumber = Number.isSafeInteger(requestedEpisode) && requestedEpisode > 0 ? requestedEpisode : undefined;
  return <PlayerExperience id={id} type={type} seasonNumber={seasonNumber} episodeNumber={episodeNumber} />;
}