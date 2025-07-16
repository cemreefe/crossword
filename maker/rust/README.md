# Crossword Grapher - Rust Implementation

A high-performance Rust implementation of the crossword graph generator, optimized for speed and memory efficiency.

## Features

- **Fast word loading and filtering** using Turkish alphabet validation
- **Parallel processing** support for intermediary generation
- **Memory-efficient** data structures using HashSet and HashMap
- **Verbose and non-verbose modes** for debugging and production use
- **Command-line interface** with configurable options

## Usage

```bash
# Basic usage (non-verbose)
cargo run --release

# Verbose output
cargo run --release -- --verbose

# Use parallel processing
cargo run --release -- --parallel --verbose

# Custom input file
cargo run --release -- --input /path/to/words.txt --verbose
```

## Performance Improvements over Python

1. **Memory efficiency**: No garbage collection overhead
2. **String operations**: Native UTF-8 string handling
3. **Hash operations**: Highly optimized HashMap/HashSet implementations
4. **Parallel processing**: Optional multi-core processing for intermediary generation
5. **Compilation**: Compile-time optimizations for hot paths

## Command Line Options

- `-i, --input <FILE>`: Input file containing words (default: ../turkish_words.txt)
- `-v, --verbose`: Enable verbose output showing detailed progress
- `-p, --parallel`: Use parallel processing for intermediary generation
- `-h, --help`: Show help message

## Architecture

The Rust implementation closely follows the Python version but with significant performance optimizations:

- Uses `HashSet<String>` for efficient word and intermediary storage
- Implements parallel processing with `rayon` for CPU-intensive operations
- Memory-efficient string operations avoiding unnecessary allocations
- Compile-time optimizations for mathematical operations

## Building

```bash
cd maker/rust
cargo build --release
```

The `--release` flag is recommended for production use as it enables all optimizations.
