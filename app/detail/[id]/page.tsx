import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DetailExperience } from "@/components/fx-watch";
import type { TmdbMediaType } from "@/lib/tmdb";

export default function DetailPage(props: PageProps<"/detail/[id]">) {
  return <Suspense fallback={<main className="fx-page-pad">Memuat detail film...</main>}><DetailContent {...props} /></Suspense>;
}

async function DetailContent({ params, searchParams }: PageProps<"/detail/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const type: TmdbMediaType = query.type === "tv" ? "tv" : "movie";
  const requestedSeason = Number(query.season);
  const initialSeason = Number.isSafeInteger(requestedSeason) && requestedSeason > 0 ? requestedSeason : undefined;
  return <DetailExperience id={id} type={type} initialSeason={initialSeason} />;
}