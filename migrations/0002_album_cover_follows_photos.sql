-- An album's cover is one of its photos: `cover_key` is that photo's `r2_key`,
-- or null for the first photo (the public API picks it, so a new order shows
-- at once). When the cover photo is deleted, moved to another album or gets
-- another file, the album goes back to its first photo.

-- A cover that is no photo of its album (uploaded before) goes the same way.
UPDATE album SET cover_key = NULL
WHERE cover_key IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM photo WHERE album_id = album.id AND r2_key = album.cover_key
);

CREATE TRIGGER photo_delete_clears_cover AFTER DELETE ON photo
BEGIN
  UPDATE album SET cover_key = NULL
  WHERE id = OLD.album_id AND cover_key = OLD.r2_key;
END;

-- PATCH writes every column, changed or not.
CREATE TRIGGER photo_update_clears_cover AFTER UPDATE OF album_id, r2_key ON photo
WHEN OLD.album_id <> NEW.album_id OR OLD.r2_key <> NEW.r2_key
BEGIN
  UPDATE album SET cover_key = NULL
  WHERE id = OLD.album_id AND cover_key = OLD.r2_key;
END;
