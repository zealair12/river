import { useState } from 'react';

export function faviconForArticleUrl(articleUrl: string): string {
  try {
    const host = new URL(articleUrl).hostname.replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return '';
  }
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let u = url.trim();
  if (u.startsWith('//')) u = `https:${u}`;
  if (!/^https?:\/\//i.test(u)) return null;
  return u;
}

export type OrbitNewsItem = {
  title: string;
  url: string;
  source: string;
  imageUrl?: string | null;
  dateLabel?: string;
};

function thumbPair(imageUrl: string | null | undefined, articleUrl: string): { primary: string; secondary: string } {
  const norm = normalizeImageUrl(imageUrl);
  const icon = faviconForArticleUrl(articleUrl);
  if (norm) return { primary: norm, secondary: icon };
  return { primary: icon, secondary: '' };
}

function NewsOrbitCircle({ item, index }: { item: OrbitNewsItem; index: number }) {
  const { primary, secondary } = thumbPair(item.imageUrl, item.url);
  const [src, setSrc] = useState(primary);
  const [hidden, setHidden] = useState(!primary && !secondary);

  const onError = () => {
    if (secondary && src !== secondary) setSrc(secondary);
    else setHidden(true);
  };

  const delay = `${(index % 5) * 0.15}s`;
  const duration = `${3 + (index % 4) * 0.35}s`;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-orbit-item"
      title={item.title}
    >
      <div
        className="news-orbit-motion"
        style={{
          animationDuration: duration,
          animationDelay: delay
        }}
      >
        <div className="news-orbit-ring">
          {!hidden ? (
            <img src={src} alt="" className="news-orbit-img" onError={onError} />
          ) : (
            <span className="news-orbit-fallback">{item.source.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      </div>
      <div className="news-orbit-title">{item.title}</div>
      <div className="news-orbit-meta">
        {item.source}
        {item.dateLabel ? ` · ${item.dateLabel}` : ''}
      </div>
    </a>
  );
}

export function NewsOrbitRow({ items }: { items: OrbitNewsItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="news-orbit-row">
      {items.map((item, i) => (
        <NewsOrbitCircle key={`${item.url}-${i}`} item={item} index={i} />
      ))}
    </div>
  );
}
