-- Add character_id to outfits table so outfits can belong to a character
ALTER TABLE outfits 
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_outfits_character_id ON outfits(character_id);
