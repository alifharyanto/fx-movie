import { Suspense } from "react";
import { SearchResults } from "@/components/fx-watch";

export default function SearchResultsPage({ params }: PageProps<"/cari/[slug]">) {
  return <Suspense fallback={<main className="fx-page-pad">Memuat hasil pencarian...</main>}><SearchResultsContent params={params} /></Suspense>;
}

async function SearchResultsContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SearchResults slug={slug} />;
}