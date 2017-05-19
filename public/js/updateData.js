// GET HISTORICAL DATA FROM cryptocompare
// TODO: Replace all this by a signal query check the api info for how to do it. Allows for gettings all data at once to avoid ddossing the server with requests
function updatePrice(pair_id, price) {
  app.pairs[pair_id].price = price;
}

// BTCCHINA //
var socket = io ('https://websocket.btcc.com/');
socket.emit('subscribe', 'marketdata_cnybtc');
socket.on('ticker', function (data) { updatePrice("btc_cny_btcchina", parseFloat(data.ticker.last)); });

// OKCOIN //
// TODO: Figure out how to get it to work without API key

// POLONIEX //
var connection = new autobahn.Connection({url: 'wss://api.poloniex.com', realm: 'poloniex'});
connection.onopen = function (session) {
   // subscribe to a topic
   session.subscribe('ticker', onevent);
   // what to do when it received trade update data
   function onevent(args) {
     if (args[0] === "BTC_ETH") {
       updatePrice("eth_btc_poloniex", parseFloat(args[1]));
     }
   }
};
connection.open();
