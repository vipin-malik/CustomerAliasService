import Chip from '@mui/material/Chip';

interface ConfidenceBadgeProps {
  score: number | null;
  isResolved: boolean;
}

const ConfidenceBadge = ({ score, isResolved }: ConfidenceBadgeProps) => {
  if (!isResolved) {
    return <Chip label="Unresolved" color="error" size="small" variant="outlined" />;
  }

  if (score !== null && score >= 90) {
    return <Chip label={`High (${score}%)`} color="success" size="small" variant="outlined" />;
  }

  if (score !== null && score >= 70) {
    return <Chip label={`Medium (${score}%)`} color="warning" size="small" variant="outlined" />;
  }

  return <Chip label={`Low (${score ?? 0}%)`} color="error" size="small" variant="outlined" />;
};

export default ConfidenceBadge;
