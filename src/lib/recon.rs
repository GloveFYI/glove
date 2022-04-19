mod recon;

use crate::types::{Address, Bytes, Index, Log, H2048, H256, U256, U64};

pub Struct Reconciliation {

}

pub Struct Transaction {
    pub hash: H256,
    pub transaction_index: u32,
    pub value: U256,
}

pub Struct Statement {
    pub reconciled: bool,

}

fn reconcile_eth(tx: Transaction, last_block_end_bal: U256, prev_tx_end_bal: U256) -> Statement {

}