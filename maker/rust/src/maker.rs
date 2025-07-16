use clap::Parser;
use crossword_grapher::{CrosswordGraph, GRID_SIZE, MIN_WORD_LENGTH};
use rand::prelude::*;
use std::collections::HashSet;
use std::fs;
use std::time::Instant;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Input file containing words
    #[arg(short, long, default_value = "../turkish_words.txt")]
    input: String,
    
    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,
    
    /// Use parallel processing for graph generation
    #[arg(short, long)]
    parallel: bool,
    
    /// Maximum number of attempts
    #[arg(short, long, default_value = "100")]
    max_attempts: usize,
    
    /// Random seed for reproducible results
    #[arg(short, long)]
    seed: Option<u64>,
}

#[derive(Debug, Clone)]
struct WordPlacement {
    word: String,
    row: usize,
    col: usize,
    direction: Direction,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum Direction {
    Horizontal,
    Vertical,
}

impl WordPlacement {
    fn get_positions(&self) -> Vec<(usize, usize)> {
        let mut positions = Vec::new();
        for (i, _) in self.word.chars().enumerate() {
            match self.direction {
                Direction::Horizontal => positions.push((self.row, self.col + i)),
                Direction::Vertical => positions.push((self.row + i, self.col)),
            }
        }
        positions
    }
}

#[derive(Debug, Clone)]
struct CrosswordGrid {
    grid: Vec<Vec<char>>,
    word_placements: Vec<WordPlacement>,
    words_on_grid: HashSet<String>,
    filled_cells: usize,
    graph: CrosswordGraph,
}

impl CrosswordGrid {
    fn new(graph: CrosswordGraph) -> Self {
        Self {
            grid: vec![vec!['.'; GRID_SIZE]; GRID_SIZE],
            word_placements: Vec::new(),
            words_on_grid: HashSet::new(),
            filled_cells: 0,
            graph,
        }
    }

    fn can_place_word(&self, word: &str, row: usize, col: usize, direction: Direction) -> bool {
        // Early exit if word is already placed
        if self.words_on_grid.contains(word) {
            return false;
        }

        match direction {
            Direction::Horizontal => {
                if col + word.len() > GRID_SIZE {
                    return false;
                }
                for (i, ch) in word.chars().enumerate() {
                    let cell = self.grid[row][col + i];
                    if cell != '.' && cell != ch {
                        return false;
                    }
                }
            }
            Direction::Vertical => {
                if row + word.len() > GRID_SIZE {
                    return false;
                }
                for (i, ch) in word.chars().enumerate() {
                    let cell = self.grid[row + i][col];
                    if cell != '.' && cell != ch {
                        return false;
                    }
                }
            }
        }
        true
    }

    fn place_word(&mut self, word: &str, row: usize, col: usize, direction: Direction, verbose: bool) -> bool {
        if !self.can_place_word(word, row, col, direction) {
            if verbose {
                println!("      ❌ Cannot place '{}' - conflicts with existing letters", word);
            }
            return false;
        }

        // Create backup
        let old_grid = self.grid.clone();
        let old_placements = self.word_placements.clone();
        let old_words_on_grid = self.words_on_grid.clone();
        let old_filled_cells = self.filled_cells;

        // Place the word
        let placement = WordPlacement {
            word: word.to_string(),
            row,
            col,
            direction,
        };

        let positions = placement.get_positions();
        for (i, (r, c)) in positions.iter().enumerate() {
            let ch = word.chars().nth(i).unwrap();
            if self.grid[*r][*c] == '.' {
                self.filled_cells += 1;
            }
            self.grid[*r][*c] = ch;
        }

        self.word_placements.push(placement);
        self.words_on_grid.insert(word.to_string());

        // Check if we're close to completion and save grid
        let empty_cells = (GRID_SIZE * GRID_SIZE) - self.filled_cells;
        if empty_cells <= (GRID_SIZE / 2) {
            if self.is_solvable_grid() {
                self.save_grid_to_file("solvables/");
            } else if empty_cells <= (GRID_SIZE / 2).saturating_sub(1) {
                self.save_grid_to_file("close_calls/");
            }
        }

        // Final validation of the grid state
        if self.validate_grid_state(verbose) {
            if verbose {
                println!("      ✅ '{}' placed successfully and grid state validated", word);
            }
            true
        } else {
            if verbose {
                println!("      ❌ '{}' placed but failed final grid state validation", word);
            }
            // Restore backup
            self.grid = old_grid;
            self.word_placements = old_placements;
            self.words_on_grid = old_words_on_grid;
            self.filled_cells = old_filled_cells;
            false
        }
    }

    fn get_row_state(&self, row: usize) -> String {
        self.grid[row].iter().collect()
    }

    fn get_col_state(&self, col: usize) -> String {
        (0..GRID_SIZE).map(|row| self.grid[row][col]).collect()
    }

    fn validate_grid_state(&self, verbose: bool) -> bool {
        // Check all rows
        for row in 0..GRID_SIZE {
            let row_state = self.get_row_state(row);
            if !self.validate_row_column(&row_state) {
                if verbose {
                    println!("      🔍 Row {} validation failed: '{}'", row, row_state);
                }
                return false;
            }
        }

        // Check all columns
        for col in 0..GRID_SIZE {
            let col_state = self.get_col_state(col);
            if !self.validate_row_column(&col_state) {
                if verbose {
                    println!("      🔍 Column {} validation failed: '{}'", col, col_state);
                }
                return false;
            }
        }

        // Additional check: every filled cell must be able to form wordful liners
        self.validate_cell_wordful_constraints(verbose)
    }

    fn validate_cell_wordful_constraints(&self, verbose: bool) -> bool {
        for row in 0..GRID_SIZE {
            for col in 0..GRID_SIZE {
                if self.grid[row][col] != '.' {
                    let row_state = self.get_row_state(row);
                    if !self.can_form_wordful_liner(&row_state, verbose) {
                        if verbose {
                            println!("      🔍 Cell ({},{}) cannot form wordful horizontal liner: '{}'", row, col, row_state);
                        }
                        return false;
                    }

                    let col_state = self.get_col_state(col);
                    if !self.can_form_wordful_liner(&col_state, verbose) {
                        if verbose {
                            println!("      🔍 Cell ({},{}) cannot form wordful vertical liner: '{}'", row, col, col_state);
                        }
                        return false;
                    }
                }
            }
        }
        true
    }

    fn can_form_wordful_liner(&self, current_state: &str, _verbose: bool) -> bool {
        let empty_positions: Vec<usize> = current_state
            .chars()
            .enumerate()
            .filter(|(_, c)| *c == '.')
            .map(|(i, _)| i)
            .collect();

        if empty_positions.is_empty() {
            // No empty cells - check if current state is valid
            return self.graph.words().contains(current_state) || self.graph.liners().contains(current_state);
        }

        // Special case: if the entire state is empty, it's always valid
        if empty_positions.len() == GRID_SIZE {
            return true;
        }

        // Try simple patterns
        let mut pattern1 = current_state.chars().collect::<Vec<_>>();
        for &pos in &empty_positions {
            pattern1[pos] = '_';
        }
        let pattern1_str: String = pattern1.iter().collect();
        if self.is_wordful_liner(&pattern1_str) {
            return true;
        }

        let mut pattern2 = current_state.chars().collect::<Vec<_>>();
        for &pos in &empty_positions {
            pattern2[pos] = '@';
        }
        let pattern2_str: String = pattern2.iter().collect();
        if self.is_wordful_liner(&pattern2_str) {
            return true;
        }

        // Try more combinations if we have few empty positions
        if empty_positions.len() <= 2 {
            let replacements = vec!['_', '@'];
            for combo in (0..empty_positions.len()).map(|_| replacements.iter()).multi_cartesian_product() {
                let mut candidate = current_state.chars().collect::<Vec<_>>();
                for (pos, replacement) in empty_positions.iter().zip(combo) {
                    candidate[*pos] = *replacement;
                }
                let candidate_str: String = candidate.iter().collect();
                if self.is_wordful_liner(&candidate_str) {
                    return true;
                }
            }
        }

        false
    }

    fn is_wordful_liner(&self, liner_pattern: &str) -> bool {
        if !self.graph.liners().contains(liner_pattern) {
            return false;
        }

        let intermediaries = self.graph.get_intermediaries_for_liner(liner_pattern);
        for intermediary in intermediaries {
            let words = self.graph.get_words_for_pattern(&intermediary);
            if !words.is_empty() {
                return true;
            }
        }
        false
    }

    fn validate_row_column(&self, current_state: &str) -> bool {
        let empty_positions: Vec<usize> = current_state
            .chars()
            .enumerate()
            .filter(|(_, c)| *c == '.')
            .map(|(i, _)| i)
            .collect();

        if empty_positions.is_empty() {
            return self.graph.liners().contains(current_state) || self.graph.words().contains(current_state);
        }

        if empty_positions.len() == GRID_SIZE {
            return true;
        }

        // Try common patterns
        let test_patterns = vec![
            current_state.replace('.', "_"),
            current_state.replace('.', "@"),
        ];

        for pattern in test_patterns {
            if self.is_achievable_liner(&pattern) {
                return true;
            }
        }

        // Try more combinations for small number of empty positions
        if empty_positions.len() <= 3 {
            let replacements = vec!['_', '@'];
            for combo in (0..empty_positions.len()).map(|_| replacements.iter()).multi_cartesian_product() {
                let mut candidate = current_state.chars().collect::<Vec<_>>();
                for (pos, replacement) in empty_positions.iter().zip(combo) {
                    candidate[*pos] = *replacement;
                }
                let candidate_str: String = candidate.iter().collect();
                if self.is_achievable_liner(&candidate_str) {
                    return true;
                }
            }
        }

        false
    }

    fn is_achievable_liner(&self, liner_pattern: &str) -> bool {
        self.is_wordful_liner(liner_pattern)
    }

    fn get_possible_placements(&self, rng: &mut StdRng) -> Vec<(String, usize, usize, Direction)> {
        let mut placements = Vec::new();

        // Check each row for possible horizontal placements
        for row in 0..GRID_SIZE {
            let row_state = self.get_row_state(row);
            if row_state.contains('.') {
                let row_placements = self.get_placements_for_line(&row_state, row, Direction::Horizontal);
                placements.extend(row_placements);
            }
        }

        // Check each column for possible vertical placements
        for col in 0..GRID_SIZE {
            let col_state = self.get_col_state(col);
            if col_state.contains('.') {
                let col_placements = self.get_placements_for_line(&col_state, col, Direction::Vertical);
                placements.extend(col_placements);
            }
        }

        // Filter out words already placed
        let mut valid_placements: Vec<_> = placements
            .into_iter()
            .filter(|(word, _, _, _)| !self.words_on_grid.contains(word))
            .collect();

        // Prioritize by word length (GRID_SIZE first) and randomize within each group
        let mut grid_size_placements: Vec<_> = valid_placements
            .iter()
            .filter(|(word, _, _, _)| word.len() == GRID_SIZE)
            .cloned()
            .collect();
        let mut shorter_placements: Vec<_> = valid_placements
            .iter()
            .filter(|(word, _, _, _)| word.len() < GRID_SIZE)
            .cloned()
            .collect();

        grid_size_placements.shuffle(rng);
        shorter_placements.shuffle(rng);

        if !grid_size_placements.is_empty() {
            grid_size_placements
        } else {
            shorter_placements
        }
    }

    fn get_placements_for_line(&self, line_state: &str, line_index: usize, direction: Direction) -> Vec<(String, usize, usize, Direction)> {
        let mut placements = Vec::new();
        let empty_positions: Vec<usize> = line_state
            .chars()
            .enumerate()
            .filter(|(_, c)| *c == '.')
            .map(|(i, _)| i)
            .collect();

        if empty_positions.is_empty() {
            return placements;
        }

        let possible_liners = self.generate_liner_patterns(line_state);

        for liner_pattern in possible_liners {
            if self.graph.liners().contains(&liner_pattern) {
                let intermediaries = self.graph.get_intermediaries_for_liner(&liner_pattern);

                for intermediary in intermediaries {
                    let words = self.graph.get_words_for_pattern(&intermediary);

                    for word in words {
                        let word_placements = self.find_word_positions_in_liner(&word, &liner_pattern, line_state);

                        for start_pos in word_placements {
                            match direction {
                                Direction::Horizontal => {
                                    placements.push((word.clone(), line_index, start_pos, Direction::Horizontal));
                                }
                                Direction::Vertical => {
                                    placements.push((word.clone(), start_pos, line_index, Direction::Vertical));
                                }
                            }
                        }
                    }
                }
            }
        }

        placements
    }

    fn generate_liner_patterns(&self, line_state: &str) -> Vec<String> {
        let empty_positions: Vec<usize> = line_state
            .chars()
            .enumerate()
            .filter(|(_, c)| *c == '.')
            .map(|(i, _)| i)
            .collect();

        if empty_positions.is_empty() {
            return vec![line_state.to_string()];
        }

        let mut patterns = Vec::new();

        if empty_positions.len() <= 3 {
            let replacements = vec!['_', '@'];
            for combo in (0..empty_positions.len()).map(|_| replacements.iter()).multi_cartesian_product() {
                let mut pattern = line_state.chars().collect::<Vec<_>>();
                for (pos, replacement) in empty_positions.iter().zip(combo) {
                    pattern[*pos] = *replacement;
                }
                patterns.push(pattern.iter().collect());
            }
        } else {
            // For larger number of empty positions, try only common patterns
            patterns.push(line_state.replace('.', "_"));
            patterns.push(line_state.replace('.', "@"));

            if empty_positions.len() >= 2 {
                let mid = empty_positions.len() / 2;
                let mut pattern3 = line_state.chars().collect::<Vec<_>>();
                for (i, &pos) in empty_positions.iter().enumerate() {
                    pattern3[pos] = if i < mid { '_' } else { '@' };
                }
                patterns.push(pattern3.iter().collect());

                let mut pattern4 = line_state.chars().collect::<Vec<_>>();
                for (i, &pos) in empty_positions.iter().enumerate() {
                    pattern4[pos] = if i < mid { '@' } else { '_' };
                }
                patterns.push(pattern4.iter().collect());
            }
        }

        // Filter to only return patterns that exist in our liner set
        patterns
            .into_iter()
            .filter(|pattern| self.graph.liners().contains(pattern))
            .collect()
    }

    fn find_word_positions_in_liner(&self, word: &str, liner_pattern: &str, line_state: &str) -> Vec<usize> {
        let mut valid_positions = Vec::new();

        for start_pos in 0..=(GRID_SIZE - word.len()) {
            let mut can_place = true;

            for (i, ch) in word.chars().enumerate() {
                let liner_pos = start_pos + i;
                let liner_char = liner_pattern.chars().nth(liner_pos).unwrap();
                let line_char = line_state.chars().nth(liner_pos).unwrap();

                if liner_char == '@' {
                    can_place = false;
                    break;
                } else if liner_char != '_' && liner_char != ch {
                    can_place = false;
                    break;
                } else if line_char != '.' && line_char != ch {
                    can_place = false;
                    break;
                }
            }

            if can_place {
                valid_positions.push(start_pos);
            }
        }

        valid_positions
    }

    fn is_complete(&self) -> bool {
        self.filled_cells == GRID_SIZE * GRID_SIZE
    }

    fn print_grid(&self) {
        println!("📋 Current Grid:");
        print!("   ");
        for i in 0..GRID_SIZE {
            print!("{} ", i);
        }
        println!();

        for (i, row) in self.grid.iter().enumerate() {
            print!(" {} ", i);
            for &cell in row {
                print!("{} ", if cell == '.' { '·' } else { cell });
            }
            println!();
        }

        let total_cells = GRID_SIZE * GRID_SIZE;
        let fill_percentage = (self.filled_cells as f64 / total_cells as f64) * 100.0;
        println!("📈 Fill progress: {}/{} cells ({:.1}%)", self.filled_cells, total_cells, fill_percentage);
        println!();
    }

    fn is_solvable_grid(&self) -> bool {
        // Check if all rows and columns can still lead to valid liners
        for row in 0..GRID_SIZE {
            if !self.is_solvable_row(row) {
                return false;
            }
        }
        for col in 0..GRID_SIZE {
            if !self.is_solvable_column(col) {
                return false;
            }
        }
        true
    }

    fn is_solvable_row(&self, row: usize) -> bool {
        let row_state = self.get_row_state(row);
        self.is_solvable_line_state(&row_state)
    }

    fn is_solvable_column(&self, col: usize) -> bool {
        let col_state = self.get_col_state(col);
        self.is_solvable_line_state(&col_state)
    }

    fn is_solvable_line_state(&self, line_state: &str) -> bool {
        let words: Vec<&str> = line_state.split('.').collect();
        words.iter().all(|&word| {
            word.is_empty() || (self.graph.words().contains(word) && word.len() >= MIN_WORD_LENGTH)
        })
    }

    fn save_grid_to_file(&self, dirname: &str) {
        let signature = self.get_grid_state_signature();
        let filename = format!("{}/grid_{}x{}_{}_empty_{}.txt", dirname, GRID_SIZE, GRID_SIZE, signature.matches('-').count(), signature);
        
        if let Err(e) = fs::create_dir_all(dirname) {
            eprintln!("Error creating directory: {}", e);
            return;
        }

        let mut content = String::new();
        content.push_str(&format!("Grid saved\n"));
        content.push_str(&format!("Filled cells: {}/{}\n", self.filled_cells, GRID_SIZE * GRID_SIZE));
        content.push_str(&format!("Words placed: {}\n\n", self.word_placements.len()));

        content.push_str("Grid:\n");
        content.push_str("   ");
        for i in 0..GRID_SIZE {
            content.push_str(&format!("{} ", i));
        }
        content.push('\n');

        for (i, row) in self.grid.iter().enumerate() {
            content.push_str(&format!(" {} ", i));
            for &cell in row {
                content.push_str(&format!("{} ", if cell == '.' { '·' } else { cell }));
            }
            content.push('\n');
        }

        content.push_str("\nPlaced words:\n");
        for (i, word) in self.word_placements.iter().enumerate() {
            content.push_str(&format!("{:2}. '{}' at ({},{}) {:?}\n", i + 1, word.word, word.row, word.col, word.direction));
        }

        let unique_words: Vec<String> = self.words_on_grid.iter().cloned().collect();
        content.push_str(&format!("\nUnique words placed ({}):\n", unique_words.len()));
        for (i, word) in unique_words.iter().enumerate() {
            content.push_str(&format!("{:2}. {}\n", i + 1, word));
        }

        if let Err(e) = fs::write(&filename, content) {
            eprintln!("Error saving grid to file: {}", e);
        }
    }

    fn get_grid_state_signature(&self) -> String {
        self.grid
            .iter()
            .map(|row| row.iter().collect::<String>())
            .collect::<Vec<_>>()
            .join("")
            .replace('.', "-")
    }
}

struct CrosswordSolver {
    graph: CrosswordGraph,
    rng: StdRng,
    attempts: usize,
    max_attempts: usize,
    visited_states: HashSet<String>,
}

impl CrosswordSolver {
    fn new(graph: CrosswordGraph, seed: Option<u64>, max_attempts: usize) -> Self {
        let rng = if let Some(seed) = seed {
            StdRng::seed_from_u64(seed)
        } else {
            StdRng::from_entropy()
        };

        Self {
            graph,
            rng,
            attempts: 0,
            max_attempts,
            visited_states: HashSet::new(),
        }
    }

    fn solve(&mut self, verbose: bool) -> Option<CrosswordGrid> {
        let mut grid = CrosswordGrid::new(self.graph.clone());
        self.attempts = 0;
        self.visited_states.clear();

        if verbose {
            println!("🚀 Starting DFS crossword generation...");
            println!("📊 Graph statistics:");
            println!("   - Total words: {}", self.graph.words().len());
            println!("   - {}-letter words (priority): {}", GRID_SIZE, self.graph.words().iter().filter(|w| w.len() == GRID_SIZE).count());
            println!("   - Shorter words: {}", self.graph.words().iter().filter(|w| w.len() < GRID_SIZE).count());
            println!("   - Total liners: {}", self.graph.liners().len());
            println!("   - Max attempts: {}", self.max_attempts);
            println!("📏 Grid size: {}x{}", GRID_SIZE, GRID_SIZE);
            println!("🎯 Strategy: Prioritize {}-letter words, use padded liners for shorter words", GRID_SIZE);
        }

        let result = self.dfs_solve(&mut grid, Vec::new(), verbose);

        match result {
            Some(solution) => {
                if verbose {
                    println!("\n🎉 SOLUTION FOUND after {} attempts!", self.attempts);
                }
                Some(solution)
            }
            None => {
                if verbose {
                    println!("\n😞 No solution found after {} attempts.", self.attempts);
                }
                None
            }
        }
    }

    fn dfs_solve(&mut self, grid: &mut CrosswordGrid, placement_history: Vec<(String, usize, usize, Direction)>, verbose: bool) -> Option<CrosswordGrid> {
        self.attempts += 1;

        if self.attempts > self.max_attempts {
            println!("Max attempts ({}) reached after {} attempts. Stopping.", self.max_attempts, self.attempts);
            panic!("Max attempts reached - terminating program");
        }

        // Create grid state signature
        let grid_signature = grid.get_grid_state_signature();
        if self.visited_states.contains(&grid_signature) {
            return None;
        }

        // Show progress
        if self.attempts <= 3 || self.attempts % 25 == 0 {
            if verbose {
                println!("\n🔄 Attempt {} - {} words placed", self.attempts, grid.word_placements.len());
                grid.print_grid();
            }
        }

        // Check if grid is complete
        if grid.is_complete() {
            if verbose {
                println!("\n🎉 SOLUTION FOUND! Grid is complete after {} attempts!", self.attempts);
                println!("Final grid:");
                grid.print_grid();
            }
            return Some(grid.clone());
        }

        // Get possible word placements
        let placements = grid.get_possible_placements(&mut self.rng);

        if placements.is_empty() {
            if verbose {
                println!("❌ No valid placements found at attempt {}. Backtracking...", self.attempts);
            }
            return None;
        }

        // Filter out placements we've already tried in this branch
        let new_placements: Vec<_> = placements
            .into_iter()
            .filter(|placement| !placement_history.contains(placement))
            .collect();

        if new_placements.is_empty() {
            if verbose {
                println!("❌ No new placements available at attempt {}. Backtracking...", self.attempts);
            }
            return None;
        }

        if self.attempts <= 3 && verbose {
            println!("Trying {} new placements at attempt {}...", new_placements.len(), self.attempts);
        }

        // Try each placement
        for (i, (word, row, col, direction)) in new_placements.iter().enumerate() {
            if self.attempts <= 3 && verbose {
                println!("  {} (attempt {}). Trying '{}' at ({},{}) {:?}", i + 1, self.attempts, word, row, col, direction);
            }

            // Create a new grid for this attempt
            let mut new_grid = grid.clone();

            // Try the new placement
            if new_grid.place_word(word, *row, *col, *direction, false) {  // Don't use verbose for individual validations
                if verbose {
                    println!("    ✅ Successfully placed '{}' at attempt {}", word, self.attempts);
                    // Show the grid state after successful placement
                    println!("      📋 Current grid state after placing '{}':", word);
                    new_grid.print_grid();
                }

                // Add this placement to history
                let mut new_history = placement_history.clone();
                new_history.push((word.clone(), *row, *col, *direction));

                // Recursively solve
                if let Some(result) = self.dfs_solve(&mut new_grid, new_history, verbose) {
                    if verbose {
                        println!("🎉 Found solution with '{}' placed at ({},{}) {:?}", word, row, col, direction);
                    }
                    return Some(result);
                }

                if self.attempts <= 3 && verbose {
                    println!("    ↩️ Backtracking from '{}' at attempt {}", word, self.attempts);
                }
            } else if self.attempts <= 3 && verbose {
                println!("    ❌ Failed to place '{}' at attempt {}", word, self.attempts);
            }
        }

        self.visited_states.insert(grid_signature);
        None
    }
}

// Need to add this trait for multi_cartesian_product
use itertools::Itertools;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    
    // Load the graph
    if args.verbose {
        println!("Loading crossword graph...");
    }
    
    let mut graph = CrosswordGraph::new();
    graph.load_words(&args.input, args.verbose)?;
    graph.find_real_intermediaries(args.verbose, args.parallel);
    graph.build_graph(args.verbose);
    graph.generate_liners(args.verbose);

    // Create directories
    fs::create_dir_all("close_calls")?;
    fs::create_dir_all("solvables")?;
    
    if args.verbose {
        println!("Graph loaded: {} words, {} liners", graph.words().len(), graph.liners().len());
    }
    
    // Create solver
    let mut solver = CrosswordSolver::new(graph, args.seed, args.max_attempts);
    
    // Solve the crossword
    let start_time = Instant::now();
    let solution = solver.solve(args.verbose);
    let duration = start_time.elapsed();
    
    if let Some(solution) = solution {
        println!("\n=== CROSSWORD SOLUTION ===");
        solution.print_grid();
        
        println!("Placed words:");
        for (i, word_placement) in solution.word_placements.iter().enumerate() {
            println!("{}. {} at ({}, {}) {:?}", i + 1, word_placement.word, word_placement.row, word_placement.col, word_placement.direction);
        }
        
        println!("\nSolved in {:.2?} with {} attempts", duration, solver.attempts);
    } else {
        println!("No solution found in {:.2?} after {} attempts!", duration, solver.attempts);
    }

    Ok(())
}
