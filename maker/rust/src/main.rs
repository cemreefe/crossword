use clap::Parser;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::{BufRead, BufReader};
use itertools::Itertools;
use rayon::prelude::*;

// Configuration constants
const GRID_SIZE: usize = 4;
const MIN_WORD_LENGTH: usize = 4;
const TURKISH_ALPHABET: &str = "abcdefghijklmnopqrstuvwxyzçğıöşü";

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Input file containing words
    #[arg(short, long, default_value = "../turkish_words.txt")]
    input: String,
    
    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,
    
    /// Use parallel processing (experimental)
    #[arg(short, long)]
    parallel: bool,
}

#[derive(Debug, Clone)]
pub struct CrosswordGraph {
    // Dictionary mapping intermediary patterns to words that match them
    intermediary_to_words: HashMap<String, HashSet<String>>,
    // Set of all valid words
    words: HashSet<String>,
    // Set of all words that can be checked against (includes longer words)
    words_that_can_be_checked_against: HashSet<String>,
    // Set of all real intermediaries (those that actually occur)
    real_intermediaries: HashSet<String>,
    // Dictionary mapping liners to their child intermediaries
    liner_to_intermediaries: HashMap<String, HashSet<String>>,
    // Set of all valid liners
    liners: HashSet<String>,
}

impl CrosswordGraph {
    pub fn new() -> Self {
        Self {
            intermediary_to_words: HashMap::new(),
            words: HashSet::new(),
            words_that_can_be_checked_against: HashSet::new(),
            real_intermediaries: HashSet::new(),
            liner_to_intermediaries: HashMap::new(),
            liners: HashSet::new(),
        }
    }

    pub fn load_words(&mut self, filename: &str, verbose: bool) -> Result<(), Box<dyn std::error::Error>> {
        if verbose {
            println!("Loading words from {}...", filename);
        }
        
        let file = File::open(filename)?;
        let reader = BufReader::new(file);
        
        for line in reader.lines() {
            let line = line?;
            let word = line.trim().to_lowercase().replace(" ", "");
            
            // Filter words: length between MIN_WORD_LENGTH and GRID_SIZE
            if word.len() >= MIN_WORD_LENGTH && word.len() <= GRID_SIZE {
                if Self::is_valid_word(&word) {
                    self.words.insert(word.clone());
                }
            }
            
            // Add to extended word set if valid
            if Self::is_valid_word(&word) {
                self.words_that_can_be_checked_against.insert(word);
            }
        }
        
        if verbose {
            println!("Loaded {} valid words", self.words.len());
        }
        
        Ok(())
    }

    fn is_valid_word(word: &str) -> bool {
        word.chars().all(|c| TURKISH_ALPHABET.contains(c))
    }

    pub fn generate_intermediaries_for_word(&self, word: &str) -> HashSet<String> {
        let mut intermediaries = HashSet::new();
        let word_len = word.len();
        let word_chars: Vec<char> = word.chars().collect();
        
        // Generate all possible combinations with underscores
        // For each position, we can either have the letter or underscore
        for i in 1..(1 << word_len) - 1 {  // Exclude all letters (0) and no letters (2^n-1)
            let mut intermediary = String::new();
            let mut has_underscore = false;
            let mut has_letter = false;
            
            for j in 0..word_len {
                if i & (1 << j) != 0 {  // If bit j is set, use underscore
                    intermediary.push('_');
                    has_underscore = true;
                } else {  // Otherwise use the actual letter
                    if j < word_chars.len() {
                        intermediary.push(word_chars[j]);
                        has_letter = true;
                    }
                }
            }
            
            // Only add if it has at least one underscore and one letter
            if has_underscore && has_letter {
                intermediaries.insert(intermediary);
            }
        }
        
        intermediaries
    }

    pub fn find_real_intermediaries(&mut self, verbose: bool, parallel: bool) {
        if verbose {
            println!("Finding real intermediaries...");
        }
        
        if parallel {
            // Parallel processing of words
            let words: Vec<String> = self.words.iter().cloned().collect();
            let all_intermediaries: Vec<HashSet<String>> = words
                .par_iter()
                .map(|word| self.generate_intermediaries_for_word(word))
                .collect();
            
            for intermediaries in all_intermediaries {
                self.real_intermediaries.extend(intermediaries);
            }
        } else {
            // Sequential processing
            for word in &self.words {
                let intermediaries = self.generate_intermediaries_for_word(word);
                self.real_intermediaries.extend(intermediaries);
            }
        }
        
        // Add pure underscore patterns as wildcard intermediaries
        for length in MIN_WORD_LENGTH..=GRID_SIZE {
            let wildcard_pattern = "_".repeat(length);
            self.real_intermediaries.insert(wildcard_pattern);
        }
        
        if verbose {
            println!("Found {} real intermediaries (including wildcards)", 
                     self.real_intermediaries.len());
        }
    }

    pub fn build_graph(&mut self, verbose: bool) {
        if verbose {
            println!("Building graph connections...");
        }
        
        for word in &self.words {
            let intermediaries = self.generate_intermediaries_for_word(word);
            
            // Only connect to real intermediaries
            for intermediary in intermediaries {
                if self.real_intermediaries.contains(&intermediary) {
                    self.intermediary_to_words
                        .entry(intermediary)
                        .or_insert_with(HashSet::new)
                        .insert(word.clone());
                }
            }
        }
        
        // Handle pure underscore patterns (wildcards) - match all words of same length
        for length in MIN_WORD_LENGTH..=GRID_SIZE {
            let wildcard_pattern = "_".repeat(length);
            if self.real_intermediaries.contains(&wildcard_pattern) {
                // Connect to all words of this length
                for word in &self.words {
                    if word.len() == length {
                        self.intermediary_to_words
                            .entry(wildcard_pattern.clone())
                            .or_insert_with(HashSet::new)
                            .insert(word.clone());
                    }
                }
            }
        }
        
        if verbose {
            println!("Graph built with {} intermediary nodes", 
                     self.intermediary_to_words.len());
        }
    }

    pub fn get_words_for_pattern(&self, pattern: &str) -> HashSet<String> {
        self.intermediary_to_words.get(pattern).cloned().unwrap_or_default()
    }

    pub fn words_match_pattern(&self, word: &str, pattern: &str) -> bool {
        if word.len() != pattern.len() {
            return false;
        }
        
        word.chars().zip(pattern.chars()).all(|(w_char, p_char)| {
            p_char == '_' || w_char == p_char
        })
    }

    fn max_len_for_n_compound(&self, n: usize) -> usize {
        if n == 0 {
            return 0;
        }
        // For n intermediaries, we need at least (n-1) separators and (n-1) other intermediaries
        // of minimum length MIN_WORD_LENGTH each.
        // So: max_len + (n-1) * MIN_WORD_LENGTH + (n-1) <= GRID_SIZE
        // max_len <= GRID_SIZE - (n-1) * MIN_WORD_LENGTH - (n-1)
        // max_len <= GRID_SIZE - (n-1) * (MIN_WORD_LENGTH + 1)
        let subtraction = (n - 1) * (MIN_WORD_LENGTH + 1);
        if GRID_SIZE >= subtraction {
            GRID_SIZE - subtraction
        } else {
            0
        }
    }

    fn max_compounds_in_liner(&self) -> usize {
        // With minimum intermediary length MIN_WORD_LENGTH and minimum 1 separator between each
        // n * MIN_WORD_LENGTH + (n-1) <= GRID_SIZE
        // n * MIN_WORD_LENGTH + n - 1 <= GRID_SIZE
        // n * (MIN_WORD_LENGTH + 1) <= GRID_SIZE + 1
        // n <= (GRID_SIZE + 1) / (MIN_WORD_LENGTH + 1)
        (GRID_SIZE + 1) / (MIN_WORD_LENGTH + 1)
    }

    pub fn generate_liners(&mut self, verbose: bool) {
        if verbose {
            println!("Generating liners...");
        }
        
        // Calculate maximum number of compounds possible
        let max_compounds = self.max_compounds_in_liner();
        if verbose {
            println!("Maximum compounds in liner: {}", max_compounds);
        }
        
        // Show max lengths for each compound count
        if verbose {
            for n in 1..=max_compounds {
                let max_len = self.max_len_for_n_compound(n);
                println!("Max intermediary length for {}-compound: {}", n, max_len);
            }
        }
        
        // Group intermediaries by length for efficient lookup
        let mut intermediaries_by_length: HashMap<usize, Vec<String>> = HashMap::new();
        for intermediary in &self.real_intermediaries {
            intermediaries_by_length
                .entry(intermediary.len())
                .or_insert_with(Vec::new)
                .push(intermediary.clone());
        }
        
        // Type 1: Single intermediary padded to GRID_SIZE characters with @
        for intermediary in &self.real_intermediaries {
            if intermediary.len() <= GRID_SIZE {
                let padding_needed = GRID_SIZE - intermediary.len();
                
                // Try different positions for the intermediary within the GRID_SIZE-character liner
                for start_pos in 0..=padding_needed {
                    let liner = format!("{}{}{}",
                        "@".repeat(start_pos),
                        intermediary,
                        "@".repeat(padding_needed - start_pos)
                    );
                    self.liners.insert(liner.clone());
                    self.liner_to_intermediaries
                        .entry(liner)
                        .or_insert_with(HashSet::new)
                        .insert(intermediary.clone());
                }
            }
        }
        
        // Type 2+: Multiple intermediaries (n-compounds where n >= 2)
        for n_compounds in 2..=max_compounds {
            let max_len = self.max_len_for_n_compound(n_compounds);
            
            if max_len >= MIN_WORD_LENGTH {
                self.generate_n_compound_liners(n_compounds, max_len, &intermediaries_by_length);
            }
        }
        
        if verbose {
            println!("Generated {} liners", self.liners.len());
        }
    }

    fn generate_n_compound_liners(
        &mut self,
        n: usize,
        max_len: usize,
        intermediaries_by_length: &HashMap<usize, Vec<String>>,
    ) {
        // Get all valid length combinations for n intermediaries
        let valid_lengths: Vec<usize> = (MIN_WORD_LENGTH..=max_len)
            .filter(|&length| intermediaries_by_length.contains_key(&length))
            .collect();
        
        if valid_lengths.is_empty() {
            return;
        }
        
        // Generate all combinations of lengths (with repetition allowed)
        for length_combo in (0..n).map(|_| valid_lengths.iter()).multi_cartesian_product() {
            let length_combo: Vec<usize> = length_combo.into_iter().cloned().collect();
            let content_length: usize = length_combo.iter().sum();
            let separators_needed = GRID_SIZE - content_length;
            
            if separators_needed >= n - 1 {  // Need at least (n-1) separators
                // Get intermediaries for each length in the combination
                let intermediary_groups: Vec<&Vec<String>> = length_combo
                    .iter()
                    .map(|&length| intermediaries_by_length.get(&length).unwrap())
                    .collect();
                
                // Generate all combinations of actual intermediaries
                for intermediary_combo in intermediary_groups.iter().map(|v| v.iter()).multi_cartesian_product() {
                    let intermediary_combo: Vec<String> = intermediary_combo
                        .into_iter()
                        .cloned()
                        .collect();
                    
                    // Ensure all intermediaries are different
                    let unique_intermediaries: HashSet<&String> = intermediary_combo.iter().collect();
                    if unique_intermediaries.len() == n {
                        self.create_liner_arrangements(&intermediary_combo, separators_needed);
                    }
                }
            }
        }
    }

    fn create_liner_arrangements(&mut self, intermediaries: &[String], separators_needed: usize) {
        let n = intermediaries.len();
        let min_separators = n - 1;  // Minimum separators needed between intermediaries
        let extra_separators = separators_needed - min_separators;
        
        if separators_needed < min_separators {
            return;
        }
        
        // For simplicity, we'll create a few common arrangements:
        // 1. Minimum separators (one @ between each)
        if separators_needed == min_separators {
            let liner = intermediaries.join("@");
            if liner.len() == GRID_SIZE {
                self.liners.insert(liner.clone());
                for inter in intermediaries {
                    self.liner_to_intermediaries
                        .entry(liner.clone())
                        .or_insert_with(HashSet::new)
                        .insert(inter.clone());
                }
            }
        }
        
        // 2. Extra separators at the beginning
        if extra_separators > 0 {
            let liner = format!("{}{}", "@".repeat(extra_separators), intermediaries.join("@"));
            if liner.len() == GRID_SIZE {
                self.liners.insert(liner.clone());
                for inter in intermediaries {
                    self.liner_to_intermediaries
                        .entry(liner.clone())
                        .or_insert_with(HashSet::new)
                        .insert(inter.clone());
                }
            }
            
            // 3. Extra separators at the end
            let liner = format!("{}{}", intermediaries.join("@"), "@".repeat(extra_separators));
            if liner.len() == GRID_SIZE {
                self.liners.insert(liner.clone());
                for inter in intermediaries {
                    self.liner_to_intermediaries
                        .entry(liner.clone())
                        .or_insert_with(HashSet::new)
                        .insert(inter.clone());
                }
            }
            
            // 4. Extra separators distributed (simple case: half at start, half at end)
            if extra_separators >= 2 {
                let sep_start = extra_separators / 2;
                let sep_end = extra_separators - sep_start;
                let liner = format!("{}{}{}",
                    "@".repeat(sep_start),
                    intermediaries.join("@"),
                    "@".repeat(sep_end)
                );
                if liner.len() == GRID_SIZE {
                    self.liners.insert(liner.clone());
                    for inter in intermediaries {
                        self.liner_to_intermediaries
                            .entry(liner.clone())
                            .or_insert_with(HashSet::new)
                            .insert(inter.clone());
                    }
                }
            }
        }
    }

    pub fn get_intermediaries_for_liner(&self, liner: &str) -> HashSet<String> {
        self.liner_to_intermediaries.get(liner).cloned().unwrap_or_default()
    }

    pub fn parse_liner_components(&self, liner: &str) -> Vec<String> {
        if liner.len() != GRID_SIZE {
            return Vec::new();
        }
        
        let mut components = Vec::new();
        let mut current_component = String::new();
        
        for ch in liner.chars() {
            if ch == '@' {
                if !current_component.is_empty() {
                    components.push(current_component.clone());
                    current_component.clear();
                }
                components.push("@".to_string());
            } else {
                current_component.push(ch);
            }
        }
        
        if !current_component.is_empty() {
            components.push(current_component);
        }
        
        components
    }

    pub fn is_valid_liner(&self, liner: &str) -> bool {
        if liner.len() != GRID_SIZE {
            return false;
        }
        
        let components = self.parse_liner_components(liner);
        let intermediary_components: Vec<&String> = components
            .iter()
            .filter(|&comp| comp != "@")
            .collect();
        
        // Check if all non-@ components are real intermediaries
        intermediary_components.iter().all(|&comp| self.real_intermediaries.contains(comp))
    }

    pub fn get_stats(&self) -> HashMap<String, f64> {
        let mut stats = HashMap::new();
        stats.insert("total_words".to_string(), self.words.len() as f64);
        stats.insert("real_intermediaries".to_string(), self.real_intermediaries.len() as f64);
        stats.insert("graph_connections".to_string(), self.intermediary_to_words.len() as f64);
        
        let total_connections: usize = self.intermediary_to_words.values().map(|v| v.len()).sum();
        let avg_words_per_intermediary = if self.intermediary_to_words.is_empty() {
            0.0
        } else {
            total_connections as f64 / self.intermediary_to_words.len() as f64
        };
        stats.insert("avg_words_per_intermediary".to_string(), avg_words_per_intermediary);
        
        stats.insert("total_liners".to_string(), self.liners.len() as f64);
        
        let total_liner_intermediaries: usize = self.liner_to_intermediaries.values().map(|v| v.len()).sum();
        let avg_intermediaries_per_liner = if self.liner_to_intermediaries.is_empty() {
            0.0
        } else {
            total_liner_intermediaries as f64 / self.liner_to_intermediaries.len() as f64
        };
        stats.insert("avg_intermediaries_per_liner".to_string(), avg_intermediaries_per_liner);
        
        stats
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    
    let mut graph = CrosswordGraph::new();
    
    // Load words
    graph.load_words(&args.input, args.verbose)?;
    
    // Find real intermediaries
    graph.find_real_intermediaries(args.verbose, args.parallel);
    
    // Build the graph
    graph.build_graph(args.verbose);
    
    // Generate liners
    graph.generate_liners(args.verbose);
    
    // Print statistics
    let stats = graph.get_stats();
    println!("\n=== CROSSWORD GRAPH STATISTICS ===");
    for (key, value) in &stats {
        println!("{}: {:.2}", key, value);
    }
    
    if args.verbose {
        // Show some examples
        println!("\n=== INTERMEDIARY EXAMPLES ===");
        
        // Show some sample intermediaries and their words
        let sample_intermediaries: Vec<String> = graph.real_intermediaries.iter().take(5).cloned().collect();
        for intermediary in sample_intermediaries {
            let words = graph.get_words_for_pattern(&intermediary);
            let sample_words: Vec<String> = words.iter().take(5).cloned().collect();
            println!("Pattern '{}' matches {} words: {:?}...", 
                     intermediary, words.len(), sample_words);
        }
        
        // Show some liner examples
        println!("\n=== LINER EXAMPLES ===");
        
        let mut sample_liners = vec!["_".repeat(GRID_SIZE)];
        sample_liners.extend(graph.liners.iter().take(10).cloned());
        
        for liner in sample_liners {
            let intermediaries = graph.get_intermediaries_for_liner(&liner);
            let components = graph.parse_liner_components(&liner);
            println!("Liner '{}' -> intermediaries: {:?}, components: {:?}", 
                     liner, intermediaries, components);
            
            // Show words for each intermediary in this liner
            for intermediary in intermediaries {
                let words = graph.get_words_for_pattern(&intermediary);
                let sample_words: Vec<String> = words.iter().take(3).cloned().collect();
                println!("  '{}' matches {} words: {:?}...", 
                         intermediary, words.len(), sample_words);
            }
            println!();  // Empty line for readability
        }
    }
    
    Ok(())
}
