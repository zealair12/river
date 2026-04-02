export interface DataPoint {
  id: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  metric: string;
  metricValue: number;
  headline: string;
  news?: string[];
  ticker?: string;
  category: 'exchange' | 'banking' | 'political' | 'crypto' | 'emerging';
  route?: string;
}

export const DATA_POINTS: DataPoint[] = [
  { id: 'nyse', city: 'New York', country: 'United States', lat: 40.71, lon: -74.01, metric: '$25.3T', metricValue: 25.3, headline: 'NYSE — World\'s largest exchange by market capitalization', ticker: 'SPY', news: ['S&P 500 climbs on strong earnings beat', 'Wall Street sees record inflows in Q1'], category: 'exchange', route: '/stock/SPY' },
  { id: 'nasdaq', city: 'San Jose', country: 'United States', lat: 37.34, lon: -121.89, metric: '$22.1T', metricValue: 22.1, headline: 'NASDAQ — Tech-dominant, home to the Magnificent Seven', ticker: 'QQQ', news: ['NVDA surpasses $3T market cap', 'AI spending drives tech rally'], category: 'exchange', route: '/stock/QQQ' },
  { id: 'lse', city: 'London', country: 'United Kingdom', lat: 51.51, lon: -0.09, metric: '$3.9T', metricValue: 3.9, headline: 'London Stock Exchange — Europe\'s premier financial center', news: ['FTSE 100 hits all-time high', 'UK inflation drops to 2.3%'], category: 'exchange', route: '/stock/EWU' },
  { id: 'tse', city: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.77, metric: '$5.8T', metricValue: 5.8, headline: 'Tokyo Stock Exchange — Asia\'s oldest exchange', news: ['Nikkei 225 breaks 40,000 for first time', 'BOJ ends negative rate policy'], category: 'exchange', route: '/stock/EWJ' },
  { id: 'sse', city: 'Shanghai', country: 'China', lat: 31.23, lon: 121.47, metric: '$6.9T', metricValue: 6.9, headline: 'Shanghai Stock Exchange — China\'s largest by market cap', news: ['China stimulus measures boost A-shares', 'Foreign investment in China bonds rises'], category: 'exchange' },
  { id: 'hkex', city: 'Hong Kong', country: 'China', lat: 22.28, lon: 114.16, metric: '$4.2T', metricValue: 4.2, headline: 'HKEX — Gateway between Chinese and global capital', news: ['Hang Seng rallies on property sector relief', 'IPO pipeline strengthens in Hong Kong'], category: 'exchange', route: '/stock/EWH' },
  { id: 'tsx', city: 'Toronto', country: 'Canada', lat: 43.65, lon: -79.38, metric: '$2.6T', metricValue: 2.6, headline: 'TSX — Natural resources and mining hub', ticker: 'EWC', news: ['Canadian dollar strengthens on oil rally', 'Gold miners lead TSX gains'], category: 'exchange', route: '/stock/EWC' },
  { id: 'xetra', city: 'Frankfurt', country: 'Germany', lat: 50.11, lon: 8.68, metric: '$2.1T', metricValue: 2.1, headline: 'Deutsche Börse — Heart of European equity trading', news: ['DAX 40 reaches new record', 'ECB holds rates steady at 3.5%'], category: 'exchange', route: '/stock/EWG' },
  { id: 'bse', city: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88, metric: '$3.5T', metricValue: 3.5, headline: 'BSE Sensex — India\'s booming equity market', news: ['India overtakes HK as 4th-largest equity market', 'Sensex crosses 80,000 milestone'], category: 'exchange', route: '/stock/INDA' },
  { id: 'b3', city: 'São Paulo', country: 'Brazil', lat: -23.55, lon: -46.64, metric: '$0.9T', metricValue: 0.9, headline: 'B3 — Latin America\'s largest exchange', news: ['Bovespa rises on rate-cut expectations', 'Brazilian real stabilizes after fiscal reforms'], category: 'exchange', route: '/stock/EWZ' },
  { id: 'asx', city: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21, metric: '$1.7T', metricValue: 1.7, headline: 'ASX — Oceania\'s primary capital market', news: ['Australian mining sector surges on lithium demand', 'RBA pauses rate hikes'], category: 'exchange', route: '/stock/EWA' },
  { id: 'sgx', city: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82, metric: '$0.6T', metricValue: 0.6, headline: 'SGX — Southeast Asia\'s derivatives powerhouse', news: ['Singapore REITs outperform amid rate pivot', 'MAS tightens crypto regulations'], category: 'exchange' },
  { id: 'zurich', city: 'Zürich', country: 'Switzerland', lat: 47.37, lon: 8.54, metric: '$2.4T', metricValue: 2.4, headline: 'Swiss banking sector — global wealth management capital', news: ['UBS completes Credit Suisse integration', 'Swiss franc strengthens as safe haven'], category: 'banking' },
  { id: 'dubai', city: 'Dubai', country: 'UAE', lat: 25.20, lon: 55.27, metric: '$1.1T', metricValue: 1.1, headline: 'Dubai — Middle East\'s rising financial center', news: ['DIFC assets under management hit $1T', 'UAE attracts record FDI inflows'], category: 'banking' },
  { id: 'seoul', city: 'Seoul', country: 'South Korea', lat: 37.57, lon: 126.98, metric: '$1.8T', metricValue: 1.8, headline: 'KOSPI — Korea\'s tech-export-driven equity market', ticker: 'EWY', news: ['Samsung leads chip export surge', 'Korea Value-Up program boosts market'], category: 'banking', route: '/stock/EWY' },
  { id: 'luxembourg', city: 'Luxembourg', country: 'Luxembourg', lat: 49.61, lon: 6.13, metric: '$5.7T', metricValue: 5.7, headline: 'World\'s second-largest fund domicile after the US', news: ['EU green bond market grows through Luxembourg', 'UCITS fund assets reach new record'], category: 'banking' },
  { id: 'dublin', city: 'Dublin', country: 'Ireland', lat: 53.35, lon: -6.26, metric: '$3.2T', metricValue: 3.2, headline: 'EU fund hub — $3.2T in managed assets', news: ['Ireland becomes EU\'s top ETF domicile', 'Tech multinationals boost Irish GDP'], category: 'banking' },
  { id: 'dc', city: 'Washington D.C.', country: 'United States', lat: 38.91, lon: -77.04, metric: '$14.4B', metricValue: 1.44, headline: 'Campaign finance epicenter — $14.4B in 2024 cycle', news: ['Super PAC spending hits record $4.7B', 'FEC reports surge in small-dollar donations'], category: 'political' },
  { id: 'la', city: 'Los Angeles', country: 'United States', lat: 34.05, lon: -118.24, metric: '$1.2B', metricValue: 0.12, headline: 'Major donor hub — entertainment industry contributions', news: ['Hollywood fundraisers raise $200M for campaigns', 'Tech billionaires shift donation patterns'], category: 'political' },
  { id: 'chicago', city: 'Chicago', country: 'United States', lat: 41.88, lon: -87.63, metric: '$34.5T', metricValue: 3.45, headline: 'CME Group — world\'s largest derivatives exchange', ticker: 'CME', news: ['CME bitcoin futures set open interest record', 'Agricultural derivatives surge on climate concerns'], category: 'exchange', route: '/stock/CME' },
  { id: 'sf', city: 'San Francisco', country: 'United States', lat: 37.77, lon: -122.42, metric: '$2.1B', metricValue: 0.21, headline: 'Tech-sector political donations hub', news: ['Silicon Valley PACs outspend Wall Street', 'Crypto industry lobbying doubles year-over-year'], category: 'political' },
  { id: 'houston', city: 'Houston', country: 'United States', lat: 29.76, lon: -95.37, metric: '$0.6B', metricValue: 0.06, headline: 'Energy-sector political contributions center', news: ['Oil majors increase lobbying spend 40%', 'Houston energy corridor drives Texas economy'], category: 'political' },
  { id: 'cayman', city: 'Cayman Islands', country: 'Cayman Islands', lat: 19.33, lon: -81.24, metric: '$2.2T', metricValue: 2.2, headline: 'Offshore finance center — hedge fund domicile capital', news: ['Global tax reform targets offshore structures', '85% of hedge funds domiciled in Cayman'], category: 'crypto' },
  { id: 'lagos', city: 'Lagos', country: 'Nigeria', lat: 6.52, lon: 3.38, metric: '$13B', metricValue: 0.013, headline: 'Africa\'s largest economy — fastest-growing fintech sector', news: ['Nigeria fintech sector raises $2B in funding', 'Lagos becomes Africa\'s startup capital'], category: 'emerging' },
  { id: 'joburg', city: 'Johannesburg', country: 'South Africa', lat: -26.20, lon: 28.04, metric: '$0.9T', metricValue: 0.9, headline: 'JSE — Africa\'s largest stock exchange', news: ['SA gold miners rally on price surge', 'Rand strengthens on improved sentiment'], category: 'emerging', route: '/stock/EZA' },
  { id: 'mexico', city: 'Mexico City', country: 'Mexico', lat: 19.43, lon: -99.13, metric: '$0.4T', metricValue: 0.4, headline: 'BMV — Latin America\'s second-largest exchange', news: ['Nearshoring boom drives Mexican markets', 'Peso outperforms EM currencies'], category: 'emerging', route: '/stock/EWW' },
  { id: 'jakarta', city: 'Jakarta', country: 'Indonesia', lat: -6.21, lon: 106.85, metric: '$0.5T', metricValue: 0.5, headline: 'IDX — Southeast Asia\'s rising equity market', news: ['Indonesia nickel exports fuel market growth', 'New capital city project attracts investment'], category: 'emerging' },
  { id: 'taipei', city: 'Taipei', country: 'Taiwan', lat: 25.03, lon: 121.57, metric: '$1.8T', metricValue: 1.8, headline: 'TWSE — Semiconductor industry powerhouse', ticker: 'EWT', news: ['TSMC drives 90% of global advanced chip production', 'Taiwan index hits record on AI demand'], category: 'exchange', route: '/stock/EWT' },
  { id: 'moscow', city: 'Moscow', country: 'Russia', lat: 55.76, lon: 37.62, metric: '$0.4T', metricValue: 0.4, headline: 'MOEX — sanctioned but still operational', news: ['Russian market isolated from Western capital', 'MOEX shifts to yuan-denominated trading'], category: 'emerging' },
  { id: 'riyadh', city: 'Riyadh', country: 'Saudi Arabia', lat: 24.71, lon: 46.68, metric: '$2.8T', metricValue: 2.8, headline: 'Tadawul — largest exchange in the Middle East', news: ['Aramco secondary offering raises $12B', 'Vision 2030 diversification accelerates'], category: 'emerging' },
  { id: 'paris', city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, metric: 'Euronext', metricValue: 3.0, headline: 'Euronext Paris — part of the pan-European Euronext group (Amsterdam, Brussels, Lisbon, Paris)', category: 'exchange' },
  { id: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, metric: 'Euronext', metricValue: 2.4, headline: 'Euronext Amsterdam — major European listing venue for multinationals', category: 'exchange' },
  { id: 'brussels', city: 'Brussels', country: 'Belgium', lat: 50.8503, lon: 4.3517, metric: 'Euronext', metricValue: 0.45, headline: 'Euronext Brussels — Belgian regulated market within Euronext', category: 'exchange' },
  { id: 'madrid', city: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038, metric: 'BME', metricValue: 0.85, headline: 'BME (Bolsa de Madrid) — Spain\'s primary stock exchange, part of SIX Group', category: 'exchange' },
  { id: 'milan', city: 'Milan', country: 'Italy', lat: 45.4642, lon: 9.19, metric: 'Borsa Italiana', metricValue: 0.75, headline: 'Borsa Italiana — Italy\'s main listing venue (Euronext Group)', category: 'exchange' },
  { id: 'stockholm_nordic', city: 'Stockholm', country: 'Sweden', lat: 59.3293, lon: 18.0686, metric: 'Nasdaq Nordic', metricValue: 1.1, headline: 'Nasdaq Stockholm — largest marketplace in the Nasdaq Nordic cluster', category: 'exchange' },
  { id: 'warsaw', city: 'Warsaw', country: 'Poland', lat: 52.2297, lon: 21.0122, metric: 'GPW', metricValue: 0.35, headline: 'Warsaw Stock Exchange (GPW) — Central Europe\'s largest regulated equity market', category: 'emerging' },
  { id: 'vienna', city: 'Vienna', country: 'Austria', lat: 48.2082, lon: 16.3738, metric: 'Wiener Börse', metricValue: 0.22, headline: 'Wiener Börse AG — operates the Vienna Stock Exchange', category: 'exchange' },
  { id: 'oslobors', city: 'Oslo', country: 'Norway', lat: 59.9139, lon: 10.7522, metric: 'Oslo Børs', metricValue: 0.55, headline: 'Oslo Børs — energy and shipping-heavy Nordic listing venue (Nasdaq Nordic)', category: 'exchange' },
  { id: 'copenhagen', city: 'Copenhagen', country: 'Denmark', lat: 55.6761, lon: 12.5683, metric: 'Nasdaq Nordic', metricValue: 0.48, headline: 'Nasdaq Copenhagen — part of the integrated Nasdaq Nordic market', category: 'exchange' },
  { id: 'telaviv', city: 'Tel Aviv', country: 'Israel', lat: 32.0853, lon: 34.7818, metric: 'TASE', metricValue: 0.28, headline: 'Tel Aviv Stock Exchange (TASE) — Israel\'s sole public securities exchange', category: 'emerging' },
  { id: 'buenosaires', city: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, metric: 'BYMA', metricValue: 0.08, headline: 'BYMA — Buenos Aires stock exchange merged as Bolsas y Mercados Argentinos', category: 'emerging' },
  { id: 'santiago_cl', city: 'Santiago', country: 'Chile', lat: -33.4489, lon: -70.6693, metric: 'BCS', metricValue: 0.18, headline: 'Santiago Stock Exchange (BCS) — Chile\'s primary listing venue', category: 'emerging' },
  { id: 'bangkok', city: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018, metric: 'SET', metricValue: 0.55, headline: 'Stock Exchange of Thailand (SET) — main board in Bangkok', category: 'emerging' },
  { id: 'kualalumpur', city: 'Kuala Lumpur', country: 'Malaysia', lat: 3.139, lon: 101.6869, metric: 'Bursa', metricValue: 0.42, headline: 'Bursa Malaysia — principal exchange for Malaysian equities', category: 'emerging' },
  { id: 'manila', city: 'Manila', country: 'Philippines', lat: 14.5995, lon: 120.9842, metric: 'PSE', metricValue: 0.28, headline: 'Philippine Stock Exchange (PSE) — result of Manila exchanges merger', category: 'emerging' },
  { id: 'hochiminh', city: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lon: 106.6297, metric: 'HOSE', metricValue: 0.22, headline: 'Ho Chi Minh Stock Exchange (HOSE) — Vietnam\'s larger equity board', category: 'emerging' },
  { id: 'auckland', city: 'Auckland', country: 'New Zealand', lat: -36.8509, lon: 174.7645, metric: 'NZX', metricValue: 0.15, headline: 'NZX — New Zealand\'s national exchange (head office Auckland)', category: 'exchange' },
];

export const CONNECTIONS: [string, string, number][] = [
  ['nyse', 'lse', 850], ['lse', 'xetra', 320], ['lse', 'hkex', 440],
  ['nyse', 'tse', 510], ['sse', 'hkex', 680], ['dc', 'nyse', 200],
  ['nyse', 'tsx', 180], ['nyse', 'cayman', 600], ['lse', 'zurich', 280],
  ['lse', 'dublin', 150], ['sf', 'nasdaq', 350], ['sgx', 'hkex', 220],
  ['bse', 'lse', 190], ['dubai', 'lse', 250], ['tse', 'sse', 300],
  ['riyadh', 'lse', 210], ['b3', 'nyse', 160], ['asx', 'hkex', 170],
  ['taipei', 'tse', 230], ['seoul', 'tse', 190],
  ['nyse', 'xetra', 400], ['nasdaq', 'lse', 380], ['nyse', 'bse', 290],
  ['hkex', 'sgx', 310], ['zurich', 'xetra', 200], ['dubai', 'bse', 260],
  ['dubai', 'riyadh', 150], ['chicago', 'nyse', 450], ['chicago', 'lse', 320],
  ['asx', 'sgx', 190], ['asx', 'tse', 210], ['seoul', 'sse', 280],
  ['taipei', 'sse', 350], ['b3', 'lse', 180], ['mexico', 'nyse', 140],
  ['joburg', 'lse', 160], ['lagos', 'lse', 120], ['dc', 'chicago', 130],
  ['sf', 'tse', 200], ['luxembourg', 'xetra', 170], ['dublin', 'nyse', 220],
  ['cayman', 'lse', 380], ['moscow', 'sse', 150], ['jakarta', 'sgx', 140],
  ['houston', 'nyse', 110], ['la', 'nasdaq', 180],   ['riyadh', 'dubai', 200],
  ['nyse', 'sgx', 250], ['lse', 'tse', 330], ['nasdaq', 'taipei', 270],
  ['paris', 'lse', 90], ['paris', 'amsterdam', 110], ['amsterdam', 'brussels', 95], ['paris', 'xetra', 220],
  ['madrid', 'lse', 500], ['milan', 'xetra', 180], ['milan', 'paris', 250], ['vienna', 'xetra', 210],
  ['stockholm_nordic', 'copenhagen', 210], ['copenhagen', 'oslobors', 180], ['oslobors', 'stockholm_nordic', 160],
  ['warsaw', 'xetra', 280], ['warsaw', 'vienna', 200], ['luxembourg', 'brussels', 95],
  ['telaviv', 'lse', 980], ['telaviv', 'nyse', 5800], ['buenosaires', 'santiago_cl', 470], ['b3', 'buenosaires', 620],
  ['bangkok', 'sgx', 470],   ['kualalumpur', 'sgx', 155], ['manila', 'hkex', 450], ['jakarta', 'bangkok', 1200],
  ['hochiminh', 'hkex', 650], ['auckland', 'asx', 670],
  ['xetra', 'paris', 220],
];

export const CATEGORY_COLORS: Record<string, string> = {
  exchange: '#00E5C8',
  banking: '#A78BFA',
  political: '#F59E0B',
  crypto: '#FF4D6A',
  emerging: '#67E8F9'
};

export const CATEGORY_LABELS: Record<string, string> = {
  exchange: 'Stock Exchange',
  banking: 'Banking Center',
  political: 'Political Finance',
  crypto: 'Crypto / Offshore',
  emerging: 'Emerging Market'
};

const DP_BY_ID_LOOKUP = new Map(DATA_POINTS.map((d) => [d.id, d]));

/**
 * Money-flow arc is drawn when both nodes exist.
 * With a category filter: only if both endpoints are in that same category (intra-category links only).
 * With no filter: all arcs in CONNECTIONS are shown.
 */
export function isFlowVisibleForCategoryFilter(
  fromId: string,
  toId: string,
  filter: string | null
): boolean {
  const a = DP_BY_ID_LOOKUP.get(fromId);
  const b = DP_BY_ID_LOOKUP.get(toId);
  if (!a || !b) return false;
  if (filter === null) return true;
  return a.category === filter && b.category === filter;
}

export function project(lon: number, lat: number, w: number, h: number): [number, number] {
  const x = (lon / 180) * (w / 2);
  const y = (lat / 90) * (h / 2);
  return [x, y];
}
