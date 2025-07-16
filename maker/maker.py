#!/usr/bin/env python3
"""
Crossword Maker - DFS-based crossword generation using liner validation
"""

import random
import itertools
import math
import time
import os
import functools
from itertools import product
from typing import List, Tuple, Optional, Set
from dataclasses import dataclass
from grapher import CrosswordGraph, GRID_SIZE, MIN_WORD_LENGTH, TURKISH_ALPHABET
from collections import defaultdict


@dataclass
class WordPlacement:
    """Represents a word placed in the crossword grid"""
    word: str
    row: int
    col: int
    direction: str  # 'h' or 'v'
    
    def get_positions(self) -> List[Tuple[int, int]]:
        """Get all grid positions occupied by this word"""
        positions = []
        for i, char in enumerate(self.word):
            if self.direction == 'h':
                positions.append((self.row, self.col + i))
            else:  # vertical
                positions.append((self.row + i, self.col))
        return positions

class CrosswordGrid:
    """Manages the crossword grid state and liner placement"""
    
    def __init__(self, graph: CrosswordGraph):
        self.graph = graph
        self.grid = [['.' for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]
        self.word_placements: List[WordPlacement] = []
        self.words_on_grid = set()  # Track words currently placed on the grid
        self.filled_cells = 0  # Track number of filled cells
        # Track horizontal and vertical liners for constraint checking
        self.horizontal_liners = ['.' * GRID_SIZE for _ in range(GRID_SIZE)]
        self.vertical_liners = ['.' * GRID_SIZE for _ in range(GRID_SIZE)]
        
    def copy(self) -> 'CrosswordGrid':
        """Create a deep copy of the grid"""
        new_grid = CrosswordGrid(self.graph)
        new_grid.grid = [row[:] for row in self.grid]
        new_grid.word_placements = self.word_placements[:]
        new_grid.words_on_grid = self.words_on_grid.copy()
        new_grid.filled_cells = self.filled_cells
        new_grid.horizontal_liners = self.horizontal_liners[:]
        new_grid.vertical_liners = self.vertical_liners[:]
        return new_grid
    
    def can_place_word(self, word: str, row: int, col: int, direction: str) -> bool:
        """Check if a word can be placed at the given position"""
        # Early exit if word is already placed.
        if word in self.words_on_grid:
            return False

        if direction == 'h':
            if col + len(word) > GRID_SIZE:
                return False
            for i, char in enumerate(word):
                cell = self.grid[row][col + i]
                if cell != '.' and cell != char:
                    return False
        else:  # vertical
            if row + len(word) > GRID_SIZE:
                return False
            for i, char in enumerate(word):
                cell = self.grid[row + i][col]
                if cell != '.' and cell != char:
                    return False
        
        return True
    
    def place_word(self, word: str, row: int, col: int, direction: str, verbose: bool = False) -> bool:
        """Place a word on the grid using liner validation"""
        if not self.can_place_word(word, row, col, direction):
            if verbose:
                print(f"      ❌ Cannot place '{word}' - conflicts with existing letters")
            return False
        
        # Create backup
        old_grid = [row[:] for row in self.grid]
        old_words = self.word_placements[:]
        old_words_on_grid = self.words_on_grid.copy()
        
        # Get the appropriate liner for this word
        liner = self.get_liner_for_word(word, row, col)
        
        if verbose:
            print(f"      📏 Using liner pattern: '{liner}' for word '{word}'")
        
        # Validate each character placement against liner constraints
        placement_positions = []
        if direction == 'h':
            for i, char in enumerate(word):
                pos_row, pos_col = row, col + i
                placement_positions.append((pos_row, pos_col, char))
        else:  # vertical
            for i, char in enumerate(word):
                pos_row, pos_col = row + i, col
                placement_positions.append((pos_row, pos_col, char))
        
        # Check liner constraints for each character before placing
        for pos_row, pos_col, char in placement_positions:
            if not self.validate_liner_constraints(pos_row, pos_col, char, verbose):
                if verbose:
                    print(f"      ❌ Cannot place '{word}' - violates liner constraints at ({pos_row},{pos_col}) with char '{char}'")
                return False
        
        if verbose:
            print(f"      ✅ All liner constraints satisfied for '{word}'")
        
        # Place the word
        placement = WordPlacement(word, row, col, direction)
        for pos_row, pos_col, char in placement_positions:
            if self.grid[pos_row][pos_col] == '.':
                self.filled_cells += 1  # Increment filled cells counter
                self.grid[pos_row][pos_col] = char
        
        self.word_placements.append(placement)
        self.words_on_grid.add(word)  # Track the word as placed
        
        # Check if we're close to completion and save grid
        empty_cells = (GRID_SIZE * GRID_SIZE) - self.filled_cells
        if empty_cells <= math.ceil(GRID_SIZE / 2):
            if self.is_solvable_grid():
                self.save_grid_to_file("solvables/")
            elif empty_cells <= math.ceil(GRID_SIZE / 2)-1:
                self.save_grid_to_file(f"close_calls/")


        
        # Final validation of the grid state
        if self.validate_grid_state(verbose=verbose):
            if verbose:
                print(f"      ✅ '{word}' placed successfully and grid state validated")
            return True
        else:
            if verbose:
                print(f"      ❌ '{word}' placed but failed final grid state validation")
                # Show which rows/columns failed
                print(f"      🔍 Debugging grid validation failure:")
                for row in range(GRID_SIZE):
                    row_state = self.get_row_state(row)
                    row_valid = self.validate_row_column(row_state)
                    print(f"        Row {row}: '{row_state}' -> {'✅' if row_valid else '❌'}")
                for col in range(GRID_SIZE):
                    col_state = self.get_col_state(col)
                    col_valid = self.validate_row_column(col_state)
                    print(f"        Col {col}: '{col_state}' -> {'✅' if col_valid else '❌'}")
            # Restore backup
            self.grid = old_grid
            self.word_placements = old_words
            self.words_on_grid = old_words_on_grid
            # Recalculate filled cells
            self.filled_cells = sum(1 for row in self.grid for cell in row if cell != '.')
            return False
    
    def remove_last_word(self) -> bool:
        """Remove the last placed word from the grid"""
        if not self.word_placements:
            return False
        
        last_word = self.word_placements.pop()
        
        self.words_on_grid.discard(last_word.word)  # Remove from words on grid
        
        # Clear the word from grid
        for pos in last_word.get_positions():
            row, col = pos
            # Only clear if no other word uses this position
            if not any(pos in word.get_positions() for word in self.word_placements):
                if self.grid[row][col] != '.':
                    self.filled_cells -= 1  # Decrement filled cells counter
                self.grid[row][col] = '.'
        
        return True
    
    def get_row_state(self, row: int) -> str:
        """Get the current state of a row"""
        return ''.join(self.grid[row])
    
    def get_col_state(self, col: int) -> str:
        """Get the current state of a column"""
        return ''.join(self.grid[row][col] for row in range(GRID_SIZE))
    
    def validate_grid_state(self, verbose: bool = False) -> bool:
        """Check if current grid state can still lead to a valid solution"""
        # Check all rows
        for row in range(GRID_SIZE):
            row_state = self.get_row_state(row)
            if not self.validate_row_column(row_state):
                if verbose:
                    print(f"      🔍 Row {row} validation failed: '{row_state}'")
                return False
        
        # Check all columns
        for col in range(GRID_SIZE):
            col_state = self.get_col_state(col)
            if not self.validate_row_column(col_state):
                if verbose:
                    print(f"      🔍 Column {col} validation failed: '{col_state}'")
                return False
        
        # Additional check: every filled cell must be able to form wordful liners
        if not self.validate_cell_wordful_constraints(verbose):
            return False
        
        return True
    
    def validate_cell_wordful_constraints(self, verbose: bool = False) -> bool:
        """Check that every filled cell can form wordful liners both horizontally and vertically"""
        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                if self.grid[row][col] != '.':  # Only check filled cells
                    # Check if this cell can be part of a wordful horizontal liner
                    row_state = self.get_row_state(row)
                    if not self.can_form_wordful_liner(row_state, verbose):
                        if verbose:
                            print(f"      🔍 Cell ({row},{col}) cannot form wordful horizontal liner: '{row_state}'")
                        return False
                    
                    # Check if this cell can be part of a wordful vertical liner
                    col_state = self.get_col_state(col)
                    if not self.can_form_wordful_liner(col_state, verbose):
                        if verbose:
                            print(f"      🔍 Cell ({row},{col}) cannot form wordful vertical liner: '{col_state}'")
                        return False
        
        return True
    
    def can_form_wordful_liner(self, current_state: str, verbose: bool = False) -> bool:
        """Check if a row/column state can be completed to form a liner that contains at least one word"""
        
        if not (has_empty_positions := '.' in current_state):
            # No empty cells - check if current state is a valid word or valid liner with words
            if current_state in self.graph.words:
                return True
            if current_state in self.graph.liners:
                # Check if this liner has any intermediaries that map to actual words
                intermediaries = self.graph.get_intermediaries_for_liner(current_state)
                for intermediary in intermediaries:
                    words = self.graph.get_words_for_pattern(intermediary)
                    if words:  # If any intermediary has words, this liner is wordful
                        return True
            return False

        empty_positions = [i for i, c in enumerate(current_state) if c == '.']
        len_empty = len(empty_positions)
        
        # Special case: if the entire state is empty, it's always valid
        if len_empty == GRID_SIZE:
            return True
        
        # Try to find at least one completion that results in a wordful liner
        # Pattern 1: Fill all empty positions with '_' (all word characters)
        pattern1 = list(current_state)
        for pos in empty_positions:
            pattern1[pos] = '_'
        pattern1_str = ''.join(pattern1)
        if self.is_wordful_liner(pattern1_str):
            return True
        
        # Pattern 2: Fill all empty positions with '@' (all empty spaces)
        pattern2 = list(current_state)
        for pos in empty_positions:
            pattern2[pos] = '@'
        pattern2_str = ''.join(pattern2)
        if self.is_wordful_liner(pattern2_str):
            return True
        
        # Try more combinations if we have few empty positions
        if len_empty <= 2:  # Only for 1-2 empty positions
            for combo in product(['_', '@'], repeat=len_empty):
                candidate = list(current_state)
                for pos, replacement in zip(empty_positions, combo):
                    candidate[pos] = replacement
                
                candidate_str = ''.join(candidate)
                if self.is_wordful_liner(candidate_str):
                    return True
        
        return False
    
    def is_wordful_liner(self, liner_pattern: str) -> bool:
        """Check if a liner pattern contains at least one word (is wordful)"""
        if liner_pattern not in self.graph.liners:
            return False
        
        # Get all intermediaries for this liner
        intermediaries = self.graph.get_intermediaries_for_liner(liner_pattern)
        
        # Check if any intermediary has at least one word
        for intermediary in intermediaries:
            words = self.graph.get_words_for_pattern(intermediary)
            if words:  # If any intermediary has words, this liner is wordful
                return True
        
        return False  # No intermediary has words
    
    def validate_row_column(self, current_state: str) -> bool:
        """
        Check if a row/column state can still be completed to a valid liner
        current_state: e.g., "AB.C." where . = empty cell
        """
        # Find positions of empty cells
        empty_positions = [i for i, c in enumerate(current_state) if c == '.']
        
        if not empty_positions:
            # No empty cells, check if current state matches any liner exactly
            # OR if it's a valid word (for 5-letter words that should be valid liners)
            is_valid_liner = current_state in self.graph.liners
            is_valid_word = current_state in self.graph.words
            return is_valid_liner or is_valid_word
        
        # Special case: if the entire state is empty (all dots), it's always valid
        if len(empty_positions) == GRID_SIZE:
            return True
        
        # For efficiency, limit the search space by trying common patterns first
        # Try patterns that use existing characters and fill gaps with _ or @
        test_patterns = []
        
        # Pattern 1: Fill all empty positions with '_' (indicating word characters)
        pattern1 = list(current_state)
        for pos in empty_positions:
            pattern1[pos] = '_'
        test_patterns.append(''.join(pattern1))
        
        # Pattern 2: Fill all empty positions with '@' (indicating empty spaces)
        pattern2 = list(current_state)
        for pos in empty_positions:
            pattern2[pos] = '@'
        test_patterns.append(''.join(pattern2))
        
        # Pattern 3: Mixed - some _ and some @
        if len(empty_positions) > 1:
            pattern3 = list(current_state)
            for i, pos in enumerate(empty_positions):
                pattern3[pos] = '_' if i % 2 == 0 else '@'
            test_patterns.append(''.join(pattern3))
        
        # Check if any test pattern can be achieved
        for pattern in test_patterns:
            if self.is_achievable_liner(pattern):
                return True
        
        # If quick patterns don't work, do more comprehensive search
        # But limit combinations to avoid exponential explosion
        if len(empty_positions) <= 3:  # Only for small number of empty positions
            from itertools import product
            for combo in product(['_', '@'], repeat=len(empty_positions)):
                candidate_liner = list(current_state)
                for pos, replacement in zip(empty_positions, combo):
                    candidate_liner[pos] = replacement
                
                liner_pattern = ''.join(candidate_liner)
                if self.is_achievable_liner(liner_pattern):
                    return True
        
        return False  # No valid completion found
    
    def is_achievable_liner(self, liner_pattern: str) -> bool:
        """Check if a liner pattern is achievable (exists and has valid words)"""
        return self.is_wordful_liner(liner_pattern)
    
    def get_possible_placements(self) -> List[Tuple[str, int, int, str]]:
        """Get all possible word placements using liner-based approach"""
        placements = []
        
        # Check each row for possible horizontal placements
        for row in range(GRID_SIZE):
            row_state = self.get_row_state(row)
            if '.' in row_state:  # Only if row has empty cells
                row_placements = self._get_placements_for_line(row_state, row, 'h')
                placements.extend(row_placements)
        
        # Check each column for possible vertical placements
        for col in range(GRID_SIZE):
            col_state = self.get_col_state(col)
            if '.' in col_state:  # Only if column has empty cells
                col_placements = self._get_placements_for_line(col_state, col, 'v')
                placements.extend(col_placements)
        
        # Filter out words already placed and randomize
        valid_placements_by_length = defaultdict(list)
        for word, row, col, direction in placements:
            if word not in self.words_on_grid:
                if len(word) == GRID_SIZE:
                    valid_placements_by_length["="].append((word, row, col, direction))
                else:
                    valid_placements_by_length["<"].append((word, row, col, direction))

        PRIORITIZE_BY_LENGTH = True  # Flag to prioritize GRID_SIZE words first
        
        # Prioritize by word length (GRID_SIZE first) and randomize within each group
        if PRIORITIZE_BY_LENGTH:
            if grid_size_placements := valid_placements_by_length.get("=", []):
                random.shuffle(grid_size_placements)
                return grid_size_placements
            else:
                shorter_placements = valid_placements_by_length.get("<", [])
                random.shuffle(shorter_placements)
                return shorter_placements
        else:
            all_placements = (*valid_placements_by_length.get("=", []), *valid_placements_by_length.get("<", []))
            random.shuffle(all_placements)
            return all_placements

    
    def _get_placements_for_line(self, line_state: str, line_index: int, direction: str) -> List[Tuple[str, int, int, str]]:
        """Get possible word placements for a specific row or column using liner patterns"""
        placements = []
        empty_positions = [i for i, c in enumerate(line_state) if c == '.']
        
        if not empty_positions:
            return []  # No empty positions, can't place anything
        
        # Generate possible liner patterns for this line state
        possible_liners = self._generate_liner_patterns(line_state)
        
        for liner_pattern in possible_liners:
            # Get intermediaries for this liner
            if liner_pattern in self.graph.liners:
                intermediaries = self.graph.get_intermediaries_for_liner(liner_pattern)
                
                for intermediary in intermediaries:
                    # Get words that match this intermediary
                    words = self.graph.get_words_for_pattern(intermediary)
                    
                    for word in words:
                        # Find where this word can be placed in the liner
                        word_placements = self._find_word_positions_in_liner(word, liner_pattern, line_state)
                        
                        for start_pos in word_placements:
                            if direction == 'h':
                                # Row placement
                                placements.append((word, line_index, start_pos, 'h'))
                            else:
                                # Column placement  
                                placements.append((word, start_pos, line_index, 'v'))
        
        return placements
    
    def _generate_liner_patterns(self, line_state: str) -> List[str]:
        """Generate possible liner patterns for a given line state"""
        empty_positions = [i for i, c in enumerate(line_state) if c == '.']
        
        if not empty_positions:
            return [line_state]  # Already complete
        
        # Generate all possible combinations of _ and @ for empty positions
        patterns = []
        
        # Limit combinations to avoid explosion - try common patterns first
        if len(empty_positions) <= 3:
            # Try all combinations for small number of empty positions
            for combo in product(['_', '@'], repeat=len(empty_positions)):
                pattern = list(line_state)
                for pos, replacement in zip(empty_positions, combo):
                    pattern[pos] = replacement
                patterns.append(''.join(pattern))
        else:
            # For larger number of empty positions, try only common patterns
            # Pattern 1: All empty positions become word characters (_)
            pattern1 = list(line_state)
            for pos in empty_positions:
                pattern1[pos] = '_'
            patterns.append(''.join(pattern1))
            
            # Pattern 2: All empty positions become empty spaces (@)
            pattern2 = list(line_state)
            for pos in empty_positions:
                pattern2[pos] = '@'
            patterns.append(''.join(pattern2))
            
            # Pattern 3: Mixed patterns - some common combinations
            if len(empty_positions) >= 2:
                # First half _, second half @
                pattern3 = list(line_state)
                mid = len(empty_positions) // 2
                for i, pos in enumerate(empty_positions):
                    pattern3[pos] = '_' if i < mid else '@'
                patterns.append(''.join(pattern3))
                
                # First half @, second half _
                pattern4 = list(line_state)
                for i, pos in enumerate(empty_positions):
                    pattern4[pos] = '@' if i < mid else '_'
                patterns.append(''.join(pattern4))
        
        # Filter to only return patterns that exist in our liner set
        valid_patterns = []
        for pattern in patterns:
            if pattern in self.graph.liners:
                valid_patterns.append(pattern)
        
        return valid_patterns
    
    def _find_word_positions_in_liner(self, word: str, liner_pattern: str, line_state: str) -> List[int]:
        """Find all valid starting positions where a word can be placed in a liner pattern"""
        valid_positions = []
        
        for start_pos in range(GRID_SIZE - len(word) + 1):
            can_place = True
            
            # Check if word fits in the liner pattern at this position
            for i, char in enumerate(word):
                liner_pos = start_pos + i
                liner_char = liner_pattern[liner_pos]
                line_char = line_state[liner_pos]
                
                # Word character must fit where:
                # 1. Liner has '_' (word position) OR exact character match
                # 2. Line state has '.' (empty) OR exact character match
                if liner_char == '@':
                    # Liner says this should be empty, can't place word here
                    can_place = False
                    break
                elif liner_char != '_' and liner_char != char:
                    # Liner has specific character that doesn't match
                    can_place = False
                    break
                elif line_char != '.' and line_char != char:
                    # Line already has different character
                    can_place = False
                    break
            
            if can_place:
                valid_positions.append(start_pos)
        
        return valid_positions
    
    def is_complete(self) -> bool:
        """Check if the crossword is complete (no empty cells)"""
        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                if self.grid[row][col] == '.':
                    return False
        return True
    
    def print_grid(self):
        """Print the current grid state with coordinates and statistics"""
        print("📋 Current Grid:")
        print("   " + " ".join(str(i) for i in range(GRID_SIZE)))
        for i, row in enumerate(self.grid):
            print(f" {i} " + " ".join(cell if cell != '.' else '·' for cell in row))
        
        # Calculate statistics using the counter
        total_cells = GRID_SIZE * GRID_SIZE
        fill_percentage = (self.filled_cells / total_cells) * 100
        
        print(f"📈 Fill progress: {self.filled_cells}/{total_cells} cells ({fill_percentage:.1f}%)")
        print()

    def get_liner_for_word(self, word: str, row: int, col: int) -> str:
        """Get the appropriate liner pattern for placing a word"""
        if len(word) == GRID_SIZE:
            # For GRID_SIZE words, use the word directly as the liner pattern
            return word
        else:
            # For shorter words, we need to create a padded liner
            # This is crucial: shorter words should use liners with @ padding
            padding_needed = GRID_SIZE - len(word)
            
            # Try different padding strategies
            padding_strategies = [
                word + '@' * padding_needed,  # Word at start, @ padding at end
                '@' * padding_needed + word,  # @ padding at start, word at end
            ]
            
            # If word is very short, try middle placement too
            if len(word) <= 3 and padding_needed >= 2:
                mid_start = padding_needed // 2
                mid_pattern = '@' * mid_start + word + '@' * (padding_needed - mid_start)
                padding_strategies.append(mid_pattern)
            
            # Find which padding strategy has a valid liner in our graph
            for padded_pattern in padding_strategies:
                # Check if this exact pattern exists as a liner
                if padded_pattern in self.graph.liners:
                    return padded_pattern
                
                # Also check if we can find a liner that can accommodate this word pattern
                for liner in self.graph.liners:
                    if self.can_word_fit_in_liner_pattern(word, liner):
                        return liner
            
            # Fallback: create a simple pattern (word + padding)
            return word + '@' * padding_needed
    
    def can_word_fit_in_liner_pattern(self, word: str, liner: str) -> bool:
        """Check if a word can fit in a specific liner pattern"""
        if len(liner) != GRID_SIZE:
            return False
        
        # Try to find a position where the word can fit
        for start_pos in range(GRID_SIZE - len(word) + 1):
            can_fit = True
            for i, char in enumerate(word):
                liner_pos = start_pos + i
                liner_char = liner[liner_pos]
                # Word character must fit where liner has '_' or exact character match
                # '@' in liner means empty space, so word can't go there
                if liner_char == '@':
                    can_fit = False
                    break
                elif liner_char != '_' and liner_char != char:
                    can_fit = False
                    break
            
            if can_fit:
                return True
        
        return False
    
    def can_fit_word_in_liner(self, word: str, liner: str) -> bool:
        """Check if a word can fit in a liner pattern"""
        if len(liner) != GRID_SIZE:
            return False
        
        # Find all possible positions where the word could fit
        for start_pos in range(GRID_SIZE - len(word) + 1):
            can_fit = True
            for i, char in enumerate(word):
                liner_pos = start_pos + i
                liner_char = liner[liner_pos]
                # Word can fit if liner has '_' or the same character
                if liner_char != '_' and liner_char != char and liner_char != '@':
                    can_fit = False
                    break
            if can_fit:
                return True
        return False
    
    def validate_liner_constraints(self, row: int, col: int, char: str, verbose: bool = False) -> bool:
        """Validate that placing a character satisfies both horizontal and vertical liner constraints"""
        # Get current horizontal and vertical states
        current_h_state = self.get_row_state(row)
        current_v_state = self.get_col_state(col)
        
        # Create new states with the character placed
        new_h_state = current_h_state[:col] + char + current_h_state[col+1:]
        new_v_state = current_v_state[:row] + char + current_v_state[row+1:]
        
        if verbose:
            print(f"        🔍 Validating char '{char}' at ({row},{col})")
            print(f"        📏 Current H-state: '{current_h_state}' -> '{new_h_state}'")
            print(f"        📏 Current V-state: '{current_v_state}' -> '{new_v_state}'")
        
        # Check if both states can still be completed to valid liners
        h_valid = self.can_complete_to_liner(new_h_state, verbose)
        v_valid = self.can_complete_to_liner(new_v_state, verbose)
        
        if verbose:
            print(f"        📏 H-state valid: {'✅' if h_valid else '❌'}")
            print(f"        📏 V-state valid: {'✅' if v_valid else '❌'}")
        
        return h_valid and v_valid
    
    def can_complete_to_liner(self, partial_state: str, verbose: bool = False) -> bool:
        """Check if a partial state can be completed to form a valid liner"""
        # Find positions of empty cells
        empty_positions = [i for i, c in enumerate(partial_state) if c == '.']
        
        if verbose:
            print(f"          🔎 Checking completion for: '{partial_state}' (empty at: {empty_positions})")
        
        if not empty_positions:
            # No empty cells, check if current state matches any liner exactly
            # OR if it's a valid word (for 5-letter words)
            is_liner = partial_state in self.graph.liners
            is_word = partial_state in self.graph.words
            result = is_liner or is_word
            if verbose:
                print(f"          🔎 No empty cells - liner:{is_liner}, word:{is_word} -> {result}")
            return result
        
        # Special case: if the entire state is empty (all dots), it's always valid
        if len(empty_positions) == GRID_SIZE:
            if verbose:
                print(f"          🔎 All empty - always valid")
            return True
        
        # For efficiency, limit the search space by trying common patterns first
        # Pattern 1: Fill all empty positions with '_' (indicating word characters)
        pattern1 = list(partial_state)
        for pos in empty_positions:
            pattern1[pos] = '_'
        pattern1_str = ''.join(pattern1)
        pattern1_valid = pattern1_str in self.graph.liners
        if verbose:
            print(f"          🔎 Pattern1 (all _): '{pattern1_str}' -> {pattern1_valid}")
        if pattern1_valid:
            return True
        
        # Pattern 2: Fill all empty positions with '@' (indicating empty spaces)
        pattern2 = list(partial_state)
        for pos in empty_positions:
            pattern2[pos] = '@'
        pattern2_str = ''.join(pattern2)
        pattern2_valid = pattern2_str in self.graph.liners
        if verbose:
            print(f"          🔎 Pattern2 (all @): '{pattern2_str}' -> {pattern2_valid}")
        if pattern2_valid:
            return True
        
        # If quick patterns don't work and we have few empty positions, try more combinations
        # if len(empty_positions) <= 2:  # Only for 1-2 empty positions
        if verbose:
            print(f"          🔎 Trying all combinations for {len(empty_positions)} empty positions...")
        for combo in product(['_', '@'], repeat=len(empty_positions)):
            candidate = list(partial_state)
            for pos, replacement in zip(empty_positions, combo):
                candidate[pos] = replacement
            
            candidate_str = ''.join(candidate)
            candidate_valid = candidate_str in self.graph.liners
            if verbose:
                print(f"          🔎 Combo {combo}: '{candidate_str}' -> {candidate_valid}")
            if candidate_valid:
                return True
        
        if verbose:
            print(f"          🔎 No valid completion found!")
        return False

    def print_liner_analysis(self):
        """Print detailed analysis of possible liners for each row and column"""
        print("📊 ROW ANALYSIS:")
        for row in range(GRID_SIZE):
            row_state = self.get_row_state(row)
            print(f"  Row {row}: '{row_state}'")
            
            # Find matching liners
            matching_liners = self.find_matching_liners(row_state)
            if matching_liners:
                liner_count = len(matching_liners)
                sample_liners = list(matching_liners)[:5]  # Show only first 5
                print(f"    🎯 {liner_count} possible liners: {', '.join(sample_liners)}")
                if liner_count > 5:
                    print(f"       ... and {liner_count - 5} more")
            else:
                print(f"    ❌ No matching liners found!")
            print()
        
        print("📊 COLUMN ANALYSIS:")
        for col in range(GRID_SIZE):
            col_state = self.get_col_state(col)
            print(f"  Col {col}: '{col_state}'")
            
            # Find matching liners
            matching_liners = self.find_matching_liners(col_state)
            if matching_liners:
                liner_count = len(matching_liners)
                sample_liners = list(matching_liners)[:5]  # Show only first 5
                print(f"    🎯 {liner_count} possible liners: {', '.join(sample_liners)}")
                if liner_count > 5:
                    print(f"       ... and {liner_count - 5} more")
            else:
                print(f"    ❌ No matching liners found!")
            print()
    
    def find_matching_liners(self, current_state: str) -> Set[str]:
        """Find all liners that could potentially match the current state"""
        empty_positions = [i for i, c in enumerate(current_state) if c == '.']
        
        if not empty_positions:
            # No empty cells - exact match required
            if current_state in self.graph.liners:
                return {current_state}
            elif current_state in self.graph.words:
                return {current_state}  # Valid word counts as valid liner
            else:
                return set()
        
        # Find liners that match the filled positions exactly
        matching_liners = set()
        
        for liner in self.graph.liners:
            if len(liner) != GRID_SIZE:
                continue
                
            # Check if liner can match current state
            # For each filled position, the liner must have the exact same character
            # For each empty position, the liner can have anything (_ or @ or letters)
            matches = True
            for i, char in enumerate(current_state):
                if char != '.':  # If position is filled
                    liner_char = liner[i]
                    # Liner must have the exact same character (no wildcards allowed)
                    if liner_char != char:
                        matches = False
                        break
                # For empty positions (char == '.'), any liner character is allowed
            
            if matches:
                matching_liners.add(liner)
        
        return matching_liners

    def save_grid_to_file(self, dirname: str):
        """Save the current grid state to a file"""
        signature = self.get_grid_state_signature()
        filename = os.path.join(dirname, f"grid_{GRID_SIZE}x{GRID_SIZE}_{signature.count('-')}_empty_{signature}.txt")
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"Grid saved at attempt {getattr(self, 'current_attempt', 'unknown')}\n")
                f.write(f"Filled cells: {self.filled_cells}/{GRID_SIZE * GRID_SIZE}\n")
                f.write(f"Words placed: {len(self.word_placements)}\n\n")
                
                # Write grid
                f.write("Grid:\n")
                f.write("   " + " ".join(str(i) for i in range(GRID_SIZE)) + "\n")
                for i, row in enumerate(self.grid):
                    f.write(f" {i} " + " ".join(cell if cell != '.' else '·' for cell in row) + "\n")
                
                # Write placed words
                f.write("\nPlaced words:\n")
                for i, word in enumerate(self.word_placements):
                    f.write(f"{i+1:2d}. '{word.word}' at ({word.row},{word.col}) {word.direction}\n")
                
                # Write unique words placed
                unique_words = list(self.words_on_grid)
                f.write(f"\nUnique words placed ({len(unique_words)}):\n")
                for i, word in enumerate(sorted(unique_words)):
                    f.write(f"{i+1:2d}. {word}\n")
                    
        except Exception as e:
            print(f"Error saving grid to file: {e}")

    @functools.cache
    def is_solvable_line_state(self, line_state: str) -> bool:
        """Check if the current column/row state is comprised of valid words and empty cells"""
        words = line_state.split('.')
        # Check if all segments can form valid words:
        return all(
            ( 
                (not word)
                or (
                    (word in self.graph.words) 
                    and len(word) >= MIN_WORD_LENGTH)
                )
            for word in words
        )

    def is_solvable_column(self, col: int) -> bool:
        """Check if the current column is comprised of valid words and empty cells"""
        col_state = self.get_col_state(col)
        return self.is_solvable_line_state(col_state)

    def is_solvable_row(self, row: int) -> bool:
        """Check if the current row is comprised of valid words and empty cells"""
        row_state = self.get_row_state(row)
        return self.is_solvable_line_state(row_state)

    def is_solvable_grid(self) -> bool:
        """Check if the current grid state is valid"""
        # Check if all rows and columns can still lead to valid liners
        for row in range(GRID_SIZE):
            if not self.is_solvable_row(row):
                return False
        for col in range(GRID_SIZE):
            if not self.is_solvable_column(col):
                return False
        return True
    
    def get_grid_state_signature(self) -> str:
        """Create a unique signature for the current grid state"""
        return ''.join(''.join(row) for row in self.grid).replace('.', '-')

class CrosswordSolver:
    """DFS-based crossword solver"""
    
    def __init__(self, graph: CrosswordGraph, seed: Optional[int] = None):
        self.graph = graph
        self.random = random.Random(seed)
        self.attempts = 0
        self.max_attempts = 50000  # Reduced even further
        self.visited_states = set()  # Track visited grid states to avoid cycles
        
    def solve(self) -> Optional[CrosswordGrid]:
        """Solve the crossword using DFS with backtracking"""
        grid = CrosswordGrid(self.graph)
        self.attempts = 0
        self.visited_states.clear()
        
        print("🚀 Starting DFS crossword generation...")
        print(f"📊 Graph statistics:")
        print(f"   - Total words: {len(self.graph.words)}")
        print(f"   - {GRID_SIZE}-letter words (priority): {len([w for w in self.graph.words if len(w) == GRID_SIZE])}")
        print(f"   - Shorter words: {len([w for w in self.graph.words if len(w) < GRID_SIZE])}")
        print(f"   - Total liners: {len(self.graph.liners)}")
        print(f"   - Max attempts: {self.max_attempts}")
        print(f"📏 Grid size: {GRID_SIZE}x{GRID_SIZE}")
        print(f"🎯 Strategy: Prioritize {GRID_SIZE}-letter words, use padded liners for shorter words")
        
        result = self._dfs_solve(grid, [])
        
        if result:
            print(f"\n🎉 SOLUTION FOUND after {self.attempts} attempts!")
            return result
        else:
            print(f"\n😞 No solution found after {self.attempts} attempts.")
            return None
    
    def _dfs_solve(self, grid: CrosswordGrid, placement_history: List[Tuple[str, int, int, str]], verbose: bool = False) -> Optional[CrosswordGrid]:
        """Recursive DFS solver with proper state tracking"""
        self.attempts += 1
        
        if self.attempts > self.max_attempts:
            print(f"Max attempts ({self.max_attempts}) reached. Stopping.")
            raise Exception("Max attempts reached")
        
        # # Create grid state signature 
        grid_signature = grid.get_grid_state_signature()
        if grid_signature in self.visited_states:
            # We've been in this exact grid state before - avoid cycle
            # print(f"🔄 Cycle detected! Already visited grid state: {grid_signature}")
            return None
        
        # Show progress
        if self.attempts <= 3 or self.attempts % 25 == 0:
            print(f"\n🔄 Attempt {self.attempts} - {len(grid.word_placements)} words placed")
            grid.print_grid()
            
            # # Show unique placements only
            # unique_placements = []
            # seen_placements = set()
            # for word in grid.word_placements:
            #     placement_key = f"{word.word}@{word.row},{word.col},{word.direction}"
            #     if placement_key not in seen_placements:
            #         unique_placements.append(word)
            #         seen_placements.add(placement_key)
            
            # if unique_placements:
            #     print("Unique placed words:")
            #     for i, word in enumerate(unique_placements):
            #         print(f"  {i+1:2d}. '{word.word}' at ({word.row},{word.col}) {word.direction}")
        
        # Check if grid is complete
        if grid.is_complete():
            print(f"\n🎉 SOLUTION FOUND! Grid is complete after {self.attempts} attempts!")
            print("Final grid:")
            grid.print_grid()
            return grid
        
        # Get possible word placements
        placements = grid.get_possible_placements()
        
        if not placements:
            print(f"❌ No valid placements found at attempt {self.attempts}. Backtracking...")
            return None
        
        # Filter out placements we've already tried in this branch
        new_placements = []
        for placement in placements:
            if placement not in placement_history:
                new_placements.append(placement)
        
        if not new_placements:
            print(f"❌ No new placements available at attempt {self.attempts}. Backtracking...")
            return None
        
        # Sort by word length (prioritize GRID_SIZE words)
        # new_placements.sort(key=lambda x: (-len(x[0]), x[0]))  # Sort by length desc, then word name
        
        # Limit number of placements to try to avoid explosion
        # max_placements = min(5, len(new_placements))
        # new_placements = new_placements[:max_placements]
        
        if self.attempts <= 3:
            print(f"Trying {len(new_placements)} new placements...")
        
        # Try each placement
        for i, (word, row, col, direction) in enumerate(new_placements):
            if self.attempts <= 3:
                print(f"  {i+1}. Trying '{word}' at ({row},{col}) {direction}")
            
            # Create a completely new grid for this attempt
            new_grid = CrosswordGrid(self.graph)
            
            # Replay all successful placements from current grid
            replay_success = True
            for existing_word in grid.word_placements:
                if not new_grid.place_word(existing_word.word, existing_word.row, existing_word.col, existing_word.direction):
                    replay_success = False
                    break
            
            if not replay_success:
                continue
            
            # Try the new placement
            if new_grid.place_word(word, row, col, direction, verbose=verbose):
                if self.attempts <= 3:
                    print(f"    ✅ Successfully placed '{word}'")
                
                # Add this placement to history
                new_history = placement_history + [(word, row, col, direction)]
                
                # Recursively solve
                result = self._dfs_solve(new_grid, new_history)
                if result:
                    print(f"🎉 Found solution with '{word}' placed at ({row},{col}) {direction}")
                    return result
                
                if self.attempts <= 3:
                    print(f"    ↩️ Backtracking from '{word}'")
            else:
                if self.attempts <= 3:
                    print(f"    ❌ Failed to place '{word}'")

        self.visited_states.add(grid_signature)
        
        # print(f"🔄 No valid placements left at attempt {self.attempts}. Backtracking...")
        return None
    
def main():
    """Main function to generate a crossword"""
    # Load the graph
    print("Loading crossword graph...")
    graph = CrosswordGraph()
    graph.load_words("turkish_words.txt")
    graph.find_real_intermediaries()
    graph.build_graph()
    graph.generate_liners()

    # create directories
    os.makedirs('close_calls', exist_ok=True)
    os.makedirs('solvables', exist_ok=True)
    
    print(f"Graph loaded: {len(graph.words)} words, {len(graph.liners)} liners")
    
    # Create solver with random seed for non-deterministic results
    import time
    solver = CrosswordSolver(graph, seed=int(time.time()) % 1000)
    
    # Solve the crossword
    solution = solver.solve()
    
    if solution:
        print("\n=== CROSSWORD SOLUTION ===")
        solution.print_grid()
        
        print("Placed words:")
        for i, word_placement in enumerate(solution.word_placements):
            print(f"{i+1}. {word_placement.word} at ({word_placement.row}, {word_placement.col}) {word_placement.direction}")
    else:
        print("No solution found!")

if __name__ == "__main__":
    main()
