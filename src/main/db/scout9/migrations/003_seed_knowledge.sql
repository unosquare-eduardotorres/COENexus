-- Migration 003: Seed glossary, business rules, and initial system prompt

INSERT OR IGNORE INTO knowledge_glossary (id, term, definition, synonyms) VALUES
  (lower(hex(randomblob(16))), 'COE', 'Center of Excellence — organizational unit managing specialized talent pools', 'Center of Excellence'),
  (lower(hex(randomblob(16))), 'CGX', 'Client Growth Executive — account owner responsible for client relationship', 'Client Growth Exec'),
  (lower(hex(randomblob(16))), 'CSU', 'Client Services Unit — delivery team assigned to a client account', ''),
  (lower(hex(randomblob(16))), 'CS', 'Client Stakeholder — primary client contact for hiring decisions', ''),
  (lower(hex(randomblob(16))), 'Bench', 'Employee currently unassigned to a billable project', 'unassigned, available'),
  (lower(hex(randomblob(16))), 'Aging', 'Number of days a position has been open since creation', 'days open'),
  (lower(hex(randomblob(16))), 'Stalled', 'Position open 30+ days without new candidate presentations', ''),
  (lower(hex(randomblob(16))), 'Vertical', 'Industry vertical the position serves (e.g., FinTech, HealthTech)', 'industry');

INSERT OR IGNORE INTO knowledge_rules (id, rule_name, rule_text, priority) VALUES
  (lower(hex(randomblob(16))), 'Seniority Match', 'Prefer candidates whose seniority level matches the position requirement within ±1 level', 10),
  (lower(hex(randomblob(16))), 'Skill Alignment', 'Primary skill must match position main_skill. Adjacent skills (e.g., React/Angular) are acceptable but score lower.', 20),
  (lower(hex(randomblob(16))), 'Geographic Fit', 'Candidate country must be in the position countries list. Remote-eligible positions accept any country.', 30),
  (lower(hex(randomblob(16))), 'No Re-presentation', 'Never recommend a candidate who was previously rejected for the same position.', 5),
  (lower(hex(randomblob(16))), 'Bench Priority', 'Bench employees should be prioritized over external candidates when skill and seniority match.', 15),
  (lower(hex(randomblob(16))), 'Rate Check', 'Candidate rate/salary must be within the position min/max rate range if specified.', 25);

INSERT OR IGNORE INTO system_prompt_versions (id, version_label, prompt_text, is_active, created_by) VALUES
  (lower(hex(randomblob(16))), 'v1-initial', 'You are Scout-9, an AI talent-matching agent for Unosquare''s COE Operations team.

Your task is to analyze open positions and candidate pools, then produce a structured report recommending the best matches.

For each position, evaluate available candidates based on:
- Technical skill alignment with position requirements
- Seniority level match
- Geographic compatibility
- Rate/salary fit within position budget
- Prior presentation history (avoid re-presenting rejected candidates)

Use the available tools to gather additional context:
- get_resume_text: Fetch full resume for deeper skill analysis
- get_position_discussions: Review stakeholder feedback and preferences
- get_candidate_history: Check prior presentations and outcomes
- get_position_detail: Get full position requirements
- get_knowledge_notes: Access client/stakeholder-specific context

Output a JSON report with this structure:
{
  "summary": "Brief overall summary",
  "positions": [
    {
      "upstreamId": number,
      "account": "string",
      "jobTitle": "string",
      "recommendations": [
        {
          "candidateUpstreamId": number,
          "candidateSourceType": "candidates" | "employees",
          "candidateName": "string",
          "fitScore": 0-100,
          "reasoning": "string",
          "strengths": ["string"],
          "concerns": ["string"]
        }
      ]
    }
  ]
}', 1, 'system');
