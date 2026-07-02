-- Centers of Excellence
CREATE TABLE IF NOT EXISTS catalog_coes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Practices
CREATE TABLE IF NOT EXISTS catalog_practices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Skills
CREATE TABLE IF NOT EXISTS catalog_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Junction: COE ↔ Practice (many-to-many)
CREATE TABLE IF NOT EXISTS catalog_coe_practices (
  coe_id INTEGER NOT NULL,
  practice_id INTEGER NOT NULL,
  PRIMARY KEY (coe_id, practice_id),
  FOREIGN KEY (coe_id) REFERENCES catalog_coes(id) ON DELETE CASCADE,
  FOREIGN KEY (practice_id) REFERENCES catalog_practices(id) ON DELETE RESTRICT
);

-- Junction: Practice ↔ Skill (many-to-many)
CREATE TABLE IF NOT EXISTS catalog_practice_skills (
  practice_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  PRIMARY KEY (practice_id, skill_id),
  FOREIGN KEY (practice_id) REFERENCES catalog_practices(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES catalog_skills(id) ON DELETE RESTRICT
);

-- ── Seed: Skills (28 rows) ──
INSERT OR IGNORE INTO catalog_skills (name) VALUES
  ('C# / .NET'), ('React'), ('Angular'), ('Vue'), ('Node.js'), ('Go'),
  ('Ruby'), ('Python'), ('Java'),
  ('MAUI'), ('OutSystems'), ('VB'), ('Salesforce Developer'), ('Salesforce Admin'),
  ('iOS'), ('Android'), ('React Native'), ('Elixir'), ('Flutter'),
  ('Cloud'), ('QA SDET'), ('QA Automation'), ('SQL'), ('AI'),
  ('BA'), ('Scrum'), ('Project Manager'), ('Design');

-- ── Seed: Practices (14 rows) ──
INSERT OR IGNORE INTO catalog_practices (name) VALUES
  ('.NET'), ('JavaScript'), ('Ruby'), ('Python'), ('Java'), ('Niche'),
  ('Cloud'), ('QA SDET'), ('QA Automation'), ('SQL'), ('AI'),
  ('Scrum/BA'), ('Project Management'), ('Design');

-- ── Seed: COEs (6 rows) ──
INSERT OR IGNORE INTO catalog_coes (name) VALUES
  ('Software Engineering'), ('Cloud & Infrastructure'), ('QA/SDET'),
  ('Data & AI'), ('Agile Management'), ('Design');

-- ── Seed: COE ↔ Practice mappings (14 rows) ──
INSERT OR IGNORE INTO catalog_coe_practices (coe_id, practice_id)
  SELECT c.id, p.id FROM catalog_coes c, catalog_practices p
  WHERE (c.name, p.name) IN (
    ('Software Engineering', '.NET'),
    ('Software Engineering', 'JavaScript'),
    ('Software Engineering', 'Ruby'),
    ('Software Engineering', 'Python'),
    ('Software Engineering', 'Java'),
    ('Software Engineering', 'Niche'),
    ('Cloud & Infrastructure', 'Cloud'),
    ('QA/SDET', 'QA SDET'),
    ('QA/SDET', 'QA Automation'),
    ('Data & AI', 'SQL'),
    ('Data & AI', 'AI'),
    ('Agile Management', 'Scrum/BA'),
    ('Agile Management', 'Project Management'),
    ('Design', 'Design')
  );

-- ── Seed: Practice ↔ Skill mappings (28 rows) ──
INSERT OR IGNORE INTO catalog_practice_skills (practice_id, skill_id)
  SELECT p.id, s.id FROM catalog_practices p, catalog_skills s
  WHERE (p.name, s.name) IN (
    ('.NET', 'C# / .NET'),
    ('JavaScript', 'React'),
    ('JavaScript', 'Angular'),
    ('JavaScript', 'Vue'),
    ('JavaScript', 'Node.js'),
    ('JavaScript', 'Go'),
    ('Ruby', 'Ruby'),
    ('Python', 'Python'),
    ('Java', 'Java'),
    ('Niche', 'MAUI'),
    ('Niche', 'OutSystems'),
    ('Niche', 'VB'),
    ('Niche', 'Salesforce Developer'),
    ('Niche', 'Salesforce Admin'),
    ('Niche', 'iOS'),
    ('Niche', 'Android'),
    ('Niche', 'React Native'),
    ('Niche', 'Elixir'),
    ('Niche', 'Flutter'),
    ('Cloud', 'Cloud'),
    ('QA SDET', 'QA SDET'),
    ('QA Automation', 'QA Automation'),
    ('SQL', 'SQL'),
    ('AI', 'AI'),
    ('Scrum/BA', 'BA'),
    ('Scrum/BA', 'Scrum'),
    ('Project Management', 'Project Manager'),
    ('Design', 'Design')
  );
