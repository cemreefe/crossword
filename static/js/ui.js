// UI and rendering functions

function renderGrid() {
  console.log(`renderGrid called. Selected: (${selected.row}, ${selected.col}), Direction: ${currentDirection}`);
  const gridEl = document.getElementById("grid");
  gridEl.className = "grid";
  gridEl.innerHTML = "";

  // Set CSS custom property for responsive grid sizing
  document.documentElement.style.setProperty('--grid-size', gridSize);

  document.querySelectorAll('.clues li').forEach(el => {
    el.classList.remove('highlighted-clue');
    el.style.display = 'none';
  });

  const { wordCells: highlightedWordCells, clueId: activeClueId } = getWordInfo(selected.row, selected.col, currentDirection);
  console.log("Highlighted word cells:", highlightedWordCells);
  console.log("Active clue ID from getWordInfo:", activeClueId);

  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const div = document.createElement("div");
      let classList = ["cell"];
      if (cell === "-") classList.push("black");

      const isHighlightedWordCell = highlightedWordCells.some(wc => wc.r === r && wc.c === c);
      if (isHighlightedWordCell) {
        classList.push("highlighted-word");
      }

      if (r === selected.row && c === selected.col) {
        classList.push("selected");
      }
      div.className = classList.join(" ");

      div.dataset.row = r;
      div.dataset.col = c;
      div.textContent = answers[r][c];

      div.onclick = () => {
        console.log(`Cell clicked: (${r}, ${c}). Current selected: (${selected.row}, ${selected.col})`);
        if (grid[r][c] === "-") {
          console.log("Clicked black cell, ignored.");
          return;
        }

        if (selected.row === r && selected.col === c) {
          currentDirection = currentDirection === 'across' ? 'down' : 'across';
          console.log(`Switched direction to: ${currentDirection}`);
        } else {
          selected = { row: r, col: c };
          console.log(`New cell selected: (${selected.row}, ${selected.col})`);

          const acrossWordInfo = getWordInfo(r, c, 'across');
          const downWordInfo = getWordInfo(r, c, 'down');

          const hasAcrossWord = acrossWordInfo.wordCells.length > 0 && acrossWordInfo.clueId;
          const hasDownWord = downWordInfo.wordCells.length > 0 && downWordInfo.clueId;

          if (currentDirection === 'across' && hasAcrossWord) {
            console.log("Keeping direction across due to valid word.");
          } else if (currentDirection === 'down' && hasDownWord) {
            console.log("Keeping direction down due to valid word.");
          } else if (hasAcrossWord) {
            currentDirection = 'across';
            console.log("Changed direction to across (only valid word).");
          } else if (hasDownWord) {
            currentDirection = 'down';
            console.log("Changed direction to down (only valid word).");
          } else {
            currentDirection = 'across';
            console.log("Defaulting direction to across (no valid words found).");
          }
        }
        renderGrid();
        
        // Show custom keyboard on mobile, focus hidden input on desktop
        if (isMobileDevice()) {
          showCustomKeyboard();
        } else {
          if (!hiddenInput.matches(':focus')) {
            setTimeout(() => {
              hiddenInput.focus();
            }, 10);
          }
        }
      };

      gridEl.appendChild(div);
    });
  });

  function getNthItemUsingEntries(direction, n) {
    const entries = Object.entries(direction === 'across' ? cluesData.H : cluesData.V);
    if (n >= 0 && n < entries.length) {
      return entries[n][1];
    }
    return undefined;
  }

  if (activeClueId) {
    const clue = getNthItemUsingEntries(currentDirection, activeClueId-1);
    document.getElementById("clue").innerText = clue;
  }

  // Handle both input and keydown events for better mobile/desktop compatibility
  hiddenInput.oninput = (e) => {
    console.log(`Input event on hidden input: ${e.target.value}. Current selected: (${selected.row}, ${selected.col}), Direction: ${currentDirection}`);
    const r = selected.row;
    const c = selected.col;

    if (grid[r][c] === "-") {
      console.log("Input on black cell, ignored.");
      hiddenInput.value = '';
      return;
    }

    const inputValue = e.target.value;
    if (inputValue && inputValue.length > 0) {
      const lastChar = inputValue[inputValue.length - 1];
      if (/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(lastChar)) {
        answers[r][c] = toUpperCaseWithLocale(lastChar);
        console.log(`Entered '${toUpperCaseWithLocale(lastChar)}' at (${r}, ${c}). Answers[${r}][${c}] = '${answers[r][c]}'`);

        if (checkIfAllFilled()) {
          console.log("All cells are filled. Checking if complete...");
          if (isPuzzleComplete()) {
            console.log("Crossword is complete!");
            showSuccessModal();
          } else {
            console.log("Crossword is filled but incorrect.");
            if (!allCellsFilledOnce) {
              showErrorModal();
            }
            allCellsFilledOnce = true;
          }
        }
        if (currentDirection === 'across') {
          moveToNextEnterableCell(r, c, 1, 0);
        } else {
          moveToNextEnterableCell(r, c, 0, 1);
        }
        renderGrid();
      }
    }
    // Clear the hidden input value after processing
    hiddenInput.value = '';
  };

  hiddenInput.onkeydown = (e) => {
    console.log(`Keydown event on hidden input: ${e.key}. Current selected: (${selected.row}, ${selected.col}), Direction: ${currentDirection}`);
    const r = selected.row;
    const c = selected.col;

    if (grid[r][c] === "-") {
      console.log("Key press on black cell, ignored.");
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      console.log(`Backspace pressed at (${r}, ${c}). Current value: '${answers[r][c]}'`);
      if (answers[r][c] !== "") {
        answers[r][c] = "";
        console.log(`Cleared cell (${r}, ${c}).`);
      } else {
        console.log(`Cell (${r}, ${c}) was empty, moving to previous enterable cell.`);
        if (currentDirection === 'across') {
          moveToPreviousEnterableCell(r, c, 1, 0);
        } else {
          moveToPreviousEnterableCell(r, c, 0, 1);
        }
      }
      renderGrid();
    } else if (e.key === "ArrowRight") {
        currentDirection = 'across';
        moveToNextWhiteCell(r, c, 1, 0);
        renderGrid();
    } else if (e.key === "ArrowLeft") {
        currentDirection = 'across';
        moveToNextWhiteCell(r, c, -1, 0);
        renderGrid();
    } else if (e.key === "ArrowUp") {
        currentDirection = 'down';
        moveToNextWhiteCell(r, c, 0, -1);
        renderGrid();
    } else if (e.key === "ArrowDown") {
        currentDirection = 'down';
        moveToNextWhiteCell(r, c, 0, 1);
        renderGrid();
    }
  };
}
