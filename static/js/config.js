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
const iosKeyboardTrigger = document.getElementById("iosKeyboardTrigger");

console.log("Configuration loaded.");
