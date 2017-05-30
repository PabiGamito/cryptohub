require 'rest-client'
require 'openssl'
require 'addressable/uri'
require 'json'

@cryptocompare_api = RestClient::Resource.new( 'https://www.cryptocompare.com/api/data/' );

# id=1182 //for BTC
# id=3808 //for LTC
# id=7605//for ETH
# get IDs from: https://www.cryptocompare.com/api/data/coinlist/

@coins = {
  eth: {
    sym: "ETH",
    name: "Ethereum",
    id: 7605,
    hashrate: 10*10**6
  },
  etc: {
    sym: "ETC",
    name: "Ethereum classic",
    id: 5324,
    hashrate: 12*10**6
  },
  zec: {
    sym: "ZEC",
    name: "Zcash",
    id: 24854,
    hashrate: 160
  },
  sc: {
    sym: "SC",
    name: "Siacoin",
    id: 13072,
    hashrate: 800
  }
}

def getCoinPrice(sym)
  response = JSON.parse( @cryptocompare_api['price'].get params: {fsym: sym, tsyms: "BTC"} )
  if response["Response"] == "Success"
    return response["Data"][0]["Price"].to_f
  else
    return getCoinPrice(sym)
  end
end

def getRewardPerDay(coin)
  response = @cryptocompare_api['coinsnapshotfullbyid'].get params: {id: coin[:id]}
  response = JSON.parse(response)
  if response["Response"] == "Success"
    data = response["Data"]["General"]
    block_reward = data["BlockReward"].to_f
    net_hash_rate = data["NetHashesPerSecond"].to_f
    block_time = data["BlockTime"].to_f
    to_btc_price = getCoinPrice(coin[:sym])
    difficulty = 4295032833.0 * net_hash_rate
    seconds = 24*60*60
    userHash = 10*10**6

    hr = userHash/net_hash_rate
    emission = block_reward*86400/block_time
    coins = hr * emission
    return reward_day = coins * to_btc_price
  else
    puts "Unsuccessful request: #{response}"
    sleep(1)
    return getRewardPerDay(id)
  end
end

i = 0
@coins.each do |sym, data|
  @coins[sym][:reward] = getRewardPerDay(@coins[sym])
  i += 1
end

puts @coins
