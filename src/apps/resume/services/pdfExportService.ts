import { StructuredResume } from '../types';

export const pdfExportService = {
  async exportToPdf(resume: StructuredResume): Promise<Blob> {
    const htmlContent = generateResumeHtml(resume);

    const blob = new Blob([htmlContent], { type: 'text/html' });
    return blob;
  },

  async downloadPdf(resume: StructuredResume, fileName?: string): Promise<void> {
    const htmlContent = generateResumeHtml(resume);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  },

  generatePreviewHtml(resume: StructuredResume): string {
    return generateResumeHtml(resume);
  },
};

function generateResumeHtml(resume: StructuredResume): string {
  const formatDate = (dateStr: string) => {
    if (dateStr === 'Present' || dateStr.toLowerCase() === 'present') return 'Present';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resume.candidateName} - Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1f2937;
      background: white;
      padding: 0.5in;
    }

    @media print {
      body {
        padding: 0;
      }
      @page {
        margin: 0.5in;
        size: letter;
      }
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #2563eb;
    }

    .name {
      font-size: 24pt;
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 8px;
    }

    .contact-info {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 15px;
      font-size: 10pt;
      color: #4b5563;
    }

    .contact-info span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 12pt;
      font-weight: 600;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary {
      text-align: justify;
      color: #374151;
    }

    .experience-item {
      margin-bottom: 15px;
    }

    .experience-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }

    .job-title {
      font-weight: 600;
      color: #111827;
    }

    .company {
      color: #4b5563;
    }

    .dates {
      font-size: 10pt;
      color: #6b7280;
      white-space: nowrap;
    }

    .location {
      font-size: 10pt;
      color: #6b7280;
      font-style: italic;
    }

    .achievements {
      margin-top: 6px;
      padding-left: 20px;
    }

    .achievements li {
      margin-bottom: 3px;
      color: #374151;
    }

    .achievements li::marker {
      color: #2563eb;
    }

    .education-item {
      margin-bottom: 10px;
    }

    .education-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .degree {
      font-weight: 600;
      color: #111827;
    }

    .institution {
      color: #4b5563;
    }

    .skills-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .skill-category {
      flex: 1;
      min-width: 200px;
    }

    .skill-category-name {
      font-weight: 600;
      font-size: 10pt;
      color: #374151;
      margin-bottom: 4px;
    }

    .skills-list {
      font-size: 10pt;
      color: #4b5563;
    }

    .certifications-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 8px;
    }

    .certification-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 6px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .cert-name {
      font-weight: 500;
      color: #111827;
    }

    .cert-issuer {
      font-size: 10pt;
      color: #6b7280;
    }

    .cert-date {
      font-size: 9pt;
      color: #9ca3af;
    }

    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <header class="header">
    <h1 class="name">${resume.candidateName}</h1>
    <div class="contact-info">
      ${resume.email ? `<span>📧 ${resume.email}</span>` : ''}
      ${resume.phone ? `<span>📱 ${resume.phone}</span>` : ''}
      ${resume.location ? `<span>📍 ${resume.location}</span>` : ''}
      ${resume.linkedIn ? `<span>🔗 ${resume.linkedIn}</span>` : ''}
    </div>
  </header>

  ${
    resume.summary
      ? `
  <section class="section">
    <h2 class="section-title">Professional Summary</h2>
    <p class="summary">${resume.summary}</p>
  </section>
  `
      : ''
  }

  ${
    resume.experience.length > 0
      ? `
  <section class="section">
    <h2 class="section-title">Professional Experience</h2>
    ${resume.experience
      .map(
        (exp) => `
      <div class="experience-item">
        <div class="experience-header">
          <div>
            <span class="job-title">${exp.title}</span>
            <span class="company"> | ${exp.company}</span>
            ${exp.location ? `<span class="location"> | ${exp.location}</span>` : ''}
          </div>
          <span class="dates">${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}</span>
        </div>
        ${
          exp.achievements && exp.achievements.length > 0
            ? `
          <ul class="achievements">
            ${exp.achievements.map((ach) => `<li>${ach}</li>`).join('')}
          </ul>
        `
            : exp.description
            ? `<p style="margin-top: 4px; color: #374151;">${exp.description}</p>`
            : ''
        }
      </div>
    `
      )
      .join('')}
  </section>
  `
      : ''
  }

  ${
    resume.education.length > 0
      ? `
  <section class="section">
    <h2 class="section-title">Education</h2>
    ${resume.education
      .map(
        (edu) => `
      <div class="education-item">
        <div class="education-header">
          <div>
            <span class="degree">${edu.degree} in ${edu.field}</span>
            <span class="institution"> | ${edu.institution}</span>
            ${edu.gpa ? `<span style="font-size: 10pt; color: #6b7280;"> | GPA: ${edu.gpa}</span>` : ''}
          </div>
          <span class="dates">${formatDate(edu.graduationDate)}</span>
        </div>
        ${edu.honors ? `<p style="font-size: 10pt; color: #6b7280; margin-top: 2px;">${edu.honors}</p>` : ''}
      </div>
    `
      )
      .join('')}
  </section>
  `
      : ''
  }

  ${
    resume.skills.length > 0
      ? `
  <section class="section">
    <h2 class="section-title">Skills</h2>
    <div class="skills-container">
      ${resume.skills
        .map(
          (cat) => `
        <div class="skill-category">
          <div class="skill-category-name">${cat.name}</div>
          <div class="skills-list">${cat.skills.join(' • ')}</div>
        </div>
      `
        )
        .join('')}
    </div>
  </section>
  `
      : ''
  }

  ${
    resume.certifications.length > 0
      ? `
  <section class="section">
    <h2 class="section-title">Certifications</h2>
    <div class="certifications-list">
      ${resume.certifications
        .map(
          (cert) => `
        <div class="certification-item">
          <div>
            <span class="cert-name">${cert.name}</span>
            <span class="cert-issuer"> - ${cert.issuer}</span>
          </div>
          <span class="cert-date">${formatDate(cert.date)}</span>
        </div>
      `
        )
        .join('')}
    </div>
  </section>
  `
      : ''
  }

  <footer class="footer">
    Generated with Resume Transformer | © ${new Date().getFullYear()} Unosquare • Generated with design.Unosquare
  </footer>
</body>
</html>
  `;
}

export default pdfExportService;
