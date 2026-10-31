"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import type { TmdbDetails, TmdbEpisode, TmdbList, TmdbMediaType, TmdbSeason, TmdbTitle } from "@/lib/tmdb";

const SAVED_KEY = "fx-watch-saved";
const SAVED_EVENT = "fx-watch-saved-change";
const HISTORY_KEY = "fx-watch-history";
const HISTORY_EVENT = "fx-watch-history-change";

export type SavedTitle = Omit<TmdbTitle, "media_type"> & { media_type: TmdbMediaType };

export type WatchHistoryItem = {
  id: string;
  title: string;
  poster_path: string | null;
  media_type: TmdbMediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  server?: "vidlink" | "multiembed";
  lastTimeFormatted?: string; // Menyimpan durasi waktu seperti "12:34" atau "Terakhir dibuka"
  updatedAt: number;
};

/* --- HOOK: SAVED TITLES --- */
function readSavedTitles(): SavedTitle[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is SavedTitle => Boolean(item && typeof item.id === "number")) : [];
  } catch {
    return [];
  }
}

function useSavedTitles() {
  const [saved, setSaved] = useState<SavedTitle[]>([]);

  useEffect(() => {
    const refresh = () => setSaved(readSavedTitles());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(SAVED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SAVED_EVENT, refresh);
    };
  }, []);

  const toggle = (title: TmdbTitle, mediaType: TmdbMediaType) => {
    const current = readSavedTitles();
    const exists = current.some((item) => item.id === title.id && item.media_type === mediaType);
    const next = exists
      ? current.filter((item) => item.id !== title.id || item.media_type !== mediaType)
      : [...current, { ...title, media_type: mediaType }];
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    setSaved(next);
    window.dispatchEvent(new Event(SAVED_EVENT));
  };

  return { saved, toggle };
}

/* --- HOOK: WATCH HISTORY --- */
function readWatchHistory(): WatchHistoryItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    const refresh = () => setHistory(readWatchHistory());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(HISTORY_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(HISTORY_EVENT, refresh);
    };
  }, []);

  const saveHistory = (item: Omit<WatchHistoryItem, "updatedAt">) => {
    const current = readWatchHistory();
    const filtered = current.filter((h) => !(h.id === item.id && h.media_type === item.media_type));
    const updated: WatchHistoryItem[] = [{ ...item, updatedAt: Date.now() }, ...filtered].slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  };

  return { history, saveHistory, clearHistory };
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
    bookmark: <path d="M6 4h12v17l-6-4-6 4z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <path d="M12 5v14m-7-7h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    play: <path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none" />,
    back: <path d="m15 18-6-6 6-6" />,
    trash: <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function subscribeToScroll(listener: () => void) {
  window.addEventListener("scroll", listener, { passive: true });
  return () => window.removeEventListener("scroll", listener);
}

function getScrollSnapshot() {
  return window.scrollY > 24;
}

function getServerScrollSnapshot() {
  return false;
}

function ChromeLinks({ pathname }: { pathname: string }) {
  const isScrolled = useSyncExternalStore(subscribeToScroll, getScrollSnapshot, getServerScrollSnapshot);
  const [isMobileNavCompact, setIsMobileNavCompact] = useState(false);
  const [isMobileHeaderCompact, setIsMobileHeaderCompact] = useState(false);

  useEffect(() => {
    let previousScrollY = window.scrollY;
    let animationFrame = 0;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > previousScrollY;
      previousScrollY = currentScrollY;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const pastScrollThreshold = currentScrollY > 60;
        setIsMobileNavCompact(scrollingDown && pastScrollThreshold);
        setIsMobileHeaderCompact(!scrollingDown && pastScrollThreshold);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  if (pathname.startsWith("/detail/") || pathname.startsWith("/putar/")) return null;
  const shouldCompactHeader = isScrolled && isMobileHeaderCompact;

  const desktopLinks = [
    { href: "/", label: "Beranda" },
    { href: "/jelajahi", label: "Jelajahi" },
    { href: "/cari", label: "Cari" },
    { href: "/disimpan", label: "Disimpan" },
  ];
  const mobileLinks = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/jelajahi", label: "Jelajahi", icon: "compass" },
    { href: "/disimpan", label: "Disimpan", icon: "bookmark" },
  ];

  return <>
    <header className={`fx-header${isScrolled ? " is-scrolled" : ""}${shouldCompactHeader ? " is-compact" : ""}`}>
      <Link href="/" className="fx-logo" aria-label="FX Watch beranda"><span className="fx-logo-mark">FX</span><span>WATCH</span></Link>
      <nav className="fx-desktop-nav" aria-label="Navigasi utama">
        {desktopLinks.map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>{item.label}</Link>)}
      </nav>
      <div className="fx-header-actions">
        <Link className="fx-search-link" href="/cari" aria-label="Cari film"><Icon name="search" /></Link>
        <Link className="fx-account-link" href="/akun" aria-label="Akun"><span>F</span></Link>
      </div>
    </header>
    <nav
      className={`fx-mobile-nav${isMobileNavCompact ? " is-compact" : ""}`}
      style={{
        width: isMobileNavCompact ? "min(calc(100% - 32px), var(--fx-mobile-nav-compact-width))" : "min(calc(100% - 32px), var(--fx-mobile-nav-width))",
        transition: "width var(--fx-mobile-nav-transition) cubic-bezier(.2,.8,.2,1)",
      }}
      aria-label="Navigasi mobile"
    >
      {mobileLinks.map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}><Icon name={item.icon} size={19} /><span>{item.label}</span></Link>)}
    </nav>
  </>;
}

export function AppChrome() {
  const pathname = usePathname();
  return <ChromeLinks pathname={pathname} />;
}

export function AppChromeFallback() {
  return <ChromeLinks pathname="" />;
}

function titleName(title: TmdbTitle) {
  return title.title || title.name || "Tanpa judul";
}

function titleYear(title: TmdbTitle) {
  const date = title.release_date || title.first_air_date;
  return date ? date.slice(0, 4) : "Baru";
}

function posterUrl(path: string | null, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

export function SaveTitleButton({ title, type = title.media_type === "tv" ? "tv" : "movie" }: { title: TmdbTitle; type?: TmdbMediaType }) {
  const { saved, toggle } = useSavedTitles();
  const isSaved = saved.some((item) => item.id === title.id && item.media_type === type);
  return <button className={`save-title-button${isSaved ? " is-saved" : ""}`} aria-label={isSaved ? "Hapus dari disimpan" : "Simpan film"} title={isSaved ? "Hapus dari disimpan" : "Simpan film"} onClick={() => toggle(title, type)}><Icon name={isSaved ? "check" : "plus"} size={18} /></button>;
}

export function MovieCard({ title, type }: { title: TmdbTitle; type?: TmdbMediaType }) {
  const mediaType = type ?? (title.media_type === "tv" ? "tv" : "movie");
  const poster = posterUrl(title.poster_path);
  return <article className="fx-movie-card">
    <Link href={`/detail/${title.id}?type=${mediaType}`} className="fx-poster-link" aria-label={`Lihat detail ${titleName(title)}`}>
      <span className="fx-poster" style={poster ? { backgroundImage: `url('${poster}')` } : undefined}>
        {!poster && <span className="poster-fallback">FX<br />WATCH</span>}
        <span className="poster-play"><Icon name="play" size={17} /></span>
      </span>
      <span className="fx-card-title">{titleName(title)}</span>
      <span className="fx-card-meta">{titleYear(title)}<i />{title.vote_average ? `${title.vote_average.toFixed(1)} TMDB` : mediaType === "tv" ? "Series" : "Film"}</span>
    </Link>
    <SaveTitleButton title={title} type={mediaType} />
  </article>;
}

function useTmdb(params: Record<string, string>) {
  const [result, setResult] = useState<{ requestUrl: string; data: TmdbList | null; error: string } | null>(null);
  const requestUrl = `/api/tmdb?${new URLSearchParams(params)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(requestUrl, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat data TMDB.");
        return result as TmdbList;
      })
      .then((data) => setResult({ requestUrl, data, error: "" }))
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== "AbortError") setResult({ requestUrl, data: null, error: reason.message });
      })
      .finally(() => undefined);
    return () => controller.abort();
  }, [requestUrl]);

  const currentResult = result?.requestUrl === requestUrl ? result : null;
  return { data: currentResult?.data ?? null, error: currentResult?.error ?? "", loading: currentResult === null };
}

function ResultGrid({ results, type, limit }: { results: TmdbTitle[]; type?: TmdbMediaType; limit?: number }) {
  const titles = results.filter((title) => title.media_type !== "person").slice(0, limit);
  if (!titles.length) return <div className="fx-empty-state">Belum ada judul yang cocok.</div>;
  return <div className="fx-movie-grid">{titles.map((title) => <MovieCard key={`${title.media_type ?? type}-${title.id}`} title={title} type={type} />)}</div>;
}

function DataState({ loading, error = "" }: { loading: boolean; error?: string }) {
  if (loading) return <div className="fx-state-message">Memuat judul dari TMDB<span className="loading-pulse" /></div>;
  if (error === "TMDB_API_KEY_MISSING") return <div className="fx-state-message">Tambahkan API key TMDB pada <code>.env.local</code>, lalu mulai ulang server.</div>;
  if (error) return <div className="fx-state-message">{error}</div>;
  return null;
}

export function TmdbCollection({ params, heading, limit, horizontal = false }: { params: Record<string, string>; heading?: string; limit?: number; horizontal?: boolean }) {
  const { data, error, loading } = useTmdb(params);
  return <section className={`fx-collection${horizontal ? " fx-collection-horizontal" : ""}`}>
    {heading && <div className="fx-section-heading"><h2>{heading}</h2><span>DATA TMDB</span></div>}
    <DataState loading={loading} error={error} />
    {data && !error && <ResultGrid results={data.results} type={params.type === "tv" ? "tv" : "movie"} limit={limit} />}
  </section>;
}

export function HomeExperience() {
  const { data, error, loading } = useTmdb({ action: "trending", type: "all" });
  const featured = data?.results.find((title) => title.backdrop_path) ?? data?.results[0];
  const backdrop = featured?.backdrop_path ? posterUrl(featured.backdrop_path, "original") : "";
  const mediaType = featured?.media_type === "tv" ? "tv" : "movie";

  return <main className="fx-home-page">
    <section className="fx-featured" style={backdrop ? { backgroundImage: `url('${backdrop}')` } : undefined}>
      <div className="fx-featured-scrim" />
      <div className="fx-featured-content">
        <span className="fx-eyebrow"><i /> PILIHAN MINGGU INI <b>·</b> FX WATCH</span>
        {loading ? <h1>MENYIAPKAN LAYAR</h1> : <h1>{featured ? titleName(featured) : "CERITA DIMULAI DI SINI"}</h1>}
        {featured && <><div className="fx-featured-meta"><span>{titleYear(featured)}</span><i />{featured.vote_average ? `${featured.vote_average.toFixed(1)} rating TMDB` : "Pilihan trending"}<i />4K</div><p>{featured.overview || "Jelajahi film dan series paling ramai dibicarakan minggu ini."}</p><div className="fx-featured-actions"><Link className="fx-play-button" href={`/detail/${featured.id}?type=${mediaType}`}>Lihat detail <span>↗</span></Link></div></>}
        {error && <DataState loading={false} error={error} />}
      </div>
      <div className="fx-featured-caption">01 <span /> {loading ? "TMDB" : "TRENDING"}</div>
    </section>
    <div className="fx-home-content">
      <TmdbCollection params={{ action: "trending", type: "movie" }} heading="Sedang ramai dibicarakan" />
      <TmdbCollection params={{ action: "trending", type: "tv" }} heading="Series pilihan" />
    </div>
  </main>;
}

export function SearchLanding() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = query.trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^-|-$/g, "");
    if (slug) router.push(`/cari/${slug}`);
  };

  return <main className="fx-page-pad fx-search-page">
    <div className="fx-page-kicker">PENCARIAN KATALOG</div>
    <h1>Cari cerita<br /><em>favoritmu.</em></h1>
    <form className="fx-search-form" onSubmit={submit}><Icon name="search" size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Judul film, aktor, atau genre" aria-label="Cari film dan series" autoFocus /><button type="submit" disabled={!query.trim()}>Cari <span>↗</span></button></form>
    <TmdbCollection params={{ action: "trending", type: "movie" }} heading="Populer saat ini" />
  </main>;
}

export function SearchResults({ slug }: { slug: string }) {
  const query = slug.replace(/-/g, " ");
  return <main className="fx-page-pad">
    <div className="fx-page-kicker">HASIL PENCARIAN</div>
    <h1 className="fx-page-title">“{query}”</h1>
    <TmdbCollection params={{ action: "search", query }} />
  </main>;
}

const genreOptions = [
  { label: "Semua", id: "" }, { label: "Action", id: "28" }, { label: "Adventure", id: "12" },
  { label: "Drama", id: "18" }, { label: "Sci-Fi", id: "878" }, { label: "Thriller", id: "53" },
  { label: "Animation", id: "16" }, { label: "Documentary", id: "99" },
];

export function ExploreExperience() {
  const [genre, setGenre] = useState("");
  const [type, setType] = useState<TmdbMediaType>("movie");
  return <main className="fx-page-pad">
    <div className="fx-page-kicker">KURASI FX WATCH</div>
    <h1 className="fx-page-title">Jelajahi katalog.</h1>
    <div className="fx-filter-row"><div className="fx-segmented"><button className={type === "movie" ? "selected" : ""} onClick={() => setType("movie")}>Film</button><button className={type === "tv" ? "selected" : ""} onClick={() => setType("tv")}>Series</button></div><div className="fx-genre-list">{genreOptions.map((option) => <button key={option.label} className={genre === option.id ? "selected" : ""} onClick={() => setGenre(option.id)}>{option.label}</button>)}</div></div>
    <TmdbCollection key={`${type}-${genre}`} params={{ action: "discover", type, ...(genre ? { genre } : {}) }} />
  </main>;
}

export function SavedExperience() {
  const { saved } = useSavedTitles();
  return <main className="fx-page-pad">
    <div className="fx-page-kicker">KOLEKSI PERSONAL</div>
    <h1 className="fx-page-title">Disimpan <span className="fx-count">{saved.length.toString().padStart(2, "0")}</span></h1>
    <p className="fx-page-note">Koleksi ini tersimpan di perangkatmu.</p>
    {!saved.length ? <div className="fx-empty-state large">Belum ada judul tersimpan. Tambahkan film lewat ikon + pada poster.</div> : <ResultGrid results={saved} />}
  </main>;
}

/* --- TAMPILAN AKUN: MENAMPILKAN CARD RIWAYAT LENGKAP DENGAN WAKTU TERAKHIR DITONTON --- */
export function AccountExperience() {
  const { history, clearHistory } = useWatchHistory();

  return <main className="fx-page-pad fx-account-page">
    <div className="fx-page-kicker">PENGATURAN PROFIL</div>
    <h1 className="fx-page-title">Akun.</h1>
    <section className="fx-profile-panel"><div className="fx-avatar">F</div><div><span className="fx-profile-label">PROFIL LOKAL</span><h2>Penonton FX</h2><p>Pengaturan dan riwayat tersimpan di perangkat ini.</p></div><span className="fx-profile-status">AKTIF</span></section>

    {/* Section Riwayat Tontonan */}
    <section className="fx-account-section" style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Riwayat Tontonan</h2>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.85rem" }}
          >
            <Icon name="trash" size={15} /> Hapus Riwayat
          </button>
        )}
      </div>

      {!history.length ? (
        <div className="fx-empty-state">Belum ada riwayat tontonan. Mulai menonton film atau series!</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {history.map((item) => {
            const playUrl = item.media_type === "tv"
              ? `/putar/${item.id}?type=tv&season=${item.seasonNumber ?? 1}&episode=${item.episodeNumber ?? 1}`
              : `/putar/${item.id}?type=movie`;
            const poster = posterUrl(item.poster_path, "w500");

            return (
              <div
                key={`${item.media_type}-${item.id}`}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "12px",
                  padding: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ aspectRatio: "16/9", borderRadius: "8px", overflow: "hidden", background: "#111", backgroundImage: poster ? `url('${poster}')` : undefined, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
                  {item.server && (
                    <span style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.75)", color: "#3b82f6", fontSize: "0.7rem", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" }}>
                      {item.server}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.3rem" }}>
                    <p style={{ fontSize: "0.8rem", color: "#a1a1aa", margin: 0 }}>
                      {item.media_type === "tv" ? `Season ${item.seasonNumber ?? 1} · Ep ${item.episodeNumber ?? 1}` : "Film"}
                    </p>
                    <span style={{ fontSize: "0.75rem", color: "#3b82f6", display: "flex", alignItems: "center", gap: "3px" }}>
                      <Icon name="clock" size={12} /> {item.lastTimeFormatted || "Terakhir dibuka"}
                    </span>
                  </div>
                </div>
                <Link
                  href={playUrl}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justify: "center",
                    gap: "0.4rem",
                    padding: "0.5rem",
                    background: "var(--fx-accent, #2563eb)",
                    color: "#fff",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  }}
                >
                  <Icon name="play" size={14} /> Lanjutkan Nonton
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>

    <section className="fx-account-settings" style={{ marginTop: "2rem" }}>
      <div><span>01</span><div><h3>Daftar disimpan</h3><p>Judul favorit disimpan pada perangkat ini.</p></div><Link href="/disimpan">Buka koleksi ↗</Link></div>
      <div><span>02</span><div><h3>Sumber katalog</h3><p>Informasi judul dan poster berasal dari TMDB.</p></div><span className="fx-setting-value">TMDB API</span></div>
      <div><span>03</span><div><h3>Keanggotaan</h3><p>Fitur login belum dihubungkan.</p></div><span className="fx-setting-value">DEMO</span></div>
    </section>
  </main>;
}

function useTitleDetails(id: string, type: TmdbMediaType) {
  const [result, setResult] = useState<{ key: string; details: TmdbDetails | null; error: string } | null>(null);
  const key = `${id}:${type}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tmdb?action=details&id=${encodeURIComponent(id)}&type=${type}`, { signal: controller.signal })
      .then(async (response) => {
        const details = await response.json();
        if (!response.ok) throw new Error(details.error || "Gagal memuat detail.");
        return details as TmdbDetails;
      })
      .then((details) => setResult({ key, details, error: "" }))
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== "AbortError") setResult({ key, details: null, error: reason.message });
      });
    return () => controller.abort();
  }, [id, key, type]);

  const current = result?.key === key ? result : null;
  return { details: current?.details ?? null, error: current?.error ?? "", loading: current === null };
}

function useSeasonEpisodes(id: string, seasonNumber: number | null) {
  const [result, setResult] = useState<{ key: string; season: TmdbSeason | null; error: string } | null>(null);
  const key = seasonNumber === null ? "" : `${id}:${seasonNumber}`;

  useEffect(() => {
    if (seasonNumber === null) return;
    const controller = new AbortController();
    fetch(`/api/tmdb?action=season&id=${encodeURIComponent(id)}&type=tv&season=${seasonNumber}`, { signal: controller.signal })
      .then(async (response) => {
        const season = await response.json();
        if (!response.ok) throw new Error(season.error || "Gagal memuat episode.");
        return season as TmdbSeason;
      })
      .then((season) => setResult({ key, season, error: "" }))
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== "AbortError") setResult({ key, season: null, error: reason.message });
      });
    return () => controller.abort();
  }, [id, key, seasonNumber]);

  const current = result?.key === key ? result : null;
  return { season: current?.season ?? null, error: current?.error ?? "", loading: seasonNumber !== null && current === null };
}

function EpisodeCard({ seriesId, seriesName, episode }: { seriesId: string; seriesName: string; episode: TmdbEpisode }) {
  const still = posterUrl(episode.still_path, "w500");
  return <Link className="fx-episode-card" href={`/putar/${seriesId}?type=tv&season=${episode.season_number}&episode=${episode.episode_number}`}>
    <span className="fx-episode-still" style={still ? { backgroundImage: `url('${still}')` } : undefined}>
      {!still && <span className="poster-fallback">FX<br />WATCH</span>}
      <span className="fx-episode-play"><Icon name="play" size={15} /></span>
    </span>
    <span className="fx-episode-title">{episode.name || `Episode ${episode.episode_number}`}</span>
    <span className="fx-episode-meta">{seriesName} · S{episode.season_number} E{episode.episode_number}</span>
  </Link>;
}

export function DetailExperience({ id, type, initialSeason }: { id: string; type: TmdbMediaType; initialSeason?: number }) {
  const { details, error, loading } = useTitleDetails(id, type);
  const [requestedSeason, setRequestedSeason] = useState(initialSeason ?? 1);
  const { saved, toggle } = useSavedTitles();
  const isSaved = saved.some((item) => item.id === Number(id) && item.media_type === type);
  const director = details?.credits?.crew.find((person) => person.job === "Director");
  const cast = details?.credits?.cast.slice(0, 8) ?? [];
  const seasons = details?.seasons?.filter((season) => season.season_number > 0) ?? [];
  const selectedSeason = seasons.some((season) => season.season_number === requestedSeason)
    ? requestedSeason
    : seasons[0]?.season_number ?? 1;
  const { season: episodeList, error: episodeError, loading: episodesLoading } = useSeasonEpisodes(id, type === "tv" ? selectedSeason : null);
  const firstEpisode = episodeList?.episodes[0];
  const canPlay = type !== "tv" || Boolean(firstEpisode);
  const playHref = type === "tv" && firstEpisode ? `/putar/${id}?type=tv&season=${selectedSeason}&episode=${firstEpisode.episode_number}` : `/putar/${id}?type=movie`;

  return <main className="fx-page-pad fx-detail-page">
    <Link href="/" className="fx-back-link"><Icon name="back" size={17} /> Kembali ke beranda</Link>
    {error ? <DataState loading={false} error={error} /> : loading || !details ? <DataState loading /> : <>
      <section className="fx-detail-layout">
        <div className="fx-detail-poster" style={details.poster_path ? { backgroundImage: `url('${posterUrl(details.poster_path, "w780")}')` } : undefined}>
          {!details.poster_path && <span className="poster-fallback">FX<br />WATCH</span>}
        </div>
        <div className="fx-detail-copy">
          <div className="fx-page-kicker">{type === "tv" ? "SERIES" : "FILM"} · TMDB ID {details.id}</div>
          <h1>{titleName(details)}</h1>
          <div className="fx-detail-meta"><span>{titleYear(details)}</span><i />{details.vote_average ? `${details.vote_average.toFixed(1)} rating TMDB` : "Belum memiliki rating"}<i />{details.runtime ? `${Math.floor(details.runtime / 60)}j ${details.runtime % 60}m` : type === "tv" ? "Series" : "Durasi belum tersedia"}</div>
          <p className="fx-detail-synopsis">{details.overview || "Sinopsis belum tersedia."}</p>
          <div className="fx-detail-actions">
            <Link className={`fx-detail-play${canPlay ? "" : " is-disabled"}`} href={playHref} aria-disabled={!canPlay} onClick={(event) => { if (!canPlay) event.preventDefault(); }}><FontAwesomeIcon icon={faPlay} /> Play</Link>
            <button className={`fx-save-large${isSaved ? " is-saved" : ""}`} onClick={() => toggle(details, type)}><Icon name={isSaved ? "check" : "plus"} /> {isSaved ? "Disimpan" : "Simpan"}</button>
          </div>
          {director && <div className="fx-director"><span>SUTRADARA</span><strong>{director.name}</strong></div>}
          {type === "tv" && <section className="fx-episodes-section">
            <div className="fx-episodes-heading"><div><h2>Episode</h2><span>{episodeList?.episode_count ?? episodeList?.episodes.length ?? details.number_of_episodes ?? 0} episode</span></div>
              {seasons.length > 1 ? <select aria-label="Pilih season" value={selectedSeason} onChange={(event) => setRequestedSeason(Number(event.target.value))}>{seasons.map((season) => <option key={season.season_number} value={season.season_number}>{season.name || `Season ${season.season_number}`}</option>)}</select> : <span className="fx-season-label">Season {selectedSeason}</span>}
            </div>
            {episodeError ? <div className="fx-episode-state">Episode tidak dapat dimuat saat ini.</div> : episodesLoading ? <div className="fx-episode-state">Memuat episode...</div> : episodeList?.episodes.length ? <div className="fx-episodes-track">{episodeList.episodes.map((episode) => <EpisodeCard key={episode.id} seriesId={id} seriesName={titleName(details)} episode={episode} />)}</div> : <div className="fx-episode-state">Belum ada data episode untuk season ini.</div>}
          </section>}
          {cast.length > 0 && <section className="fx-cast-section"><div className="fx-cast-heading"><h2>Pemeran</h2><span>{cast.length} nama</span></div><div className="fx-cast-list">{cast.map((person) => <div className="fx-cast-person" key={person.id}><span className="fx-cast-photo" style={person.profile_path ? { backgroundImage: `url('https://image.tmdb.org/t/p/w185${person.profile_path}')` } : undefined}>{!person.profile_path && person.name.slice(0, 1)}</span><span className="fx-cast-name">{person.name}</span><span className="fx-cast-role">{person.character}</span></div>)}</div></section>}
        </div>
      </section>
    </>}
  </main>;
}

/* --- PLAYER EXPERIENCE: MENANGKAP PESAN DURASI & MENYIMPAN STATUS SERVER --- */
export function PlayerExperience({ id, type, seasonNumber, episodeNumber }: { id: string; type: TmdbMediaType; seasonNumber?: number; episodeNumber?: number }) {
  const { details, error, loading } = useTitleDetails(id, type);
  const activeSeason = type === "tv" ? seasonNumber ?? 1 : 1;
  const activeEpisode = type === "tv" ? episodeNumber ?? 1 : 1;
  const { season } = useSeasonEpisodes(id, type === "tv" ? activeSeason : null);
  const selectedEpisode = season?.episodes.find((episode) => episode.episode_number === activeEpisode) ?? season?.episodes[0];
  const { saveHistory } = useWatchHistory();

  const [activeServer, setActiveServer] = useState<"vidlink" | "multiembed">("vidlink");
  const [currentProgress, setCurrentProgress] = useState<string>("Baru saja");

  // Listener untuk menangkap postMessage durasi waktu dari player (jika didukung)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === "object" && event.data !== null) {
          // VidLink/MultiEmbed timeupdate format
          if (event.data.time || event.data.currentTime) {
            const totalSeconds = Math.floor(event.data.time || event.data.currentTime);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const formatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
            setCurrentProgress(formatted);
          }
        }
      } catch {
        // abaikan error parsing message
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Otomatis update Riwayat Tontonan
  useEffect(() => {
    if (details) {
      saveHistory({
        id,
        title: titleName(details),
        poster_path: selectedEpisode?.still_path || details.backdrop_path || details.poster_path,
        media_type: type,
        seasonNumber: type === "tv" ? activeSeason : undefined,
        episodeNumber: type === "tv" ? activeEpisode : undefined,
        server: activeServer,
        lastTimeFormatted: currentProgress,
      });
    }
  }, [details, id, type, activeSeason, activeEpisode, selectedEpisode, activeServer, currentProgress]);

  const embedSources = {
    vidlink:
      type === "tv"
        ? `https://vidlink.pro/tv/${id}/${activeSeason}/${activeEpisode}`
        : `https://vidlink.pro/movie/${id}`,
    multiembed:
      type === "tv"
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${activeSeason}&e=${activeEpisode}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  };

  return <main className="fx-page-pad fx-player-page">
    <div className="fx-player-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
      <Link href={`/detail/${id}?type=${type}`} className="fx-back-link" style={{ marginBottom: 0 }}>
        <Icon name="back" size={17} /> Kembali ke detail
      </Link>

      <div className="fx-server-switcher" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>Server:</span>
        <button
          type="button"
          onClick={() => setActiveServer("vidlink")}
          style={{
            padding: "0.35rem 0.85rem",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: activeServer === "vidlink" ? "var(--fx-accent, #2563eb)" : "rgba(255,255,255,0.05)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          VidLink
        </button>
        <button
          type="button"
          onClick={() => setActiveServer("multiembed")}
          style={{
            padding: "0.35rem 0.85rem",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: activeServer === "multiembed" ? "var(--fx-accent, #2563eb)" : "rgba(255,255,255,0.05)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          MultiEmbed
        </button>
      </div>
    </div>

    {/* Video Player */}
    <section className="fx-player-screen" style={{ position: "relative", aspectRatio: "16/9", width: "100%", background: "#000", borderRadius: "12px", overflow: "hidden" }}>
      <iframe
        key={activeServer}
        src={embedSources[activeServer]}
        style={{ width: "100%", height: "100%", border: "none" }}
        allow="autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title={details ? titleName(details) : "Video Player"}
      />
    </section>

    {error ? <DataState loading={false} error={error} /> : loading || !details ? <DataState loading /> : <section className="fx-player-details">
      <h1>{titleName(details)}</h1>
      <div className="fx-player-genres">
        {details.genres?.length ? details.genres.map((genre) => <span key={genre.id}>{genre.name}</span>) : <span>Genre belum tersedia</span>}
      </div>
      {type === "tv" && <div className="fx-player-episode">
        <span>EPISODE</span>
        <strong>{titleName(details)} Season {activeSeason} | Episode {selectedEpisode?.episode_number ?? activeEpisode}</strong>
        {selectedEpisode && <em>{selectedEpisode.name} · {season?.episode_count ?? season?.episodes.length ?? 0} episode di season ini</em>}
      </div>}
    </section>}

    <TmdbCollection params={{ action: "recommendations", id, type }} heading="Film serupa" limit={10} horizontal />
  </main>;
}