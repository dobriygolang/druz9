-- Add circle_id to events (nullable — events can exist outside circles)
ALTER TABLE events
  ADD COLUMN circle_id UUID REFERENCES circles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_circle_id ON events(circle_id)
  WHERE circle_id IS NOT NULL;

-- Extend repeat_rule to support yearly
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_repeat_rule_check;

ALTER TABLE events
  ADD CONSTRAINT events_repeat_rule_check
  CHECK (repeat_rule IN ('none', 'daily', 'weekly', 'monthly', 'yearly'));
