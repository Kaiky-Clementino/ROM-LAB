const WORDS = [
  { answer: "CPU", clue: "Cerebro do computador que executa instrucoes e coordena componentes." },
  { answer: "ULA", clue: "Bloco responsavel por calculos numericos e comparacoes logicas." },
  { answer: "UC", clue: "Parte que interpreta instrucoes e comanda o funcionamento interno." },
  { answer: "REGISTRADORES", clue: "Memorias internas ultrarrapidas usadas durante processamento imediato." },
  { answer: "RAM", clue: "Memoria volatil usada para dados e programas em execucao." },
  { answer: "ROM", clue: "Memoria permanente com instrucoes essenciais de inicializacao." },
  { answer: "EEPROM", clue: "Chip nao volatil regravavel eletricamente sem remover do circuito." },
  { answer: "FLASH", clue: "Tecnologia nao volatil apagada em blocos, comum em pendrives." },
  { answer: "CACHE", clue: "Memoria muito rapida que reduz acesso frequente a dados." },
  { answer: "MEMORIADEMASSA", clue: "Armazenamento de grande capacidade para dados persistentes." },
  { answer: "DMA", clue: "Recurso que transfere dados sem ocupar continuamente o processador." },
  { answer: "ADDRESSBUS", clue: "Linhas que indicam local de origem ou destino na memoria." },
  { answer: "DATABUS", clue: "Linhas eletricas que transportam informacoes entre componentes." },
  { answer: "MICROCONTROLADOR", clue: "Circuito integrado com processamento e perifericos para sistemas embarcados." },
  { answer: "DUALCORE", clue: "Processador com dois nucleos fisicos de execucao." },
  { answer: "QUADCORE", clue: "Processador com quatro nucleos para tarefas simultaneas." }
];

const BOARD_SIZE = 26;
const MAX_ATTEMPTS = 500;

const boardEl = document.getElementById("board");
const acrossEl = document.getElementById("acrossClues");
const downEl = document.getElementById("downClues");
const scoreEl = document.getElementById("score");
const feedbackEl = document.getElementById("feedback");
const checkBtn = document.getElementById("checkBtn");
const resetBtn = document.getElementById("resetBtn");

let game = null;

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function inBounds(row, col, size) {
  return row >= 0 && col >= 0 && row < size && col < size;
}

function canPlaceWord(board, word, row, col, direction, requireCross) {
  const size = board.length;
  let crosses = 0;

  for (let i = 0; i < word.length; i += 1) {
    const r = row + (direction === "down" ? i : 0);
    const c = col + (direction === "across" ? i : 0);
    if (!inBounds(r, c, size)) return null;

    const existing = board[r][c];
    const char = word[i];
    if (existing && existing !== char) return null;

    if (!existing) {
      if (direction === "across") {
        if (inBounds(r - 1, c, size) && board[r - 1][c]) return null;
        if (inBounds(r + 1, c, size) && board[r + 1][c]) return null;
      } else {
        if (inBounds(r, c - 1, size) && board[r][c - 1]) return null;
        if (inBounds(r, c + 1, size) && board[r][c + 1]) return null;
      }
    } else {
      crosses += 1;
    }
  }

  const beforeR = row + (direction === "down" ? -1 : 0);
  const beforeC = col + (direction === "across" ? -1 : 0);
  if (inBounds(beforeR, beforeC, size) && board[beforeR][beforeC]) return null;

  const afterR = row + (direction === "down" ? word.length : 0);
  const afterC = col + (direction === "across" ? word.length : 0);
  if (inBounds(afterR, afterC, size) && board[afterR][afterC]) return null;

  if (requireCross && crosses === 0) return null;
  return { crosses };
}

function placeWord(board, placement) {
  const { answer, row, col, direction, id, clue } = placement;
  for (let i = 0; i < answer.length; i += 1) {
    const r = row + (direction === "down" ? i : 0);
    const c = col + (direction === "across" ? i : 0);
    board[r][c] = answer[i];
  }
  return { id, answer, clue, row, col, direction };
}

function findCandidates(board, item, placed) {
  const candidates = [];
  const { answer } = item;

  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board.length; c += 1) {
      const cell = board[r][c];
      if (!cell) continue;

      for (let i = 0; i < answer.length; i += 1) {
        if (answer[i] !== cell) continue;

        const across = { row: r, col: c - i, direction: "across" };
        const down = { row: r - i, col: c, direction: "down" };

        const testAcross = canPlaceWord(board, answer, across.row, across.col, "across", placed > 0);
        if (testAcross) candidates.push({ ...across, score: testAcross.crosses });

        const testDown = canPlaceWord(board, answer, down.row, down.col, "down", placed > 0);
        if (testDown) candidates.push({ ...down, score: testDown.crosses });
      }
    }
  }
  return candidates;
}

function generateGame(words) {
  const baseOrder = [...words].sort((a, b) => b.answer.length - a.answer.length);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const board = createBoard(BOARD_SIZE);
    const head = baseOrder[0];
    const tail = shuffle(baseOrder.slice(1));
    const queue = [head, ...tail];
    const placements = [];

    const firstRow = Math.floor(BOARD_SIZE / 2);
    const firstCol = Math.floor((BOARD_SIZE - queue[0].answer.length) / 2);
    const firstPlacement = {
      ...queue[0],
      row: firstRow,
      col: firstCol,
      direction: "across",
      id: queue[0].answer
    };

    if (!canPlaceWord(board, queue[0].answer, firstRow, firstCol, "across", false)) continue;
    placements.push(placeWord(board, firstPlacement));

    let success = true;
    for (let i = 1; i < queue.length; i += 1) {
      const item = queue[i];
      const candidates = findCandidates(board, item, placements.length);

      if (candidates.length === 0) {
        success = false;
        break;
      }

      candidates.sort((a, b) => b.score - a.score);
      const bestScore = candidates[0].score;
      const best = candidates.filter((x) => x.score === bestScore);
      const chosen = best[Math.floor(Math.random() * best.length)];

      placements.push(
        placeWord(board, {
          ...item,
          row: chosen.row,
          col: chosen.col,
          direction: chosen.direction,
          id: item.answer
        })
      );
    }

    if (!success) continue;

    return finalizeBoard(board, placements);
  }

  throw new Error("Nao foi possivel gerar o tabuleiro com todas as palavras.");
}

function finalizeBoard(board, placements) {
  const rows = [];
  const cols = [];
  placements.forEach((p) => {
    for (let i = 0; i < p.answer.length; i += 1) {
      const r = p.row + (p.direction === "down" ? i : 0);
      const c = p.col + (p.direction === "across" ? i : 0);
      rows.push(r);
      cols.push(c);
    }
  });

  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  const starts = new Map();
  let currentNumber = 1;
  const sortedPlacements = [...placements].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    if (a.col !== b.col) return a.col - b.col;
    return a.direction.localeCompare(b.direction);
  });

  sortedPlacements.forEach((p) => {
    const key = `${p.row}-${p.col}`;
    if (!starts.has(key)) {
      starts.set(key, currentNumber);
      currentNumber += 1;
    }
    p.number = starts.get(key);
  });

  return {
    board,
    placements: sortedPlacements,
    bounds: { minRow, maxRow, minCol, maxCol }
  };
}

function renderGame(state) {
  const { board, placements, bounds } = state;
  const { minRow, maxRow, minCol, maxCol } = bounds;
  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;

  boardEl.style.setProperty("--cols", cols);
  boardEl.innerHTML = "";

  const cellMap = new Map();
  const wordCellMap = new Map();

  placements.forEach((p) => {
    for (let i = 0; i < p.answer.length; i += 1) {
      const r = p.row + (p.direction === "down" ? i : 0);
      const c = p.col + (p.direction === "across" ? i : 0);
      const key = `${r}-${c}`;
      if (!wordCellMap.has(key)) wordCellMap.set(key, []);
      wordCellMap.get(key).push(p.id);
    }
  });

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const realR = r + minRow;
      const realC = c + minCol;
      const key = `${realR}-${realC}`;

      const cell = document.createElement("div");
      cell.className = "cell";

      if (!board[realR][realC]) {
        cell.classList.add("blank");
        boardEl.appendChild(cell);
        continue;
      }

      const start = placements.find((p) => p.row === realR && p.col === realC);
      if (start) {
        const num = document.createElement("span");
        num.className = "num";
        num.textContent = String(start.number);
        cell.appendChild(num);
      }

      const input = document.createElement("input");
      input.maxLength = 1;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.dataset.row = String(realR);
      input.dataset.col = String(realC);
      input.addEventListener("input", handleInput);
      input.addEventListener("keydown", handleKeydown);

      cell.appendChild(input);
      boardEl.appendChild(cell);
      cellMap.set(key, { cell, input, words: wordCellMap.get(key) || [] });
    }
  }

  state.cellMap = cellMap;
  renderClues(placements);
}

function renderClues(placements) {
  acrossEl.innerHTML = "";
  downEl.innerHTML = "";

  const across = placements.filter((p) => p.direction === "across");
  const down = placements.filter((p) => p.direction === "down");

  across.forEach((p) => {
    const li = document.createElement("li");
    li.id = `clue-${p.id}`;
    li.textContent = `${p.number}. ${p.clue} (${p.answer.length})`;
    acrossEl.appendChild(li);
  });

  down.forEach((p) => {
    const li = document.createElement("li");
    li.id = `clue-${p.id}`;
    li.textContent = `${p.number}. ${p.clue} (${p.answer.length})`;
    downEl.appendChild(li);
  });
}

function handleInput(event) {
  const input = event.target;
  const cleaned = input.value.toUpperCase().replace(/[^A-Z]/g, "");
  input.value = cleaned;

  if (!cleaned) return;
  const row = Number(input.dataset.row);
  const col = Number(input.dataset.col);

  const rightKey = `${row}-${col + 1}`;
  const downKey = `${row + 1}-${col}`;
  const next = game.cellMap.get(rightKey) || game.cellMap.get(downKey);
  if (next) next.input.focus();
}

function handleKeydown(event) {
  const input = event.target;
  if (event.key !== "Backspace" || input.value) return;

  const row = Number(input.dataset.row);
  const col = Number(input.dataset.col);
  const leftKey = `${row}-${col - 1}`;
  const upKey = `${row - 1}-${col}`;
  const prev = game.cellMap.get(leftKey) || game.cellMap.get(upKey);
  if (prev) prev.input.focus();
}

function resetVisualState() {
  game.cellMap.forEach(({ cell }) => {
    cell.classList.remove("correct", "wrong");
  });

  game.placements.forEach((p) => {
    const clue = document.getElementById(`clue-${p.id}`);
    clue.classList.remove("ok", "erro");
  });

  feedbackEl.textContent = "";
  feedbackEl.classList.remove("win");
}

function checkAnswers() {
  resetVisualState();

  let correctCount = 0;
  const perCellStatus = new Map();

  game.placements.forEach((p) => {
    let typed = "";
    for (let i = 0; i < p.answer.length; i += 1) {
      const r = p.row + (p.direction === "down" ? i : 0);
      const c = p.col + (p.direction === "across" ? i : 0);
      const key = `${r}-${c}`;
      const cell = game.cellMap.get(key);
      typed += cell.input.value.toUpperCase();
    }

    const isCorrect = typed === p.answer;
    if (isCorrect) correctCount += 1;

    const clue = document.getElementById(`clue-${p.id}`);
    clue.classList.add(isCorrect ? "ok" : "erro");

    for (let i = 0; i < p.answer.length; i += 1) {
      const r = p.row + (p.direction === "down" ? i : 0);
      const c = p.col + (p.direction === "across" ? i : 0);
      const key = `${r}-${c}`;
      if (!perCellStatus.has(key)) perCellStatus.set(key, []);
      perCellStatus.get(key).push(isCorrect);
    }
  });

  perCellStatus.forEach((statusList, key) => {
    const state = statusList.every(Boolean) ? "correct" : "wrong";
    game.cellMap.get(key).cell.classList.add(state);
  });

  scoreEl.textContent = `${correctCount} de ${game.placements.length} palavras corretas`;
  if (correctCount === game.placements.length) {
    feedbackEl.textContent = "Parabens! Voce concluiu a cruzadinha com 100% de acertos.";
    feedbackEl.classList.add("win");
  }
}

function resetBoard() {
  game.cellMap.forEach(({ input }) => {
    input.value = "";
  });
  resetVisualState();
  scoreEl.textContent = `0 de ${game.placements.length} palavras corretas`;
}

function init() {
  game = generateGame(WORDS);
  renderGame(game);
  scoreEl.textContent = `0 de ${game.placements.length} palavras corretas`;

  checkBtn.addEventListener("click", checkAnswers);
  resetBtn.addEventListener("click", resetBoard);
}

init();
