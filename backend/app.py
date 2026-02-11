#!/usr/bin/env python
"""Entry point for the Sleeper backend."""
import sys
import os

# Add the app directory to the path so backend is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS
import logging
from sqlalchemy import text

from .config import Config
from .extensions import db
from .routes import api
from . import models

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.config.from_object(Config)
    
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    # Initialize database
    db.init_app(app)
    
    with app.app_context():
        logger.info(f"DB URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
        db.create_all()

        def ensure_column(table: str, column: str, column_type: str):
            try:
                result = db.session.execute(text(f"PRAGMA table_info({table})"))
                columns = [row[1] for row in result.fetchall()]
                if column not in columns:
                    logger.info(f"Adding {column} column to {table} table")
                    db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}"))
                    db.session.commit()
            except Exception as e:
                logger.warning(f"Could not ensure {column} column on {table}: {e}")

        ensure_column("contract", "contract_amount", "INTEGER")
        ensure_column("contract", "created_at", "DATETIME")
        ensure_column("amnesty_player", "created_at", "DATETIME")
        ensure_column("rfa_players", "created_at", "DATETIME")
        ensure_column("extension_players", "created_at", "DATETIME")
        league_info_columns = {
            "is_auction": "INTEGER",
            "is_keeper": "INTEGER",
            "money_per_team": "INTEGER",
            "keepers_allowed": "INTEGER",
            "rfa_allowed": "INTEGER",
            "amnesty_allowed": "INTEGER",
            "extension_allowed": "INTEGER",
            "extension_length": "INTEGER",
            "max_contract_length": "INTEGER",
            "rfa_length": "INTEGER",
            "taxi_length": "INTEGER",
            "rollover_every": "INTEGER",
            "creation_date": "TEXT",
        }
        for column, column_type in league_info_columns.items():
            ensure_column("league_info", column, column_type)
    
    # Register blueprints
    app.register_blueprint(api)
    
    return app

app = create_app()

if __name__ == "__main__":
    if os.getenv("DEBUGPY", "0") == "1":
        import debugpy
        debugpy.listen(("0.0.0.0", 5679))
        # debugpy.wait_for_client()  # uncomment if you want to block until attached
    app.run(debug=True, host='0.0.0.0', port=5000)
