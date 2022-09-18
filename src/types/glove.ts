
import type EVM from 'ethereum-types';
import type { BigNumber } from 'ethers';

export namespace Glove {

  /**
   * Networks
   */

  export interface Network {
    key: NetworkKey; // ethereum | by canonical dataset
    label: string;
    chainId: number;
    versionKey?: string; // hardfork names in case of ethereum
  }

  /**
   * User-oriented asset: may point to on-chain entities
   */

  export interface Asset {
    id: string;
    symbol: AssetSymbol;
    name: string;
    logoUrl?: string;
  }

  /**
   * On-chain entities
   */

  export interface Account {
    address: Address;
    resolverName?: string; // notational // ens:bethyname.eth
    label?: string;
  }

  export interface Thing extends Account {
    symbol: AssetSymbol;
    decimals?: number; // no value = non fungible
    maxOwners?: BigNumber; // related to shared ownership of a single unit // presently only relates to NFTs
    totalSupply: BigNumber;
    maxSupply: BigNumber;
  }

  export interface ThingExtended extends Thing {
    code: string;
    abi: string;
  }

  /**
   * On-chain activity continuum
   */

  export interface ThingActvity {
    assetAccount: Address;
    subjectAccount: Address;
    blockNumber: number;
    transactionIndex: number;
    value: number;
    timestamp: number;
  }
}