// Historical data service for Cosmos Hub stats
// Loads scraped historical data from static JSON files

export interface HistoricalDataPoint {
  date: string;
  timestamp: number;
  value?: number;
  bonded?: number;
  notBonded?: number;
  [key: string]: string | number | undefined;
}

export interface HistoricalChartData {
  source: string;
  scrapedAt: string;
  chartId: string;
  title: string;
  data: HistoricalDataPoint[];
  rawData: any;
}

// Read historical data from static files
export class HistoricalDataService {
  private static cache: Map<string, HistoricalChartData> = new Map();

  static async readHistoricalData(filename: string): Promise<HistoricalDataPoint[]> {
    // Check cache first
    if (this.cache.has(filename)) {
      return this.cache.get(filename)!.data;
    }

    try {
      const response = await fetch(`/data/historical/${filename}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        console.warn(`[HistoricalDataService] Could not load historical data: ${filename}`);
        return [];
      }
      const data: HistoricalChartData = await response.json();

      // Cache the result
      this.cache.set(filename, data);
      return data.data || [];
    } catch (error) {
      console.warn(`[HistoricalDataService] Error loading historical data ${filename}:`, error);
      return [];
    }
  }

  static async getStakingDynamics(): Promise<HistoricalDataPoint[]> {
    return this.readHistoricalData('staking-dynamics.json');
  }

  static async getUnbondingHistory(): Promise<HistoricalDataPoint[]> {
    return this.readHistoricalData('unbonding.json');
  }

  static async getAprHistory(): Promise<HistoricalDataPoint[]> {
    return this.readHistoricalData('apr.json');
  }

  static async getInflationHistory(): Promise<HistoricalDataPoint[]> {
    return this.readHistoricalData('inflation.json');
  }

  static async getEmissionHistory(): Promise<HistoricalDataPoint[]> {
    return this.readHistoricalData('emission.json');
  }

  static async getAllHistoricalData() {
    return Promise.all([
      this.getStakingDynamics(),
      this.getUnbondingHistory(),
      this.getAprHistory(),
      this.getInflationHistory(),
      this.getEmissionHistory(),
    ]);
  }

  static clearCache() {
    this.cache.clear();
  }
}
