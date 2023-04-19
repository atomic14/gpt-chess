import { Color } from "chess.js";
import { Button, Modal } from "react-bootstrap";

type StartGameProps = {
  showModal: boolean;
  handleCloseModal: () => void;
  onStartGame: (color: Color) => void;
}

export default function StartGame({ showModal, handleCloseModal, onStartGame }: StartGameProps) {
  return (
    <Modal show={showModal} onHide={handleCloseModal}>
      <Modal.Header closeButton>
        <Modal.Title>Start New Game</Modal.Title>
      </Modal.Header>
      <Modal.Body>Which color would you like to play?</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onStartGame('w')}>
          White
        </Button>
        <Button variant="secondary" onClick={() => onStartGame('b')}>
          Black
        </Button>
        <Button variant="primary" onClick={() => onStartGame(Math.random() >= 0.5 ? 'b' : 'w')}>
          Don't Care
        </Button>
      </Modal.Footer>
    </Modal >
  );
}