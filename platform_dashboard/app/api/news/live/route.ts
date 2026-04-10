import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  link: string;
  source: string;
  published: string;
  summary?: string;
}

// Cache news for 5 minutes
let newsCache: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchRSSFeed(url: string, source: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch ${source}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    
    // Parse RSS using regex (lightweight, no XML lib needed)
    const items: NewsItem[] = [];
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const titleRegex = /<title>(.*?)<\/title>/i;
    const linkRegex = /<link>(.*?)<\/link>/i;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/i;
    const descRegex = /<description>(.*?)<\/description>/is;
    
    const matches = xml.matchAll(itemRegex);
    
    for (const match of matches) {
      const itemXml = match[1];
      
      const title = itemXml.match(titleRegex)?.[1];
      const link = itemXml.match(linkRegex)?.[1];
      const pubDate = itemXml.match(pubDateRegex)?.[1];
      const description = itemXml.match(descRegex)?.[1];
      
      if (title && link) {
        items.push({
          title: cleanHtml(title),
          link: cleanHtml(link),
          source,
          published: pubDate || new Date().toISOString(),
          summary: description ? cleanHtml(description).substring(0, 200) + '...' : undefined,
        });
      }
      
      if (items.length >= 10) break; // Limit to 10 items per source
    }
    
    return items;
  } catch (error) {
    console.error(`Error fetching ${source}:`, error);
    return [];
  }
}

function cleanHtml(text: string): string {
  return text
    .replace(/<![CDATA[(.*?)]]>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

async function fetchAllNews(): Promise<NewsItem[]> {
  const now = Date.now();
  
  // Return cached if fresh
  if (newsCache && (now - newsCache.timestamp) < CACHE_TTL) {
    return newsCache.data;
  }
  
  const sources = [
    { url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms', name: 'Economic Times' },
    { url: 'https://www.moneycontrol.com/rss/latestnews.xml', name: 'MoneyControl' },
    { url: 'https://finance.yahoo.com/news/rssindex', name: 'Yahoo Finance' },
  ];
  
  const allNews: NewsItem[] = [];
  
  // Fetch in parallel
  const promises = sources.map(async ({ url, name }) => {
    const news = await fetchRSSFeed(url, name);
    return news;
  });
  
  const results = await Promise.allSettled(promises);
  
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
    }
  });
  
  // Sort by published date (newest first)
  allNews.sort((a, b) => {
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });
  
  // Deduplicate by title similarity
  const uniqueNews: NewsItem[] = [];
  const seen = new Set<string>();
  
  for (const item of allNews) {
    const key = item.title.toLowerCase().substring(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueNews.push(item);
    }
    
    if (uniqueNews.length >= 20) break; // Limit to 20 items
  }
  
  // Update cache
  newsCache = { data: uniqueNews, timestamp: now };
  
  return uniqueNews;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') || 'all'; // 'india', 'us', or 'all'
    
    const allNews = await fetchAllNews();
    
    // Filter by market if specified
    let filteredNews = allNews;
    if (market === 'india') {
      filteredNews = allNews.filter(item => 
        item.source.includes('Economic') || 
        item.source.includes('MoneyControl')
      );
    } else if (market === 'us') {
      filteredNews = allNews.filter(item => 
        item.source.includes('Yahoo')
      );
    }
    
    return NextResponse.json({
      news: filteredNews,
      count: filteredNews.length,
      timestamp: new Date().toISOString(),
      market
    });
    
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
