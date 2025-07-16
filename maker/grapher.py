#!/usr/bin/env python3
"""
Crossword Maker - Graph-based approach with intermediary nodes
"""

import re
from collections import defaultdict
from typing import Set, Dict, List
import string

# Configuration
GRID_SIZE = 5  # Maximum word length for crossword
MIN_WORD_LENGTH = 4

# Turkish alphabet (29 letters)
TURKISH_ALPHABET = "abcdefghijklmnopqrstuvwxyzçğıöşü"

class CrosswordGraph:
    """Graph structure for crossword words and intermediaries"""
    
    def __init__(self):
        # Dictionary mapping intermediary patterns to words that match them
        self.intermediary_to_words = defaultdict(set)
        # Set of all valid words
        self.words = set()
        self.words_that_can_be_checked_against = set()
        # Set of all real intermediaries (those that actually occur)
        self.real_intermediaries = set()
        # Dictionary mapping liners to their child intermediaries
        self.liner_to_intermediaries = defaultdict(set)
        # Set of all valid liners
        self.liners = set()
        
    def load_words(self, filename: str) -> None:
        """Load words from file, filtering by length and valid characters"""
        print(f"Loading words from {filename}...")
        
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                word = line.strip().lower()
                word = word.replace(" ", "")  # Remove spaces
                
                # Filter words: length between MIN_WORD_LENGTH and GRID_SIZE
                if MIN_WORD_LENGTH <= len(word) <= GRID_SIZE:
                    # Only include words with valid Turkish characters (no spaces or special chars)
                    if self._is_valid_word(word):
                        self.words.add(word)
                if self._is_valid_word(word):
                    self.words_that_can_be_checked_against.add(word)
        
        print(f"Loaded {len(self.words)} valid words")
    
    def _is_valid_word(self, word: str) -> bool:
        """Check if word contains only valid Turkish letters"""
        return all(c in TURKISH_ALPHABET for c in word)
    
    def generate_intermediaries_for_word(self, word: str) -> Set[str]:
        """Generate all possible intermediaries for a given word"""
        intermediaries = set()
        word_len = len(word)
        
        # Generate all possible combinations with underscores
        # For each position, we can either have the letter or underscore
        for i in range(1, 2**word_len - 1):  # Exclude all letters (0) and no letters (2^n-1)
            intermediary = ""
            for j in range(word_len):
                if i & (1 << j):  # If bit j is set, use underscore
                    intermediary += "_"
                else:  # Otherwise use the actual letter
                    intermediary += word[j]
            
            # Only add if it has at least one underscore and one letter
            if "_" in intermediary and any(c != "_" for c in intermediary):
                intermediaries.add(intermediary)
        
        return intermediaries
    
    def find_real_intermediaries(self) -> None:
        """Find all real intermediaries by going through all words"""
        print("Finding real intermediaries...")
        
        for word in self.words:
            intermediaries = self.generate_intermediaries_for_word(word)
            self.real_intermediaries.update(intermediaries)
        
        # Add pure underscore patterns as wildcard intermediaries
        for length in range(MIN_WORD_LENGTH, GRID_SIZE + 1):
            wildcard_pattern = "_" * length
            self.real_intermediaries.add(wildcard_pattern)
        
        print(f"Found {len(self.real_intermediaries)} real intermediaries (including wildcards)")
    
    def build_graph(self) -> None:
        """Build the graph connecting intermediaries to words"""
        print("Building graph connections...")
        
        for word in self.words:
            intermediaries = self.generate_intermediaries_for_word(word)
            
            # Only connect to real intermediaries
            for intermediary in intermediaries:
                if intermediary in self.real_intermediaries:
                    self.intermediary_to_words[intermediary].add(word)
        
        # Handle pure underscore patterns (wildcards) - match all words of same length
        for length in range(MIN_WORD_LENGTH, GRID_SIZE + 1):
            wildcard_pattern = "_" * length
            if wildcard_pattern in self.real_intermediaries:
                # Connect to all words of this length
                for word in self.words:
                    if len(word) == length:
                        self.intermediary_to_words[wildcard_pattern].add(word)
        
        print(f"Graph built with {len(self.intermediary_to_words)} intermediary nodes")
    
    def get_words_for_pattern(self, pattern: str) -> Set[str]:
        """Get all words that match a given intermediary pattern"""
        return self.intermediary_to_words.get(pattern, set())
    
    def words_match_pattern(self, word: str, pattern: str) -> bool:
        """Check if a word matches an intermediary pattern"""
        if len(word) != len(pattern):
            return False
        
        for i, (w_char, p_char) in enumerate(zip(word, pattern)):
            if p_char != "_" and w_char != p_char:
                return False
        
        return True
    
    def get_stats(self) -> Dict[str, int]:
        """Get statistics about the graph"""
        return {
            "total_words": len(self.words),
            "real_intermediaries": len(self.real_intermediaries),
            "graph_connections": len(self.intermediary_to_words),
            "avg_words_per_intermediary": sum(len(words) for words in self.intermediary_to_words.values()) / max(1, len(self.intermediary_to_words)),
            "total_liners": len(self.liners),
            "avg_intermediaries_per_liner": sum(len(intermediaries) for intermediaries in self.liner_to_intermediaries.values()) / max(1, len(self.liner_to_intermediaries))
        }

    def max_len_for_n_compound(self, n: int) -> int:
        """Calculate maximum intermediary length for n-compound liners"""
        if n <= 0:
            return 0
        # For n intermediaries, we need at least (n-1) separators and (n-1) other intermediaries
        # of minimum length MIN_WORD_LENGTH each.
        # So: max_len + (n-1) * MIN_WORD_LENGTH + (n-1) <= GRID_SIZE
        # max_len <= GRID_SIZE - (n-1) * MIN_WORD_LENGTH - (n-1)
        # max_len <= GRID_SIZE - (n-1) * (MIN_WORD_LENGTH + 1)
        return GRID_SIZE - (n - 1) * (MIN_WORD_LENGTH + 1)

    def max_compounds_in_liner(self) -> int:
        """Calculate maximum number of compounds that can fit in a liner"""
        # With minimum intermediary length MIN_WORD_LENGTH and minimum 1 separator between each
        # n * MIN_WORD_LENGTH + (n-1) <= GRID_SIZE
        # n * MIN_WORD_LENGTH + n - 1 <= GRID_SIZE
        # n * (MIN_WORD_LENGTH + 1) <= GRID_SIZE + 1
        # n <= (GRID_SIZE + 1) / (MIN_WORD_LENGTH + 1)
        return (GRID_SIZE + 1) // (MIN_WORD_LENGTH + 1)

    def generate_liners(self) -> None:
        """Generate all possible liners from real intermediaries"""
        print("Generating liners...")
        
        # Calculate maximum number of compounds possible
        max_compounds = self.max_compounds_in_liner()
        print(f"Maximum compounds in liner: {max_compounds}")
        
        # Show max lengths for each compound count
        for n in range(1, max_compounds + 1):
            max_len = self.max_len_for_n_compound(n)
            print(f"Max intermediary length for {n}-compound: {max_len}")
        
        # Group intermediaries by length for efficient lookup
        intermediaries_by_length = defaultdict(list)
        for intermediary in self.real_intermediaries:
            intermediaries_by_length[len(intermediary)].append(intermediary)
        
        # Type 1: Single intermediary padded to GRID_SIZE characters with @
        for intermediary in self.real_intermediaries:
            if len(intermediary) <= GRID_SIZE:
                # Pad with @ to make it GRID_SIZE characters
                padding_needed = GRID_SIZE - len(intermediary)
                
                # Try different positions for the intermediary within the GRID_SIZE-character liner
                for start_pos in range(padding_needed + 1):
                    liner = "@" * start_pos + intermediary + "@" * (padding_needed - start_pos)
                    self.liners.add(liner)
                    self.liner_to_intermediaries[liner].add(intermediary)
        
        # Type 2+: Multiple intermediaries (n-compounds where n >= 2)
        for n_compounds in range(2, max_compounds + 1):
            max_len = self.max_len_for_n_compound(n_compounds)
            
            if max_len >= MIN_WORD_LENGTH:
                # Generate all combinations of n intermediaries
                self._generate_n_compound_liners(n_compounds, max_len, intermediaries_by_length)
        
        print(f"Generated {len(self.liners)} liners")

    def _generate_n_compound_liners(self, n: int, max_len: int, intermediaries_by_length: Dict[int, List[str]]) -> None:
        """Generate all possible n-compound liners"""
        from itertools import product, combinations_with_replacement
        
        # Get all valid length combinations for n intermediaries
        valid_lengths = [length for length in range(MIN_WORD_LENGTH, max_len + 1) 
                        if length in intermediaries_by_length]
        
        if not valid_lengths:
            return
        
        # Generate all combinations of lengths (with repetition allowed)
        for length_combo in combinations_with_replacement(valid_lengths, n):
            content_length = sum(length_combo)
            separators_needed = GRID_SIZE - content_length
            
            if separators_needed >= n - 1:  # Need at least (n-1) separators
                # Get intermediaries for each length in the combination
                intermediary_groups = [intermediaries_by_length[length] for length in length_combo]
                
                # Generate all combinations of actual intermediaries
                for intermediary_combo in product(*intermediary_groups):
                    # Ensure all intermediaries are different
                    if len(set(intermediary_combo)) == n:
                        self._create_liner_arrangements(intermediary_combo, separators_needed)

    def _create_liner_arrangements(self, intermediaries: tuple, separators_needed: int) -> None:
        """Create different arrangements of intermediaries with separators"""
        n = len(intermediaries)
        min_separators = n - 1  # Minimum separators needed between intermediaries
        extra_separators = separators_needed - min_separators
        
        if extra_separators < 0:
            return
        
        # For simplicity, we'll create a few common arrangements:
        # 1. Minimum separators (one @ between each)
        if separators_needed == min_separators:
            liner = "@".join(intermediaries)
            if len(liner) == GRID_SIZE:
                self.liners.add(liner)
                for inter in intermediaries:
                    self.liner_to_intermediaries[liner].add(inter)
        
        # 2. Extra separators at the beginning
        elif extra_separators > 0:
            liner = "@" * extra_separators + "@".join(intermediaries)
            if len(liner) == GRID_SIZE:
                self.liners.add(liner)
                for inter in intermediaries:
                    self.liner_to_intermediaries[liner].add(inter)
            
            # 3. Extra separators at the end
            liner = "@".join(intermediaries) + "@" * extra_separators
            if len(liner) == GRID_SIZE:
                self.liners.add(liner)
                for inter in intermediaries:
                    self.liner_to_intermediaries[liner].add(inter)
            
            # 4. Extra separators distributed (simple case: half at start, half at end)
            if extra_separators >= 2:
                sep_start = extra_separators // 2
                sep_end = extra_separators - sep_start
                liner = "@" * sep_start + "@".join(intermediaries) + "@" * sep_end
                if len(liner) == GRID_SIZE:
                    self.liners.add(liner)
                    for inter in intermediaries:
                        self.liner_to_intermediaries[liner].add(inter)

    def get_intermediaries_for_liner(self, liner: str) -> Set[str]:
        """Get all intermediaries that are part of a given liner"""
        return self.liner_to_intermediaries.get(liner, set())

    def parse_liner_components(self, liner: str) -> List[str]:
        """Parse a liner into its component parts (intermediaries and empty boxes)"""
        if len(liner) != GRID_SIZE:
            return []
        
        components = []
        current_component = ""
        
        for char in liner:
            if char == "@":
                if current_component:
                    components.append(current_component)
                    current_component = ""
                components.append("@")
            else:
                current_component += char
        
        if current_component:
            components.append(current_component)
        
        return components

    def is_valid_liner(self, liner: str) -> bool:
        """Check if a liner is valid (GRID_SIZE characters, contains known intermediaries)"""
        if len(liner) != GRID_SIZE:
            return False
        
        components = self.parse_liner_components(liner)
        intermediary_components = [comp for comp in components if comp != "@"]
        
        # Check if all non-@ components are real intermediaries
        return all(comp in self.real_intermediaries for comp in intermediary_components)

def main():
    """Main function to demonstrate the crossword graph"""
    graph = CrosswordGraph()
    
    # Load words
    graph.load_words("turkish_words.txt")
    
    # Find real intermediaries
    graph.find_real_intermediaries()
    
    # Build the graph
    graph.build_graph()
    
    # Generate liners
    graph.generate_liners()
    
    # Print statistics
    stats = graph.get_stats()
    print("\n=== CROSSWORD GRAPH STATISTICS ===")
    for key, value in stats.items():
        print(f"{key}: {value}")
    
    # Show some examples
    print("\n=== INTERMEDIARY EXAMPLES ===")
    
    # Show some sample intermediaries and their words
    sample_intermediaries = list(graph.real_intermediaries)[:5]
    for intermediary in sample_intermediaries:
        words = graph.get_words_for_pattern(intermediary)
        print(f"Pattern '{intermediary}' matches {len(words)} words: {list(words)[:5]}...")
    
    # Show some liner examples
    print("\n=== LINER EXAMPLES ===")
    
    sample_liners = ["_"*GRID_SIZE] + list(graph.liners)[:10]
    for liner in sample_liners:
        intermediaries = graph.get_intermediaries_for_liner(liner)
        components = graph.parse_liner_components(liner)
        print(f"Liner '{liner}' -> intermediaries: {list(intermediaries)}, components: {components}")
        
        # Show words for each intermediary in this liner
        for intermediary in intermediaries:
            words = graph.get_words_for_pattern(intermediary)
            print(f"  '{intermediary}' matches {len(words)} words: {list(words)[:3]}...")
        print()  # Empty line for readability
    
    return graph


if __name__ == "__main__":
    main()