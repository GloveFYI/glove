import type EVM from 'ethereum-types';

export namespace TrueBlocks {

  export type Appearance = {
    blockNumber: EVM.BlockWithoutTransactionData['number'];
    transactionIndex: EVM.Transaction['transactionIndex'];
    address: Address;
    name?: string;
    timestamp: number;
    date: string;
  }

  export type Log = {
    blockNumber: EVM.BlockWithoutTransactionData['number'];
    transactionIndex: EVM.Transaction['transactionIndex'];
    logIndex: EVM.LogEntry['logIndex'];
    timestamp: EVM.BlockWithTransactionData['timestamp'];
    address: Address;
    topics: Array<string>;
  }

  export type ReconciliationType = 'prevdiff-partial' | 'partial-nextdiff' | 'partial-partial';

  export type Statement = {
    blockNumber: EVM.BlockWithoutTransactionData['number'];
    transactionIndex: EVM.Transaction['transactionIndex'];
    timestamp: EVM.BlockWithoutTransactionData['timestamp'];
    assetAddr: ContractAddress<any>;
    assetSymbol: AssetSymbol;
    decimals: number;
    prevBlk: EVM.BlockWithoutTransactionData['number'],
    prevBlkBal: string,
    begBal: string,
    begBalDiff: string,
    amountIn: string,
    amountOut: string,
    internalIn: string,
    internalOut: string;
    selfDestructIn: string;
    selfDestructOut: string;
    minerBaseRewardIn: string;
    minerNephewRewardIn: string;
    minerTxFeeIn: string;
    minerUncleRewardIn: string;
    prefundIn: string;
    spotPrice: number;
    priceSource: string;
    gasCostOut: string;
    endBal: string;
    totalIn: string;
    totalOut: string;
    totalOutLessGas: string;
    amountNet: string;
    endBalCalc: string;
    endBalDiff: string;
    reconciliationType: ReconciliationType;
    reconciled: boolean;
  }

  export type Receipt = {
    status: null | 0 | 1; // null if tx precedes Byzantium
    contractAddress: Address;
    gasUsed: EVM.TransactionReceipt['cumulativeGasUsed'];
    logs: Array<Log>
  }

  export interface Transaction {
    hash: EVM.Transaction['hash'];
    blockHash: EVM.Transaction['blockHash'];
    blockNumber: EVM.Transaction['blockNumber'];
    transactionIndex: EVM.Transaction['transactionIndex'];
    nonce: EVM.Transaction['nonce'];
    timestamp: EVM.BlockWithoutTransactionData['timestamp'];
    from: EVM.Transaction['from'];
    to: EVM.Transaction['to'];
    value: EVM.Transaction['value'];
    gas: EVM.Transaction['gas'];
    gasPrice: EVM.Transaction['gasPrice'];
    maxFeePerGas: EVM.Transaction['maxFeePerGas'];
    maxPriorityFeePerGas: EVM.Transaction['maxPriorityFeePerGas'];
    isError: 0 | 1;
    hasToken: 0 | 1;
    articulatedTx: string;
    compressedTx: string;
    finalized: boolean;
    extraData?: string;
    date: string;
    statements: Array<Statement>;
    receipts: Array<Receipt>;
  }
}