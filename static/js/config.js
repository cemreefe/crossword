// Configuration and global variables
let puzzleDate; // Will be set dynamically to the latest available puzzle date
const lang = new URLSearchParams(window.location.search).get('lang') || 'tr';
let allCellsFilledOnce = false; // Track if all cells have been filled at least once

// Game state variables
let selected = { row: 0, col: 0 };
let currentDirection = 'across'; // 'across' or 'down'
let answers = [];
let gridSize = 0;
let grid = [];
let cluesData = { H: {}, V: {} };
let cluePositions = {
  across: {},
  down: {}
};
let timerInterval;
let startTime;

// DOM elements
const hiddenInput = document.getElementById("hiddenInput");

// Utility functions
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 768 && window.innerHeight <= 1024);
}

console.log("Configuration loaded.");
