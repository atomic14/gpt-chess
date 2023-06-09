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
        <h3>What's all this about?</h3>
        <p>I've been playing around with ChatGPT plugins and made fun <a href="https://gpt-chess.atomic14.com/">chess plugin</a> - but not many people have access to plugins yet.</p>
        <p>You can learn all about the plugin by watching <a href="https://youtu.be/lXFeq2yUy58">this video</a> - it's pretty interesting</p>
        <p>So I made this simple website to make it easier to play chess againt ChatGPT.</p>
        <p>You can either: copy and paste the moves into a ChatGPT session - or - if you have API access you can paste an APIKey in. Everything happens client side so it's pretty safe.</p>
        <p>GPT-3.5 is pretty rubbish, GPT-4 will give you a slightly better game.</p>
        <p>The code is available <a href='https://github.com/atomic14/gpt-chess'>here</a> - it's very rough and ready.</p>
        <p>If you like this then do check out my <a href='https://www.youtube.com/@atomic14'>YouTube channel</a>. If you really like it, you might consider contributing something on <a href='https://www.patreon.com/atomic14'>patreon...</a></p>
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
      <ToastContainer position="top-right" />
    </div>
  );
}

export default App;
