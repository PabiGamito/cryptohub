# require 'rest-client'
# require 'openssl'
# require 'addressable/uri'
require 'json'

addresses_json_file = File.read('addresses.json')
Addresses = JSON.parse(addresses_json_file)

module Coinmarketcap

  def self.ticker
    JSON.parse( resource[ 'ticker' ].get )
  end

  def self.ticker( currency )
    JSON.parse( resource[ 'ticker' ][ currency ].get )[0]
  end

  protected

  def self.resource
    @@resouce ||= RestClient::Resource.new( 'https://api.coinmarketcap.com/v1/' )
  end

end

module Blockchain

  def self.address_balance(address)
    balance = resource[ 'addressbalance' ][ address ].get # returns value in satoshis | 1BTC = 100,000,000 satoshis
    return balance.to_f/100000000
  end

  def self.all_addresses_balance
    addresses = Addresses["btc"].join("%7C") # %7C is url parsed '|' = divider between addresses
    self.address_balance(addresses)
  end

  protected

  def self.resource
    @@resouce ||= RestClient::Resource.new( 'https://blockchain.info/q/' )
  end

end

module Etherscan

  def self.address_balance(addresses) # addresses should be a hash
    params = {}
    params[:module] = "account"
    params[:action] = "balancemulti"
    params[:address] = addresses.join(",")
    result = JSON.parse( resource.get params: params )["result"]
    # join all acount balances into one balance
    balance = 0
    result.each do |account|
      balance += account["balance"].to_i
    end
    return balance.to_f/1000000000000000000 # returns total balance in Ether
  end

  def self.all_addresses_balance
    self.address_balance(Addresses["eth"])
  end

  protected

  def self.resource
    @@resouce ||= RestClient::Resource.new( 'https://api.etherscan.io/api' )
  end

end

# TODO: Get price with simple ticker and then scan through all coins for desired one to avoid too many requests
# btc_price = Coinmarketcap.ticker("bitcoin")["price_usd"].to_f
# eth_price = Coinmarketcap.ticker("ethereum")["price_usd"].to_f
# puts "BALANCES:"
# btc_balance = Blockchain.all_addresses_balance
# eth_balance = Etherscan.all_addresses_balance
# puts "#{btc_balance} BTC"
# puts "#{eth_balance} ETH"
#
# total_value_usd = btc_price*btc_balance + eth_balance*eth_price
# puts "\nTOTAL VALUE:"
# puts "#{total_value_usd} USD"
