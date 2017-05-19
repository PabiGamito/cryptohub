require "rubygems"
require "bundler/setup"
require 'rest-client'
require "sinatra"

# avoids HTTP errors when adding rest-client gem caused by Rake
set :server, 'webrick'

configure do
  set :views, "#{File.dirname(__FILE__)}/views"
  set :show_exceptions, :after_handler
end

configure :production, :development do
  enable :logging
end

helpers do
  require File.join File.dirname(__FILE__), "api-clients"

  def btc_balance
    Blockchain.all_addresses_balance
  end

  def eth_balance
    Etherscan.all_addresses_balance
  end

end

# root page
get "/" do
  @address = Addresses
  erb :root
end

# return total asset balance value
get "/get-total-balance-value" do
  btc_price = Coinmarketcap.ticker("bitcoin")["price_usd"].to_f
  eth_price = Coinmarketcap.ticker("ethereum")["price_usd"].to_f

  total_value_usd = btc_balance*btc_price + eth_balance*eth_price
  return total_value_usd.to_s
end

get "/addresses" do
  content_type :json
  Addresses.to_json
end

# return bitcoin balance value
get "/btc-balance" do
  return btc_balance.to_s
end

# return ethereum balance value
get "/eth-balance" do
  return eth_balance.to_s
end

# initialize all past transactions
post "/initialize-history" do

end
