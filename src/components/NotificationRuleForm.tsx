import { FC, useState, useMemo } from 'react';
import { NotificationRule, NotificationRuleType, Project, ENVIRONMENT_ORDER, EnvironmentName } from '../types';
import { METRICS_THRESHOLDS } from '../utils/constants';

interface NotificationRuleFormProps {
  rule?: NotificationRule;        // Edit mode if provided
  projects: Project[];
  onSave: (rule: Omit<NotificationRule, 'id'>) => void;
  onCancel: () => void;
}

const RULE_TYPE_LABELS: Record<NotificationRuleType, string> = {
  'pipeline-failure': 'Pipeline Failure',
  'coverage-drop': 'Coverage Drop',
  'duration-spike': 'Duration Spike',
  'deployment-failure': 'Deployment Failure',
};

function generateAutoName(type: NotificationRuleType, scope: 'all' | number[], projects: Project[], env?: EnvironmentName): string {
  const typeLabel = RULE_TYPE_LABELS[type];
  if (scope === 'all') {
    const suffix = type === 'deployment-failure' && env ? ` (${env.toUpperCase()})` : '';
    return `${typeLabel} — All Projects${suffix}`;
  }
  if (scope.length === 1) {
    const project = projects.find(p => p.id === scope[0]);
    const name = project?.name || `Project ${scope[0]}`;
    const suffix = type === 'deployment-failure' && env ? ` (${env.toUpperCase()})` : '';
    return `${typeLabel} — ${name}${suffix}`;
  }
  const suffix = type === 'deployment-failure' && env ? ` (${env.toUpperCase()})` : '';
  return `${typeLabel} — ${scope.length} projects${suffix}`;
}

const NotificationRuleForm: FC<NotificationRuleFormProps> = ({
  rule,
  projects,
  onSave,
  onCancel,
}) => {
  const [type, setType] = useState<NotificationRuleType>(rule?.type || 'pipeline-failure');
  const [scopeType, setScopeType] = useState<'all' | 'specific'>(
    rule?.scope === 'all' ? 'all' : (Array.isArray(rule?.scope) ? 'specific' : 'all')
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>(
    Array.isArray(rule?.scope) ? rule.scope : []
  );
  const [threshold, setThreshold] = useState<string>(
    rule?.threshold?.toString() || ''
  );
  const [environment, setEnvironment] = useState<EnvironmentName>(
    rule?.environment || 'prod'
  );
  const [name, setName] = useState(rule?.name || '');
  const [nameEdited, setNameEdited] = useState(!!rule?.name);

  const needsThreshold = type === 'coverage-drop' || type === 'duration-spike';
  const needsEnvironment = type === 'deployment-failure';
  const scope: 'all' | number[] = scopeType === 'all' ? 'all' : selectedProjectIds;

  // Auto-generate name when relevant fields change (unless user manually edited)
  const autoName = useMemo(
    () => generateAutoName(type, scope, projects, needsEnvironment ? environment : undefined),
    [type, scope, projects, needsEnvironment, environment]
  );

  const displayName = nameEdited ? name : autoName;

  // Validation
  const validationErrors: string[] = [];
  if (needsThreshold) {
    const num = Number(threshold);
    if (!threshold || isNaN(num) || num <= 0) {
      validationErrors.push('Threshold must be a positive number');
    }
  }
  if (scopeType === 'specific' && selectedProjectIds.length === 0) {
    validationErrors.push('Select at least one project');
  }

  const isValid = validationErrors.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const defaultThreshold = type === 'coverage-drop'
      ? METRICS_THRESHOLDS.COVERAGE_TARGET
      : METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT;

    onSave({
      type,
      name: displayName,
      enabled: rule?.enabled ?? true,
      scope: scopeType === 'all' ? 'all' : selectedProjectIds,
      threshold: needsThreshold ? Number(threshold) || defaultThreshold : undefined,
      environment: needsEnvironment ? environment : undefined,
      createdAt: rule?.createdAt || new Date().toISOString(),
    });
  };

  const handleProjectToggle = (projectId: number) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleTypeChange = (newType: NotificationRuleType) => {
    setType(newType);
    // Reset threshold to sensible defaults
    if (newType === 'coverage-drop') {
      setThreshold(String(METRICS_THRESHOLDS.COVERAGE_TARGET));
    } else if (newType === 'duration-spike') {
      setThreshold(String(METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT));
    }
  };

  return (
    <form className="notification-rule-form" onSubmit={handleSubmit}>
      <div className="notification-form-field">
        <label htmlFor="rule-type">Rule Type</label>
        <select
          id="rule-type"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as NotificationRuleType)}
        >
          {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="notification-form-field">
        <label htmlFor="rule-name">Name</label>
        <input
          id="rule-name"
          type="text"
          value={displayName}
          onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
          placeholder="Auto-generated name"
        />
      </div>

      <div className="notification-form-field">
        <label>Scope</label>
        <div className="notification-scope-radios">
          <label className="notification-radio-label">
            <input
              type="radio"
              name="scope"
              value="all"
              checked={scopeType === 'all'}
              onChange={() => setScopeType('all')}
            />
            All projects
          </label>
          <label className="notification-radio-label">
            <input
              type="radio"
              name="scope"
              value="specific"
              checked={scopeType === 'specific'}
              onChange={() => setScopeType('specific')}
            />
            Specific projects
          </label>
        </div>
        {scopeType === 'specific' && (
          <div className="notification-project-list">
            {projects.map(p => (
              <label key={p.id} className="notification-project-checkbox">
                <input
                  type="checkbox"
                  checked={selectedProjectIds.includes(p.id)}
                  onChange={() => handleProjectToggle(p.id)}
                />
                {p.name}
              </label>
            ))}
            {projects.length === 0 && (
              <span className="notification-hint">Load dashboard to see projects</span>
            )}
          </div>
        )}
      </div>

      {needsThreshold && (
        <div className="notification-form-field">
          <label htmlFor="rule-threshold">
            {type === 'coverage-drop' ? 'Coverage Threshold (%)' : 'Duration Spike Threshold (%)'}
          </label>
          <input
            id="rule-threshold"
            type="number"
            min="1"
            step="1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={type === 'coverage-drop'
              ? String(METRICS_THRESHOLDS.COVERAGE_TARGET)
              : String(METRICS_THRESHOLDS.DURATION_SPIKE_PERCENT)}
          />
        </div>
      )}

      {needsEnvironment && (
        <div className="notification-form-field">
          <label htmlFor="rule-environment">Environment</label>
          <select
            id="rule-environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as EnvironmentName)}
          >
            {ENVIRONMENT_ORDER.map(env => (
              <option key={env} value={env}>{env.toUpperCase()}</option>
            ))}
          </select>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="notification-form-errors">
          {validationErrors.map((err, i) => (
            <p key={i} className="notification-form-error">{err}</p>
          ))}
        </div>
      )}

      <div className="notification-form-actions">
        <button type="submit" disabled={!isValid}>
          {rule ? 'Update Rule' : 'Add Rule'}
        </button>
        <button type="button" className="text-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default NotificationRuleForm;
