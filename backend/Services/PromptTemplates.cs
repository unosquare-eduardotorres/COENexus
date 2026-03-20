namespace OperationNexus.Api.Services;

public static class PromptTemplates
{
    public const string OpusAnalysis = @"You are a senior technical recruiter AI with deep expertise in technical hiring. You are known for being precise, honest, and never inflating candidate fit scores.

{{contextBlock}}

Resume:
{{resume}}

Analyze this person's fit for the role. Return a JSON object with this exact structure:
{
  ""matchScore"": <0-100>,
  ""role"": ""<person's best-fit role title>"",
  ""years"": <total years of experience>,
  ""location"": ""{{country}}"",
  ""salary"": ""{{salaryDisplay}}"",
  ""availability"": ""{{availabilityDisplay}}"",
  ""fitVerdict"": ""strong-fit|good-fit|partial-fit|not-a-fit"",
  ""fitSummary"": ""<1-2 sentence verdict — clearly state whether this IS or IS NOT a good fit and the #1 reason>"",
  ""whyNotFit"": ""<if partial-fit or not-a-fit: detailed narrative on why they do NOT fit and what's missing. If strong-fit or good-fit: empty string>"",
  ""scores"": {
    ""technical"": <0-100>,
    ""technicalReason"": ""<1-sentence justification>"",
    ""domain"": <0-100>,
    ""domainReason"": ""<1-sentence justification>"",
    ""leadership"": <0-100>,
    ""leadershipReason"": ""<1-sentence justification>"",
    ""softSkills"": <0-100>,
    ""softSkillsReason"": ""<1-sentence justification>"",
    ""availability"": <0-100>,
    ""availabilityReason"": ""<1-sentence justification>""
  },
  ""summary"": ""<2-3 sentence verdict: Start with whether this is a GOOD FIT or NOT A FIT, then the strongest reason, then one key risk or differentiator>"",
  ""skills"": [{ ""name"": ""<skill>"", ""status"": ""met|surpassed|partial|missing"", ""years"": <years>, ""priority"": ""required|nice-to-have|optional"" }],
  ""domains"": [{ ""name"": ""<domain>"", ""confidence"": <0-100>, ""evidence"": ""<brief evidence>"" }],
  ""gaps"": [{ ""skill"": ""<gap area>"", ""severity"": ""high|medium|low"", ""note"": ""<explanation>"" }],
  ""leadership"": [{ ""label"": ""<leadership quality>"", ""priority"": ""required|nice-to-have|optional"", ""status"": ""met|surpassed|partial|missing"" }],
  ""softSkills"": [{ ""label"": ""<soft skill>"", ""priority"": ""required|nice-to-have|optional"", ""status"": ""met|surpassed|partial|missing"" }],
  ""analysis"": {
    ""whyRightFit"": ""<detailed narrative on why this person fits>"",
    ""immediateValue"": ""<what value they bring day one>"",
    ""rampUpEstimate"": ""<realistic ramp-up time and what they need to learn>"",
    ""riskFactors"": ""<risks and how to mitigate them>"",
    ""beyondJd"": ""<hidden strengths beyond the JD requirements>"",
    ""leadershipDynamics"": ""<leadership style and team dynamics>"",
    ""industryDepth"": ""<industry and domain knowledge depth>"",
    ""trackRecord"": ""<proof points and track record>"",
    ""culturalFit"": ""<cultural and work style compatibility>"",
    ""retentionPotential"": ""<long-term retention potential and growth path>""
  }
}

CRITICAL RULES FOR SKILLS:
- The ""skills"" array must ONLY contain skills that are explicitly mentioned in the Job Description text above.
- Do NOT invent, infer, or add skills that are not written in the Job Description.
- If the Job Description contains no specific technical skills, return an empty skills array [].
- Each skill's ""priority"" must reflect how it appears in the JD: ""required"" for must-haves, ""nice-to-have"" for preferred/bonus, ""optional"" for briefly mentioned.
- The ""status"" must reflect the person's actual resume evidence: ""met"" only if the resume clearly demonstrates that skill, ""partial"" if limited evidence, ""missing"" if no evidence found, ""surpassed"" only if experience significantly exceeds what the JD asks for.
- All JD-required skills MUST appear in the output regardless of whether the person matches them. Missing skills get status ""missing"".
- If years of experience for a skill cannot be determined from the resume, use -1.
- Do NOT assume leadership experience from job titles alone — look for concrete evidence in the resume.

CRITICAL RULES FOR GAPS:
- The ""gaps"" array must ONLY flag gaps for skills that are explicitly required or preferred in the Job Description.
- Do NOT invent requirements that are not in the JD just to create gaps.
- If the JD has no specific requirements, return an empty gaps array [].

CRITICAL RULES FOR FIT VERDICT:
- Be brutally honest. If the person is NOT a good fit, say so clearly.
- The ""fitVerdict"" must reflect reality: use ""not-a-fit"" or ""partial-fit"" when gaps are significant.
- ""whyNotFit"" must be substantive when the person doesn't match — don't leave it empty or generic.
- Do NOT inflate scores to be polite. A mismatch is a mismatch.

SCORING CALIBRATION:
- 90-100: Exceptional — exceeds every requirement, could lead the initiative
- 70-89: Strong — meets most requirements with minor gaps easily addressed
- 50-69: Partial — meets some requirements but has notable gaps requiring ramp-up
- 30-49: Weak — significant misalignment, would require substantial training
- 0-29: No fit — fundamentally different skill set or experience level

Leadership and softSkills must be returned as structured objects with label, priority, and status fields.

Return ONLY valid JSON, no markdown or explanation.";

    public const string MatchEngineContextBlock = @"Job Description:
{{jobDescription}}

Candidate Name: {{candidateName}}
Current Title: {{jobTitle}}
Seniority: {{seniority}}
Main Skill: {{mainSkill}}
Country: {{country}}
Rate: {{rate}} {{currency}}
On Bench: {{isBench}}
Source: {{sourceType}}";

    public const string BenchBurnContextBlock = @"Open Position:
Account: {{account}}
Job Title: {{jobTitle}}
Main Skill: {{positionMainSkill}}
Job Description:
{{jobDescription}}

Employee Name: {{employeeName}}
Current Title: {{employeeJobTitle}}
Seniority: {{seniority}}
Main Skill: {{employeeMainSkill}}
Country: {{country}}";
}
