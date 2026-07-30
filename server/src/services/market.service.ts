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
      
      const isIndianExchange = (q: any) => 
        q.exchange === 'NSI' || q.exchange === 'BSE' || 
        q.exchDisp === 'NSE' || q.exchDisp === 'BSE' ||
        (q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')));

      // Filter out irrelevant results, keep Equities primarily
      let filtered = results.quotes.filter(
        (q: any) => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') && isIndianExchange(q)
      );
      
      // If we forced .NS and found nothing, try the original query
      if (filtered.length === 0 && !query.includes('.')) {
        const fallback = await yahooFinance.search(query);
        filtered = fallback.quotes.filter(
          (q: any) => q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') && isIndianExchange(q)
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

  private ipoCache: { data: any[]; expiresAt: number } | null = null;

  async getIpos() {
    if (this.ipoCache && Date.now() < this.ipoCache.expiresAt) {
      return this.ipoCache.data;
    }

    try {
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
      const res = await fetch('https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', { headers });
      const html = await res.text();
      const $ = cheerio.load(html);
      
      const ipos: any[] = [];
      
      const sizeMap = await this.fetchSizeMap();
      
      // Table 0: Upcoming & Active IPOs
      $('table').eq(0).find('tr').each((j, row) => {
          if (j > 0) {
              const tds = $(row).find('td');
              if (tds.length >= 8) {
                  const name = $(tds[0]).text().trim();
                  const gmp = $(tds[1]).text().trim();
                  const priceBand = $(tds[3]).text().trim();
                  const estListing = $(tds[4]).text().trim();
                  let date = $(tds[5]).text().trim();
                  const ipoType = $(tds[6]).text().trim();
                  const status = $(tds[7]).text().trim();
                  
                  // Fix date: "30-3 August" -> "30 Jul - 3 Aug"
                  const dateMatch = date.match(/^(\d+)-(\d+)\s+([A-Za-z]+)$/);
                  if (dateMatch) {
                      const d1 = parseInt(dateMatch[1]);
                      const d2 = parseInt(dateMatch[2]);
                      const m2 = dateMatch[3];
                      if (d1 > d2) {
                          const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          const idx = months.findIndex(m => m.toLowerCase().startsWith(m2.toLowerCase().substring(0,3)));
                          if (idx !== -1) {
                              const m1 = months[(idx - 1 + 12) % 12];
                              date = `${d1} ${m1.substring(0,3)} - ${d2} ${m2.substring(0,3)}`;
                          }
                      }
                  }
                  
                  if (name && name !== 'IPO Name') {
                      let displayStatus = "Upcoming";
                      const lowerStatus = status.toLowerCase();
                      if (lowerStatus.includes('open') || lowerStatus.includes('active') || lowerStatus.includes('close')) {
                          displayStatus = "Live";
                      }
                      
                      let mappedSize = sizeMap[name.toLowerCase()]?.size || "N/A";
                      let mappedSub = sizeMap[name.toLowerCase()]?.sub || "N/A";
                      
                      if (mappedSize === "N/A" || mappedSub === "N/A") {
                          for (const key of Object.keys(sizeMap)) {
                              if (key.includes(name.toLowerCase()) || name.toLowerCase().includes(key)) {
                                  if (mappedSize === "N/A") mappedSize = sizeMap[key].size || "N/A";
                                  if (mappedSub === "N/A") mappedSub = sizeMap[key].sub || "N/A";
                              }
                          }
                      }
                      
                      let gmpPercent = 0;
                      const pctMatch = estListing.match(/\(([^%]+)%\)/);
                      if (pctMatch) {
                          gmpPercent = parseFloat(pctMatch[1]);
                      }
                      
                      let estRetailProfit = "N/A";
                      let estHniProfit = "N/A";
                      if (gmpPercent && !isNaN(gmpPercent)) {
                          if (ipoType.toUpperCase().includes('SME')) {
                              estRetailProfit = "N/A (SME)";
                              estHniProfit = `₹${Math.round(120000 * (gmpPercent/100)).toLocaleString()}`;
                          } else {
                              estRetailProfit = `₹${Math.round(15000 * (gmpPercent/100)).toLocaleString()}`;
                              estHniProfit = `₹${Math.round(210000 * (gmpPercent/100)).toLocaleString()}`;
                          }
                      }

                      ipos.push({
                          id: `upcoming-${j}`,
                          name,
                          date,
                          size: mappedSize,
                          type: ipoType || "Mainboard",
                          price: priceBand !== '-' ? `₹${priceBand.replace('₹', '')} (GMP: ${gmp})` : `TBA (GMP: ${gmp})`,
                          gmpPercent: gmpPercent ? `${gmpPercent.toFixed(2)}%` : null,
                          estRetailProfit,
                          estHniProfit,
                          subscription: mappedSub,
                          status: displayStatus,
                          links: [
                              { title: 'Search Chittorgarh', url: `https://www.google.com/search?q=${encodeURIComponent(name + ' IPO Chittorgarh')}` },
                              { title: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(name + ' IPO')}` }
                          ]
                      });
                  }
              }
          }
      });
      
      // Table 1: Recent Listings (Closed IPOs)
      $('table').eq(1).find('tr').each((j, row) => {
          if (j > 0) {
              const tds = $(row).find('td');
              if (tds.length >= 4) {
                  const name = $(tds[0]).text().trim();
                  const issuePrice = $(tds[1]).text().trim();
                  const gmp = $(tds[2]).text().trim();
                  const listingPrice = $(tds[3]).text().trim();
                  
                  if (name && name !== 'IPO Name') {
                      let priceStr = `${issuePrice} -> ${listingPrice}`;
                      
                      let mappedSize = sizeMap[name.toLowerCase()]?.size || "N/A";
                      let mappedSub = sizeMap[name.toLowerCase()]?.sub || "N/A";
                      if (mappedSize === "N/A" || mappedSub === "N/A") {
                          for (const key of Object.keys(sizeMap)) {
                              if (key.includes(name.toLowerCase()) || name.toLowerCase().includes(key)) {
                                  if (mappedSize === "N/A") mappedSize = sizeMap[key].size || "N/A";
                                  if (mappedSub === "N/A") mappedSub = sizeMap[key].sub || "N/A";
                              }
                          }
                      }
                      
                      const ipoType = name.toUpperCase().includes('SME') ? 'SME' : 'Mainboard';
                      
                      let gmpPercent = 0;
                      const issueNum = parseFloat(issuePrice.replace(/[^0-9.]/g, ''));
                      const listNum = parseFloat(listingPrice.replace(/[^0-9.]/g, ''));
                      if (!isNaN(issueNum) && !isNaN(listNum) && issueNum > 0) {
                          gmpPercent = ((listNum - issueNum) / issueNum) * 100;
                      }
                      
                      let estRetailProfit = "N/A";
                      let estHniProfit = "N/A";
                      if (gmpPercent !== 0 && !isNaN(gmpPercent)) {
                          if (ipoType.toUpperCase().includes('SME')) {
                              estRetailProfit = "N/A (SME)";
                              estHniProfit = `₹${Math.round(120000 * (gmpPercent/100)).toLocaleString()}`;
                          } else {
                              estRetailProfit = `₹${Math.round(15000 * (gmpPercent/100)).toLocaleString()}`;
                              estHniProfit = `₹${Math.round(210000 * (gmpPercent/100)).toLocaleString()}`;
                          }
                      }
                      
                      ipos.push({
                          id: `closed-${j}`,
                          name,
                          date: `Recently Listed`,
                          size: mappedSize,
                          type: ipoType,
                          price: priceStr,
                          gmpPercent: gmpPercent ? `${gmpPercent.toFixed(2)}%` : null,
                          estRetailProfit,
                          estHniProfit,
                          subscription: mappedSub,
                          status: "Closed",
                          links: [
                              { title: 'Search Chittorgarh', url: `https://www.google.com/search?q=${encodeURIComponent(name + ' IPO Chittorgarh')}` },
                              { title: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(name + ' IPO')}` }
                          ]
                      });
                  }
              }
          }
      });

      if (ipos.length > 0) {
          this.ipoCache = { data: ipos, expiresAt: Date.now() + 60 * 60 * 1000 };
          return ipos;
      }
      throw new Error("No IPOs found on IPOWatch");
    } catch(err) {
      console.error('IPO Scrape Error:', err);
      // Ultimate fallback
      const now = new Date();
      const month = now.toLocaleString('default', { month: 'short' });
      const year = now.getFullYear();
      return [
        { id: "1", name: "Mock IPO", date: `${month} ${year}`, size: "1,000 Cr", price: "100", status: "Closed" }
      ];
    }
  }

  private async fetchSizeMap() {
      try {
          const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
          const sizeMap: Record<string, {size?: string, sub?: string}> = {};
          
          const res = await fetch('https://ipowatch.in/upcoming-ipo-calendar-ipo-list/', { headers });
          const html = await res.text();
          let $ = cheerio.load(html);
          
          $('table').each((i, table) => {
            const headersArr = $(table).find('tr').first().find('th, td').map((j, el) => $(el).text().trim()).get();
            let nameIdx = headersArr.findIndex(h => h.includes('Company') || h.includes('IPO'));
            let sizeIdx = headersArr.findIndex(h => h.includes('Size'));
            
            if (nameIdx !== -1 && sizeIdx !== -1) {
              $(table).find('tr').each((j, tr) => {
                if (j > 0) {
                  const tds = $(tr).find('td');
                  if (tds.length > Math.max(nameIdx, sizeIdx)) {
                    const name = $(tds[nameIdx]).text().trim().toLowerCase();
                    const size = $(tds[sizeIdx]).text().trim();
                    if (name && size) {
                        if (!sizeMap[name]) sizeMap[name] = {};
                        sizeMap[name].size = size;
                    }
                  }
                }
              });
            }
          });

          const res2 = await fetch('https://ipowatch.in/ipo-performance/', { headers });
          const html2 = await res2.text();
          $ = cheerio.load(html2);
          
          $('table').each((i, table) => {
             const headersArr = $(table).find('tr').first().find('th, td').map((j, el) => $(el).text().trim()).get();
             const nameIdx = headersArr.findIndex(h => h.includes('Company'));
             const sizeIdx = headersArr.findIndex(h => h.includes('Amount') || h.includes('Size'));
             const subIdx = headersArr.findIndex(h => h.includes('Subscription'));
             
             if (nameIdx !== -1) {
                 $(table).find('tr').each((j, tr) => {
                     if (j > 0) {
                         const tds = $(tr).find('td');
                         const name = $(tds[nameIdx])?.text().trim().toLowerCase();
                         if (name && name !== 'company') {
                             if (!sizeMap[name]) sizeMap[name] = {};
                             
                             if (sizeIdx !== -1 && tds[sizeIdx]) {
                                 const size = $(tds[sizeIdx]).text().trim();
                                 if (size) sizeMap[name].size = size.includes('Cr') ? size : `₹${size} Cr`;
                             }
                             if (subIdx !== -1 && tds[subIdx]) {
                                 const sub = $(tds[subIdx]).text().trim();
                                 if (sub && sub !== '-') sizeMap[name].sub = sub;
                             }
                         }
                     }
                 });
             }
          });

          return sizeMap;
      } catch (err) {
          console.error("Failed to fetch IPO size map", err);
          return {};
      }
  }
}


export const marketService = new MarketService();
