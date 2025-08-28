import type { FC } from 'react';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../context/useAuth';

type Props = {
  doctorName?: string;
};

const CollaboratorBanner: FC<Props> = ({ doctorName }) => {
  const { user } = useAuth();
  if (!user || user.role !== 'ROLE_COLLABORATORE') return null;
  if (!doctorName) return null;
  const openSelector = () => {
    window.dispatchEvent(new Event('open-collaborator-menu'));
  };
  return (
    <Alert variant="info" className="py-2 px-3 d-flex align-items-center justify-content-between" style={{ borderRadius: 10 }}>
      <span>
        Operi come Collaboratore di <strong>{doctorName}</strong>
      </span>
      <button type="button" className="btn btn-sm btn-outline-primary" onClick={openSelector}>
        Cambia
      </button>
    </Alert>
  );
};

export default CollaboratorBanner;
