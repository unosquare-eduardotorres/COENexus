-- ── Step 1: Rebuild table — drop email UNIQUE, add practice_id FK ──
CREATE TABLE IF NOT EXISTS coe_practice_leads_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  coe TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  practice_id INTEGER REFERENCES catalog_practices(id)
);

INSERT INTO coe_practice_leads_new (id, display_name, email, coe, active)
  SELECT id, display_name, email, coe, active FROM coe_practice_leads;

DROP TABLE coe_practice_leads;
ALTER TABLE coe_practice_leads_new RENAME TO coe_practice_leads;

-- One lead per practice (but one lead CAN own multiple practices via multiple rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cpl_practice_unique
  ON coe_practice_leads(practice_id) WHERE practice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cpl_email
  ON coe_practice_leads(email);

-- ── Step 2: Backfill practice_id from existing coe text column ──
UPDATE coe_practice_leads
SET practice_id = (
  SELECT cp.id FROM catalog_practices cp WHERE cp.name = coe_practice_leads.coe
)
WHERE coe != '' AND practice_id IS NULL;

-- ── Step 2b: Catalog restructuring ──

-- Rename SQL practice → Data (encompasses SQL, BI, ETL)
UPDATE catalog_practices SET name = 'Data' WHERE name = 'SQL';

-- Add new skills: BI, ETL
INSERT OR IGNORE INTO catalog_skills (name) VALUES ('BI'), ('ETL');

-- Map BI and ETL skills to the Data practice
INSERT OR IGNORE INTO catalog_practice_skills (practice_id, skill_id)
  SELECT p.id, s.id FROM catalog_practices p, catalog_skills s
  WHERE p.name = 'Data' AND s.name IN ('BI', 'ETL');

-- Create new ItOps practice
INSERT OR IGNORE INTO catalog_practices (name) VALUES ('ItOps');

-- Map ItOps to Cloud & Infrastructure COE
INSERT OR IGNORE INTO catalog_coe_practices (coe_id, practice_id)
  SELECT c.id, p.id FROM catalog_coes c, catalog_practices p
  WHERE c.name = 'Cloud & Infrastructure' AND p.name = 'ItOps';

-- ── Step 3: Seed complete practice lead assignments ──
-- Luis Naranjo → JavaScript practice
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Luis Naranjo', 'luis.naranjo@unosquare.com', 'JavaScript', p.id
  FROM catalog_practices p WHERE p.name = 'JavaScript'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'luis.naranjo@unosquare.com' AND c.practice_id = p.id
  );

-- Emmanuel Huitrado → Java practice
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Emmanuel Huitrado', 'emmanuel.huitrado@unosquare.com', 'Java', p.id
  FROM catalog_practices p WHERE p.name = 'Java'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'emmanuel.huitrado@unosquare.com' AND c.practice_id = p.id
  );

-- Emmanuel Huitrado → Python practice (multi-practice lead)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Emmanuel Huitrado', 'emmanuel.huitrado@unosquare.com', 'Python', p.id
  FROM catalog_practices p WHERE p.name = 'Python'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'emmanuel.huitrado@unosquare.com' AND c.practice_id = p.id
  );

-- Braulio Hernandez → .NET practice
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Braulio Hernandez', 'braulio.hernandez@unosquare.com', '.NET', p.id
  FROM catalog_practices p WHERE p.name = '.NET'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'braulio.hernandez@unosquare.com' AND c.practice_id = p.id
  );

-- JD Warren → Ruby (already has coe='Ruby', just ensure practice_id is set)
-- Eduardo Torres → Niche (already has coe='Niche', just ensure practice_id is set)
-- Both handled by Step 2 backfill above.

-- Francisco Contreras → Scrum/BA (Agile Management)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Francisco Contreras', 'francisco.contreras@unosquare.com', 'Scrum/BA', p.id
  FROM catalog_practices p WHERE p.name = 'Scrum/BA'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'francisco.contreras@unosquare.com' AND c.practice_id = p.id
  );

-- Francisco Contreras → Project Management (Agile Management, multi-practice)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Francisco Contreras', 'francisco.contreras@unosquare.com', 'Project Management', p.id
  FROM catalog_practices p WHERE p.name = 'Project Management'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'francisco.contreras@unosquare.com' AND c.practice_id = p.id
  );

-- Gabriel Amezquita → AI (Data & AI)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Gabriel Amezquita', 'gabriel.amezquita@unosquare.com', 'AI', p.id
  FROM catalog_practices p WHERE p.name = 'AI'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'gabriel.amezquita@unosquare.com' AND c.practice_id = p.id
  );

-- Luis Osuna → QA Automation (QA/SDET)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Luis Osuna', 'luis.osuna@unosquare.com', 'QA Automation', p.id
  FROM catalog_practices p WHERE p.name = 'QA Automation'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'luis.osuna@unosquare.com' AND c.practice_id = p.id
  );

-- Luis Osuna → QA SDET (QA/SDET, multi-practice)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Luis Osuna', 'luis.osuna@unosquare.com', 'QA SDET', p.id
  FROM catalog_practices p WHERE p.name = 'QA SDET'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'luis.osuna@unosquare.com' AND c.practice_id = p.id
  );

-- Olaf Lopez → Data (Data & AI, renamed from SQL)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Olaf Lopez', 'olaf.lopez@unosquare.com', 'Data', p.id
  FROM catalog_practices p WHERE p.name = 'Data'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'olaf.lopez@unosquare.com' AND c.practice_id = p.id
  );

-- Jade Davila → Design (Design)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Jade Davila', 'jade.davila@unosquare.com', 'Design', p.id
  FROM catalog_practices p WHERE p.name = 'Design'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'jade.davila@unosquare.com' AND c.practice_id = p.id
  );

-- Oscar Ruiz → Cloud (Cloud & Infrastructure)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Oscar Ruiz', 'oscar.ruiz@unosquare.com', 'Cloud', p.id
  FROM catalog_practices p WHERE p.name = 'Cloud'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'oscar.ruiz@unosquare.com' AND c.practice_id = p.id
  );

-- Oscar Hernandez → ItOps (Cloud & Infrastructure, new practice)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Oscar Hernandez', 'oscar.hernandez@unosquare.com', 'ItOps', p.id
  FROM catalog_practices p WHERE p.name = 'ItOps'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.email = 'oscar.hernandez@unosquare.com' AND c.practice_id = p.id
  );
