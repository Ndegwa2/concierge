from app import create_app
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Create Flask app
app = create_app()

if __name__ == '__main__':
    # Run the application
    # NOTE: debug defaults to False for security. Set DEBUG=true explicitly for development.
    app.run(
        host=os.environ.get('HOST', '0.0.0.0'),
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('DEBUG', 'False').lower() == 'true'
    )
