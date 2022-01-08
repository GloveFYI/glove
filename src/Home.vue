<template>
  <div class="home" :class="{'light-mode': lightMode}">
    <div class="claimer">
      <span><strong>This version of glove</strong> is meant only for interactive UI Demo, <strong>accounting is KNOWN to be mostly incorrect</strong>. Addresses go through etherscan, heavy tx history won't work. <a href="https://etherscan.io/myapikey" target="_blank">Get your key</a></span>
      <a href="">Learn More</a>
    </div>
    <div class="address-field flex center">
      <form class="address" @submit.prevent="handleEthAddress" v-if="etherscan">
        <label for="eth-address">Address</label>
        <input id="eth-address" name="eth-address" :type="hideBalances ? 'password' : 'text'" class="align-center" :value="ethAddress">
        <button>PULL</button>
      </form>
      <form class="etherscan-key" @submit.prevent="handleEtherscanKey" v-else>
        <label for="etherscan-key">Etherscan API Key</label>
        <input id="etherscan-key" name="etherscan-key" class="align-center" :value="keys.etherscan">
        <button>SET KEY</button>
      </form>
      <div>
        <input type="checkbox" v-model="hideBalances"> Hide Balances
        {{ " " }}
        <input type="checkbox" v-model="filter.hideZeroValue"> Hide Valueless
        {{ " " }}
        <input type="checkbox" v-model="filter.activeOnly"> Active Only
        &emsp;
        <input type="checkbox" v-model="lightMode"> 💡 Lights
        &emsp; ⛽ gε {{ gasPrice }}
      </div>
    </div>
    <div class="status-bar align-center">
      <span>Ξ {{mask(Number(balance).toFixed(6))}} / {{mask(toFormattedUsd(Number(balance)*ethPrice, 2))}}</span>
      &emsp;|&emsp;
      <span><strong>Value</strong> {{mask(toFormattedUsd(totalBalanceValue,2))}}</span>
      &emsp;|&emsp;
      <span><strong>Exit Value</strong> {{mask(toFormattedUsd(totalLiquidValue,2))}}</span>
      &emsp;|&emsp;
      <span><strong>Investment</strong> <span>{{mask(toFormattedUsd(totalInvestment))}}</span></span>
      &emsp;|&emsp;
      <span><strong>ROI</strong> <span :class="{positive: totalRoi > 0, negative: totalRoi < 0}">{{toFormattedRoi(totalRoi)}}</span></span>
    </div>
    
    <table class="data-table" cellpadding="10" v-if="!loading">
      <thead class="bold">
        <tr>
          <th width="250">Asset</th>
          <th>ROI</th>
          <th>Holdings</th>
          <th>Value</th>
          <th>Value Share</th>
          <th>Investment</th>
          <th>Allocation</th>
          <th width="300">Transactions</th>
        </tr>
      </thead>
      <tbody>
        <tr :key="item.symbol" v-for="item in filteredTable">
          <template v-if="true">
            <td valign="top" class="">
              <p class="slim" style="font-size: 15px"><img style="vertical-align: middle" :src="item.image" width="20" />&emsp;<span>{{item.name}}</span></p>
              <span class="bold">⬨ {{ item.symbol || item.address }}</span><br>
              <div class="flex" style="justify-content: space-between">
              <span>{{ toFormattedUsd(item.numbers.currentPrice, 3) }}<br><small v-if="item.numbers.currentPriceChange" :class="{positive: item.numbers.currentPriceChange > 0, negative: item.numbers.currentPriceChange < 0, change: true}">{{ item.numbers.currentPriceChange.toFixed(2) }} %</small></span>
              <span>▴ {{ (item.numbers.currentMarketCap / 1000000).toFixed(2) }}m<br><small class="grey change">◌ {{ toFormattedPercent(item.capRatio) }}</small></span>
              </div>
            </td>
            <td align="right"><span :class="{positive: item.isGain, negative: !item.isGain, bold: true}">{{item.roi}}</span><br>
              <small v-if="item.holdings === 0" class="grey change">{{ item.unrealRoi }}</small>
            </td>
            <td align="right">{{mask(item.holdings.toFixed(6))}}</td>
            <td align="right">{{mask(toFormattedUsd(item.numbers.currentValue,2))}}</td>
            <td align="right">{{item.share}}</td>
            <td align="right">{{mask(toFormattedUsd(item.investment,2))}}</td>
            <td align="right">{{item.allocation}}</td>
            <td>
              <div
              :key="action.tx.hash"
              v-for="action in item.actions"
              :class="{'action-cell': true, ...action.class}"
              >
              <p>
                <span style="flex: 2">{{action.time}}</span>
                <span style="flex: 1" class="symbol align-center">{{action.symbol}}</span>
                <span style="flex: 3">
                  {{mask(action.tx.decimalValue.toFixed(2))}}
                  <br>
                  <small class="grey">{{toFormattedUsd(action.price)}} / {{(action.marketCap / 1000000).toFixed(2)}}m</small>
                </span>
              </p>
              </div>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import moment from "moment";
import _ from "lodash";
import Web3 from "web3";
import etherscanApi from "etherscan-api";

const mainnet = '';
const WETH_CONTRACT_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

const NETWORK = {
  ETHEREUM_MAINNET: "ethereum",
  BSC_MAINNET: "bsc",
  POLYGON_MAINNET: "polygon"
};

function makeApi({
  baseUrl,
  baseHeader = {}
  }) {
  return (endpoint, query) => {
      var querystring = "";
      if(query) {
        querystring = "?";
        Object.keys(query).forEach(key => {
          querystring += `${key}=${query[key]}&`
        });
      }
      const options = {
        headers: baseHeader
      }
      return fetch(`${baseUrl}${endpoint}${querystring}`, options)
        .then(res => res.json());
    }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  name: 'Home',
  props: {
    msg: String
  },
  data: () => ({

    // clients
    web3: null,
    coingecko: null,
    etherscan: null,
    chains: null,

    loading: true,
    hideBalances: false,
    lightMode: true,

    filter: {
      maxTrx: 10,
      activeOnly: true,
      hideZeroValue: true,
    },

    keys: {
      etherscan: ""
    },
    
    // data
    coingeckoList: [],
    
    gasPrice: 0,
    gasPriceUsd: 0,

    ethPrice: 0,
    ethAddress: "",
    balance: 0,

    nativeTxs: [],
    tokenTransfers: [],
    tokensMetadata: [],
    
    tokenTxsMap: [],
    tokenTxsRaw: {},
    tokenTxsPrices: {},
    tokenMarket: {},

    purchasePriceFallback: JSON.parse(localStorage.getItem("PRICE_FALLBACK")) || {}
  }),

  computed: {
    totalRoi() {
      const valueList = this.dataTable.map(item => (item.numbers.currentValue + item.numbers.returnValue));
      const totalValue = _.sum(valueList);
      const totalRoi = ((totalValue - this.totalInvestment) / this.totalInvestment)*100;
      return totalRoi;
    },
    totalInvestment() {
      const investmentList = this.dataTable.map(item => item.numbers.investment);
      const totalInvestment = _.sum(investmentList);
      return totalInvestment;
    },
    totalBalanceValue() {
      const balanceValueList = this.dataTable.map(item => item.numbers.currentValue);
      return _.sum(balanceValueList);
    },
    totalLiquidValue() {
      const liquidValueList = this.dataTable.map(item => item.numbers.liquidValue);
      console.log(liquidValueList);
      return _.sum(liquidValueList.filter(v => v > 0));
    },
    filteredTable() {
      if(!this.dataTable) return [];
      return this.dataTable.filter(line => {
        let condition = true;
        const hasHolding = line.holdings > 0;
        if(this.filter.hideZeroValue && hasHolding) {
          condition = line.numbers.currentValue >= 1;
        }
        if(this.filter.activeOnly && !hasHolding) {
          condition = false;
        }
        return condition;
      }).reverse();
    },
    dataTable() {
      let dataTable = [];
      try {
        dataTable = Object.values(this.filtered.tokenTxs).map(txs => {

          const symbol = txs[0].token.toUpperCase();

          if(txs.length <= 0) {
            return {
              name: this.tokens[symbol] && this.tokens[symbol].name,
              symbol,
              actions: [],
            } 
          }

          const getTxHist = (tx) => (this.tokenTxsPrices[symbol] && this.tokenTxsPrices[symbol].find(item => item.txHash === tx.hash) || {})
          
          const getTxPrice = (tx) => {
            const txHist = getTxHist(tx);
            let price;
            const fallback = this.purchasePriceFallback[symbol];
            if(typeof fallback === "number") {
              price = fallback;
            }
            else if (typeof fallback === "object" && typeof fallback[tx.hash] === "number") {
              price = fallback[tx.hash];
            }
            else {
              price = txHist.price || 0;
            }
            return price;
          }

          const actions = txs.map(tx => {
            const txHist = getTxHist(tx);
            const txPrice = getTxPrice(tx);
            const txMc = txHist.marketCap || 0;
            return {
              tx,
              class: { in: !!tx.isIn, out: !tx.isIn },
              time: this.toFormattedDate(tx.timestamp),
              symbol: tx.isIn === true ? '+' : "-",
              price: txPrice.toFixed(3),
              marketCap: txMc
            }
          });
          const txValueSet = txs.map(tx => {
            const price = getTxPrice(tx);
            return price ? price * tx.decimalValue * (tx.isIn ? 1 : -1) : 0;
          }).reverse();
          console.log(symbol, txValueSet)
          const alltimeHoldings = _.sum(txs.filter(tx => tx.isIn).map(tx => tx.decimalValue));
          // const totalInvestment = _.sum(txValueSet.filter(value => value >= 0)); // work this later with rug / airdrop implementations
          const totalInvestment = _.sum(txValueSet.filter(value => value > 0)) || 0;
          const returnValue = _.sum(txValueSet.filter(value => value < 0))*-1;
          // txValueSet.reverse().find(value => value >= 0)
          // const totalValueOut = -1*(_.sum(txValueSet.filter(value => value < 0)));
          const totalBalance = this.balances[symbol] || 0;

          const currentPrice = this.tokenMarket[symbol] ? this.tokenMarket[symbol].current_price : 0;
          const currentMarketCap = this.tokenMarket[symbol] ? this.tokenMarket[symbol].market_cap : 0;
          const fdValuation = this.tokenMarket[symbol] ? this.tokenMarket[symbol].fully_diluted_valuation : 0;
          const totalBalanceValue = totalBalance * currentPrice;

          // const gain = totalValueOut + totalBalanceValue - totalInvestment; // work this later for cumulative roi

          const gain = (totalBalanceValue + returnValue) - totalInvestment;
          const unrealGain = (alltimeHoldings * currentPrice) - totalInvestment;
          let roi = ((gain / totalInvestment) * 100) || 0;
          // if(!_.isFinite(roi)) {
          //   roi = 0;
          // }
          let unrealRoi = ((unrealGain / totalInvestment) * 100) || 0;
          // if(!_.isFinite(unrealRoi)) {
          //   unrealRoi = 0;
          // }

          const currentPriceChange = this.tokenMarket[symbol] ? this.tokenMarket[symbol].price_change_percentage_24h : null;

          return {
            name: this.tokens[symbol] && this.tokens[symbol].name,
            address: this.tokens[symbol] && this.tokens[symbol].address,
            image: this.tokenMarket[symbol] &&this.tokenMarket[symbol].image,
            symbol,
            actions,
            numbers: {
              investment: totalInvestment,
              holdings: totalBalance,
              alltimeHoldings,
              currentPrice,
              currentPriceChange,
              currentMarketCap,
              currentValue: totalBalanceValue,
              liquidValue: totalBalanceValue,
              fdValuation,
              returnValue,
              roi
            },
            investment: totalInvestment.toFixed(5),
            holdings: totalBalance,
            roi: this.toFormattedRoi(roi),
            unrealRoi: this.toFormattedRoi(unrealRoi),
            capRatio: (currentMarketCap / fdValuation)*100,
            isGain: roi >= 0,
            isAirdrop: txValueSet[0] ? false : true,
          }
        })
      } catch(e) {
        console.error(e);
      }
      const totalInvestment = _.sum(dataTable.map(item => item.numbers.investment));
      const totalValue = _.sum(dataTable.map(item => item.numbers.currentValue));
      dataTable = dataTable.map(item => {
        const allocation = ((item.numbers.investment / totalInvestment) * 100) || 0;
        const share = (item.numbers.currentValue / totalValue) * 100;
        return {
          ...item,
          numbers: {
            ...item.numbers,
            allocation,
            share
          },
          allocation: allocation.toFixed(2) + " %",
          share: share.toFixed(2) + " %"
        }
      })
      return dataTable;
    },
    assets() {
      const { ethAddress, coingeckoList, tokenTransfers } = this;
      if(!ethAddress || !tokenTransfers || !coingeckoList) {
        return []
      }
      let assets = [];

      const injectTxToAsset = (tx) => {
        const matchContract = asset => {
          return Object.values(asset.platforms || {}).includes(tx.address);
        };
        let index = assets.findIndex(matchContract);
        if(index < 0) {
          const asset = coingeckoList.find(matchContract);
          index = assets.push({...asset, transfers: []}) - 1; 
        }
        assets[index].transfers.push({
          contractAddress: tx.address,
          hash: tx.transaction_hash,
          timestamp: Number(tx.block_timestamp),
          isIn: tx.to_address.toLowerCase() === ethAddress.toLowerCase(),
          isFree: false,
          value: Number(tx.value),
          decimalValue: Number(tx.value) * Math.pow(10, Number(tx.tokenDecimal) * -1),
        });
      }

      tokenTransfers.forEach((transfer) => {
        injectTxToAsset(transfer);
      });

      console.log("assets", assets);

      return assets;
    },
    tokens() {
      const {coingeckoList} = this;
      return _.mapValues(this.tokenTxsRaw, function(trx) {
        const oneTrx = trx[0];
        const cgData = coingeckoList.find(coin => {
          return oneTrx.contractAddress.toLowerCase() === coin.platforms.ethereum
        }) || {
        };
        return {
          symbol: oneTrx.tokenSymbol.toUpperCase(),
          address: oneTrx.contractAddress,
          decimal: Number(oneTrx.tokenDecimal),
          cgId: cgData.id || "",
          name: cgData.name || oneTrx.tokenName,
        };
      });
    },
    tokenTxs() {
      const {ethAddress} = this;
      if(!ethAddress) return {};
      return _.mapValues(this.tokenTxsRaw, function(trx) {
        return trx.map(oneTrx => ({
          token: oneTrx.tokenSymbol,
          hash: oneTrx.hash,
          timestamp: Number(oneTrx.timeStamp),
          isIn: oneTrx.to.toLowerCase() === ethAddress.toLowerCase(),
          isFree: false,
          value: Number(oneTrx.value),
          decimalValue: Number(oneTrx.value) * Math.pow(10, Number(oneTrx.tokenDecimal) * -1),
        }));
      });
    },
    balances() {
      return _.mapValues(this.tokenTxs, function(txs) {
        return _.sum(txs.map(tx => ((tx.isIn) ? tx.decimalValue : tx.decimalValue * -1)));
      });
    },
    filtered() {
      return {
        tokenTxs: _.mapValues(this.tokenTxs, function(trx) {
          return _.take(trx, 10);
        })
      }
    },
  },

  watch: {
    async tokenTxs() {

      let pricesPromises = Object.keys(this.tokenTxsRaw).map(symbol => {
        const txPromises = this.tokenTxs[symbol].map(tx => Promise.all([tx, (this.tokens[symbol].cgId) ? this.fetchTokenPrice({
            id: this.tokens[symbol].cgId,
            startTime: moment.unix(tx.timestamp).startOf("hour").unix(),
            endTime: moment.unix(tx.timestamp).endOf("hour").unix()
          }) : {}]));

        return Promise.all(txPromises).then(histData => {
          return histData.map(([tx, item]) => {
            if(!item.prices) return {symbol};
            return {
              symbol,
              txHash: tx.hash,
              value: tx.decimalValue,
              marketCap: item.market_caps[0] && item.market_caps[0][1],
              price: item.prices[0] && item.prices[0][1]
            }
          })
        })
      });

      let data = await Promise.all(pricesPromises);
      let tokenTxsPrices = {};
      data.forEach(txs => {
        tokenTxsPrices[txs[0].symbol] = txs; 
      });
      this.tokenTxsPrices = tokenTxsPrices;

      let tokenMarketData = await this.fetchMarkets();
      let tokenMarket = {};
      tokenMarketData.forEach(token => {
        tokenMarket[token.symbol.toUpperCase()] = token;
      });
      this.tokenMarket = tokenMarket;
      this.loading = false;
    }
  },

  methods: {

    async multichainFetch(endpoint, query = { }) {

      let result = [];

      await timeout(50);

      try {
        const [ ethhTxs, bscTxs, polygonTxs ] = await Promise.all([
          this.apiDeepIndex(endpoint, { ...query, chain: NETWORK.ETHEREUM_MAINNET }),
          this.apiDeepIndex(endpoint, { ...query, chain: NETWORK.BSC_MAINNET }),
          this.apiDeepIndex(endpoint, { ...query, chain: NETWORK.POLYGON_MAINNET }),
        ]);

        result = [
          ...(ethhTxs.result.map(x => ({ ...x, network: NETWORK.ETHEREUM_MAINNET }))),
          ...(bscTxs.result.map(x => ({ ...x, network: "bsc" }))),
          ...(polygonTxs.result.map(x => ({ ...x, network: "polygon" }))),
        ];  
      } catch(e) {
        result = []
      }

      return result;
    },

    async fetchTransfers() {
      const { web3 } = this;
      let result = await web3.eth.getPastLogs({
        fromBlock: 0,
        toBlock: "latest",
        address: this.ethAddress,
        topics: []
      });
      return result;
    },

    handleEtherscanKey(event) {
      const etherscanKey = event.target.querySelector("[name='etherscan-key']").value;
      localStorage.setItem("ETHERSCAN_KEY", etherscanKey);
      this.etherscan = etherscanApi.init(etherscanKey);
    },

    async handleEthAddress(event) {
      const web3 = this.web3;
      
      this.ethAddress = event.target.querySelector("[name='eth-address']").value;
      // let balance = await web3.eth.getBalance(this.ethAddress);
      // this.balance = web3.utils.fromWei(balance, 'ether');
      let balance = await this.etherscan.account.balance(this.ethAddress, 'latest');
      this.balance = web3.utils.fromWei(balance.result, 'ether');
   
      let ethTxs = await this.etherscan.account.txlist(this.ethAddress, 1, 'latest', 1, 1000, 'asc');
      this.ethTxs = ethTxs.result;

      //// refactor zone start
      
      // this.nativeTxs = await this.multichainFetch(`${this.ethAddress}`);
      // this.tokenTransfers = await this.multichainFetch(`${this.ethAddress}/erc20/transfers`);

      // // merge the above to create a sensible gravy

      // // get unique contract addresses from tokenTransfers

      // const contractAddresses = this.tokenTransfers.map(x => x.address);

      // this.tokensMetadata = await this.multichainFetch(`erc20/metadata`, {
      //   addresses: contractAddresses.join(",")
      // });
      

      //// refactor zone end

      let tokenTxs = await this.etherscan.account.tokentx(this.ethAddress, undefined, 1, 'latest', 'asc');

      tokenTxs.result = tokenTxs.result.filter(tx => tx.contractAddress !== WETH_CONTRACT_ADDRESS);

      this.tokenTxsMap = tokenTxs.result.map(x => ({
        ...x,
        platform: "ethereum"
      }));

      // @todo tokenTxRaw keys to be contract Address instead of symbol

      let tokenTxsRaw = _.groupBy([...tokenTxs.result], (tx) => {
        console.log("tokenTxRawLatest", tx);
        // tx.contactAddress
        return tx.tokenSymbol;
      });
      tokenTxsRaw = _.mapValues(tokenTxsRaw, function(txs) {
        return _.sortBy(txs, [function(o) {return Number(o.timeStamp)}]).reverse()
      });
      tokenTxsRaw = _.mapKeys(tokenTxsRaw, function(value, key) {
        return key.toUpperCase();
      });
      this.tokenTxsRaw = tokenTxsRaw;
    },

    async handleTrackContract() {
      // const web3 = this.web3;
    },

    addToWatchlist(symbol) {
      window.localStorage.setItem("", symbol);
    },

    toFormattedDate(timestamp) {
      return moment.unix(timestamp).format("YY-MM-DD");
    },

    toFormattedUsd(amount, decimals = 2) {
      return "$ " + Number(amount).toFixed(decimals);
    },

    mask(value) {
      return this.hideBalances ? "********" : value;
    },

    async fetchCoingeckoList() {
      let res = await this.apiCoingecko('coins/list', {
        include_platform: true
      });
      console.log("fetchCoingeckoList", res);
      this.coingeckoList = res;
    },

    async fetchEthPrices() {
      this.ethPrice = (await this.apiCoingecko("coins/ethereum")).market_data.current_price.usd;
      const gasPrice = (await this.apiGas()).fast / 10;
      this.gasPrice = gasPrice;
    },

    async fetchTokenPrice({id, startTime, endTime}) {
      if(!id) return {};
      await timeout(200);
      let res = await this.apiCoingecko(`coins/${id}/market_chart/range`, {
        vs_currency: "usd",
        from: startTime,
        to: endTime,
      });
      return res;
    },

    async fetchMarkets() {
      const ids = Object.values(this.tokens).map(token => token.cgId).join(',');
      let res = await this.apiCoingecko("coins/markets", { 
        ids,
        vs_currency: "usd"
        });
      return res;
    },

    toFormattedPercent(number) {
      if(!_.isFinite(number)) {
        return "∞"
      }
      return number.toFixed(2) + " %"
    },

    toFormattedRoi(roi) {
      if(isNaN(roi)) return "0.00 %";
      if(!isFinite(roi)) return "∞";
      return roi > 100 ? ((roi+100)/100).toFixed(2)+" X" : roi.toFixed(2) + " %";
    }
  },

  mounted() {
    this.web3 = new Web3(new Web3.providers.HttpProvider(mainnet));

    const etherscanKey = localStorage.getItem("ETHERSCAN_KEY");
    if(etherscanKey) {
      this.etherscan = etherscanApi.init(etherscanKey);
    }

    // Coingecko: closed SaaS, restrictive API
    this.apiCoingecko = makeApi({
      baseUrl: "https://api.coingecko.com/api/v3/",
    });

    // ??: multichain api
    this.apiDeepIndex = makeApi({
      baseUrl: "",
      baseHeader: { "X-API-Key": "" }
    });

    // 0x Protocol: public API
    const zeroXHosts = {
      ethereum: "https://api.0x.org/",
      bsc: "https://bsc.api.0x.org/",
      polygon: "https://polygon.api.0x.org/",
    };

    this.apiZeroX = _.mapValues(zeroXHosts, (baseUrl) => {
      return makeApi({ baseUrl });
    });

    this.apiGas = makeApi({
      baseUrl: "https://ethgasstation.info/api/ethgasAPI.json?",
    });

    this.fetchCoingeckoList();
    this.fetchEthPrices();
    window.setInterval(this.fetchEthPrices, 60000);
  },

  updated() {
    console.log('# STATE UPDATE', this)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>

$green: #00ee00;
$red: #ff5959;

.claimer {
  font-family: Helvetica, sans-serif;
  font-size: 13px;
  margin: 0;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(139,139,139,0.1);
  padding: 10px;
  text-align: center;

  > * {
    display: inline-block;
    padding: 0 6px;
  }
}

.home {
  padding: 10px;
  padding-top: 50px;
  &.light-mode {

    background: #fff;
    color: #000;
    input, select, button {
      background: transparent;
      color: #333;
      border: 1px solid #000;
    }

    button, input[type="submit"] {
      color: #000;
    }

    table {
      th {
        background: #eee;
      }
      tr {
        box-shadow: 0 1px 0 0 rgba(0,0,0,0.1);
      }
      td {
        &:before {
          background-color: rgba(0,0,0,0.1)
        }
      }
    }

    .positive {
      color: #059e03;
    }

  }
}

.address-field {
  margin: 20px 0;
  input, button, label, select {
    margin: 0 10px;
  }
}

#eth-address {
  width: 350px;
}

table {
  border-collapse: collapse;

  .action-cell {
    p {
      display: flex;
      align-items: center;
      flex-grow: 1;
      margin: 0;
    }
    span {
      flex: 1;
    }

    .symbol {
      font-weight: bold;
    }
  }
}

table {
  th {
    background:#111;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  tr {
    box-shadow: 0 1px 0 0 rgba(255,255,255,0.1);
  }
  td {
    position: relative;
    &:before {
      content: '';
      width: 1px;
      background-color: rgba(255,255,255,0.05);
      height: 20px;
      position: absolute;
      left: 0;
      top: 100%;
      transform: translateY(-50%);
    }

    &:last-of-type {
      background: rgba(139, 139, 139, 0.03);
    }
  }
}

table td > * {
  margin: 5px 0;
}

.status-bar {
  margin: 20px auto;
}

.data-table {
  max-width: 100%;
  // width: 100%;
  margin: 30px auto;
}

.slim {
  margin: 10px 0;
}

.positive {
  color: #00ee00;
}

.negative {
  color: #ff5959;
}

.grey {
  opacity: 0.6;
}

.bold {
  font-weight: 600;
}

.spaced {
  letter-spacing: 1px;
}

.small {
  font-size: 11px;
}
</style>
