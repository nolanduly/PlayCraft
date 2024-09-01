from flask import Flask, render_template, request, jsonify, url_for
import os
from urllib.parse import quote
import json
from connorStalions import traverse_playbook, create_directory
import logging
from PIL import Image
import pytesseract

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG)

UPLOAD_FOLDER = 'static/uploads'
GAME_PLANS_FOLDER = 'game_plans'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['GAME_PLANS_FOLDER'] = GAME_PLANS_FOLDER

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/load_playbook', methods=['POST'])
def load_playbook():
    school = request.form['school']
    logging.debug(f"Received request to load playbook for school: {school}")
    
    if not school:
        return jsonify({'error': 'School name is required'}), 400
    
    base_url = f'https://collegefootball.gg/playbooks/{school}/offense/'
    starting_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{school.capitalize()}_Offense_Playbook')
    
    if os.path.exists(starting_path):
        logging.debug(f"Playbook for {school} already exists. Loading from disk.")
    else:
        logging.debug(f"Creating directory: {starting_path}")
        create_directory(starting_path)
        
        logging.debug(f"Traversing playbook from URL: {base_url}")
        try:
            traverse_playbook(base_url, base_url, starting_path)
        except Exception as e:
            logging.error(f"Failed to traverse playbook: {str(e)}")
            return jsonify({'error': 'Failed to load playbook. The school might not exist or there might be a network issue.'}), 500
    
    logging.debug("Loading plays from directory")
    plays = load_plays_from_directory(starting_path, school)
    
    if not plays:
        return jsonify({'error': 'No plays found in the playbook'}), 404
    
    logging.debug(f"Returning {len(plays)} plays")
    return jsonify(plays)

def load_plays_from_directory(directory, school):
    plays = []
    logging.debug(f"Loading plays from directory: {directory}")
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.png'):
                play_path = os.path.join(root, file)
                relative_path = os.path.relpath(play_path, directory)
                path_parts = relative_path.split(os.sep)
                
                play_name = os.path.splitext(file)[0]
                formation = path_parts[-2] if len(path_parts) > 1 else "Unknown"
                alignment = path_parts[-3] if len(path_parts) > 2 else "Unknown"
                
                url_path = '/static/' + quote(os.path.relpath(play_path, app.static_folder).replace(os.sep, '/'))
                
                play_info = {
                    'name': play_name,
                    'path': url_path,
                    'playbook': f"{school.capitalize()} Offense",
                    'formation': formation,
                    'alignment': alignment,
                    'directory': os.path.dirname(relative_path).replace(os.sep, '/')
                }
                
                logging.debug(f"Found play: {play_info}")
                plays.append(play_info)
    
    return plays

@app.route('/save_game_plan', methods=['POST'])
def save_game_plan():
    try:
        data = request.json
        name = data['name']
        plays = data['plays']
        play_call_sheet = data['playCallSheet']
        
        game_plan = {
            'name': name,
            'plays': plays,
            'playCallSheet': play_call_sheet
        }
        
        if not os.path.exists(app.config['GAME_PLANS_FOLDER']):
            os.makedirs(app.config['GAME_PLANS_FOLDER'])
        
        file_path = os.path.join(app.config['GAME_PLANS_FOLDER'], f"{name}.json")
        
        with open(file_path, 'w') as f:
            json.dump(game_plan, f)
        
        return jsonify({'success': True, 'message': f'Game plan "{name}" saved successfully'})
    except Exception as e:
        logging.error(f"Error saving game plan: {str(e)}")
        return jsonify({'error': f'An error occurred while saving the game plan: {str(e)}'}), 500

@app.route('/load_game_plan', methods=['POST'])
def load_game_plan():
    name = request.form['name']
    file_path = os.path.join(app.config['GAME_PLANS_FOLDER'], f"{name}.json")
    
    if not os.path.exists(file_path):
        return jsonify({'error': f'Game plan "{name}" not found'}), 404
    
    try:
        with open(file_path, 'r') as f:
            game_plan = json.load(f)
        return jsonify(game_plan)
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid game plan file'}), 500
    except Exception as e:
        logging.error(f"Error loading game plan: {str(e)}")
        return jsonify({'error': 'An error occurred while loading the game plan'}), 500

@app.route('/auto_play_type', methods=['POST'])
def auto_play_type():
    logging.debug("Auto Play Type route called")
    plays = request.json['plays']
    logging.debug(f"Received {len(plays)} plays for auto-typing")
    typed_plays = []

    for play in plays:
        image_path = os.path.join(app.root_path, play['path'].lstrip('/'))
        logging.debug(f"Analyzing image: {image_path}")
        play_type = analyze_image(image_path)
        play['auto_play_type'] = play_type
        logging.debug(f"Auto-typed play {play['name']} as {play_type}")
        typed_plays.append(play)

    logging.debug(f"Finished auto-typing {len(typed_plays)} plays")
    return jsonify(typed_plays)

def analyze_image(image_path):
    try:
        with Image.open(image_path) as img:
            # Crop the image to the top-left corner (100x50 pixels)
            cropped = img.crop((0, 0, 100, 50))
            # Use pytesseract to extract text from the cropped image
            text = pytesseract.image_to_string(cropped).strip().lower()
            logging.debug(f"Extracted text from {image_path}: '{text}'")
            
            if 'run' in text:
                return 'Run'
            elif 'pass' in text:
                return 'Pass'
            elif 'rpo' in text:
                return 'RPO'
            else:
                return 'Unknown'
    except Exception as e:
        logging.error(f"Error analyzing image {image_path}: {str(e)}")
        return 'Error'

if __name__ == '__main__':
    app.run(debug=True)