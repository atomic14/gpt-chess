import React, { useState } from "react";
import { Button } from "react-bootstrap";
import "chessboard-element";
import { Chess, Color } from 'chess.js'
import { ToastContainer, toast } from 'react-toastify';

import ChessGPT from "./chess_master_2000/ChessGPT";
import ChessBoard from "./components/ChessBoard";
import StartGameModal from "./components/StartGameModal";
import 'react-toastify/dist/ReactToastify.css';
import TextDisplay from "./components/TextDisplay";
import AIMoveModal from "./components/AIMoveModal";
import { getAllValidSanMoves, getBoardDescription } from "./chess_master_2000/ChessHelpers";


function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [fen, setFen] = useState('');
  const [pgn, setPgn] = useState('');
  const [ascii, setAscii] = useState('');
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [showStartGameModal, setShowStartGameModal] = useState(false);
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [showAIMoveModal, setShowAIMoveModal] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const game = useState(new Chess())[0];
  const ai = useState(new ChessGPT())[0];

  function updateGameState() {
    setFen(game.fen());
    setPgn(game.pgn());
    setAscii(game.ascii().replace(/ /g, ''));
    setValidMoves(getAllValidSanMoves(game));
    setBoardDescription(getBoardDescription(game));
  }

  function startNewGame(playerColor: Color) {
    game.clear();
    game.reset();
    ai.clear();
    updateGameState();
    setPlayerColor(playerColor);
    setIsGameStarted(true);
    setShowStartGameModal(false);
    if (playerColor !== game.turn()) {
      setShowAIMoveModal(true);
    }
  }

  function onPlayerMove(from: string, to: string, promotion?: string) {
    game.move({ from, to, promotion });
    updateGameState();
    if (game.isGameOver()) {
      handleGameOver();
    } else {
      // get the AI move
      setShowAIMoveModal(true);
    }
  }

  function onAIMove(aiMove: string, reason: string) {
    game.move(aiMove);
    updateGameState();
    setAiMessage(reason);
    setShowAIMoveModal(false);
    if (game.isGameOver()) {
      handleGameOver();
    }
  }

  function handleGameOver() {
    setIsGameStarted(false);
    if (game.isCheckmate()) {
      if (game.turn() === playerColor) {
        toast.error('You lost to Checkmate!');
      } else {
        toast.success('You won by Checkmate!');
      }
    } else {
      if (game.isDraw()) {
        toast.info('Game ended in a draw!');
      } else if (game.isStalemate()) {
        toast.info('Game ended in a stalemate!');
      } else if (game.isThreefoldRepetition()) {
        toast.info('Game ended in a threefold repetition!');
      } else if (game.isInsufficientMaterial()) {
        toast.info('Game ended in insufficient material (K vs. K, K vs. KB, or K vs. KN)');
      } else {
        toast.info('Game ended in an unknown way!');
      }
    }
  }

  return (
    <div className='container'>
      <div className='chessboard'>
        <ChessBoard game={game} fen={fen} isGameStarted={isGameStarted} playerColor={playerColor} onPlayerMove={(from, to, promotion) => onPlayerMove(from, to, promotion)} />
      </div>
      <div className="right_panel">
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1rem' }}>
          <Button disabled={isGameStarted} variant='primary' onClick={() => setShowStartGameModal(true)}>Start Game</Button>
          <Button disabled={!isGameStarted} variant='danger' onClick={() => setIsGameStarted(false)}>Resign</Button>
        </div>
        <TextDisplay title='AI Messages' text={aiMessage} />
        <TextDisplay title='PGN' text={pgn} />
        <TextDisplay title='FEN' breakAnywhere text={fen} />
      </div>
      <StartGameModal
        showModal={showStartGameModal}
        handleCloseModal={() => setShowStartGameModal(false)}
        onStartGame={(color) => startNewGame(color)} />
      <AIMoveModal
        showModal={showAIMoveModal}
        ai={ai}
        fen={fen}
        pgn={pgn}
        ascii={ascii}
        boardDescription={boardDescription}
        validMoves={validMoves}
        aiColor={playerColor === 'w' ? 'b' : 'w'}
        setApiKey={(key) => setApiKey(key)}
        apiKey={apiKey}
        onMove={(move, reason) => onAIMove(move, reason)}
      />
      <ToastContainer position="top-center" />
    </div>
  );
}

export default App;
