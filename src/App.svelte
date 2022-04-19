<script>
  import { Buffer } from "buffer";
  import moment from "moment";
  import _ from "lodash";
  import { onMount } from "svelte";
  import { ethers } from "ethers";
  import etherscanApi from "etherscan-api";
  import namehash from "eth-ens-namehash";

  const MAINNET = "";
  const WETH_CONTRACT_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const ENS_REGISTRY_CONTRACT_ADDRESS =
    "0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e";
  const YEK = "YWE7CYXT15F5VBY9RQFV188JCXPQZ1M3GC";

  const NETWORK = {
    ETHEREUM_MAINNET: "ethereum",
    BSC_MAINNET: "bsc",
    POLYGON_MAINNET: "polygon",
  };

  window.Buffer = Buffer;

  function makeApi({ baseUrl, baseHeader = {} }) {
    return (endpoint, query) => {
      var querystring = "";
      if (query) {
        querystring = "?";
        Object.keys(query).forEach((key) => {
          querystring += `${key}=${query[key]}&`;
        });
      }
      const options = {
        headers: baseHeader,
      };
      return fetch(`${baseUrl}${endpoint}${querystring}`, options).then((res) =>
        res.json()
      );
    };
  }

  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // clients

  let statements = JSON.parse(localStorage.getItem("glove_statements"));

  let apiCoingecko;
  let apiDeepIndex;
  let apiZeroX;
  let apiChifra;
  let apiGas;
  let web3;
  let etherscan = null;
  let loading = true;
  let hideBalances = false;
  let lightMode = true;
  let filterMaxTrx = 10;
  let filterActiveOnly = true;
  let filterHideZeroValue = true;
  let keys = {
    etherscan: "",
  };

  // data

  let coingeckoList = [];
  let gasPrice = 0;
  let ethPrice = 0;
  let ethAddress = "";
  let balance = 0;

  let filteredTable = [];
  let ethTxs = [];
  let tokenTransfers = [];
  let tokensMetadata = [];
  let tokenTxsMap = [];
  let tokenTxsRaw = {};
  let tokenTxsPrices = {};
  let tokenMarket = {};

  let purchasePriceFallback =
    JSON.parse(localStorage.getItem("PRICE_FALLBACK")) || {};

  // methods

  async function multichainFetch(endpoint, query = {}) {
    let result = [];

    await timeout(50);

    try {
      const [ethhTxs, bscTxs, polygonTxs] = await Promise.all([
        apiDeepIndex(endpoint, { ...query, chain: NETWORK.ETHEREUM_MAINNET }),
        apiDeepIndex(endpoint, { ...query, chain: NETWORK.BSC_MAINNET }),
        apiDeepIndex(endpoint, { ...query, chain: NETWORK.POLYGON_MAINNET }),
      ]);

      result = [
        ...ethhTxs.result.map((x) => ({
          ...x,
          network: NETWORK.ETHEREUM_MAINNET,
        })),
        ...bscTxs.result.map((x) => ({ ...x, network: "bsc" })),
        ...polygonTxs.result.map((x) => ({ ...x, network: "polygon" })),
      ];
    } catch (e) {
      result = [];
    }

    return result;
  }

  async function fetchTransfers() {
    let result = await web3.eth.getPastLogs({
      fromBlock: 0,
      toBlock: "latest",
      address: ethAddress,
      topics: [],
    });
    return result;
  }

  function handleEtherscanKey(event) {
    const which = event.submitter.id;
    let key = "";
    if (which === "dev_key") {
      key = YEK;
    } else {
      key = event.target.querySelector("[name='etherscan-key']").value;
    }
    localStorage.setItem("ETHERSCAN_KEY", key);
    etherscan = etherscanApi.init(key);
  }

  async function handleEthAddress(event) {
    ethAddress = event.target.querySelector("[name='eth-address']").value;

    if (ethAddress.includes(".eth")) {
      const data = "02571be3" + namehash.hash(ethAddress).slice(2);
      const address = await etherscan.proxy.eth_call(
        ENS_REGISTRY_CONTRACT_ADDRESS,
        data,
        "latest"
      );
      ethAddress = "0x" + address.result.slice(-40);
    }

    // let balance = await web3.eth.getBalance(ethAddress);
    // balance = web3.utils.fromWei(balance, 'ether');
    let _balance = await etherscan.account.balance(ethAddress, "latest");
    balance = ethers.utils.formatEther(_balance.result);
    let _ethTxs = await etherscan.account.txlist(
      ethAddress,
      1,
      "latest",
      1,
      1000,
      "asc"
    );
    ethTxs = _ethTxs.result;

    //// refactor zone start

    // nativeTxs = await multichainFetch(`${ethAddress}`);
    // tokenTransfers = await multichainFetch(`${ethAddress}/erc20/transfers`);

    // // merge the above to create a sensible gravy

    // // get unique contract addresses from tokenTransfers

    // const contractAddresses = tokenTransfers.map(x => x.address);

    // tokensMetadata = await multichainFetch(`erc20/metadata`, {
    //   addresses: contractAddresses.join(",")
    // });

    //// refactor zone end

    let tokenTxs = await etherscan.account.tokentx(
      ethAddress,
      undefined,
      1,
      "latest",
      "asc"
    );

    tokenTxsMap = tokenTxs.result.map((x) => ({
      ...x,
      platform: "ethereum",
    }));

    // @todo tokenTxRaw keys to be contract Address instead of symbol

    let _tokenTxsRaw = _.groupBy([...tokenTxs.result], (tx) => {
      console.log("tokenTxRawLatest", tx);
      // tx.contactAddress
      return tx.tokenSymbol;
    });
    _tokenTxsRaw = _.mapValues(_tokenTxsRaw, function (txs) {
      return _.sortBy(txs, [
        function (o) {
          return Number(o.timeStamp);
        },
      ]).reverse();
    });
    _tokenTxsRaw = _.mapKeys(_tokenTxsRaw, function (value, key) {
      return key.toUpperCase();
    });

    tokenTxsRaw = _tokenTxsRaw;
  }

  async function handleTrackContract() {
    // const web3 = web3;
  }

  function addToWatchlist(symbol) {
    window.localStorage.setItem("", symbol);
  }

  function toFormattedDate(timestamp) {
    return moment.unix(timestamp).format("YY-MM-DD");
  }

  function toFormattedUsd(amount, decimals = 2) {
    return "$ " + Number(amount).toFixed(decimals);
  }

  function toFormattedPercent(number) {
    if (!_.isFinite(number)) {
      return "∞";
    }
    return number.toFixed(2) + " %";
  }

  function toFormattedRoi(roi) {
    if (isNaN(roi)) return "0.00 %";
    if (!isFinite(roi)) return "∞";
    return roi > 100
      ? ((roi + 100) / 100).toFixed(2) + " X"
      : roi.toFixed(2) + " %";
  }

  async function fetchCoingeckoList() {
    let res = await apiCoingecko("coins/list", {
      include_platform: true,
    });
    console.log("fetchCoingeckoList", res);
    coingeckoList = res;
  }

  async function fetchEthPrices() {
    ethPrice = (await apiCoingecko("coins/ethereum")).market_data.current_price
      .usd;
    gasPrice = (await apiGas()).fast / 10;
  }

  async function fetchTokenPrice({ id, startTime, endTime }) {
    if (!id) return {};
    await timeout(200);
    let res = await apiCoingecko(`coins/${id}/market_chart/range`, {
      vs_currency: "usd",
      from: startTime,
      to: endTime,
    });
    return res;
  }

  async function fetchMarkets() {
    const ids = Object.values(tokens)
      .map((token) => token.cgId)
      .join(",");
    let res = await apiCoingecko("coins/markets", {
      ids,
      vs_currency: "usd",
    });
    return res;
  }

  async function updateMarkets() {
    let tokenMarketData = await fetchMarkets();
    let _tokenMarket = {};
    tokenMarketData.forEach((token) => {
      _tokenMarket[token.symbol.toUpperCase()] = token;
    });
    tokenMarket = _tokenMarket;
  }

  const LOCALE =
    (navigator.languages && navigator.languages.length
      ? navigator.languages[0]
      : navigator.language) || "en";

  const percentFormatter = Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const fiatFormatter = Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  });
  const fiatpactFormatter = Intl.NumberFormat(LOCALE, {
    notation: "compact",
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    // minimumFractionDigits: 2,
  });
  const numFormatter = Intl.NumberFormat(LOCALE, {});
  const numpactFormatter = Intl.NumberFormat(LOCALE, {
    notation: "compact",
  });

  $: fiat = function (value, flag = "") {
    let formatter = flag.includes("c") ? fiatpactFormatter : fiatFormatter;
    return formatter.format(Number(value)).toLowerCase();
  };

  $: eth = function (value) {
    return "Ξ " + numFormatter.format(Number(value));
  };

  $: percent = function (value) {
    if (isNaN(value)) return percentFormatter.format(0);
    if (!isFinite(value)) return "∞";
    return percentFormatter.format(Number(value));
  };

  $: percentiple = function (value) {
    if (isNaN(value)) return percentFormatter.format(0);
    if (!isFinite(value)) return "∞";
    return value >= 1
      ? numFormatter.format(value + 1) + " X"
      : percentFormatter.format(value);
  };

  $: number = function (value) {
    return numFormatter.format(Number(value));
  };

  $: mask = function (value) {
    return hideBalances ? "********" : value;
  };

  let tokenStatements = {};

  // $: {
  //   tokenStatements =
  // }

  $: assets =
    tokenTransfers &&
    (() => {
      if (!ethAddress || !tokenTransfers || !coingeckoList) {
        return [];
      }
      let assets = [];

      const injectTxToAsset = (tx) => {
        const matchContract = (asset) => {
          return Object.values(asset.platforms || {}).includes(tx.address);
        };
        let index = assets.findIndex(matchContract);
        if (index < 0) {
          const asset = coingeckoList.find(matchContract);
          index = assets.push({ ...asset, transfers: [] }) - 1;
        }
        assets[index].transfers.push({
          contractAddress: tx.address,
          hash: tx.transaction_hash,
          timestamp: Number(tx.block_timestamp),
          isIn: tx.to_address.toLowerCase() === ethAddress.toLowerCase(),
          isFree: false,
          value: Number(tx.value),
          decimalValue:
            Number(tx.value) * Math.pow(10, Number(tx.tokenDecimal) * -1),
        });
      };

      tokenTransfers.forEach((transfer) => {
        injectTxToAsset(transfer);
      });

      return assets;
    })();

  $: tokens =
    tokenTxsRaw &&
    (() => {
      return _.mapValues(tokenTxsRaw, function (trx) {
        const oneTrx = trx[0];
        const cgData =
          coingeckoList.find((coin) => {
            return (
              oneTrx.contractAddress.toLowerCase() === coin.platforms.ethereum
            );
          }) || {};
        return {
          symbol: oneTrx.tokenSymbol.toUpperCase(),
          address: oneTrx.contractAddress,
          decimal: Number(oneTrx.tokenDecimal),
          cgId: cgData.id || "",
          name: cgData.name || oneTrx.tokenName,
        };
      });
    })();

  $: tokenTxs =
    tokenTxsRaw &&
    (() => {
      if (!ethAddress) return {};
      return _.mapValues(tokenTxsRaw, function (trx) {
        return trx.map((oneTrx) => ({
          token: oneTrx.tokenSymbol,
          hash: oneTrx.hash,
          timestamp: Number(oneTrx.timeStamp),
          isIn: oneTrx.to.toLowerCase() === ethAddress.toLowerCase(),
          isFree: false,
          value: Number(oneTrx.value),
          decimalValue:
            Number(oneTrx.value) *
            Math.pow(10, Number(oneTrx.tokenDecimal) * -1),
        }));
      });
    })();

  $: filtered =
    tokenTxs &&
    (() => {
      const filtered = _.mapValues(tokenTxs, function (trx) {
        return _.take(trx, 10);
      });
      delete filtered.WETH;
      return {
        tokenTxs: filtered,
      };
    })();

  $: balances =
    tokenTxs &&
    (() => {
      return _.mapValues(tokenTxs, function (txs) {
        return _.sum(
          txs.map((tx) => (tx.isIn ? tx.decimalValue : tx.decimalValue * -1))
        );
      });
    })();

  $: dataTable =
    filtered &&
    (() => {
      let dataTable = [];
      try {
        dataTable = Object.values(filtered.tokenTxs).map((txs) => {
          const symbol = txs[0].token.toUpperCase();

          if (txs.length <= 0) {
            return {
              name: tokens[symbol] && tokens[symbol].name,
              symbol,
              actions: [],
            };
          }

          const getTxHist = (tx) =>
            (tokenTxsPrices[symbol] &&
              tokenTxsPrices[symbol].find((item) => item.txHash === tx.hash)) ||
            {};

          const getTxPrice = (tx) => {
            const txHist = getTxHist(tx);
            let price;
            const fallback = purchasePriceFallback[symbol];
            if (typeof fallback === "number") {
              price = fallback;
            } else if (
              typeof fallback === "object" &&
              typeof fallback[tx.hash] === "number"
            ) {
              price = fallback[tx.hash];
            } else {
              price = txHist.price || 0;
            }
            return price;
          };

          const actions = txs.map((tx) => {
            const txHist = getTxHist(tx);
            const txPrice = getTxPrice(tx);
            const txMc = txHist.marketCap || 0;
            return {
              tx,
              class: { in: !!tx.isIn, out: !tx.isIn },
              time: toFormattedDate(tx.timestamp),
              symbol: tx.isIn === true ? "+" : "-",
              price: txPrice.toFixed(3),
              marketCap: txMc,
            };
          });
          const txValueSet = txs
            .map((tx) => {
              const price = getTxPrice(tx);
              return price ? price * tx.decimalValue * (tx.isIn ? 1 : -1) : 0;
            })
            .reverse();
          console.log(symbol, txValueSet);
          const alltimeHoldings = _.sum(
            txs.filter((tx) => tx.isIn).map((tx) => tx.decimalValue)
          );
          // const totalInvestment = _.sum(txValueSet.filter(value => value >= 0)); // work this later with rug / airdrop implementations
          const totalInvestment =
            _.sum(txValueSet.filter((value) => value > 0)) || 0;
          const returnValue =
            _.sum(txValueSet.filter((value) => value < 0)) * -1;
          // txValueSet.reverse().find(value => value >= 0)
          // const totalValueOut = -1*(_.sum(txValueSet.filter(value => value < 0)));
          const totalBalance = balances[symbol] || 0;

          const currentPrice = tokenMarket[symbol]
            ? tokenMarket[symbol].current_price
            : 0;
          const currentMarketCap = tokenMarket[symbol]
            ? tokenMarket[symbol].market_cap
            : 0;
          const fdValuation = tokenMarket[symbol]
            ? tokenMarket[symbol].fully_diluted_valuation
            : 0;
          const totalBalanceValue = totalBalance * currentPrice;

          // const gain = totalValueOut + totalBalanceValue - totalInvestment; // work this later for cumulative roi

          const gain = totalBalanceValue + returnValue - totalInvestment;
          const unrealGain = alltimeHoldings * currentPrice - totalInvestment;
          let roi = gain / totalInvestment || 0;
          // if(!_.isFinite(roi)) {
          //   roi = 0;
          // }
          let unrealRoi = unrealGain / totalInvestment || 0;
          // if(!_.isFinite(unrealRoi)) {
          //   unrealRoi = 0;
          // }

          const currentPriceChange = tokenMarket[symbol]
            ? tokenMarket[symbol].price_change_percentage_24h / 100
            : null;

          return {
            name: tokens[symbol] && tokens[symbol].name,
            address: tokens[symbol] && tokens[symbol].address,
            image: tokenMarket[symbol] && tokenMarket[symbol].image,
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
              gain,
              roi,
            },
            investment: fiat(totalInvestment),
            holdings: number(totalBalance),
            roi: percentiple(roi),
            unrealRoi: percentiple(unrealRoi),
            circSupply: percent(currentMarketCap / fdValuation),
            isGain: roi >= 0,
          };
        });
      } catch (e) {
        console.error(e);
      }
      const totalInvestment = _.sum(
        dataTable.map((item) => item.numbers.investment)
      );
      const totalValue = _.sum(
        dataTable.map((item) => item.numbers.currentValue)
      );
      dataTable = dataTable.map((item) => {
        const allocation = item.numbers.investment / totalInvestment || 0;
        const share = item.numbers.currentValue / totalValue;
        return {
          ...item,
          numbers: {
            ...item.numbers,
            allocation,
            share,
          },
          allocation: percent(allocation),
          share: percent(share),
        };
      });
      return dataTable;
    })();

  $: {
    filteredTable = dataTable
      .filter((line) => {
        let condition = true;
        const hasHolding = line.numbers.holdings > 0;
        if (filterHideZeroValue && hasHolding) {
          condition = line.numbers.currentValue >= 1;
        }
        if (filterActiveOnly && !hasHolding) {
          condition = false;
        }
        return condition;
      })
      .reverse();
  }

  // makeshift aggregator
  function aggr(g) {
    return g[1]((dataTable || []).map((i) => g[0](i.numbers)));
  }

  const MUSH = {
    totalRoi: [(i) => i.gain, _.sum],
    totalInvestment: [(i) => i.investment, _.sum],
    totalBalanceValue: [(i) => i.currentValue, _.sum],
  };

  $: totalInvestment = dataTable && aggr(MUSH.totalInvestment);
  $: totalRoi = dataTable && aggr(MUSH.totalRoi) / totalInvestment;
  $: totalBalanceValue = dataTable && aggr(MUSH.totalBalanceValue);
  $: totalLiquidValue = totalBalanceValue;

  const watchTokenTxs = async () => {
    let pricesPromises = Object.keys(tokenTxsRaw).map((symbol) => {
      const txPromises = tokenTxs[symbol].map((tx) =>
        Promise.all([
          tx,
          tokens[symbol].cgId
            ? fetchTokenPrice({
                id: tokens[symbol].cgId,
                startTime: moment.unix(tx.timestamp).startOf("hour").unix(),
                endTime: moment.unix(tx.timestamp).endOf("hour").unix(),
              })
            : {},
        ])
      );

      return Promise.all(txPromises).then((histData) => {
        return histData.map(([tx, item]) => {
          if (!item.prices) return { symbol };
          return {
            symbol,
            txHash: tx.hash,
            value: tx.decimalValue,
            marketCap: item.market_caps[0] && item.market_caps[0][1],
            price: item.prices[0] && item.prices[0][1],
          };
        });
      });
    });

    let data = await Promise.all(pricesPromises);
    let _tokenTxsPrices = {};
    data.forEach((txs) => {
      _tokenTxsPrices[txs[0].symbol] = txs;
    });
    tokenTxsPrices = _tokenTxsPrices;

    await updateMarkets();
    loading = false;
  };

  $: if (tokenTxs) {
    watchTokenTxs().then();
  }

  onMount(() => {
    // web3 = new ethers.providers.JsonRpcProvider(MAINNET);

    const etherscanKey = localStorage.getItem("ETHERSCAN_KEY");
    if (etherscanKey) {
      etherscan = etherscanApi.init(etherscanKey);
    }

    // trueblocks: open as they rarely come
    apiChifra = makeApi({
      baseUrl: "http://localhost:9000",
    });

    // Coingecko: closed SaaS, restrictive API
    apiCoingecko = makeApi({
      baseUrl: "https://api.coingecko.com/api/v3/",
    });

    // ??: multichain api
    apiDeepIndex = makeApi({
      baseUrl: "",
      baseHeader: { "X-API-Key": "" },
    });

    // 0x Protocol: public API
    const zeroXHosts = {
      ethereum: "https://api.0x.org/",
      bsc: "https://bsc.api.0x.org/",
      polygon: "https://polygon.api.0x.org/",
    };

    apiZeroX = _.mapValues(zeroXHosts, (baseUrl) => {
      return makeApi({ baseUrl });
    });

    apiGas = makeApi({
      baseUrl: "https://ethgasstation.info/api/ethgasAPI.json?",
    });

    fetchCoingeckoList();
    fetchEthPrices();

    window.setInterval(async () => {
      await fetchEthPrices();
      await updateMarkets();
    }, 30000);
  });

  const statementValue = (s) => {
    let value = "";
    // if(s.totalIn) {
    //   value = "+"+Number(s.totalIn)*Math.pow(10, -s.decimals);
    // }
    // if(s.totalOutLessGas) {
    //   value += ((value) ? " / " : "") + Number(s.totalOutLessGas)*Math.pow(10, -s.decimals);
    // }
    return value;
  };

  const trulyReconciled = (s) => {
    const cond1 =
      BigInt(s.begBal) + BigInt(s.totalIn) ===
      BigInt(s.totalOut) + BigInt(s.endBal);
    const cond2 = BigInt(s.begBal) === BigInt(s.prevBlkBal);
    return [cond1 && cond2, cond1, cond2];
  };
</script>

<body>
  <div class="home" class:light-mode={lightMode}>
    <div class="claimer">
      <span
        ><strong>This version of glove</strong> is meant only for interactive UI
        Demo, <strong>accounting is KNOWN to be mostly incorrect</strong>.
        Addresses go through etherscan, prices come from coingecko.
        <a href="https://etherscan.io/myapikey" target="_blank">Get your key</a
        ></span
      >
      | <a href="https://glove.fyi/manifest">Contribute / Source</a>
    </div>
    <div class="address-field flex center">
      {#if etherscan}
        <form class="address" on:submit|preventDefault={handleEthAddress}>
          <label for="eth-address">Address / ENS</label>
          <input
            id="eth-address"
            name="eth-address"
            type={hideBalances ? "password" : "text"}
            class="align-center"
            :value="ethAddress"
          />
          <button>PULL</button>
        </form>
      {:else}
        <form
          class="etherscan-key"
          on:submit|preventDefault={handleEtherscanKey}
        >
          <label for="etherscan-key">Etherscan API</label>
          <input
            type="submit"
            id="dev_key"
            name="dev_key"
            value="USE DEV KEY"
          />/ OR
          <input
            id="etherscan-key"
            name="etherscan-key"
            class="align-center"
            bind:value={keys.etherscan}
          />
          <input
            type="submit"
            id="own_key"
            name="own_key"
            value="SET OWN KEY"
          />
        </form>
      {/if}
      <div>
        <input type="checkbox" bind:checked={hideBalances} /> Hide Balances
        {" "}
        <input type="checkbox" bind:checked={filterHideZeroValue} /> Hide
        Valueless
        {" "}
        <input type="checkbox" bind:checked={filterActiveOnly} /> Active Only
        &emsp;
        <input type="checkbox" bind:checked={lightMode} /> 💡 Lights &emsp; ⛽
        gε {gasPrice}
      </div>
    </div>
    <div class="status-bar align-center">
      <span>
        {mask(eth(balance))} : {mask(fiat(Number(balance) * ethPrice))}
      </span>
      {#if balances.WETH}
        &emsp;/&emsp;
        <span>
          W{mask(eth(balances.WETH))} : {mask(
            fiat(Number(balances.WETH) * ethPrice)
          )}
        </span>
      {/if}
      &emsp;|&emsp;
      <span>
        <strong>ROI</strong>
        <span class:positive={totalRoi > 0} class:negative={totalRoi < 0}>
          {percentiple(totalRoi)}
        </span>
      </span>
      &emsp;|&emsp;
      <span>
        <strong>Value</strong>
        {mask(fiat(totalBalanceValue))}
      </span>
      &emsp;|&emsp;
      <span>
        <strong>Exit Value</strong>
        {mask(fiat(totalLiquidValue))}
      </span>
      &emsp;|&emsp;
      <span>
        <strong>Investment</strong>
        <span>{mask(fiat(totalInvestment))}</span>
      </span>
    </div>

    {#if !loading}
      <table class="data-table" cellpadding="10">
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
          {#each filteredTable || dataTable as item}
            <tr>
              <td valign="top" class="">
                <p class="slim" style="font-size: 15px">
                  <img
                    style="vertical-align: middle"
                    src={item.image}
                    width="20"
                    alt=""
                  />&emsp;<span>{item.name}</span>
                </p>
                <div class="flex">
                  <span class="bold">⬨ {item.symbol || item.address}</span>
                </div>
                <div class="flex" style="justify-content: space-between">
                  <div>
                    {fiat(item.numbers.currentPrice)}<br />
                    {#if item.numbers.currentPriceChange}
                      <small
                        class="change"
                        class:positive={item.numbers.currentPriceChange > 0}
                        class:negative={item.numbers.currentPriceChange < 0}
                      >
                        {percentiple(item.numbers.currentPriceChange)}
                      </small>
                    {/if}
                  </div>
                  <div>
                    ▴ <span style="min-width: 60px; display: inline-block;">
                      {fiat(item.numbers.currentMarketCap, "c")}</span
                    >
                    <br />
                    <small class="grey change">
                      ◌ {item.circSupply}
                    </small>
                  </div>
                </div>
              </td>
              <td align="right">
                <span
                  class="bold"
                  class:positive={item.isGain}
                  class:negative={!item.isGain}
                >
                  {item.roi}
                </span>
                <br />
                {#if item.numbers.holdings === 0}
                  <small class="grey change">
                    {item.unrealRoi}
                  </small>
                {/if}
              </td>
              <td align="right">{mask(item.holdings)}</td>
              <td align="right">
                {mask(fiat(item.numbers.currentValue))}
              </td>
              <td align="right">{item.share}</td>
              <td align="right">{mask(item.investment)}</td>
              <td align="right">{item.allocation}</td>
              <td>
                {#each item.actions as action}
                  <div
                    class="action-cell"
                    class:in={action.class.in}
                    class:out={action.class.out}
                  >
                    <p>
                      <span style="flex: 2">{action.time}</span>
                      <span style="flex: 1" class="symbol align-center">
                        {action.symbol}
                      </span>
                      <span style="flex: 3">
                        {mask(action.tx.decimalValue.toFixed(2))}
                        <br />
                        <small class="grey">
                          {fiat(action.price)} / {fiat(action.marketCap, "c")}
                        </small>
                      </span>
                    </p>
                  </div>
                {/each}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
    <!-- <div id="tb-audit">
      // EOA: assetSymbol === WEI => assetAddr === ethAddress
        <br />
        <div class="transaction-box">
          <small
            >(▲ <span class="bg-grey">? /</span>) <em>bN.tI</em> |
            <em>WEI:gCO*sP</em> | <em>ether</em>
          </small>
          <p>
            <em>statement[i]: (tIn || tOLG)</em> <em>symbol</em>
          </p>
        </div>
        {#each statements as tx}
          <div
            class="transaction-box"
            class:border-red={!tx.isError && tx.value && tx.statements[0].gasCostOut
              ? tx.value !== Number(tx.statements[0].totalOutLessGas)
              : false}
            class:grey={tx.isError}
          >
            {#if tx.logs.find((x) => x.name === "Approval" || x.name === "ApprovalForAll")}<hr
              />{/if}
            <small
              class:grey={!tx.statements[0].gasCostOut}
              class:bg-negative={tx.isError === 1}
              on:click={() => {
                let x = JSON.parse(JSON.stringify(tx));
                delete x.statements;
                console.log(x);
                alert(JSON.stringify(x, null, "    "));
              }}
              >{tx.from === ""
                ? "▲"
                : tx.to === ""
                ? "/"
                : "?"}&emsp;
              {tx.statements[0].blockNumber}.{tx.statements[0].transactionIndex} | ${(
                tx.statements[0].spotPrice *
                Number(tx.statements[0].gasCostOut) *
                Math.pow(10, -18)
              ).toFixed(3)} | {eth(tx.value * Math.pow(10, -18))}</small
            >
            {#each tx.statements as s}
              <p
                on:click={() => {
                  console.log(s);
                  alert(JSON.stringify(s, null, "    "));
                }}
                class:border-red={!tx.isError
                  ? trulyReconciled(s)[0] !== s.reconciled
                  : false}
                class:negative={!s.reconciled}
              >
                {"+" + Number(s.totalIn) * Math.pow(10, -18)} / {"-" +
                  Number(s.totalOutLessGas) * Math.pow(10, -18)}
                {s.assetSymbol === "WEI"
                  ? "ETH"
                  : s.assetAddr === WETH_CONTRACT_ADDRESS
                  ? "WETH"
                  : s.assetSymbol.slice(0, 2) !== "0x"
                  ? s.assetSymbol
                  : s.assetAddr.slice(0, 6)}
                <strong>{s.reconciliationType}</strong>

                {trulyReconciled(s)[1]} / {trulyReconciled(s)[2]} | {BigInt(
                  s.begBal
                ) + BigInt(s.totalIn)} / {BigInt(s.endBal) + BigInt(s.totalOut)}
              </p>
            {/each}
          </div>
        {/each}
    </div> -->
  </div>
  <footer class="text-center">
    <small>Served from SiaSky (DeFS)</small>
  </footer>
</body>

<style lang="scss">
  @import url("https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap");

  $primary: #fff;
  $background: #000;

  .bold {
    font-weight: 700;
  }

  .text-center {
    text-align: center;
  }

  .flex {
    display: flex;

    &.center {
      justify-content: center;
      align-items: center;
    }
  }

  .flex.j-center {
    justify-content: center;
  }

  .flex.a-center {
    justify-content: center;
  }

  .flex.row {
    flex-flow: row;
  }

  .flex.column {
    flex-flow: column;
  }

  .align-center {
    text-align: center;
  }

  //////

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
    background: rgba(139, 139, 139, 0.1);
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
      input,
      select,
      button,
      .button {
        background: transparent;
        color: #333;
        border: 1px solid #000;
      }

      button,
      input[type="submit"],
      .button {
        color: #000;
      }

      table {
        th {
          background: #eee;
        }
        tr {
          box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.1);
        }
        td {
          &:before {
            background-color: rgba(0, 0, 0, 0.1);
          }
        }
      }

      .positive {
        color: #059e03;
      }
    }
  }

  .transaction-box {
    min-width: 250px;
    display: inline-block;
    margin: 10px;
    padding: 10px;
    border: 1px solid #000;
    vertical-align: top;
    border-radius: 2px;
    p:hover {
      background-color: rgb(202, 255, 245);
    }
    small {
      font-weight: bold;
      background: #000;
      padding: 2px;
      color: #fff;
    }
  }

  .address-field {
    margin: 20px 0;
    input,
    button,
    label,
    select,
    .button {
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
      background: #111;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    tr {
      box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.1);
    }
    td {
      position: relative;
      &:before {
        content: "";
        width: 1px;
        background-color: rgba(255, 255, 255, 0.05);
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

  .bg-negative {
    background: #ff5959 !important;
    color: #fff !important;
  }

  .grey {
    opacity: 0.6;
  }

  .bg-grey {
    background-color: #666;
  }

  .border-red {
    border: 1px solid;
    border-color: #ff5959;
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
