
## State of the codebase

**Glove** in present from, originates from an unconventional method of creating web experiences that don't lie and cheat their receiver. It is in its infancy, with very limited entities supporting its development.

It is being driven by an early engineering M.O., which is backed by [first principles defined here](https://pint.network/t/pint-network-genesis/). Most of the work on codebase predates both, and was carried out intermittently through 2021, to derive measures from on-chain data that are not conveniently, freely, and openly available.

[Must Read the M.O.](https://pint.network/t/first-invention-mo/)

**Almost everything that makes up the ultimate minimal experience is yet to be implemented.** Changes should roll out eventually as more content is created to support specifications.


## Contribution

Glove competes with the status-quo, it breathes "yes can do". Competition goes fast, unnatural it is, friction there is, bright it burns. Time is mortal, the quicker ones wither sooner and die.

**Purposed open software outlives a generation:** delegate adaptability to userland, to realize a p2p-embedded experience, that self-contructs.

- what can be decoupled from core codebase, should be

- invest effort in standardization and data linking

- there is a future of data bridges flying in the decentralized web, simulate them

We keep up with realities, yet build away, bury the head time to time... balance is key.

If you, by an off-chance wish to contribute today, know that glove is running on rags, there is no money nor fame in it, no community, no use yet, "learning" is to your will, there's no one to promise it. If you are insane, you can volunteer for potential or open tasks. Otherwise, you can apply your interest to consider [covering for material resource needs](https://glove.fyi/manifest/).

And obviously if you look forward to using it, please join [discord](https://discord.gg/MdmM2WFH) to stay connected.


----

### Mindmapping for correct ROIs

0 b: 1 token at 1 usd at 1m cap
1 b: 4 token at 2 usd at 5m cap
2 s: 2 token at 4 usd at 15m cap
3 s: 1 token at 6 usd at 25m cap
4 b: 1 token at 8 usd at 30m cap

current price = 10usd
current cap = 60m


// [ stxId, btxId, amount, balance, days, price_multiple, cap_multiple ]
[ 2, 0, 1, 0, xx, 4.0, 15.0  ] // derived money_multiple = 15 / 4 = 3.75 i.e. inflation
[ 2, 1, 1, 3, xx, 2.0, 03.0 ] // 3 / 2 = 1.5
[ 3, 1, 1, 2, xx, 3.0, 05.0 ] // 5 / 3 = 1.66

Buy balances that are still non-zero, are then calculated against current price

format // btx: amount, price_mul, cap_mul

1: 2, 5.0, 12.0 // 2.4
4: 1, 1.25, 2.0 // 1.6

(3.75 + 1.5 + 1.66 + (2.4*2) + 1.6) / 6 = 2.218 (cumulative multiple of inflation)

in this case: tx#1, only 2 tokens out of 4, and subsequent buys i.e. tx#4 will be accounted for calculations against current holding

// hideous incomplete reference algo, implement sanely

each sellset as stx:
    buyset = prior buy transactions
    each buyset as btx:
        result[tx.id][btx.id] = btx - tx

