
import type { Glove } from '../types';
import type { TrueBlocks } from '../types';
import { BigNumber } from 'ethers';

/**
 * 
 * @param data 
 * @todo rough draft implementation, make it
 */
export function trueblocks(data: {
  appearance: TrueBlocks.Appearance,
  statements: TrueBlocks.Statement[]
}): Array<Glove.LedgerEntry> {

  return data.statements.map(s => {

    const reconciliation: Glove.Reconciliation = {
      openBalance: BigNumber.from(s.begBal),
      inTotalAmount: BigNumber.from(s.totalIn),
      outTotalAmount: BigNumber.from(s.totalOut),
    };
    let r = reconciliation;
    reconciliation.closeBalance = r.openBalance.add(r.inTotalAmount).sub(r.outTotalAmount);

    const isReconciled = r.openBalance.add(r.inTotalAmount) === r.closeBalance;

    return {
      blockNumber: s.blockNumber,
      transactionIndex: s.transactionIndex,
      of: s.assetAddr,
      to: data.appearance.address,
      value: s.amountIn,
      timestamp: data.appearance.timestamp,
      reconciliation,
      isReconciled
    } as Glove.LedgerEntry;
  })
}