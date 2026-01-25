import { FC } from 'react';
import { VersionReadiness } from '../types';

interface ReadinessDetailsProps {
  readiness: VersionReadiness;
  jiraBaseUrl?: string;
}

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Expanded details panel for a version's readiness status.
 * Shows deployment info, MR link, sign-off details, and test job link.
 */
const ReadinessDetails: FC<ReadinessDetailsProps> = ({
  readiness,
  jiraBaseUrl
}) => {
  const { deployment, signoff, testStatus, mr, status } = readiness;

  // Determine what's blocking promotion
  const getBlockers = (): string[] => {
    const blockers: string[] = [];
    
    if (status === 'not-deployed') {
      blockers.push('Not deployed to this environment');
    }
    if (status === 'tests-failed') {
      blockers.push('Post-deployment tests failed');
    }
    if (status === 'pending-signoff') {
      blockers.push('Awaiting sign-off from CODEOWNERS');
    }
    
    return blockers;
  };

  const blockers = getBlockers();

  return (
    <div className="readiness-details">
      <div className="readiness-details__section">
        <h4 className="readiness-details__section-title">Deployment</h4>
        {deployment ? (
          <dl className="readiness-details__list">
            <dt>Version</dt>
            <dd><code>{deployment.version || 'Unknown'}</code></dd>

            <dt>Environment</dt>
            <dd>{deployment.environment.toUpperCase()}</dd>

            <dt>Status</dt>
            <dd>
              <span className={`deployment-status deployment-status--${deployment.status}`}>
                {deployment.status}
              </span>
            </dd>

            <dt>Deployed</dt>
            <dd>{formatTimestamp(deployment.timestamp)}</dd>

            <dt>Pipeline</dt>
            <dd>
              {deployment.pipelineUrl ? (
                <a 
                  href={deployment.pipelineUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="readiness-details__link"
                >
                  #{deployment.pipelineId}
                </a>
              ) : (
                `#${deployment.pipelineId}`
              )}
            </dd>

            <dt>Job</dt>
            <dd>
              <a 
                href={deployment.jobUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="readiness-details__link"
              >
                {deployment.jobName}
              </a>
            </dd>

            {deployment.jiraKey && jiraBaseUrl && (
              <>
                <dt>JIRA</dt>
                <dd>
                  <a 
                    href={`${jiraBaseUrl}/${deployment.jiraKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="readiness-details__link"
                  >
                    {deployment.jiraKey}
                  </a>
                </dd>
              </>
            )}
          </dl>
        ) : (
          <p className="readiness-details__empty">Not deployed</p>
        )}
      </div>

      <div className="readiness-details__section">
        <h4 className="readiness-details__section-title">Merge Request</h4>
        {mr ? (
          <dl className="readiness-details__list">
            <dt>MR</dt>
            <dd>
              {mr.webUrl ? (
                <a 
                  href={mr.webUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="readiness-details__link"
                >
                  !{mr.iid}
                </a>
              ) : (
                `!${mr.iid}`
              )}
            </dd>
            {mr.title && (
              <>
                <dt>Title</dt>
                <dd className="readiness-details__mr-title">{mr.title}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="readiness-details__empty">No linked merge request</p>
        )}
      </div>

      <div className="readiness-details__section">
        <h4 className="readiness-details__section-title">Sign-off</h4>
        {signoff ? (
          <dl className="readiness-details__list">
            <dt>Author</dt>
            <dd>
              <span className={signoff.isValid ? 'signoff-valid' : 'signoff-invalid'}>
                @{signoff.author}
                {signoff.isValid ? ' ✓' : ' (not authorized)'}
              </span>
            </dd>

            <dt>Timestamp</dt>
            <dd>{formatTimestamp(signoff.timestamp)}</dd>

            <dt>Version</dt>
            <dd><code>{signoff.version}</code></dd>

            <dt>Environment</dt>
            <dd>{signoff.environment.toUpperCase()}</dd>
          </dl>
        ) : (
          <div className="readiness-details__signoff-help">
            <p className="readiness-details__empty">No sign-off found</p>
            <p className="readiness-details__help-text">
              Add a comment to the MR with format:
              <br />
              <code>SIGNOFF: v{readiness.version} {readiness.environment.toUpperCase()}</code>
            </p>
          </div>
        )}
      </div>

      <div className="readiness-details__section">
        <h4 className="readiness-details__section-title">Post-Deploy Tests</h4>
        {testStatus.exists ? (
          <dl className="readiness-details__list">
            <dt>Status</dt>
            <dd>
              <span className={`test-status test-status--${testStatus.passed ? 'passed' : 'failed'}`}>
                {testStatus.passed ? '✓ Passed' : '✗ Failed'}
              </span>
            </dd>

            {testStatus.jobName && (
              <>
                <dt>Job</dt>
                <dd>
                  {testStatus.jobUrl ? (
                    <a 
                      href={testStatus.jobUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="readiness-details__link"
                    >
                      {testStatus.jobName}
                    </a>
                  ) : (
                    testStatus.jobName
                  )}
                </dd>
              </>
            )}
          </dl>
        ) : (
          <p className="readiness-details__empty">No post-deploy tests configured</p>
        )}
      </div>

      {blockers.length > 0 && (
        <div className="readiness-details__section readiness-details__section--blockers">
          <h4 className="readiness-details__section-title">Blocking Promotion</h4>
          <ul className="readiness-details__blockers">
            {blockers.map((blocker, index) => (
              <li key={index} className="readiness-details__blocker">
                {blocker}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ReadinessDetails;
