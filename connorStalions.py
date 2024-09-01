import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_directory(path):
    if not os.path.exists(path):
        os.makedirs(path)
        logger.info(f"Created directory: {path}")

def download_play_image(img_url, play_name, path):
    create_directory(path)
    try:
        response = requests.get(img_url)
        response.raise_for_status()
        img_path = os.path.join(path, f"{play_name}.png")
        with open(img_path, 'wb') as f:
            f.write(response.content)
        logger.info(f"Downloaded and saved image: {img_path}")
    except requests.RequestException as e:
        logger.error(f"Failed to download image: {img_url}. Error: {str(e)}")

def traverse_playbook(base_url, current_url, current_path, visited=set()):
    if current_url in visited:
        return
    visited.add(current_url)

    try:
        response = requests.get(current_url)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Failed to retrieve {current_url}: {str(e)}")
        if response.status_code == 404:
            logger.error(f"The playbook for this school might not exist: {base_url}")
        return

    soup = BeautifulSoup(response.text, 'html.parser')
    anchors = soup.find_all('a', href=True)
    found_sub_paths = False

    for anchor in anchors:
        href = anchor['href']
        full_url = urljoin(current_url, href)

        if '#' in href or '/#' in href or 'jeg_' in href:
            continue

        if full_url.startswith(base_url) and full_url not in visited:
            if full_url.endswith('/'):
                relative_path = os.path.relpath(urlparse(full_url).path, urlparse(base_url).path)
                sub_path = os.path.join(current_path, os.path.basename(urlparse(relative_path).path))
                traverse_playbook(base_url, full_url, sub_path, visited)
            found_sub_paths = True

    if not found_sub_paths:
        play_images = soup.find_all('img', src=True)
        for img in play_images:
            img_src = img['src']
            if img_src.startswith("https://collegefootball.gg/wp-content/plugins/playbook/playbook_images_ncaa-25/"):
                play_name = os.path.basename(urlparse(current_url).path.rstrip('/'))
                download_play_image(img_src, play_name, os.path.dirname(current_path))
                return

def main():
    school = input("Enter the name of the school to steal from: ").strip().lower().replace(" ", "-")
    base_url = f'https://collegefootball.gg/playbooks/{school}/offense/'

    try:
        response = requests.get(base_url)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Could not find the school at {base_url}: {str(e)}")
        return

    starting_path = f'{school.capitalize()}_Offense_Playbook'
    create_directory(starting_path)
    traverse_playbook(base_url, base_url, starting_path)

if __name__ == '__main__':
    main()