import useResizeObserver from "@react-hook/resize-observer";
import { Chess, Color } from "chess.js";
import React from "react";
import { useEffect, useRef } from "react";

const whiteSquareGrey = '#a9a9a9';
const blackSquareGrey = '#696969';

type ChessBoardProps = {
  game: Chess
  isGameStarted: boolean
  playerColor: Color
  onPlayerMove: (from: string, to: string) => void
  fen: string
}

const useSize = (target: React.RefObject<HTMLElement>) => {
  const [size, setSize] = React.useState<{ width: Number, height: Number }>()

  React.useLayoutEffect(() => {
    if (target.current) {
      setSize(target.current.getBoundingClientRect())
    }
  }, [target])

  // Where the magic happens
  useResizeObserver(target, (entry) => setSize(entry.contentRect))
  return size
}

export default function ChessBoard({ game, fen, isGameStarted, playerColor, onPlayerMove }: ChessBoardProps) {
  // chessboard-element ref
  const chessBoardRef = useRef<HTMLElement>(null);

  // update the chessboard when the game fen changes
  useEffect(() => {
    if (chessBoardRef.current) {
      chessBoardRef.current.setAttribute('position', fen);
    }
  }, [fen]);

  const size = useSize(chessBoardRef);

  useEffect(() => {
    function setEdgeHighlightStyle(style: string) {
      const edgeHighlightStyles: HTMLElement = document.getElementById("edgeHighlightStyles")!;
      edgeHighlightStyles!.textContent = style;
    }

    function setBackgroundStyle(style: string) {
      const legalMoveHighlightStyles: HTMLElement = document.getElementById("legalMoveHighlightStyles")!;
      legalMoveHighlightStyles!.textContent = style;
    }

    function greySquare(square: string) {
      const highlightColor = (square.charCodeAt(0) % 2) ^ (square.charCodeAt(1) % 2)
        ? whiteSquareGrey
        : blackSquareGrey;

      setBackgroundStyle(`
          chess-board::part(${square}) {
          background-color: ${highlightColor};
        }`);
    }

    function onDragStart(event: any) {
      // do not pick up pieces if the game is over
      if (game.isGameOver() || !isGameStarted || playerColor !== game.turn()) {
        event.preventDefault();
        return;
      }

      const { source, piece } = event.detail;

      // or if it's not that side's turn
      if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        event.preventDefault();
        return;
      }

      // get list of possible moves for this square
      const moves = game.moves({
        square: source,
        verbose: true
      });

      if (moves.length === 0) {
        event.preventDefault();
        return;
      }
      // highlight the square they moused over
      greySquare(source);

      // highlight the possible squares for this piece
      for (const move of moves) {
        greySquare(move.to);
      }
    }

    function onDragMove(event: any) {
      const moves = game.moves({ verbose: true });
      console.log(event.detail);
      const is_valid_move = moves.some(move => move.from === event.detail.source && move.to === event.detail.newLocation);
      if (is_valid_move) {
        setEdgeHighlightStyle(`
          chess-board::part(${event.detail.newLocation}) {
            box-shadow: inset 0 0 3px 3px rgba(0, 255, 0, 0.5);
          }`);
      } else {
        setEdgeHighlightStyle(`
          chess-board::part(${event.detail.newLocation}) {
            box-shadow: inset 0 0 3px 3px rgba(255, 0, 0, 0.5);
          }`);
      }
    }

    async function onDrop(event: any) {
      const { source, target, setAction } = event.detail;
      // clear any highlighting
      setEdgeHighlightStyle("");
      setBackgroundStyle("");

      if (source === target) {
        setAction('snapback');
        return;
      }

      // see if the move is legal
      try {
        await onPlayerMove(source, target);
      } catch (e) {
        setAction('snapback');
      }
    }

    const chessBoard = chessBoardRef.current;
    if (chessBoard) {
      chessBoard.addEventListener("drag-move", onDragMove);
      chessBoard.addEventListener("drag-start", onDragStart);
      chessBoard.addEventListener("drop", onDrop);
    }

    // Clean up the event listener when the component unmounts
    return () => {
      if (chessBoard) {
        chessBoard.removeEventListener("drag-move", onDragMove);
        chessBoard.removeEventListener("drag-start", onDragStart);
        chessBoard.removeEventListener("drop", onDrop);
      }
    };
  }, [chessBoardRef, game, isGameStarted, onPlayerMove, playerColor]);

  return (
    <div style={{ marginBottom: -(size?.width || 0) / 8 }}>
      <chess-board
        sparePieces={false}
        ref={chessBoardRef}
        position='start'
        draggable-pieces={isGameStarted}
      ></chess-board>
    </div>
  );
}