// Navigation and movement functions

function moveToNextWhiteCell(row, col, dx, dy) {
  console.log(`moveToNextWhiteCell from (${row}, ${col}) with dx:${dx}, dy:${dy}`);
  let r = row;
  let c = col;
  let originalR = row;
  let originalC = col;

  do {
    r += dy;
    c += dx;
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
        console.log(`Hit boundary at (${r}, ${c}). Staying at original.`);
        selected = { row: originalR, col: originalC };
        return;
    }
  } while (grid[r][c] === "-");

  console.log(`Moved to next white cell: (${r}, ${c})`);
  selected = { row: r, col: c };
}

function moveToNextEnterableCell(row, col, dx, dy) {
  console.log(`moveToNextEnterableCell from (${row}, ${col}) with dx:${dx}, dy:${dy}`);
  let nextR = row + dy;
  let nextC = col + dx;

  while (nextR < gridSize && nextC < gridSize && nextR >= 0 && nextC >= 0) {
    if (grid[nextR][nextC] !== "-" && answers[nextR][nextC] === "") {
      selected = { row: nextR, col: nextC };
      console.log(`Moved to next enterable cell in current word: (${selected.row}, ${selected.col})`);
      return;
    }
    nextR += dy;
    nextC += dx;
  }

  console.log("No next enterable cell in current word. Searching for next word.");
  if (currentDirection === 'across') {
    for (let r_new = row; r_new < gridSize; r_new++) {
      for (let c_new = (r_new === row ? col + 1 : 0); c_new < gridSize; c_new++) {
        if (grid[r_new][c_new] !== '-' && answers[r_new][c_new] === "") {
          selected = { row: r_new, col: c_new };
          console.log(`Moved to start of next across word: (${selected.row}, ${selected.col})`);
          return;
        }
      }
    }
  } else { // 'down'
    for (let c_new = col; c_new < gridSize; c_new++) {
      for (let r_new = (c_new === col ? row + 1 : 0); r_new < gridSize; r_new++) {
        if (grid[r_new][c_new] !== '-' && answers[r_new][c_new] === "") {
          selected = { row: r_new, col: c_new };
          console.log(`Moved to start of next down word: (${selected.row}, ${selected.col})`);
          return;
        }
      }
    }
  }
  console.log("No next enterable cell found in entire grid. Staying at current.");
  selected = { row: row, col: col };
}

function moveToPreviousEnterableCell(row, col, dx, dy) {
    console.log(`moveToPreviousEnterableCell from (${row}, ${col}) with dx:${dx}, dy:${dy}`);
    let prevR = row - dy;
    let prevC = col - dx;

    while (prevR >= 0 && prevC >= 0 && prevR < gridSize && prevC < gridSize) {
        if (grid[prevR][prevC] !== "-") {
            selected = { row: prevR, col: prevC };
            console.log(`Moved to previous enterable cell in current word: (${selected.row}, ${selected.col})`);
            return;
        }
        prevR -= dy;
        prevC -= dx;
    }

    console.log("No previous enterable cell in current word. Searching for end of previous word.");
    if (currentDirection === 'across') {
        for (let r_new = row; r_new >= 0; r_new--) {
            for (let c_new = (r_new === row ? col - 1 : gridSize - 1); c_new >= 0; c_new--) {
                if (grid[r_new][c_new] !== '-') {
                    if (c_new === gridSize - 1 || grid[r_new][c_new + 1] === '-') {
                         selected = { row: r_new, col: c_new };
                         console.log(`Moved to end of previous across word: (${selected.row}, ${selected.col})`);
                         return;
                    }
                }
            }
        }
    } else { // 'down'
        for (let c_new = col; c_new >= 0; c_new--) {
            for (let r_new = (c_new === col ? row - 1 : gridSize - 1); r_new >= 0; r_new--) {
                if (grid[r_new][c_new] !== '-') {
                    if (r_new === gridSize - 1 || grid[r_new + 1][c_new] === '-') {
                        selected = { row: r_new, col: c_new };
                        console.log(`Moved to end of previous down word: (${selected.row}, ${selected.col})`);
                        return;
                    }
                }
            }
        }
    }
    console.log("No previous word found in entire grid. Staying at current.");
    selected = { row: row, col: col };
}
