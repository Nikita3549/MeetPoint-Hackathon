CREATE OR REPLACE FUNCTION generate_temp_event_slug() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  lengths INT[] := ARRAY[3, 4, 3];
  i INT;
  j INT;
  seg TEXT;
  len INT;
BEGIN
  FOR i IN 1..3 LOOP
    len := lengths[i];
    seg := '';
    FOR j IN 1..len LOOP
      seg := seg || substr(chars, 1 + floor(random() * 26)::INT, 1);
    END LOOP;
    IF i > 1 THEN
      result := result || '-';
    END IF;
    result := result || seg;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE "events" ADD COLUMN "slug" TEXT;

UPDATE "events"
SET "slug" = generate_temp_event_slug()
WHERE "slug" IS NULL;

DROP FUNCTION generate_temp_event_slug();

CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

ALTER TABLE "events" ALTER COLUMN "slug" SET NOT NULL;
