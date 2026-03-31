import { useState, useMemo, useCallback } from 'react';
import {
  DataSource,
  FilterOptions,
  FilterRule,
  FilterField,
  FilterOperator,
  AdvancedConstraints,
} from '../../types';

interface FilterStepProps {
  dataSource: DataSource;
  filterOptions: FilterOptions | null;
  initialConstraints: AdvancedConstraints;
  onNext: (constraints: AdvancedConstraints) => void;
}

type FilterTabKey = 'candidate' | 'employee';

interface FieldConfig {
  field: FilterField;
  label: string;
  operators: { value: FilterOperator; label: string }[];
  valueType: 'dropdown' | 'number-currency' | 'multi-select' | 'date' | 'boolean';
  optionsKey?: keyof FilterOptions;
}

const CANDIDATE_FIELDS: FieldConfig[] = [
  {
    field: 'mainSkill',
    label: 'Main Skill',
    operators: [
      { value: 'equals', label: '=' },
      { value: 'notEquals', label: '≠' },
    ],
    valueType: 'dropdown',
    optionsKey: 'mainSkills',
  },
  {
    field: 'country',
    label: 'Country',
    operators: [
      { value: 'equals', label: '=' },
      { value: 'notEquals', label: '≠' },
    ],
    valueType: 'dropdown',
    optionsKey: 'countries',
  },
  {
    field: 'currentSalary',
    label: 'Current Salary',
    operators: [
      { value: 'lte', label: '≤' },
      { value: 'gte', label: '≥' },
    ],
    valueType: 'number-currency',
  },
  {
    field: 'salaryExpectation',
    label: 'Salary Expectation',
    operators: [
      { value: 'lte', label: '≤' },
      { value: 'gte', label: '≥' },
    ],
    valueType: 'number-currency',
  },
  {
    field: 'status',
    label: 'Status',
    operators: [
      { value: 'notEquals', label: '≠' },
      { value: 'equals', label: '=' },
    ],
    valueType: 'multi-select',
    optionsKey: 'candidateStatuses',
  },
  {
    field: 'lastStatusUpdate',
    label: 'Last Status Update',
    operators: [
      { value: 'gte', label: '≥' },
      { value: 'lte', label: '≤' },
    ],
    valueType: 'date',
  },
  {
    field: 'coeCertified',
    label: 'CoE Qualified',
    operators: [
      { value: 'equals', label: '=' },
    ],
    valueType: 'boolean',
  },
];

const EMPLOYEE_FIELDS: FieldConfig[] = [
  {
    field: 'mainSkill',
    label: 'Main Skill',
    operators: [
      { value: 'equals', label: '=' },
      { value: 'notEquals', label: '≠' },
    ],
    valueType: 'dropdown',
    optionsKey: 'mainSkills',
  },
  {
    field: 'country',
    label: 'Country',
    operators: [
      { value: 'equals', label: '=' },
      { value: 'notEquals', label: '≠' },
    ],
    valueType: 'dropdown',
    optionsKey: 'countries',
  },
  {
    field: 'seniority',
    label: 'Seniority',
    operators: [
      { value: 'equals', label: '=' },
      { value: 'notEquals', label: '≠' },
    ],
    valueType: 'dropdown',
    optionsKey: 'seniorities',
  },
  {
    field: 'currentSalary',
    label: 'Gross Monthly Salary',
    operators: [
      { value: 'lte', label: '≤' },
      { value: 'gte', label: '≥' },
    ],
    valueType: 'number-currency',
  },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultCandidateFilters(): FilterRule[] {
  return [
    { id: generateId(), field: 'status', operator: 'notEquals', value: 'Do Not Call', connector: 'and' },
    { id: generateId(), field: 'status', operator: 'notEquals', value: 'Hired', connector: 'and' },
    { id: generateId(), field: 'status', operator: 'notEquals', value: 'Incompatible', connector: 'and' },
    { id: generateId(), field: 'country', operator: 'notEquals', value: 'Argentina', connector: 'and' },
    { id: generateId(), field: 'lastStatusUpdate', operator: 'gte', value: '2026-01-01', connector: 'and' },
    { id: generateId(), field: 'coeCertified', operator: 'equals', value: true, connector: 'and' },
  ];
}

function getFieldConfig(field: FilterField, tab: FilterTabKey): FieldConfig | undefined {
  const fields = tab === 'candidate' ? CANDIDATE_FIELDS : EMPLOYEE_FIELDS;
  return fields.find((f) => f.field === field);
}

interface FilterGroup {
  field: FilterField;
  fieldConfig: FieldConfig;
  rules: FilterRule[];
}

export default function FilterStep({
  dataSource,
  filterOptions,
  initialConstraints,
  onNext,
}: FilterStepProps) {
  const showCandidateTab = dataSource === 'candidates' || dataSource === 'all-sources';
  const showEmployeeTab = dataSource === 'all-employees' || dataSource === 'all-sources';

  const defaultTab: FilterTabKey = showCandidateTab ? 'candidate' : 'employee';

  const [activeTab, setActiveTab] = useState<FilterTabKey>(defaultTab);
  const [candidateFilters, setCandidateFilters] = useState<FilterRule[]>(() => {
    if (initialConstraints.candidateFilters.length > 0) return initialConstraints.candidateFilters;
    return showCandidateTab ? createDefaultCandidateFilters() : [];
  });
  const [employeeFilters, setEmployeeFilters] = useState<FilterRule[]>(
    initialConstraints.employeeFilters
  );

  const currentFilters = activeTab === 'candidate' ? candidateFilters : employeeFilters;
  const setCurrentFilters = activeTab === 'candidate' ? setCandidateFilters : setEmployeeFilters;
  const availableFields = activeTab === 'candidate' ? CANDIDATE_FIELDS : EMPLOYEE_FIELDS;

  const totalFilterCount = candidateFilters.length + employeeFilters.length;

  const groupedFilters = useMemo<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [];
    const fieldIndex = new Map<FilterField, number>();

    for (const rule of currentFilters) {
      const existing = fieldIndex.get(rule.field);
      if (existing !== undefined) {
        groups[existing].rules.push(rule);
      } else {
        const config = getFieldConfig(rule.field, activeTab);
        if (config) {
          fieldIndex.set(rule.field, groups.length);
          groups.push({ field: rule.field, fieldConfig: config, rules: [rule] });
        }
      }
    }
    return groups;
  }, [currentFilters, activeTab]);

  const handleAddRule = useCallback((fieldConfig: FieldConfig) => {
    const defaultOp = fieldConfig.operators[0].value;
    const defaultValue = fieldConfig.valueType === 'number-currency' ? 0
      : fieldConfig.valueType === 'boolean' ? true
      : '';
    const newRule: FilterRule = {
      id: generateId(),
      field: fieldConfig.field,
      operator: defaultOp,
      value: defaultValue,
      connector: 'and',
    };
    setCurrentFilters((prev) => [...prev, newRule]);
  }, [setCurrentFilters]);

  const handleRemoveRule = useCallback((ruleId: string) => {
    setCurrentFilters((prev) => prev.filter((r) => r.id !== ruleId));
  }, [setCurrentFilters]);

  const handleUpdateRule = useCallback((ruleId: string, updates: Partial<FilterRule>) => {
    setCurrentFilters((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, ...updates } : r))
    );
  }, [setCurrentFilters]);

  const handleContinue = () => {
    const applyConnectors = (filters: FilterRule[]): FilterRule[] => {
      const groups: FilterRule[][] = [];
      const fieldIdx = new Map<FilterField, number>();

      for (const rule of filters) {
        const existing = fieldIdx.get(rule.field);
        if (existing !== undefined) {
          groups[existing].push(rule);
        } else {
          fieldIdx.set(rule.field, groups.length);
          groups.push([rule]);
        }
      }

      const result: FilterRule[] = [];
      groups.forEach((group, gi) => {
        group.forEach((rule, ri) => {
          const isLastInGroup = ri === group.length - 1;
          const isLastGroup = gi === groups.length - 1;
          let connector = rule.connector;
          if (isLastInGroup && !isLastGroup) connector = 'and';
          if (isLastInGroup && isLastGroup) connector = 'and';
          result.push({ ...rule, connector });
        });
      });
      return result;
    };

    onNext({
      candidateFilters: showCandidateTab ? applyConnectors(candidateFilters) : [],
      employeeFilters: showEmployeeTab ? applyConnectors(employeeFilters) : [],
    });
  };

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (candidateFilters.length > 0) parts.push(`${candidateFilters.length} candidate`);
    if (employeeFilters.length > 0) parts.push(`${employeeFilters.length} employee`);
    return parts.length > 0 ? parts.join(', ') + ' filter(s)' : 'No filters';
  }, [candidateFilters.length, employeeFilters.length]);

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">Advanced Filters</h2>
            <p className="text-xs text-muted">SQL-level constraints applied before the semantic search</p>
          </div>
        </div>

        {showCandidateTab && showEmployeeTab && (
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100/50 dark:bg-dark-hover/50 mb-5">
            <button
              onClick={() => setActiveTab('candidate')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'candidate'
                  ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              Candidate Filters
              {candidateFilters.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                  {candidateFilters.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('employee')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'employee'
                  ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              Employee Filters
              {employeeFilters.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                  {employeeFilters.length}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="mb-4">
          <p className="text-sm font-medium text-secondary mb-2">Add Filter</p>
          <div className="flex flex-wrap gap-1.5">
            {availableFields.map((fieldConfig) => (
              <button
                key={fieldConfig.field}
                onClick={() => handleAddRule(fieldConfig)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg glass-panel-subtle text-secondary hover:text-primary hover:bg-white/10 transition-all border border-gray-200/20 dark:border-dark-border/20"
              >
                + {fieldConfig.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'employee' && (
          <div className="flex items-start gap-2 px-3 py-2 mb-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <svg className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Contractor hourly rates (≤100 USD) are auto-converted to monthly (×160) for salary filter comparisons.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {currentFilters.length === 0 && (
            <div className="text-center py-8 text-sm text-muted">
              No filters added. Click a pill above to add a filter rule.
            </div>
          )}

          {groupedFilters.map((group, groupIndex) => (
            <div key={group.field}>
              {groupIndex > 0 && (
                <div className="flex items-center justify-center py-1.5">
                  <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-indigo-500/15 text-indigo-500">
                    AND
                  </span>
                </div>
              )}
              <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                  <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 text-xs font-semibold rounded-md">
                    {group.fieldConfig.label}
                  </span>
                  <button
                    onClick={() => handleAddRule(group.fieldConfig)}
                    className="w-5 h-5 flex items-center justify-center rounded-md text-indigo-400 hover:bg-indigo-500/15 transition-all"
                    title={`Add another ${group.fieldConfig.label} filter`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <div className="px-2 pb-2 space-y-0">
                  {group.rules.map((rule, ruleIndex) => (
                    <div key={rule.id}>
                      {ruleIndex > 0 && (
                        <div className="flex items-center justify-center py-0.5">
                          <button
                            onClick={() => {
                              const prevRule = group.rules[ruleIndex - 1];
                              handleUpdateRule(prevRule.id, {
                                connector: prevRule.connector === 'or' ? 'and' : 'or',
                              });
                            }}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-all ${
                              group.rules[ruleIndex - 1].connector === 'and'
                                ? 'bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500/25'
                                : 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
                            }`}
                            title="Click to toggle AND/OR"
                          >
                            {group.rules[ruleIndex - 1].connector === 'and' ? 'AND' : 'OR'}
                          </button>
                        </div>
                      )}
                      <FilterRuleRow
                        rule={rule}
                        fieldConfig={group.fieldConfig}
                        filterOptions={filterOptions}
                        onUpdate={(updates) => handleUpdateRule(rule.id, updates)}
                        onRemove={() => handleRemoveRule(rule.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalFilterCount > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200/10 dark:border-dark-border/10">
            <p className="text-xs text-muted">{filterSummary}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleContinue}
        className="w-full py-3 px-6 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-xl font-semibold text-sm transition-all duration-200"
      >
        Continue
      </button>
    </div>
  );
}

interface FilterRuleRowProps {
  rule: FilterRule;
  fieldConfig: FieldConfig;
  filterOptions: FilterOptions | null;
  onUpdate: (updates: Partial<FilterRule>) => void;
  onRemove: () => void;
}

function FilterRuleRow({ rule, fieldConfig, filterOptions, onUpdate, onRemove }: FilterRuleRowProps) {
  const options = fieldConfig.optionsKey && filterOptions
    ? filterOptions[fieldConfig.optionsKey] ?? []
    : [];

  const cycleOperator = () => {
    const ops = fieldConfig.operators;
    const currentIdx = ops.findIndex((o) => o.value === rule.operator);
    const nextIdx = (currentIdx + 1) % ops.length;
    onUpdate({ operator: ops[nextIdx].value });
  };

  const isNegativeOp = ['notEquals', 'gte'].includes(rule.operator);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
      <button
        onClick={cycleOperator}
        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex-shrink-0 ${
          isNegativeOp
            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
            : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/20'
        }`}
        title="Click to toggle operator"
      >
        {fieldConfig.operators.find((o) => o.value === rule.operator)?.label}
      </button>

      {fieldConfig.valueType === 'dropdown' && (
        options.length > 0 ? (
          <select
            value={rule.value as string}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="glass-input text-sm py-1 px-2 flex-1 text-primary"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={rule.value as string}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Type value..."
            className="glass-input text-sm py-1 px-2 flex-1 text-primary placeholder:text-muted"
          />
        )
      )}

      {fieldConfig.valueType === 'multi-select' && (
        options.length > 0 ? (
          <select
            value={rule.value as string}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="glass-input text-sm py-1 px-2 flex-1 text-primary"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={rule.value as string}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Type value..."
            className="glass-input text-sm py-1 px-2 flex-1 text-primary placeholder:text-muted"
          />
        )
      )}

      {fieldConfig.valueType === 'number-currency' && (
        <div className="flex items-center gap-1.5 flex-1">
          <input
            type="number"
            min={0}
            value={rule.value as number || ''}
            onChange={(e) => onUpdate({ value: e.target.value ? Number(e.target.value) : 0 })}
            placeholder="Amount"
            className="glass-input text-sm py-1 px-2 w-28 text-primary placeholder:text-muted"
          />
          <select
            value={rule.currency ?? ''}
            onChange={(e) => onUpdate({ currency: e.target.value || undefined })}
            className="glass-input text-sm py-1 px-2 w-20 text-primary"
          >
            <option value="">Any</option>
            {filterOptions?.currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {fieldConfig.valueType === 'date' && (
        <input
          type="date"
          value={rule.value as string || ''}
          onChange={(e) => onUpdate({ value: e.target.value })}
          className="glass-input text-sm py-1 px-2 flex-1 text-primary"
        />
      )}

      {fieldConfig.valueType === 'boolean' && (
        <select
          value={String(rule.value)}
          onChange={(e) => onUpdate({ value: e.target.value === 'true' })}
          className="glass-input text-sm py-1 px-2 flex-1 text-primary"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )}

      <button
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
