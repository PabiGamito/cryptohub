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
    open: 0,
    change: 0,
    changePercent: 0,
    changeInSelectedCurrency: 0,
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
        historicalData: {

        }
      },
      usd: {
        close: 0,
        open: 0,
        historicalData: closeHash(historicalDataHash)
      },
      eur: {
        close: 0,
        open: 0,
        historicalData: closeHash(historicalDataHash)
      },
      cny: {
        close: 0,
        open: 0,
        historicalData: closeHash(historicalDataHash)
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
      sc: coinHash("Siacoin", "sc"),
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
      if (!this.activeCoin) {
        this.makeActiveCoin(this.coins[0].sym);
      }
      // Activate first coin
      // TODO: Make it activate another coin if selected coin is not first in coins list
      $("#menu-bar ul li.coin").first().addClass("active");

      this.refresh();
    },

    refresh: function() {
      this.updateBalances();
      this.updateCurrencyConversionRates();
      this.getCoinPrices();
      this.updateChartPriceData(this.activeCoin);
      this.updateChangeInSelectedCurrencyValues();
      setTimeout(function(){ this.refresh() }, 60*1000); // Refresh every 1min
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
      this.updateChangeInSelectedCurrencyValues();
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
          console.log("updateCoinPrices: updating coin price " + sym);
          var coin = app.coins[sym];
          var data = response.Data[0];
          var price = data.Price;
          var open = data.Open24Hour;
          coin.price = price;
          coin.open = open;
          coin.change = price/open - 1;
        });
      } else {
        // For BTC pair
        coin.price = 1;
        coin.open = 1;
        coin.change = 0;
      }
    },


    updateCurrencyConversionRates: function() {
      var syms = Object.keys(this.btcValueIn);
      $.get({
        url: "https://www.cryptocompare.com/api/data/price",
        data: {
          e: "CCCAGG", // the exchange, CCCAGG = all exchanges avg
          fsym: "BTC",
          tsyms: syms.join(',').toUpperCase()
        }
      }).done(function(response) {
        if (response["Response"] == "Success") {
          var data = response["Data"];
          console.log("updateCurrencyConversionRates: Updating currency conversion rates");
          for (var i = 0; i < data.length; i++) {
            var curData = data[i];
            var sym = curData["Symbol"].toLowerCase();
            app.btcValueIn[sym].close = curData["Price"];
            app.btcValueIn[sym].open = curData["Open24Hour"];
          }
        } else {
          console.log("updateCurrencyConversionRates: Failed to get currency conversion rates");
          updateCurrencyConversionRates();
        }

      });
      // $.get( "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=" + syms.join(',').toUpperCase() + "&extraParams=cryptohub", function( data ) {
      //   var syms = Object.keys(data);
      //   for (var i = 0; i < syms.length; i++) {
      //     var sym = syms[i];
      //     app.btcValueIn[sym.toLowerCase()].close = data[sym];
      //   }
      // });
      // // TODO: Get timestamp from online source to be correct even if time is wrong on user device
      // var ts = Math.round(new Date().getTime() / 1000);
      // var tsYesterday = ts - (24 * 3600);
      // $.get( "https://min-api.cryptocompare.com/data/pricehistorical?fsym=BTC&tsyms="+ syms.join(',').toUpperCase() + "&ts=" + tsYesterday + "&extraParams=cryptohub", function( response ) {
      //   var data = response["BTC"];
      //   var syms = Object.keys(data);
      //   for (var i = 0; i < syms.length; i++) {
      //     var sym = syms[i];
      //     app.btcValueIn[sym.toLowerCase()].open = data[sym];
      //   }
      //
      // });
    },


    updateCurrencyConversionHistoricalData: function(dataSet) {
      // dataSet = "histominute" or "histohour" or "histoday"
      this.getHistoricalData("BTC", this.currency.toUpperCase(), dataSet);
    },

    updateChangeInSelectedCurrencyValues: function () {
      var coinSyms = Object.keys(this.coins);
      for (var i = 0; i < coinSyms.length; i++) {
        var coin = this.coins[coinSyms[i]];
        this.updateChangeInSelectedCurrency(coinSyms[i]);
      }
    },

    updateChangeInSelectedCurrency: function (sym) {
      // TODO: Figure out why this isn't working
      var coin = this.coins[sym];
      var btcCloseValueInSelectedCurrency = this.btcValueIn[this.currency].close;
      var btcOpenValueInSelectedCurrency = this.btcValueIn[this.currency].open;
      if (coin.price == 0 || btcCloseValueInSelectedCurrency == 0 || btcOpenValueInSelectedCurrency == 0) {
        console.log("updateChangeInSelectedCurrency: Waiting for values to not be null");
        setTimeout(function() {app.updateChangeInSelectedCurrency(sym);}, 250);
      } else {
        console.log("updateChangeInSelectedCurrency: updating coin " + coin.sym + " change in selected currency");
        var closeValue = coin.price * btcCloseValueInSelectedCurrency;
        var openValue = coin.open * btcOpenValueInSelectedCurrency;
        console.log(coin.sym + " closed: " + closeValue);
        console.log(coin.sym + " opened:" + openValue);
        var changeInSelectedCurrency = closeValue/openValue - 1; // in selected currency
        coin.changeInSelectedCurrency = changeInSelectedCurrency;
      }

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
      var btcCloseValueInSelectedCurrency = this.btcValueIn[this.currency].close;
      var btcOpenValueInSelectedCurrency = this.btcValueIn[this.currency].open;
      this.balanceAbsChange = (closeValue*btcCloseValueInSelectedCurrency) - (openValue*btcOpenValueInSelectedCurrency); // in selected currency
    },

    updateBalanceRelChange: function() {
      var btcCloseValueInSelectedCurrency = this.btcValueIn[this.currency].close;
      var btcOpenValueInSelectedCurrency = this.btcValueIn[this.currency].open;
      var closeValue = this.balance * btcCloseValueInSelectedCurrency;
      var openValue = (this.balance * btcOpenValueInSelectedCurrency - this.balanceAbsChange); // this.balanceAbsChange is already in selected currency value
      this.balanceRelChange = closeValue/openValue - 1; // in selected currency
    },

    updateChartPriceData: function(sym) {
      // TODO: Make it also update if price data is too old
      // TODO: Make data getting more efficient instead of making a call for each time period only make on call and update time periods with relavent data
      // TODO: Add loading symbol while data is loading

      if (!this.coins[sym].historicalData[this.activeTimeFrame].length || !this.btcValueIn[this.currency].historicalData[this.activeTimeFrame].length) {
        var dataSet = null;
        switch (this.activeTimeFrame) {
          case "day":
            dataSet = "histominute";
            break;
          case "week":
            // update week and month values in on req
            dataSet = "histohour";
            break;
          case "month":
            // update week and month values in on req
            dataSet = "histohour";
            break;
          case "month3":
            // update month3, month6 and year values in on req
            dataSet = "histoday";
            break;
          case "month6":
            // update month3, month6 and year values in on req
            dataSet = "histoday";
            break;
          case "year":
            // update month3, month6 and year values in on req
            dataSet = "histoday";
            break;
        }

        if (!this.btcValueIn[this.currency].historicalData[this.activeTimeFrame].length) {
          console.log("updateChartPriceData: getting historical data for active currency conversion");
          this.updateCurrencyConversionHistoricalData(dataSet);
        }
        if (!this.coins[sym].historicalData[this.activeTimeFrame].length) {
          console.log("updateChartPriceData: getting historical data for active pair");
          this.getHistoricalData(sym, "BTC", dataSet);
        }

      } else {
        console.log("updateChartPriceData: updating graph");
        var data = this.coins[sym].historicalData[this.activeTimeFrame];
        var conversionHistoricalPrice = this.btcValueIn[this.currency].historicalData[this.activeTimeFrame];
        priceData = [];
        for(i=0; i < data.length; i++) {
          conversionPrice = conversionHistoricalPrice[i].close;
          priceData.push(data[i].close*conversionPrice);
        }
        latestPricePointDate = data[0].time;
        firstPricePointDate = data[data.length-1].time;
        if (!animating) {
          animate();
        }
        ctx.clearRect(0, 0, c.width, c.height);
        renderCanvas();
      }
    },

    dataToKeep: function(data) {
      // Only keep between 90 & 180 data points
      var delta = Math.floor(data.length/90);
      var keptData = [];
      for( var i = data.length-1; i >= 0; i-=delta) {
        keptData.unshift(data[i]);
      }
      return keptData;
    },

    getHistoricalData: function(fsym, tsym, dataSet) {
      var limits = null;
      if (fsym.toLowerCase() == "btc" && tsym.toLowerCase() == "btc") {
        // README: Keep limits upto date with limit in "else" condition to keep app working
        limits = {
          day: 1440,
          week: 24*7,
          month: 24*30,
          month3: 30*3,
          month6: 30*6,
          year: 365
        };
        timeFrames = Object.keys(limits);
        console.log("getHistoricalData: updating coin historicalData (BTC)");
        for (var i = 0; i < timeFrames.length; i++) {
          timeFrame = timeFrames[i];
          limit = limits[timeFrame];
          var data = [];
          for(t = 0; t < limit; t++){
            data.push({
              close: 1,
              high: 1,
              low: 1,
              open: 1
              // TODO: Find a way to add this data
              // time: ?,
              // volumefrom: ?, // need to be taken from BTC to USD
              // volumeto: ?// need to be taken from BTC to USD
            });
          }
          var keptData = this.dataToKeep(data);
          this.coins[fsym].historicalData[timeFrame] = keptData;
        }
        this.coins[fsym].price = 1;
        this.updateChartPriceData(fsym);

      } else {
        var attempts = 0;
        var getLimit = null;
        switch (dataSet) {
          case "histominute":
            dataSet = "histominute";
            getLimit = 1440;
            limits = {
              day: 1440
            };
            break;
          case "histohour":
            // update week and month values on req
            dataSet = "histohour";
            getLimit = 24*30;
            limits = {
              week: 24*7,
              month: 24*30
            };
            break;
          case "histoday":
            // update month3 and month6 and year values on req
            dataSet = "histoday";
            getLimit = 365;
            limits = {
              month3: 30*3,
              month6: 30*6,
              year: 365
            };
            break;
        }
        $.get({
          url: "https://www.cryptocompare.com/api/data/" + dataSet + "/",
          data: {
            e: "CCCAGG", // the exchange, CCCAGG = all exchanges avg
            fsym: fsym,
            tsym: tsym,
            limit: getLimit,
            extraParams: "cryptohub"
          }
        }).done(function(data) {
          if (data.Response === "Success") {
            data = data.Data;
            // Update latest price
            var close = data[data.length-1].close;
            if (tsym.toLowerCase() == "btc") {
              app.coins[fsym].price = close;
            } else if (fsym.toLowerCase() == "btc") {
              // it's a request to update currency conversion history
              app.btcValueIn[tsym.toLowerCase()].close = close;
            }
            // Store historical price data into application variable
            timeFrames = Object.keys(limits);
            console.log("getHistoricalData: updating coin historicalData");
            for (var i = 0; i < timeFrames.length; i++) {
              var timeFrame = timeFrames[i];
              var limit = limits[timeFrame];
              var keptData = app.dataToKeep(data.slice(0-limit));
              if (tsym.toLowerCase() == "btc") {
                app.coins[fsym].historicalData[timeFrame] = keptData;
              } else {
                // it's a request to update currency conversion history
                console.log("getHistoricalData: updating currency conversion historicalData");
                app.btcValueIn[tsym.toLowerCase()].historicalData[timeFrame] = keptData;
              }

            }
            if (tsym.toLowerCase() == "btc") {
              app.updateChartPriceData(fsym);
            } else {
              app.updateChartPriceData(app.activeCoin);
            }
          } else if (attempts < 3) {
            attempts += 1;
            setTimeout(function () {
              app.getHistoricalData(fsym, tsym, dataSet);
            }, 1000);
          }
        });
      }

    }


	}
});

app.initialize();
