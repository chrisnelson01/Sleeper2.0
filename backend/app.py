from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db  # Import db from extensions.py

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load configuration
app.config.from_object(Config)

# Initialize db with the app
db.init_app(app)

from routes import api

# Register blueprints (routes)
app.register_blueprint(api)

if __name__ == "__main__":
    app.run(debug=True)
