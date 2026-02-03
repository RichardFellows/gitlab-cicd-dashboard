import { MRWithProject } from '../types';
import MRCard from './MRCard';
import '../styles/MRBoard.css';

interface MRBoardColumnProps {
  title: string;
  icon: string;
  colorClass: string;
  count: number;
  mergeRequests: MRWithProject[];
  onMRSelect: (mr: MRWithProject) => void;
  darkMode?: boolean;
}

const MRBoardColumn = ({
  title,
  icon,
  colorClass,
  count,
  mergeRequests,
  onMRSelect,
  darkMode,
}: MRBoardColumnProps) => {
  return (
    <div className={`mr-board-column ${colorClass}`}>
      <div className="mr-board-column__header">
        <span className="mr-board-column__icon">{icon}</span>
        <span className="mr-board-column__title">{title}</span>
        <span className="mr-board-column__badge">{count}</span>
      </div>
      <div className="mr-board-column__list">
        {mergeRequests.length === 0 ? (
          <div className="mr-board-column__empty">No MRs with this status</div>
        ) : (
          mergeRequests.map(mr => (
            <MRCard
              key={`${mr.projectId}-${mr.iid}`}
              mr={mr}
              onSelect={() => onMRSelect(mr)}
              darkMode={darkMode}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MRBoardColumn;
