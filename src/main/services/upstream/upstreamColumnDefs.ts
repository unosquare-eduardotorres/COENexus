import type { ColumnDefinition } from './upstreamApiClient'

export function col(name: string, label: string, overrides: Partial<ColumnDefinition> = {}): ColumnDefinition {
  return {
    name,
    label,
    aggregate: 'None',
    dataType: 'string',
    dateDisplayFormat: 'YYYY-MM-DD',
    dateOriginFormat: 'YYYY-MM-DD',
    dateTimeDisplayFormat: 'YYYY-MM-DDTHH:mm:ss',
    dateTimeOriginFormat: 'YYYY-MM-DDTHH:mm:ss',
    isKey: false,
    isComputed: false,
    searchable: false,
    sortDirection: 'None',
    sortOrder: -1,
    sortable: true,
    visible: true,
    filterOperator: 'Contains',
    filterable: true,
    exportable: true,
    ...overrides,
  }
}

export function buildEmployeeColumns(): ColumnDefinition[] {
  return [
    col('UserId', 'User ID', { dataType: 'numeric', isKey: true, filterable: false, filterOperator: 'None', visible: false }),
    col('Active', 'Active', { filterOperator: 'Equals', filterText: 'Active', filterable: false, visible: false }),
    col('FullName', 'Name', { searchable: true, sortDirection: 'Ascending', sortOrder: 1 }),
    col('Email', 'E-mail', { searchable: true }),
    col('JobTitle', 'Job Title', { searchable: true }),
    col('MainSkill', 'Main Skill', { searchable: true }),
    col('AdditionalSkills', 'Additional Skills', { searchable: true, sortable: false }),
    col('FunctionalUnit', 'Functional Unit', { searchable: true }),
    col('Office', 'Office Location', { searchable: true }),
    col('ContractType', 'Contract Type', { searchable: true }),
    col('BusinessUnit', 'Business Unit', { searchable: true }),
    col('StartDate', 'Start Date', { dataType: 'datetimeutc' }),
    col('EnterpriseId', 'Enterprise ID', { searchable: true }),
    col('HrName', 'HR Partner', { searchable: true }),
    col('PeopleSuccessLead', 'People Success Lead', { searchable: true }),
    col('DateOfBirth', 'Date of Birth', { dataType: 'datetimeutc', sortable: false, filterable: false }),
    col('AnniversaryDate', 'Anniversary Date', { dataType: 'datetimeutc', sortable: false, filterable: false }),
    col('IsProjectBased', 'Is Project Based'),
  ]
}

export function buildCandidateColumns(year?: number): ColumnDefinition[] {
  const statusUpdateColumn = col('StatusUpdate', 'Status Update', { dataType: 'datetimeutc', sortDirection: 'Descending', sortOrder: 1 })

  if (year != null) {
    statusUpdateColumn.filterOperator = 'Between'
    if (year >= 2014) {
      statusUpdateColumn.filterText = `${year}-01-01T00:00:00.000Z`
      statusUpdateColumn.filterArgument = [`${year}-12-31T23:59:59.999Z`]
    } else {
      statusUpdateColumn.filterText = '2000-01-01T00:00:00.000Z'
      statusUpdateColumn.filterArgument = ['2013-12-31T23:59:59.999Z']
    }
  }

  return [
    col('CandidateId', 'Actions', { dataType: 'numeric', isKey: true, filterable: false, exportable: false, filterOperator: 'Equals' }),
    col('Candidate', 'Candidate', { searchable: true }),
    col('Recruiter', 'Recruiter', { searchable: true }),
    col('CandidateStatusName', 'Status', { filterable: false }),
    col('JobBoard', 'Job Board'),
    col('Skills', 'Main Skill'),
    col('AdditionalSkills', 'Additional Skill'),
    col('Seniority', 'Seniority'),
    col('SeniorityBand', 'Seniority Band'),
    col('CoeCertifiedStatus', 'COE Certified Status'),
    col('MobilePhone', 'Mobile Phone'),
    col('Email', 'Email', { searchable: true }),
    col('SecondaryEmail', 'Secondary Email'),
    col('Location', 'Location'),
    statusUpdateColumn,
  ]
}

export function buildRateColumns(): ColumnDefinition[] {
  return [
    col('Account', 'Account', { searchable: true, filterOperator: 'None' }),
    col('WorkOrderProjectName', 'Project Name', { searchable: true, filterOperator: 'None' }),
    col('Rate', 'Rate', { dataType: 'numeric', searchable: true, filterOperator: 'None' }),
    col('StartDate', 'Start Date', { dataType: 'date', searchable: true, sortDirection: 'Descending', sortOrder: 1, filterOperator: 'None' }),
  ]
}

export function buildNoteColumns(): ColumnDefinition[] {
  return [
    col('PersonaNoteId', 'Note ID', { dataType: 'numeric', isKey: true, filterable: false, filterOperator: 'None', visible: false }),
    col('NoteTypeName', 'Type', { searchable: true }),
    col('NoteContent', 'Content', { searchable: true }),
    col('FullName', 'Name', { searchable: true }),
    col('DateCreated', 'Created', { dataType: 'datetimeutc' }),
    col('Filename', 'File', { searchable: true }),
  ]
}

export function buildOpenPositionColumns(): ColumnDefinition[] {
  return [
    col('RecruitmentRequisitionId', 'Actions', { filterable: false, exportable: false, sortable: false, filterOperator: 'None' }),
    col('Id', 'Id', { dataType: 'numeric', isKey: true, sortDirection: 'Ascending', sortOrder: 2, filterOperator: 'None' }),
    col('Account', 'Account', { searchable: true, sortDirection: 'Ascending', sortOrder: 1, filterOperator: 'None' }),
    col('VerticalIndustry', 'Vertical Industry', { searchable: true, filterOperator: 'None' }),
    col('CoE', 'CoE', { searchable: true, filterOperator: 'None' }),
    col('Practice', 'Practice', { searchable: true, filterOperator: 'None' }),
    col('Stakeholder', 'Stakeholder', { searchable: true, filterOperator: 'None' }),
    col('MainSkill', 'Main Skill', { searchable: true, filterOperator: 'None' }),
    col('Status', 'Status', { searchable: true, filterOperator: 'None' }),
    col('Countries', 'Countries', { searchable: true, filterOperator: 'None' }),
    col('InOffice', 'In Office', { dataType: 'boolean', filterOperator: 'None' }),
    col('Csu', 'CSU', { searchable: true, filterOperator: 'None' }),
    col('PositionStatus', 'Count', { filterable: false, filterOperator: 'None' }),
    col('Aging', 'Aging', { dataType: 'numeric', filterable: false, filterOperator: 'None' }),
    col('Seniorities', 'Seniorities', { searchable: true, filterOperator: 'None' }),
    col('RateRange', 'Available Range', { filterOperator: 'None' }),
    col('Created', 'Created', { dataType: 'date', filterOperator: 'None' }),
    col('StartDate', 'Ready Date', { dataType: 'date', filterOperator: 'None' }),
    col('LastStatus', 'Last Modification', { dataType: 'date', filterOperator: 'None' }),
    col('Sourcing', 'Sourcing', { searchable: true, filterOperator: 'None' }),
    col('Replacement', 'Replacement', { dataType: 'boolean', filterOperator: 'None' }),
    col('Closed', 'Closed', { dataType: 'date', filterOperator: 'None' }),
    col('IsFromAssignments', 'Is From Assignments', { dataType: 'boolean', sortable: false, visible: false, filterOperator: 'None' }),
  ]
}

export function buildPrrColumns(): ColumnDefinition[] {
  return [
    col('Id', 'Actions', { dataType: 'numeric', isKey: true, searchable: false, sortable: false, filterable: false, exportable: false, filterOperator: 'None' }),
    col('Employee', 'Employee', { searchable: true, filterOperator: 'None' }),
    col('Account', 'Client', { searchable: true, filterOperator: 'None' }),
    col('Team', 'Team', { searchable: true, filterOperator: 'None' }),
    col('MainSkill', 'Main Skill', { searchable: true, filterOperator: 'None' }),
    col('Seniority', 'Seniority', { searchable: true, filterOperator: 'None' }),
    col('ProjectTransitionStatus', 'Status', { searchable: true, filterOperator: 'None' }),
    col('TransitionSubType', 'Sub Type', { searchable: true, filterOperator: 'None' }),
    col('Location', 'Location', { searchable: true, filterOperator: 'None' }),
    col('RequestDate', 'Request Date', { dataType: 'date', searchable: false, filterOperator: 'None' }),
    col('DaysSinceLastInterview', 'Days Since Last Interview', { searchable: true, filterOperator: 'None' }),
    col('Impact', 'Current Project Impact', { searchable: true, filterOperator: 'None' }),
    col('AttritionRisk', 'Attrition Risk', { searchable: true, filterOperator: 'None' }),
    col('Comments', 'Comments', { searchable: true, filterOperator: 'None' }),
  ]
}

export function buildPrrPresentationColumns(): ColumnDefinition[] {
  return [
    col('OpenPositionId', ' Id', { dataType: 'numeric', isKey: true, searchable: false, sortable: false, filterable: false, exportable: false, filterOperator: 'None' }),
    col('Account', 'Client', { searchable: true, filterOperator: 'None' }),
    col('OpenPositionStatus', 'Position Status', { searchable: true, filterOperator: 'None' }),
    col('Location', 'Location', { searchable: true, filterOperator: 'None' }),
    col('Date', 'Presented On', { dataType: 'date', searchable: true, sortDirection: 'Descending', filterOperator: 'None' }),
    col('CandidateStatus', 'Status', { searchable: true, filterOperator: 'None' }),
  ]
}

export function buildTeamCompositionColumns(): ColumnDefinition[] {
  return [
    col('Account', 'Account', { searchable: true, filterOperator: 'None' }),
    col('Team', 'Team', { searchable: true, filterOperator: 'None' }),
    col('Project', 'Project', { searchable: true, filterOperator: 'None' }),
    col('Role', 'Role', { searchable: true, filterOperator: 'None' }),
    col('StartDate', 'Start Date', { dataType: 'datetimeutc', sortDirection: 'Descending', sortOrder: 1, filterOperator: 'None' }),
    col('EndDate', 'End Date', { dataType: 'datetimeutc', filterOperator: 'None' }),
  ]
}

export function buildPresentedCandidateColumns(): ColumnDefinition[] {
  return [
    col('CandidateRequisitionId', 'Actions', { dataType: 'numeric', isKey: true, filterable: false, exportable: false, sortable: false, filterOperator: 'None' }),
    col('Candidate', 'Candidate', { searchable: true, filterOperator: 'None' }),
    col('CandidateStatusName', 'Status', { searchable: true, filterOperator: 'None' }),
    col('StartDate', 'Status Date', { dataType: 'date', sortDirection: 'Descending', sortOrder: 1, filterOperator: 'None' }),
    col('Skills', 'Main Skill', { searchable: true, filterOperator: 'None' }),
    col('Rate', 'Rate', { dataType: 'numeric', searchable: true, filterOperator: 'None' }),
    col('Visa', 'Employee', { dataType: 'boolean', filterOperator: 'None' }),
    col('Skype', 'Rec Status', { searchable: true, filterOperator: 'None' }),
    col('CandidateId', 'Candidate Id', { dataType: 'numeric', filterable: false, visible: false, filterOperator: 'None' }),
  ]
}
