-- ── Seed missing practice lead assignments ──
-- Migration 023 was updated after it had already run, so these leads were never inserted.

-- Francisco Contreras → Scrum/BA (Agile Management)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Francisco Contreras', 'francisco.contreras@unosquare.com', 'Scrum/BA', p.id
  FROM catalog_practices p WHERE p.name = 'Scrum/BA'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Francisco Contreras → Project Management (Agile Management, multi-practice)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Francisco Contreras', 'francisco.contreras@unosquare.com', 'Project Management', p.id
  FROM catalog_practices p WHERE p.name = 'Project Management'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Gabriel Amezquita → AI (Data & AI)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Gabriel Amezquita', 'gabriel.amezquita@unosquare.com', 'AI', p.id
  FROM catalog_practices p WHERE p.name = 'AI'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Luis Osuna → QA Automation (QA/SDET)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Luis Osuna', 'luis.osuna@unosquare.com', 'QA Automation', p.id
  FROM catalog_practices p WHERE p.name = 'QA Automation'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Luis Osuna → QA SDET (QA/SDET, multi-practice)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Luis Osuna', 'luis.osuna@unosquare.com', 'QA SDET', p.id
  FROM catalog_practices p WHERE p.name = 'QA SDET'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Olaf Lopez → Data (Data & AI, renamed from SQL)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Olaf Lopez', 'olaf.lopez@unosquare.com', 'Data', p.id
  FROM catalog_practices p WHERE p.name = 'Data'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Jade Davila → Design (Design)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Jade Davila', 'jade.davila@unosquare.com', 'Design', p.id
  FROM catalog_practices p WHERE p.name = 'Design'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Oscar Ruiz → Cloud (Cloud & Infrastructure)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Oscar Ruiz', 'oscar.ruiz@unosquare.com', 'Cloud', p.id
  FROM catalog_practices p WHERE p.name = 'Cloud'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Oscar Hernandez → ItOps (Cloud & Infrastructure, new practice)
INSERT OR IGNORE INTO coe_practice_leads (display_name, email, coe, practice_id)
  SELECT 'Oscar Hernandez', 'oscar.hernandez@unosquare.com', 'ItOps', p.id
  FROM catalog_practices p WHERE p.name = 'ItOps'
  AND NOT EXISTS (
    SELECT 1 FROM coe_practice_leads c
    WHERE c.practice_id = p.id
  );

-- Also ensure catalog restructuring from 023 is applied
-- Rename SQL → Data (idempotent — if already renamed, no-op)
UPDATE catalog_practices SET name = 'Data' WHERE name = 'SQL';

-- Add BI, ETL skills
INSERT OR IGNORE INTO catalog_skills (name) VALUES ('BI'), ('ETL');

-- Map BI and ETL to Data practice
INSERT OR IGNORE INTO catalog_practice_skills (practice_id, skill_id)
  SELECT p.id, s.id FROM catalog_practices p, catalog_skills s
  WHERE p.name = 'Data' AND s.name IN ('BI', 'ETL');

-- Create ItOps practice if not exists
INSERT OR IGNORE INTO catalog_practices (name) VALUES ('ItOps');

-- Map ItOps to Cloud & Infrastructure COE
INSERT OR IGNORE INTO catalog_coe_practices (coe_id, practice_id)
  SELECT c.id, p.id FROM catalog_coes c, catalog_practices p
  WHERE c.name = 'Cloud & Infrastructure' AND p.name = 'ItOps';
