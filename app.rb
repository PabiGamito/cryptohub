require "bundler/setup"
require "rubygems"
require "sinatra"
require 'sinatra/base'
require 'logger'
require "sinatra/activerecord"
require './config/environments' #database configuration


set :logging, true
  
@@logger = Logger.new('/tmp/cryptohub.log')

# avoids HTTP errors when adding rest-client gem caused by Rake
set :server, 'webrick'

enable :sessions

configure do
  set :views, "#{File.dirname(__FILE__)}/views"
  set :show_exceptions, :after_handler
end

configure :production, :development do
  enable :logging
end

helpers do
  require File.join File.dirname(__FILE__), "api-clients"

  def login?
    if session[:user_id].nil?
      return false
    else
      return true
    end
  end

  def user
    return User.find(session[:user_id])
  end

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

post "/signup" do
  password_salt = BCrypt::Engine.generate_salt
  password_hash = BCrypt::Engine.hash_secret(params[:password], password_salt)

  User.create(username: params[:username], email: params[:email], password_salt: password_salt, password_hash: password_hash)

  session[:user_id] = params[:user_id]
  redirect "/"
end

post "/login" do
  if User.exists?(email: params[:email_username])
    user = User.find_by(email: params[:email_username])
  elsif User.exists?(username: params[:email_username])
    user = User.find_by(username: params[:email_username])
  else
    return erb :error
  end

  if user.password_hash == BCrypt::Engine.hash_secret(params[:password], user.password_salt)
    session[:user_id] = user.id
    redirect "/"
  end
end

get "/logout" do
  session[:user_id] = nil
  redirect "/"
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