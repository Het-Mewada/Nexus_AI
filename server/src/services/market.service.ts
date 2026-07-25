import YF from 'yahoo-finance2';
const yahooFinance = new YF();
import * as cheerio from 'cheerio';
import { prisma } from '../config/database';

export class MarketService {
  async searchStock(query: string) {
    try {
      // Prioritize Indian markets if no suffix is provided
      const searchQuery = query.includes('.') ? query : `${query}.NS`;
      const results = await yahooFinance.search(searchQuery);
      
      // Filter out irrelevant results, keep Equities primarily
      const filtered = results.quotes.filter(
        (q: any) => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      );
      
      // If we forced .NS and found nothing, try the original query
      if (filtered.length === 0 && !query.includes('.')) {
        const fallback = await yahooFinance.search(query);
        return fallback.quotes.filter(
          (q: any) => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        );
      }
      
      return filtered;
    } catch (error) {
      console.error('Yahoo Finance Search Error:', error);
      return [];
    }
  }

  async getQuote(symbol: string) {
    try {
      return await yahooFinance.quote(symbol);
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  async getLivePrice(symbol: string): Promise<number | null> {
    const quote = await this.getQuote(symbol);
    if (quote && quote.regularMarketPrice) return quote.regularMarketPrice;
    return null;
  }

  async searchSymbol(query: string) {
    return this.searchStock(query);
  }

  async getChart(symbol: string, interval: '1d' | '1wk' | '1mo' | '5m' = '1d', range: string = '1y') {
    try {
      const rangeMap: Record<string, number> = {
        '1d': 1 * 24 * 60 * 60 * 1000,
        '5d': 5 * 24 * 60 * 60 * 1000,
        '1mo': 30 * 24 * 60 * 60 * 1000,
        '6mo': 180 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000,
        '5y': 5 * 365 * 24 * 60 * 60 * 1000,
      };
      
      const period1 = new Date(Date.now() - (rangeMap[range] || rangeMap['1y'])).toISOString();
      const queryOptions: any = { interval, period1 };
      
      const chartData = await yahooFinance.chart(symbol, queryOptions);
      
      // Transform data into the format expected by the frontend
      // The frontend currently expects data.quotes and data.timestamp
      if (chartData && Array.isArray(chartData.quotes)) {
         return {
             timestamp: (chartData.quotes as any[]).map((q: any) => new Date(q.date).getTime() / 1000),
             quotes: (chartData.quotes as any[]).map((q: any) => ({ close: q.close }))
         };
      }
      return chartData;
    } catch (error) {
      console.error(`Error fetching chart for ${symbol}:`, error);
      return null;
    }
  }

  async getWatchlist(userId: string) {
    return prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async addToWatchlist(userId: string, symbol: string, name?: string) {
    const existing = await prisma.watchlist.findUnique({
      where: { userId_symbol: { userId, symbol } }
    });
    if (existing) return existing;
    
    return prisma.watchlist.create({
      data: { userId, symbol, name }
    });
  }

  async removeFromWatchlist(userId: string, symbol: string) {
    await prisma.watchlist.deleteMany({
      where: { userId, symbol }
    });
    return { success: true };
  }

  async getIpos() {
    try {
      const headers: any = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
      };
      
      const initResponse = await fetch('https://www.nseindia.com/', { headers });
      const cookies = initResponse.headers.get('set-cookie');
      
      if (cookies) {
          headers['Cookie'] = cookies;
      }
      
      const apiResponse = await fetch('https://www.nseindia.com/api/ipo-current-issue', { headers });
      
      if (!apiResponse.ok) {
        throw new Error(`NSE API returned ${apiResponse.status}`);
      }
      
      const data = await apiResponse.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        return this.fallbackIpos(); // Fallback if no active IPOs
      }
      
      const gmpList = await this.fetchGmpList();

      const ipos = data.map((item: any, i: number) => {
        let size = "N/A";
        if (item.noOfSharesOffered) {
          const shares = parseInt(item.noOfSharesOffered);
          if (!isNaN(shares)) {
            size = shares >= 10000000 ? `${(shares/10000000).toFixed(2)} Cr Shares` : `${shares.toLocaleString()} Shares`;
          }
        }
        
        const name = item.companyName || item.symbol;
        
        // Match with GMP list
        const nseName = name.toLowerCase();
        const gmpMatch = gmpList.find((g: any) => {
            const gName = g.name.toLowerCase().replace(/ sme$/, '').replace(/ ltd$/, '').replace(/ limited$/, '');
            return nseName.includes(gName) || gName.includes(nseName.split(' ')[0]);
        });
        
        let priceStr = "TBA";
        if (gmpMatch) {
            const cleanPrice = gmpMatch.price.replace('₹', '');
            priceStr = `${cleanPrice} (GMP: ${gmpMatch.gmp})`;
        }
        
        return {
          id: `ipo-${item.symbol || i}`,
          name: name,
          date: `${item.issueStartDate} to ${item.issueEndDate}`,
          size: size,
          price: priceStr,
          status: item.status === "Active" ? "Live" : "Upcoming",
          links: [
            { title: 'View on NSE', url: `https://www.nseindia.com/market-data/issue-information?symbol=${encodeURIComponent(item.symbol)}&series=${encodeURIComponent(item.series)}&type=Active` },
            { title: 'Search Chittorgarh', url: `https://www.google.com/search?q=${encodeURIComponent(name + ' IPO Chittorgarh')}` },
            { title: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(name + ' IPO')}` }
          ]
        };
      });
      
      const realIpos = ipos.length > 0 ? ipos : [];
      // Also grab the dynamically dated "Closed" fallback IPOs so the UI has past data
      const fallbacks = await this.fallbackIpos(gmpList);
      const pastIpos = fallbacks.filter(i => i.status === 'Closed' || i.status === 'Upcoming');
      
      const merged = [...realIpos, ...pastIpos];
      return merged.length > 0 ? merged : fallbacks;
    } catch(err) {
      console.error('IPO Scrape Error:', err);
      return await this.fallbackIpos();
    }
  }
  
  private async fetchGmpList() {
    try {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
        const res = await fetch('https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', { headers });
        const html = await res.text();
        const $ = cheerio.load(html);
        const list: any[] = [];
        $('figure.wp-block-table table').first().find('tbody tr').each((j, row) => {
            const tds = $(row).find('td');
            if (tds.length >= 4) {
                const name = $(tds[0]).text().trim();
                if (name && name !== 'IPO Name') {
                    list.push({ name, price: $(tds[3]).text().trim(), gmp: $(tds[1]).text().trim() });
                }
            }
        });
        return list;
    } catch(e) {
        console.error('Failed to fetch GMP list', e);
        return [];
    }
  }

  private async fetchPerformanceList() {
    try {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
        const res = await fetch('https://ipowatch.in/ipo-performance/', { headers });
        const html = await res.text();
        const $ = cheerio.load(html);
        const list: any[] = [];
        
        $('table').each((i, table) => {
             if (i === 4 || i === 5) {
                 $(table).find('tr').each((j, tr) => {
                     if (j > 0) {
                         const tds = $(tr).find('td');
                         if (tds.length >= 7) {
                             const name = $(tds[0]).text().trim();
                             const issuePrice = $(tds[2]).text().trim();
                             const size = $(tds[3]).text().trim();
                             const listingDate = $(tds[5]).text().trim();
                             const listingPrice = $(tds[6]).text().trim();
                             if (name && name !== 'Company') {
                                 list.push({ name, issuePrice, size, listingDate, listingPrice });
                             }
                         }
                     }
                 });
             }
        });
        return list;
    } catch(e) {
        console.error('Failed to fetch Performance list', e);
        return [];
    }
  }

  private async fallbackIpos(gmpList: any[] = []) {
    try {
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
      const ipos: any[] = [];
      
      // Fetch Upcoming
      try {
          const res = await fetch('https://ipowatch.in/upcoming-ipo-calendar-ipo-list/', { headers });
          const html = await res.text();
          const $ = cheerio.load(html);
          $('figure.wp-block-table table').first().find('tbody tr').each((j, row) => {
              const tds = $(row).find('td');
              if (tds.length >= 4) {
                  const name = $(tds[0]).text().trim();
                  if (name && name !== 'Company Name') {
                      ipos.push({ 
                          id: `upcoming-${j}`, 
                          name, 
                          date: $(tds[1]).text().trim(), 
                          size: $(tds[3]).text().trim(), 
                          price: "TBA", 
                          status: "Upcoming",
                          links: [
                              { title: 'Search Chittorgarh', url: `https://www.google.com/search?q=${encodeURIComponent(name + ' IPO Chittorgarh')}` },
                              { title: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(name + ' IPO')}` }
                          ]
                      });
                  }
              }
          });
      } catch (e) {
          console.error('Failed to fetch upcoming from IPOWatch', e);
      }
      
      // Fetch Closed from Performance list (Listed IPOs)
      try {
          const perfList = await this.fetchPerformanceList();
          let count = 0;
          for (const item of perfList) {
              if (count < 10) { // Limit to 10
                  // Calculate gain
                  const issueNum = parseFloat(item.issuePrice.replace(/[^0-9.]/g, ''));
                  const listNum = parseFloat(item.listingPrice.replace(/[^0-9.]/g, ''));
                  let gainStr = "";
                  
                  if (!isNaN(issueNum) && !isNaN(listNum) && issueNum > 0) {
                      const gainRs = listNum - issueNum;
                      const gainPct = ((gainRs / issueNum) * 100).toFixed(1);
                      const sign = gainRs >= 0 ? "+" : "";
                      gainStr = ` (Listed at ₹${listNum}, ${sign}₹${gainRs.toFixed(1)} / ${sign}${gainPct}%)`;
                  } else {
                      gainStr = ` (Listed at ${item.listingPrice})`;
                  }
                  
                  const cleanIssuePrice = item.issuePrice.replace('₹', '');
                  
                  ipos.push({ 
                      id: `closed-${count}`, 
                      name: item.name, 
                      date: `Listed on ${item.listingDate}`, 
                      size: item.size || "N/A", 
                      price: `${cleanIssuePrice}${gainStr}`, 
                      status: "Closed",
                      links: [
                          { title: 'Search Chittorgarh', url: `https://www.google.com/search?q=${encodeURIComponent(item.name + ' IPO Chittorgarh')}` },
                          { title: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(item.name + ' IPO')}` }
                      ]
                  });
                  count++;
              }
          }
      } catch(e) {
          console.error('Failed to parse Performance list', e);
      }
      
      if (ipos.length > 0) return ipos;
    } catch (e) {}

    // Ultimate fallback if all fails
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    return [
      { id: "1", name: "Swiggy Ltd (Mock)", date: `${month} ${year}`, size: "11,000 Cr", price: "390", status: "Closed" }
    ];
  }
}

export const marketService = new MarketService();
