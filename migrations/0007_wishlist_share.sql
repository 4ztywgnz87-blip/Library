-- The secret link to her wishlist, and the gifts people have quietly reserved from it
CREATE TABLE wish_shares (
  token TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE wish_claims (
  token TEXT NOT NULL,
  book_id TEXT NOT NULL,
  name TEXT NOT NULL,
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (token, book_id)
);
