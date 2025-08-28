import { Modal, Button } from 'react-bootstrap';
import { type FC } from 'react';

type Variant = 'primary' | 'success' | 'danger' | 'warning' | 'info';

export const InfoModal: FC<{
  show: boolean;
  title?: string;
  message?: string;
  variant?: Variant;
  onClose: () => void;
}> = ({ show, title = 'Messaggio', message = '', variant = 'primary', onClose }) => {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={`alert alert-${variant} mb-0`} role="alert">
          {message}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant={variant} onClick={onClose}>OK</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InfoModal;