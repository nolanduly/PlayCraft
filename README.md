# PlayCraft
Play Calling Web Application for NCAA CFB 25

built with the help of claude 3.5 sonnet

# PlayCraft: Play Calling Web Application

PlayCraft is a powerful web application designed for football coaches to manage playbooks, create game plans, and analyze plays. It offers an intuitive interface for organizing plays, annotating diagrams, and building situational play call sheets.

## Features

- Playbook management: Load and organize plays from various schools
- Play annotation: Draw on play diagrams to highlight key elements
- Game plan creation: Build and save custom game plans
- Play call sheet: Organize plays by down, distance, and field position
- Tagging system: Add and filter plays by custom tags
- Search functionality: Quickly find plays by name, tags, or notes
- Auto Play Type detection: Automatically categorize plays as Run, Pass, or RPO

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/playcraft.git
   cd playcraft
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up the database:
   ```
   flask db upgrade
   ```

4. Run the application:
   ```
   flask run
   ```

5. Open a web browser and navigate to `http://localhost:5000`

## Usage

For detailed usage instructions, please refer to the [User Documentation](USER_DOCUMENTATION.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
