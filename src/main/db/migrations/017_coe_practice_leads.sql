CREATE TABLE IF NOT EXISTS coe_practice_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  coe TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe) VALUES
  ('Luis Naranjo',        'luis.naranjo@unosquare.com',        ''),
  ('Braulio Hernandez',   'braulio.hernandez@unosquare.com',   ''),
  ('Emmanuel Huitrado',   'emmanuel.huitrado@unosquare.com',    '');
