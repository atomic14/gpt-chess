declare namespace JSX {
  interface ChessBoardProps extends React.HTMLAttributes<HTMLElement> {
    position?: string;
    sparePieces?: boolean;
  }

  interface IntrinsicElements {
    "chess-board": React.DetailedHTMLProps<ChessBoardProps, HTMLElement>;
  }
}
