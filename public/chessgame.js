const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const moveSound = new Audio('/move.mp3');
const invalidMoveSound = new Audio('/wrong.mp3');

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handelMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b"){
    boardElement.classList.add("flipped");
  }
  else{
    boardElement.classList.remove("flipped");
  }
};

const handelMove = (source, target) => {
  // Determine the piece being moved
  const piece = chess.get(`${String.fromCharCode(97 + source.col)}${8 - source.row}`);

  // Build the move object
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
  };

  // If the piece is a pawn and it's moving to the last rank (8 for white, 1 for black), add promotion
  if (piece && piece.type === 'p' && (target.row === 0 || target.row === 7)) {
    move.promotion = "q";  // Promote to queen by default
  }

  const result = chess.move(move);  // Attempt the move in the chess instance

  if (result) {
    moveSound.play();
    socket.emit("move", move);  // Emit the move to the server only if it's valid
    renderBoard();  // Re-render the board after the move
  } else {
    invalidMoveSound.play();
    console.log("Invalid move");
  }
};


const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♙",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  return unicodePieces[piece.type] || "";
};

socket.on("playerRole", (role) => {
  playerRole = role;  // Set player role based on server data
  renderBoard();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  renderBoard();
});

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
});

renderBoard();
