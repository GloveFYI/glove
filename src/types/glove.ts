import { Activity } from './glove';

import type EVM from 'ethereum-types';
import type { BigNumber } from 'ethers';

/**
 * Interfaces used for composability, not necessarily reflecting classes
 */

export namespace Glove {

  /// networks

  export interface Network {
    key: NetworkKey; // <string_from_canonical_dataset> ex: ethereum
    label: string;
    chainId: number;
    versionKey?: string; // hardfork names in case of ethereum
    nativeSymbol: string;
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

  /// on-chain entities

  /**
   * On-chain entity capable of being addressable and accountable
   */
  export interface Account {
    address: Address;
    resolverName?: string; // notational // ens:bethyname.eth
    label?: string;
  }

  /**
   * On-chain entity capable of whatever
   */
  export interface Thing extends Account {
    symbol: AssetSymbol;
    decimals?: number; // no value = non fungible
    maxOwners?: BigNumber; // related to shared ownership of a single unit // presently only relates to NFTs
    totalSupply: BigNumber;
    maxSupply: BigNumber;
  }

  /**
   * On-chain entity capable of whatever, containing code
   */
  export interface ThingExtended extends Thing {
    code: string;
    abi: string;
  }

  /// on-chain activity continuum

  /**
   * Transaction location and extraction parameters
   */
  export interface TxLocator {
    blockNumber: number;
    transactionIndex: number;
  }

  /**
   * A Relation between addressable accounts
   */
  export interface Relation {
    by: Thing['address']; // actor, caller
    of?: Thing['address']; // object
    from: Account['address']; // subject
    to: Account['address']; // subject
  }

  // ex: 'by' minted 'of' from 'from' to 'to'
  // Alice minted EVE from 0x0 to Bob
  // by === of : valid case

  /**
   * A temporal on-chain activity tied to a transaction, relating accounts
   */
  export interface Activity extends TxLocator, Relation {
    value: BigNumber;
    method: string; // general or specific to spec of 'by'
    timestamp: number;
  }

  // recon of Relation.of in relation to Relation.to
  export interface Reconciliation {
    openBalance: BigNumber; // balance from prev block
    inTotalAmount: BigNumber;
    outTotalAmount: BigNumber;
    closeBalance: BigNumber; // 
  }

  // financial accounting

  /**
   * 
   */
  export interface LedgerEntry extends TxLocator, Relation {
    value: BigNumber;
    timestamp: number;
    reconciliation?: Reconciliation;
    isReconciled: boolean;
  }
}