import logging, os, sys
from pathlib import Path
from app import create_app
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
for env_name in ('.env', '../.env'):
    env_path = (BACKEND_DIR / env_name).resolve()
    if env_path.exists():
        load_dotenv(env_path)
        break

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
    handlers=[
        logging.FileHandler('/tmp/backend-logs/trace.log'),
        logging.StreamHandler(sys.stderr),
    ],
)

werkzeug = logging.getLogger('werkzeug')
werkzeug.setLevel(logging.INFO)

app = create_app()

if __name__ == '__main__':
    app.run(
        host=os.environ.get('HOST', '0.0.0.0'),
        port=int(os.environ.get('PORT', 5000)),
        debug=False,
        use_reloader=False,
    )