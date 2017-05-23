// TODO: Save all app data into IndexedDB to load faster, and check for updated values every once in a while
var historicalDataHash = {
  day: [],
  week: [],
  month: [],
  month3: [],
  month6: [],
  year: []
};

function coinHash(name, sym) {
  return jQuery.extend(true, {}, {
    sym: sym,
    name: name,
    price: 0, // price is alawys in BTC
    holding: 0,
    change: 0,
    changePercent: 0,
    historicalData: closeHash(historicalDataHash)
  });
}
function closeHash(hash) {
  return jQuery.extend(true, {}, hash);
}

var app = new Vue({
  el: '#app',
  data: {
    activeTimeFrame: 'day',
    balance: 0, // in BTC
    balanceAbsChange: 0, // Absolute change always in BTC
    balanceRelChange: 0, // Relative to selected currency
    activeCoin: "btc",
    currency: "usd",
    btcValueIn: {
      btc: {
        close: 1,
        open: 1,
      },
      usd: {
        close: 0,
        open: 0,
      },
      eur: {
        close: 0,
        open: 0,
      },
      cny: {
        close: 0,
        open: 0,
      }
    },
    btcChangeRelativeTo: {
      btc: 0,
      usd: 0,
      eur: 0,
      cny: 0
    },
    searchString: "",
    coins: {
      btc: coinHash("Bitcoin", "btc"),
      eth: coinHash("Ether", "eth"),
      xrp: coinHash("Ripple", "xrp"),
      xem: coinHash("NEM", "xem"),
      ltc: coinHash("Litecoin", "ltc"),
      etc: coinHash("Ether Classic", "etc"),
      dash: coinHash("Dash", "dash"),
      xlm: coinHash("Stellar", "xlm"),
      xmr: coinHash("Monero", "xmr"),
      bcn: coinHash("Bytecoin", "bcn"),
      maid: coinHash("MaidSafe Coin", "maid")
    },
    coinsSearchData: [
      // To be used and filled by filterCoins function
    ]
  },
  computed: {
    // A computed property that holds only those articles that match the searchString.
    filteredCoins: function () {
      var coinsSearchData = this.coinsSearchData,
        searchString = this.searchString;

      if(!coinsSearchData.length) {
        var keys = Object.keys(this.coins);
        for(var i in keys) {
            var coin = this.coins[keys[i]];
            coinsSearchData.push({
              sym: coin.sym,
              keyWords: [coin.sym, coin.name]
            });
        }
      }

      if(!searchString){
        return coinsSearchData;
      }

      searchString = searchString.trim().toLowerCase();
      var searchArray = searchString.split(" ");

      coinsSearchData = coinsSearchData.filter( function(coin) {
        var match = true;
        for (i = 0; i < searchArray.length; i++) {
          if (coin.keyWords.join().toLowerCase().indexOf(searchArray[i]) === -1) {
              match = false;
          }
        }
        if (match) {
          return coin;
        }
      });

      // Return an array with the filtered data.
      return coinsSearchData;
    }
  },
  methods: {
    initialize: function() {
      this.updateBalances();
      this.updateCurrencyConversionRates();

      if (!this.activeCoin) {
        this.makeActiveCoin(this.coins[0].sym);
      }
      $("#menu-bar ul li.coin").first().addClass("active");
      this.getCoinPrices();
      
      // TODO: Add historical price of btc to = 1 for all prices
      // var limit = 24;
      //   dataSet = "histohour";
      //   timeFrame = "day";
      // this.getHistoricalData(this.activeCoin, limit, dataSet, timeFrame);
    },

    makeActiveCoin: function(sym) {
      this.activeCoin = sym;
      $("#menu-bar ul li.coin.active").removeClass("active");
      $("#menu-bar ul li.coin." + sym).addClass("active");
      var limit = 24;
        dataSet = "histohour";
      this.updateChartPriceData(sym);
    },

    makeActiveTimeFrame: function(timeFrame) {
      // TODO: Replace graph with loading icon, to avoid confusion if graph doesn't load
      this.activeTimeFrame = timeFrame;
      $("#content nav.time-frame-menu ul li.active").removeClass("active");
      $("#content nav.time-frame-menu ul li." + timeFrame).addClass("active");
      this.updateChartPriceData(this.activeCoin);
    },

    changeCurrency: function(sym) {
      this.currency = sym;
      this.updateBalanceChange();
      // TODO: Get currency to BTC historical price to update graphs
    },

    getCoinPrices: function() {
      var syms = Object.keys(this.coins);
      for (var i = 0; i < syms.length; i++) {
        var sym = syms[i];
        this.updateCoinPrices(sym);
      }
    },

    updateCoinPrices: function(sym) {
      if (sym.toLowerCase() != "btc") {
        $.get({
          url: "https://www.cryptocompare.com/api/data/price",
          data: {
            e: "CCCAGG", // the exchange, CCCAGG = all exchanges avg
            fsym: sym.toUpperCase(),
            tsyms: "BTC"
          }
        }).done(function(response) {
          var coin = app.coins[sym];
          var data = response.Data[0];
          var price = data.Price;
          var open = data.Open24Hour;
          coin.price = price;
          coin.change = price/open - 1;
        });
      } else {
        coin.price = 1;
        coin.change = 0;
      }
    },


    updateCurrencyConversionRates: function() {
      var syms = Object.keys(this.btcValueIn);
      $.get( "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=" + syms.join(',').toUpperCase(), function( data ) {
        var syms = Object.keys(data);
        for (var i = 0; i < syms.length; i++) {
          var sym = syms[i];
          app.btcValueIn[sym.toLowerCase()][close] = data[sym];
        }
      });
      // TODO: Get timestamp from online source to be correct even if time is wrong on user device
      var ts = Math.round(new Date().getTime() / 1000);
      var tsYesterday = ts - (24 * 3600);
      $.get( "https://min-api.cryptocompare.com/data/pricehistorical?fsym=BTC&tsyms="+ syms.join(',').toUpperCase() + "&ts=" + tsYesterday, function( response ) {
        var data = response["BTC"];
        var syms = Object.keys(data);
        for (var i = 0; i < syms.length; i++) {
          var sym = syms[i];
          app.btcValueIn[sym.toLowerCase()][open] = data[sym];
        }
      });
    },

    updateBalances: function() {
      $.get( "/addresses", function( data ) {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var addresses = data[key];
          app.updateHoldingValue(key, addresses);
        }
      });
    },


    updateHoldingValue: function( sym, addresses ) {
      if (sym.toLowerCase() == "btc") {
        this.updateBTCHoldingValue(addresses);
      } else if (sym.toLowerCase() == "eth") {
        this.updateETHHoldingValue(addresses);
      }
    },


    updateBTCHoldingValue: function(addresses) {
      // %7C is url parsed '|' = divider between addresses
      $.get( "https://blockchain.info/q/addressbalance/" + addresses.join("%7C"), function( data ) {
        // returns value in satoshis | 1BTC = 100,000,000 satoshis
        var btcBalance = parseFloat(data)/100000000;
        var coin = app.coins["btc"];
        coin.holding = btcBalance;
        var updateTotalHoldings = function() {
          if (coin.price != 0) {
            app.balance += coin.holding * coin.price;
            app.updateBalanceAbsChange();
            app.updateBalanceRelChange();
          } else {
            setTimeout(function(){ updateTotalHoldings(); }, 100);
          }
        }
        updateTotalHoldings();
      });
    },


    updateETHHoldingValue: function(addresses) {
      $.get( "https://api.etherscan.io/api?module=account&action=balancemulti&address=" + addresses.join(","), function( data ) {
        // return value in wei | 1ETH = 1000000000000000000 Weis\
        var results = data["result"];
        ethBalance = 0.0;
        for (var i = 0; i < results.length; i++) {
          var account = results[i];
          ethBalance += parseFloat(account["balance"])/1000000000000000000;
        }
        var coin = app.coins["eth"];
        coin.holding = ethBalance;
        var updateTotalHoldings = function() {
          if (coin.price != 0) {
            app.balance += coin.holding * coin.price;
            app.updateBalanceAbsChange();
            app.updateBalanceRelChange();
          } else {
            setTimeout(function(){ updateTotalHoldings(); }, 100);
          }
        }
        updateTotalHoldings();
      });
    },

    updateTotalBalance: function() {
      var balance = 0;
      var syms = Object.keys(this.coins);
      for (var i = 0; i < syms.length; i++) {
        var sym = syms[i];
        var coin = this.coins[sym];
        balance += coin.holding * coin.price;
      }
      this.balance = balance;
    },

    updateBalanceChange: function() {
      updateBalanceAbsChange();
      updateBalanceRelChange();
    },

    updateBalanceAbsChange: function() {
      openValue = 0; // in BTC
      closeValue = 0; // in BTC
      var syms = Object.keys(this.coins);
      for (var i = 0; i < syms.length; i++) {
        var sym = syms[i];
        var coin = this.coins[sym];
        if (coin.holding !== 0) {
          coinCloseValue = coin.holding * coin.price;
          closeValue += coinCloseValue;
          openValue += coinCloseValue/(1+coin.change);
        }
      }
      var btcCloseValueInSelectedCurrency = this.btcValueIn[this.currency][close];
      var btcOpenValueInSelectedCurrency = this.btcValueIn[this.currency][open];
      this.balanceAbsChange = (closeValue*btcCloseValueInSelectedCurrency) - (openValue*btcOpenValueInSelectedCurrency); // in selected currency
    },

    updateBalanceRelChange: function() {
      var btcCloseValueInSelectedCurrency = this.btcValueIn[this.currency][close];
      var btcOpenValueInSelectedCurrency = this.btcValueIn[this.currency][open];
      var closeValue = this.balance * btcCloseValueInSelectedCurrency;
      var openValue = (this.balance * btcOpenValueInSelectedCurrency - this.balanceAbsChange); // this.balanceAbsChange is already in selected currency value
      this.balanceRelChange = closeValue/openValue - 1; // in selected currency
    },

    updateChartPriceData: function(sym) {
      coin = this.coins[sym];
      // TODO: Make is also update if price data is too old
      if (!coin.historicalData[this.activeTimeFrame].length) {
        var dataSet = null;
        var limit = null;
        switch (this.activeTimeFrame) {
          case "day":
            dataSet = "histohour";
            limit = 24;
            break;
          case "week":
            dataSet = "histohour";
            limit = 24*7;
            break;
          case "month":
            dataSet = "histoday";
            limit = 30;
            break;
          case "month3":
            dataSet = "histoday";
            limit = 30*3;
            break;
          case "month6":
            dataSet = "histoday";
            limit = 30*6;
            break;
          case "year":
            dataSet = "histoday";
            limit = 365;
            break;
        }
        this.getHistoricalData(sym, limit, dataSet, this.activeTimeFrame);
      } else {
        var data = this.coins[sym].historicalData[this.activeTimeFrame];
        priceData = [];
        for(i=0; i < data.length; i++) {
          priceData.push(data[i].close);
        }
        latestPricePointDate = data[0].time;
        firstPricePointDate = data[data.length-1].time;
        if (!animating) {
          animate();
        }
        ctx.clearRect(0, 0, c.width, c.height);
        renderCanvas();
        renderCanvas();
      }
    },


    getHistoricalData: function(sym, limit, dataSet, timeFrame) {
      if (sym.toLowerCase() == "btc") {
        this.coins[sym].price = 1;
      } else {
        $.get({
          url: "https://www.cryptocompare.com/api/data/" + dataSet + "/",
          data: {
            e: "CCCAGG", // the exchange, CCCAGG = all exchanges avg
            fsym: sym,
            tsym: "BTC",
            limit: limit
          }
        }).done(function(data) {
          if (data.Response === "Success") {
            data = data.Data;
            app.coins[sym].price = data[data.length-1].close;
            app.coins[sym].historicalData[timeFrame] = data;
            // if (timeFrame === "day") {
            //   app.coins[sym].change = (data[data.length-1].close * 1000000000 - data[0].open * 1000000000) / 1000000000;
            //   app.coins[sym].changePercent = ((data[data.length-1].close - data[0].open) / data[0].open) * 100;
            // }
            app.updateChartPriceData(sym);
          } else {
            setTimeout(function () {
              app.getHistoricalData(sym, limit, dataSet, timeFrame);
            }, 1000);
          }
        });
      }

    }
	}
});

app.initialize();
