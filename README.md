# Dutluk Mini Crossword

A modern, multilingual web-based crossword puzzle game with built-in encryption support for puzzle creators. Play daily mini crosswords in your browser with an elegant, mobile-friendly interface.

Live on <https://bulmaca.dutl.uk>.

## 🎯 Features

- **Daily Mini Crosswords**: New puzzles published regularly
- **Multilingual Support**: Currently supports English and Turkish with easy localization
- **Encryption System**: Secure puzzle creation and sharing without spoilers
- **Mobile-Friendly**: Responsive design optimized for all devices
- **Real-time Validation**: Instant feedback on puzzle completion
- **Timer**: Track your solving time and share your results
- **Keyboard Navigation**: Full keyboard support for seamless solving

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Some sort of hosting (can be as simple as gtihub pages, or Python's built-in server)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/crossword.git
cd crossword
```

2. Start a local web server:
```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

3. Open your browser and navigate to `http://localhost:8000`

### Language Selection

The game supports multiple languages via URL parameters:
- Turkish (default): `http://localhost:8000/`
- English: `http://localhost:8000/?lang=en`

## 📝 Creating Your Own Crosswords

### Crossword Format

Crosswords are stored as simple text files with the following format:

```
AUTHOR: Your Name
GRID: 5
AB-DE
FGHIJ
KLMNO
PQRST
UVWXY

H1.1: Clue for first horizontal word
H1.2: Clue for second horizontal word (if any)
H2.1: Second row's clue
V1.1: First vertical clue
V2.1: Second vertical clue
```

### Format Explanation

- **AUTHOR**: Your name as the puzzle creator
- **GRID**: Grid size (typically 5 or 6)
- **Grid Layout**: 
  - Letters represent filled cells
  - `-` represents black/blocked cells
  - Each row on a new line
- **Clues**: 
  - `H` for horizontal, `V` for vertical
  - First number is row/column, second is word index
  - Example: `H1.2` = Second word in row one

### Example 4x4 Grid

```
AUTHOR: John Doe
GRID: 4
CATS
A--T
ROBE
SHED

H1.1: Feline pets
H2.1: B4B
H2.2: Sigh sound
H3.1: Bathrobe
H4.1: Garden storage
V1.1: Common vehicles
...
```

## 🔐 Encryption System

### Why Encryption?

The encryption system allows puzzle creators to:
- Share puzzles without revealing solutions
- Maintain the surprise element for solvers
- Upload puzzles to public repositories safely

### How to Encrypt Puzzles

1. **Visit the Encryption Tool**: Navigate to `/encrypt.html`

2. **Upload or Paste Content**: 
   - Drag and drop a `.txt` file, or
   - Paste your crossword content directly

3. **Validate**: The tool will check your puzzle format

4. **Generate Encrypted Version**: Creates an encrypted file ready for upload

5. **Test Your Puzzle**: Preview and play your encrypted puzzle before sharing to ensure everything works as expected.

### Technical Details

- Uses XOR encryption with a simple key
- Encrypted files are prefixed with `[ENCRYPTED]`
- The game automatically detects and decrypts content
- Original format remains unchanged after decryption

## 📂 File Structure

```
crossword/
├── index.html              # Main game interface
├── encrypt.html            # Puzzle encryption tool
├── devlog.html            # Development changelog
├── localization/          # Language files
│   ├── en.json           # English translations
│   └── tr.json           # Turkish translations
├── en/                   # English puzzles
│   └── YYYY-MM-DD.txt    # Daily puzzle files
├── tr/                   # Turkish puzzles
│   └── YYYY-MM-DD.txt    # Daily puzzle files
├── maker/                # Puzzle generation tools
│   ├── maker.py          # Crossword generator
│   ├── grapher.py        # Word graph creation tool
│   └── turkish_words.txt # Example word dictionary
└── static/               # Images and assets
    ├── dut2.png
    └── dutluk_card.png
```

## 🌍 Adding a New Language

### Step 1: Create Localization File

Create a new JSON file in the `localization/` directory:

```json
{
  "readyToPlay": "Ready to play?",
  "startGame": "Start Crossword",
  "crosswordSolved": "🎉 Crossword Solved!",
  "youFinishedIn": "You finished in",
  "miniCrossword": "Mini Crossword",
  "time": "Time",
  "by": "by",
  "across": "ACROSS",
  "down": "DOWN",
  "shareText": "I solved today's Mini Crossword in {time}!"
}
```

### Step 2: Create Puzzle Directory

Create a new directory for your language code (e.g., `fr/` for French, `es/` for Spanish).

### Step 3: Add Puzzle Files

Create puzzle files in the format `YYYY-MM-DD.txt` in your language directory.

### Step 4: Access Your Language

Use the URL parameter: `?lang=your_language_code`

The locale used to convert letters to uppercase will be based on your language code. It will automatically be used as your locale.

The default code is `tr`.

## 🛠️ Development

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Testing Your Puzzles

Use the encryption tool at `/encrypt.html` to:
- Validate puzzle format
- Preview your puzzle
- Test gameplay before sharing

## 📱 Mobile Support

The game is fully optimized for mobile devices:
- Touch-friendly interface
- Responsive grid sizing
- Virtual keyboard support
- Tap-to-type functionality on iOS

## 🎨 Customization

### Styling

Modify the CSS in `index.html` to customize:
- Colors and themes
- Grid appearance
- Typography
- Responsive behavior

### Game Logic

The main game logic is in `index.html`:
- Grid validation
- Timer functionality
- Puzzle loading
- Encryption/decryption

## 📊 Puzzle Generation

The project includes Python tools for generating puzzles:

- `grapher.py`: Creates a graph of nodes based on complete and
incomplete words. This helps create a mapping from rows/columns
to potential words that can be used for the row/column. A separate, more detailed documentation to follow.
- `maker.py`: Automated crossword generation using the graph created by grapher.

## 🔗 URL Parameters

- `lang`: Language selection (`en`, `tr`)
- `crosswordOverride`: Direct puzzle data (URL encoded) to preview puzzles you create. Can be accessed through encrypt.html using the "Preview" button.

## 📄 License

🤷

## 🎯 Future Enhancements

- Additional languages
- Better puzzle generation algorithms

---

Off you go then!
