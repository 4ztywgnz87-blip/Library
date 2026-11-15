-- Gift-givers sign in to the wishlist with their email, so they can change a reservation from any device
ALTER TABLE wish_claims ADD COLUMN email TEXT;
-- The name the wishlist is shown under ("Kels's little wishlist")
ALTER TABLE wish_shares ADD COLUMN name TEXT;
