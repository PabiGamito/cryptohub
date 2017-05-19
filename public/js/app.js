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
    owned: 0,
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
    activeNav: 'buy-options',
    activeTimeFrame: 'day',
    balance: 0,
    price: 0,
    searchString: "",
    activeCoin: "btc",
    currency: "usd",
    // TODO: Add btc_change relative to other currencies to update 24 change time to match selected currency
    btc_value_in: {
      btc: 1,
      usd: 0,
      eur: 0,
      cny: 0
    },
    coins: {
      btc: coinHash("Bitcoin", "btc"),
      eth: coinHash("Ethereum", "eth"),
      xrp: coinHash("Ripple", "xrp"),
      xem: coinHash("NEM", "xem"),
      ltc: coinHash("Litecoin", "ltc"),
      etc: coinHash("Etherum Classic", "etc"),
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
      $("#menu-open-bar ul li.coin").first().addClass("active");

      var limit = 24;
        dataSet = "histohour";
        timeFrame = "day";
      var keys = Object.keys(this.coins);
      for(var i in keys) {
          var coin = this.coins[keys[i]];
          this.getHistoricalData(coin.sym, limit, dataSet, timeFrame);
      }
    },


		makeActiveNav: function(item) {
			this.activeNav = item;
      $("nav#menu ul li.active").removeClass("active");
      $("nav#menu ul li." + item).addClass("active");
		},


    makeActiveCoin: function(sym) {
      this.activeCoin = sym;
      $("#menu-open-bar ul li.coin.active").removeClass("active");
      $("#menu-open-bar ul li.coin." + sym).addClass("active");
      this.updateChartPriceData(sym);
    },


    makeActiveTimeFrame: function(timeFrame) {
      this.activeTimeFrame = timeFrame;
      $("#content nav.time-frame-menu ul li.active").removeClass("active");
      $("#content nav.time-frame-menu ul li." + timeFrame).addClass("active");
      this.updateChartPriceData(this.activeCoin);
    },


    updateBalances: function() {
      $.get( "/addresses", function( data ) {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var addresses = data[key];
          app.getAddressesValue(key, addresses);
        }
      });
    },


    getAddressesValue: function( sym, addresses ) {
      if (sym.toLowerCase() == "btc") {
        this.getBtcAddressesValue(addresses);
      } else if (sym.toLowerCase() == "eth") {
        this.getEthAddressesValue(addresses);
      }
    },


    getBtcAddressesValue: function(addresses) {
      // %7C is url parsed '|' = divider between addresses
      $.get( "https://blockchain.info/q/addressbalance/" + addresses.join("%7C"), function( data ) {
        // returns value in satoshis | 1BTC = 100,000,000 satoshis
        var btcBalance = parseFloat(data)/100000000;
        app.coins["btc"].owned = btcBalance;
        app.updateTotalBalance();
      });
    },


    getEthAddressesValue: function(addresses) {
      $.get( "https://api.etherscan.io/api?module=account&action=balancemulti&address=" + addresses.join(","), function( data ) {
        // return value in wei | 1ETH = 1000000000000000000 Weis\
        var results = data["result"];
        ethBalance = 0.0;
        for (var i = 0; i < results.length; i++) {
          var account = results[i];
          ethBalance += parseFloat(account["balance"])/1000000000000000000;
        }
        app.coins["eth"].owned = ethBalance;
        app.updateTotalBalance();
      });
    },


    updateTotalBalance: function() {
      var balance = 0;
      var syms = Object.keys(this.coins);
      for (var i = 0; i < syms.length; i++) {
        var sym = syms[i];
        balance += this.coins[sym].owned;
      }
    },


    updateCurrencyConversionRates: function() {
      $.get( "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD,EUR,CNY", function( data ) {
        var syms = Object.keys(data);
        for (var i = 0; i < syms.length; i++) {
          var sym = syms[i];
          app.btc_value_in[sym.toLowerCase()] = data[sym];
        }
      });
    },


    updateChartPriceData: function(sym) {
      coin = this.coins[sym];
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
            if (timeFrame === "day") {
              app.coins[sym].change = (data[data.length-1].close * 1000000000 - data[0].open * 1000000000) / 1000000000;
              app.coins[sym].changePercent = ((data[data.length-1].close - data[0].open) / data[0].open) * 100;
            }
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
