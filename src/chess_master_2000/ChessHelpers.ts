import { Chess } from "chess.js";

export function getAllValidSanMoves(game: Chess) {
  const validMoves = game.moves({ verbose: true });
  return validMoves.map((move) => move.san);
}

export function pieceTypeToName(pieceType: string) {
  switch (pieceType) {
    case "p":
      return "pawn";
    case "n":
      return "knight";
    case "b":
      return "bishop";
    case "r":
      return "rook";
    case "q":
      return "queen";
    case "k":
      return "king";
    default:
      throw new Error(`Unknown piece type: ${pieceType}`);
  }
}

export function getBoardDescription(game: Chess) {
  // build a text description of the board
  const board = game.board();
  // board is a 2D array - flatten it
  const flatBoard = [];
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      flatBoard.push(board[i][j]);
    }
  }
  const whitePieces = flatBoard.filter((sq) => sq && sq.color === "w");
  const blackPieces = flatBoard.filter((sq) => sq && sq.color === "b");
  const blackPositions = blackPieces
    .map((sq) => `${pieceTypeToName(sq!.type)} at ${sq!.square}`)
    .join(", ");
  const whitePositions = whitePieces
    .map((sq) => `${pieceTypeToName(sq!.type)} at ${sq!.square}`)
    .join(", ");
  return `White pieces: ${whitePositions}.\nBlack pieces: ${blackPositions}.`;
}
