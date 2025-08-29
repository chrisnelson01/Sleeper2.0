# Sleeper2.0/backend/app.py
from flask import Flask
from flask_cors import CORS

from backend.config import Config
from backend.extensions import db
from backend.routes import api  # <-- your Blueprint from routes.py
import os, logging

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config.from_object(Config)
    db.init_app(app)

    # 👇 add this
    with app.app_context():
        logging.getLogger().setLevel(logging.INFO)
        app.logger.info(f"DB URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
        app.logger.info(f"DB path exists: {os.path.exists(app.config['DB_PATH'])}")
        if os.path.exists(app.config['DB_PATH']):
            app.logger.info(f"DB size (bytes): {os.path.getsize(app.config['DB_PATH'])}")

        from backend import models   # ensure models import
        db.create_all()              # creates missing tables only

    app.register_blueprint(api)
    return app

# WSGI entrypoint
app = create_app()

if __name__ == "__main__":
    # Local dev run (only when invoked directly)
    app.run(debug=True)