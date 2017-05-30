require 'rest-client'
require 'openssl'
require 'addressable/uri'
require 'json'
require 'date'

class Date
  def dayname
     DAYNAMES[self.wday]
  end

  def abbr_dayname
    ABBR_DAYNAMES[self.wday]
  end
end

@prices_data = {} # mon: {data_points: ..., total_price:..., times_lowest_of_the_week:}
@cryptocompare_api = RestClient::Resource.new( 'https://www.cryptocompare.com/api/data/' );
# https://min-api.cryptocompare.com/data/histoday?fsym=BTC&tsym=USD&limit=60&aggregate=3&e=CCCAGG

response = JSON.parse( @cryptocompare_api['histoday'].get params: {fsym: "BTC", tsym: "EUR", limit: 1994, e: "coinbase"} )

week_data = {}
@lowest_day_of_week_time = {} # how many time a day is lowest of the week

i = 0
response["Data"].each do |data|
  time = DateTime.strptime(data["time"].to_s,'%s')
  abbr_dayname = time.abbr_dayname
  dayname = time.dayname

  if @prices_data[abbr_dayname] == nil
    @prices_data[abbr_dayname] = {data_points: 0, total_price: 0, times_lowest_of_the_week: 0}
  end

  day_avg = (data["high"].to_f + data["low"].to_f)/2
  # day_avg = data["high"].to_f
  total_price = @prices_data[abbr_dayname][:total_price] + day_avg
  data_points = @prices_data[abbr_dayname][:data_points] + 1
  @prices_data[abbr_dayname] = {data_points: data_points, total_price: total_price, day_name: dayname}
  week_data[abbr_dayname] = day_avg

  # Check if it is the lowest of the week
  i += 1
  if i % 7 == 0
    lowest_day = nil
    lowest_day_price = Float::INFINITY
    week_data.each do |day_of_week, price|
      if price < lowest_day_price
        lowest_day = day_of_week
        lowest_day_price = price
      end
    end
    if @lowest_day_of_week_time[lowest_day] == nil
      @lowest_day_of_week_time[lowest_day] = 0
    end
    @lowest_day_of_week_time[lowest_day] += 1
    # reset week data
    week_data = {}
  end
end

# puts @total_price

lowest_day = nil
lowest_day_price = Float::INFINITY

puts "Average market prices of the past 1994 days are:"
sorted_prices_data = @prices_data.sort_by {|_key, value| value[:total_price]/value[:data_points]}.to_h
sorted_prices_data.each do |day_of_week, data|
  puts "#{day_of_week}: #{data[:total_price]/data[:data_points]}"
  if data[:total_price] < lowest_day_price
    lowest_day = data[:day_name]
    lowest_day_price = data[:total_price]
  end
end

puts "\n"

puts "Times day has been lowest day of the week:"
sorted_lowest_day_of_week_time = @lowest_day_of_week_time.sort_by {|_key, value| 0-value}.to_h
sorted_lowest_day_of_week_time.each do |day_of_week, times|
  puts "#{day_of_week}: #{times}"
end

puts "\n"

puts "Best day to buy based of 1994 last days is:"
puts lowest_day
