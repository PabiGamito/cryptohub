class CreateWallet < ActiveRecord::Migration[5.1]
  def change
    create_table :wallets do |t|
      t.integer :user_id
      t.string :address
      t.string :coin_sym
    end
  end
end
