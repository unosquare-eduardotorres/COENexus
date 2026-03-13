import { StructuredResume, BatchJob } from '../types';

export const sampleResumes: StructuredResume[] = [
  {
    id: 'resume-001',
    originalFileName: 'Gustavo_Cereceres.docx',
    originalFileType: 'docx',
    originalContent: `GUSTAVO CERECERES
Senior Software Engineer
gustavo.cereceres@email.com | (555) 123-4567 | San Francisco, CA
LinkedIn: linkedin.com/in/gustavocereceres

PROFESSIONAL SUMMARY
Results-driven Senior Software Engineer with 8+ years of experience in full-stack development, specializing in cloud-native applications and microservices architecture. Proven track record of leading cross-functional teams and delivering scalable solutions that drive business growth. Expert in React, Node.js, and AWS services.

PROFESSIONAL EXPERIENCE

Senior Software Engineer | TechCorp Solutions | Jan 2021 - Present | San Francisco, CA
- Led development of microservices architecture serving 2M+ daily active users
- Architected and implemented real-time data processing pipeline reducing latency by 40%
- Mentored team of 5 junior developers, improving code quality metrics by 35%
- Spearheaded migration from monolithic architecture to containerized microservices

Software Engineer | InnovateTech Inc | Mar 2018 - Dec 2020 | Austin, TX
- Developed customer-facing React applications with 99.9% uptime
- Implemented CI/CD pipelines reducing deployment time by 60%
- Collaborated with product team to deliver 15+ features per quarter
- Optimized database queries improving application performance by 50%

Junior Software Developer | StartupXYZ | Jun 2016 - Feb 2018 | Seattle, WA
- Built RESTful APIs using Node.js and Express
- Participated in agile development sprints and code reviews
- Contributed to open-source projects and internal tools

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley | 2016
GPA: 3.8/4.0 | Dean's List

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, Java, SQL
Frontend: React, Vue.js, Angular, HTML5, CSS3, Tailwind CSS
Backend: Node.js, Express, Django, Spring Boot
Cloud: AWS (EC2, S3, Lambda, DynamoDB), GCP, Azure
DevOps: Docker, Kubernetes, Jenkins, GitHub Actions, Terraform
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch

CERTIFICATIONS
AWS Certified Solutions Architect - Professional | 2023
Google Cloud Professional Cloud Architect | 2022
Certified Kubernetes Administrator (CKA) | 2022`,
    candidateName: 'Gustavo Cereceres',
    email: 'gustavo.cereceres@email.com',
    phone: '(555) 123-4567',
    location: 'San Francisco, CA',
    linkedIn: 'linkedin.com/in/gustavocereceres',
    summary:
      'Results-driven Senior Software Engineer with 8+ years of experience in full-stack development, specializing in cloud-native applications and microservices architecture. Proven track record of leading cross-functional teams and delivering scalable solutions that drive business growth. Expert in React, Node.js, and AWS services.',
    experience: [
      {
        id: 'exp-001-1',
        company: 'TechCorp Solutions',
        title: 'Senior Software Engineer',
        startDate: '2021-01',
        endDate: 'Present',
        location: 'San Francisco, CA',
        description:
          'Led development of microservices architecture serving 2M+ daily active users. Architected and implemented real-time data processing pipeline reducing latency by 40%.',
        achievements: [
          'Led development of microservices architecture serving 2M+ daily active users',
          'Architected and implemented real-time data processing pipeline reducing latency by 40%',
          'Mentored team of 5 junior developers, improving code quality metrics by 35%',
          'Spearheaded migration from monolithic architecture to containerized microservices',
        ],
      },
      {
        id: 'exp-001-2',
        company: 'InnovateTech Inc',
        title: 'Software Engineer',
        startDate: '2018-03',
        endDate: '2020-12',
        location: 'Austin, TX',
        description:
          'Developed customer-facing React applications with 99.9% uptime. Implemented CI/CD pipelines reducing deployment time by 60%.',
        achievements: [
          'Developed customer-facing React applications with 99.9% uptime',
          'Implemented CI/CD pipelines reducing deployment time by 60%',
          'Collaborated with product team to deliver 15+ features per quarter',
          'Optimized database queries improving application performance by 50%',
        ],
      },
      {
        id: 'exp-001-3',
        company: 'StartupXYZ',
        title: 'Junior Software Developer',
        startDate: '2016-06',
        endDate: '2018-02',
        location: 'Seattle, WA',
        description: 'Built RESTful APIs using Node.js and Express. Participated in agile development sprints.',
        achievements: [
          'Built RESTful APIs using Node.js and Express',
          'Participated in agile development sprints and code reviews',
          'Contributed to open-source projects and internal tools',
        ],
      },
    ],
    education: [
      {
        id: 'edu-001-1',
        institution: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2016-05',
        gpa: '3.8/4.0',
        honors: "Dean's List",
      },
    ],
    skills: [
      {
        id: 'skill-001-1',
        name: 'Languages',
        skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'SQL'],
      },
      {
        id: 'skill-001-2',
        name: 'Frontend',
        skills: ['React', 'Vue.js', 'Angular', 'HTML5', 'CSS3', 'Tailwind CSS'],
      },
      {
        id: 'skill-001-3',
        name: 'Backend',
        skills: ['Node.js', 'Express', 'Django', 'Spring Boot'],
      },
      {
        id: 'skill-001-4',
        name: 'Cloud',
        skills: ['AWS (EC2, S3, Lambda, DynamoDB)', 'GCP', 'Azure'],
      },
      {
        id: 'skill-001-5',
        name: 'DevOps',
        skills: ['Docker', 'Kubernetes', 'Jenkins', 'GitHub Actions', 'Terraform'],
      },
      {
        id: 'skill-001-6',
        name: 'Databases',
        skills: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'],
      },
    ],
    certifications: [
      {
        id: 'cert-001-1',
        name: 'AWS Certified Solutions Architect - Professional',
        issuer: 'Amazon Web Services',
        date: '2023-01',
      },
      {
        id: 'cert-001-2',
        name: 'Google Cloud Professional Cloud Architect',
        issuer: 'Google Cloud',
        date: '2022-06',
      },
      {
        id: 'cert-001-3',
        name: 'Certified Kubernetes Administrator (CKA)',
        issuer: 'CNCF',
        date: '2022-03',
      },
    ],
    transformedAt: '2024-01-15T10:30:00Z',
    status: 'transformed',
    validationResults: [],
    overallValidationStatus: 'pending',
  },
  {
    id: 'resume-002',
    originalFileName: 'unosquare_resume.docx',
    originalFileType: 'docx',
    originalContent: `MARIA RODRIGUEZ
Full Stack Developer
maria.rodriguez@email.com | (555) 987-6543 | Austin, TX

SUMMARY
Innovative Full Stack Developer with 5 years of experience building web applications. Skilled in modern JavaScript frameworks and cloud technologies. Passionate about creating user-centric solutions.

EXPERIENCE

Full Stack Developer | Unosquare | Aug 2020 - Present | Austin, TX
- Developed enterprise web applications using React and .NET Core
- Implemented automated testing strategies achieving 90% code coverage
- Collaborated with clients to gather requirements and deliver solutions
- Led technical discussions and architectural decisions for projects

Frontend Developer | WebAgency LLC | Jan 2019 - Jul 2020 | Dallas, TX
- Built responsive web applications using React and Redux
- Improved website performance scores by 45%
- Worked with UX team to implement pixel-perfect designs

EDUCATION
Master of Science in Software Engineering | Texas State University | 2019
Bachelor of Science in Computer Science | University of Texas at Austin | 2017

SKILLS
Technical: React, TypeScript, .NET Core, C#, SQL Server, Azure, Git
Soft Skills: Communication, Team Leadership, Problem Solving

CERTIFICATIONS
Microsoft Certified: Azure Developer Associate | 2023
React Developer Certification | 2021`,
    candidateName: 'Maria Rodriguez',
    email: 'maria.rodriguez@email.com',
    phone: '(555) 987-6543',
    location: 'Austin, TX',
    summary:
      'Innovative Full Stack Developer with 5 years of experience building web applications. Skilled in modern JavaScript frameworks and cloud technologies. Passionate about creating user-centric solutions.',
    experience: [
      {
        id: 'exp-002-1',
        company: 'Unosquare',
        title: 'Full Stack Developer',
        startDate: '2020-08',
        endDate: 'Present',
        location: 'Austin, TX',
        description:
          'Developed enterprise web applications using React and .NET Core. Implemented automated testing strategies achieving 90% code coverage.',
        achievements: [
          'Developed enterprise web applications using React and .NET Core',
          'Implemented automated testing strategies achieving 90% code coverage',
          'Collaborated with clients to gather requirements and deliver solutions',
          'Led technical discussions and architectural decisions for projects',
        ],
      },
      {
        id: 'exp-002-2',
        company: 'WebAgency LLC',
        title: 'Frontend Developer',
        startDate: '2019-01',
        endDate: '2020-07',
        location: 'Dallas, TX',
        description: 'Built responsive web applications using React and Redux. Improved website performance.',
        achievements: [
          'Built responsive web applications using React and Redux',
          'Improved website performance scores by 45%',
          'Worked with UX team to implement pixel-perfect designs',
        ],
      },
    ],
    education: [
      {
        id: 'edu-002-1',
        institution: 'Texas State University',
        degree: 'Master of Science',
        field: 'Software Engineering',
        graduationDate: '2019-05',
      },
      {
        id: 'edu-002-2',
        institution: 'University of Texas at Austin',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2017-05',
      },
    ],
    skills: [
      {
        id: 'skill-002-1',
        name: 'Technical',
        skills: ['React', 'TypeScript', '.NET Core', 'C#', 'SQL Server', 'Azure', 'Git'],
      },
      {
        id: 'skill-002-2',
        name: 'Soft Skills',
        skills: ['Communication', 'Team Leadership', 'Problem Solving'],
      },
    ],
    certifications: [
      {
        id: 'cert-002-1',
        name: 'Microsoft Certified: Azure Developer Associate',
        issuer: 'Microsoft',
        date: '2023-03',
      },
      {
        id: 'cert-002-2',
        name: 'React Developer Certification',
        issuer: 'React Training',
        date: '2021-09',
      },
    ],
    transformedAt: '2024-01-15T11:00:00Z',
    status: 'reviewing',
    validationResults: [],
    overallValidationStatus: 'pending',
  },
];

export const sampleBatchJobs: BatchJob[] = [
  {
    id: 'batch-001',
    name: 'Q1 2024 Engineering Candidates',
    templateId: 'template-001',
    status: 'completed',
    totalResumes: 15,
    processedResumes: 15,
    successfulResumes: 14,
    failedResumes: 1,
    resumes: [
      { id: 'br-001', fileName: 'john_doe.pdf', status: 'completed', resumeId: 'resume-001' },
      { id: 'br-002', fileName: 'jane_smith.docx', status: 'completed', resumeId: 'resume-002' },
      { id: 'br-003', fileName: 'bob_wilson.pdf', status: 'failed', error: 'Unable to parse document' },
    ],
    createdAt: '2024-01-10T09:00:00Z',
    completedAt: '2024-01-10T09:15:00Z',
    createdBy: 'admin-001',
  },
  {
    id: 'batch-002',
    name: 'Marketing Team Hires',
    templateId: 'template-001',
    status: 'processing',
    totalResumes: 8,
    processedResumes: 5,
    successfulResumes: 5,
    failedResumes: 0,
    resumes: [
      { id: 'br-004', fileName: 'alice_johnson.pdf', status: 'completed', resumeId: 'resume-003' },
      { id: 'br-005', fileName: 'charlie_brown.docx', status: 'processing' },
      { id: 'br-006', fileName: 'diana_prince.txt', status: 'pending' },
    ],
    createdAt: '2024-01-15T14:00:00Z',
    createdBy: 'admin-001',
  },
];

export function getResumeById(id: string): StructuredResume | undefined {
  return sampleResumes.find((r) => r.id === id);
}

export function getAllResumes(): StructuredResume[] {
  return sampleResumes;
}

export function getBatchJobs(): BatchJob[] {
  return sampleBatchJobs;
}

export function getBatchJobById(id: string): BatchJob | undefined {
  return sampleBatchJobs.find((b) => b.id === id);
}
