export namespace Coingecko {

  export type Market = {
    id?: string;
    name?: string;
    symbol?: string;
    image?: string;
    current_price?: number;
    market_cap?: number;
    market_cap_rank?: number;
    fully_diluted_valuation?: null;
    total_volume?: number;
    high_24h?: number;
    low_24h?: number;
    price_change_24h?: number;
    price_change_percentage_24h?: number;
    market_cap_change_24h?: number;
    market_cap_change_percentage_24h?: number;
    circulating_supply?: number;
    total_supply?: number;
    max_supply?: null;
    ath?: number;
    ath_change_percentage?: number;
    ath_date?: Date;
    atl?: number;
    atl_change_percentage?: number;
    atl_date?: Date;
    roi?: null;
    last_updated?: Date;
  }

  export type Item = {
    id: string;
    name: string;
    platforms: { [key: NetworkKey]: ContractAddress<NetworkKey> };
    symbol: string;
  };

  export type MarketChartItem = {
    prices: Array<Array<number>>;
    market_caps: Array<Array<number>>;
    total_volumes: Array<Array<number>>;
  };
}