import { FC } from 'react';
import SummarySection from './SummarySection';
import TableView from './TableView';
import CardView from './CardView';
import { DashboardMetrics, ViewType } from '../types';

interface DashboardProps {
  metrics: DashboardMetrics;
  viewType: ViewType;
  onProjectSelect: (projectId: number) => void;
}

const Dashboard: FC<DashboardProps> = ({ metrics, viewType, onProjectSelect }) => {
  return (
    <div className="dashboard">
      <SummarySection metrics={metrics} />
      
      <section className="projects-section">
        <h2>Project Metrics</h2>
        
        {viewType === ViewType.TABLE ? (
          <TableView 
            projects={metrics.projects} 
            onProjectSelect={onProjectSelect} 
          />
        ) : (
          <CardView 
            projects={metrics.projects} 
            onProjectSelect={onProjectSelect} 
          />
        )}
      </section>
    </div>
  );
};

export default Dashboard;