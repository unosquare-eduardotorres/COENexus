export const SAMPLE_JOB_DESCRIPTION = `Position Title: Backend Engineer
Reports To: Director of Software Engineering

The Position:
We're seeking a Backend Engineer to design and build interoperability-first services in Azure that securely move, transform, and expose healthcare data. You will work primarily in Python to integrate external systems via REST APIs, implement standards like FHIR and C-CDA, generate compliant HTML-to-PDF documents, and deploy horizontally scalable services on Azure Container Apps or Azure Function Apps. Success in this role leads directly to lower turnaround time, higher data quality, and audit-ready outcomes in a HIPAA/HITRUST environment.

Duties & Responsibilities:

Interoperability & Standards
- Build FHIR integrations (e.g., Patient, DocumentReference, $match) including authentication (OAuth2 / SMART on FHIR) and robust error handling.
- Parse and transform C-CDA clinical documents; map sections/entries into normalized data structures for downstream use.
- Contribute to HL7 v2/MDM/ADT flows as needed (e.g., payload parsing, message validation, ack/error handling).

API Engineering (Python)
- Design and implement internal/external REST APIs using Python (FastAPI/Flask), with clear contracts, validation, and versioning.
- Define OpenAPI specs, request/response schemas, and secure endpoints (authZ/authN, scopes, roles, and least-privilege).

Document Generation (HTML → PDF)
- Create accessible and compliant HTML templates for request/authorization letters and correspondence; convert to PDF via server-side renderers.
- Implement a reusable templating pipeline (variables, partials, localization, testing) and ensure PDFs meet client and regulatory requirements.

Cloud-Native Delivery (Azure)
- Deploy horizontally scalable services on Azure Container Apps (with autoscale) or Azure Function Apps (Elastic Premium), backed by Application Insights and Log Analytics for observability.
- Use Azure Service Bus/Event Grid for reliable, event-driven processing; design idempotent workers with poison-queue handling.
- Manage secrets/config via Key Vault/App Configuration; implement blue/green or slot-based releases.

Data Engineering
- Build resilient ingestion/transformation pipelines for FHIR/C-CDA and API data across Blob/Data Lake/SQL/Cosmos DB stores.
- Model data for reporting/analytics while maintaining lineage and auditability; enforce PII/PHI handling rules.

Quality, Observability & Reliability
- Instrument services with structured logs, metrics, and traces; maintain dashboards and SLOs (latency, error rate, throughput).
- Write integration tests, contract tests, and data validation checks; automate with CI/CD (Azure DevOps/GitHub Actions).

Compliance & Documentation
- Ensure HIPAA/HITRUST controls are met across code, infrastructure, and logging.
- Maintain developer-ready docs: API specs, field mappings, runbooks, and architectural decision records (ADRs).

Experience & Qualifications:

Required
- 3+ years in data engineering, platform/API development, or similar roles.
- Strong Python skills (FastAPI/Flask), including packaging, virtual environments, and testing frameworks.
- Hands on building REST APIs and integrating external APIs; OpenAPI/Swagger proficiency.
- Practical experience with FHIR (resources, search parameters, auth) and C-CDA parsing/transformation.
- Knowledge of EPIC, Cerner, Athena, and other EMRs.
- Proven deployment of horizontally scalable services on Azure (Container Apps or Function Apps), with observability and auto-scale.
- Solid understanding of cloud data stores (Azure SQL, Blob/Data Lake, Postgres SQL DB) and event systems (Service Bus/Event Grid).
- Git based workflows and CI/CD; security first mindset; excellent communication and collaboration.
- Experience working in Healthcare.
- Experience with FHIR, Epic, Cerner, Athena, eClinicalWorks, or other EMRs.

Preferred
- Experience with HL7 v2 (MLLP/MDM/ADT) message handling.
- Familiarity with HTML→PDF engines and template systems.
- IaC (Bicep/Terraform/ARM), Azure API Management, and private networking patterns.
- Healthcare background and working knowledge of HIPAA/HITRUST controls.

The Person:
The successful candidate will be a motivated data engineer who:
- Interoperability-minded: Enjoys turning healthcare standards (FHIR/C-CDA/HL7) into reliable, developer-friendly services.
- Python craftsperson: Writes clean, testable code and well-documented APIs.
- Cloud-native pragmatist: Designs for horizontal scale, resiliency, and observability from day one.
- Compliance-aware: Bakes auditability and privacy into every pipeline and endpoint.
- Collaborative: Works smoothly with product, ops, and security—translating requirements into running systems.`;
