import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET'] = os.getenv('JWT_SECRET', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZXhhbXBsZSJ9.lGrIa8yMwsB_ZSrgoniyr5FF34e9tE7TJboLqTfvifE')
# Disable strict slashes to prevent redirects that break CORS preflight
app.url_map.strict_slashes = False

cors_origin = os.getenv('FRONTEND_URL', 'http://localhost:5173')
# Fix CORS: Explicitly allow OPTIONS method and handle preflight properly
CORS(app, 
     resources={r"/api/*": {
         "origins": cors_origin,
         "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True
     }},
     supports_credentials=True,
     automatic_options=True)  # This ensures OPTIONS requests are handled automatically

from db import init_db
from auth import auth_bp
from jobs import jobs_bp
from candidate import candidate_bp
from applications import applications_bp
from sessions_routes import sessions_bp

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "status": "ok",
        "message": "Job Portal API root. See /health for status.",
        "endpoints": ["/health", "/api", "/api/jobs", "/api/candidate", "/api/applications", "/api/sessions"]
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Job Portal API is running"})

app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
app.register_blueprint(candidate_bp, url_prefix='/api/candidate')
app.register_blueprint(applications_bp, url_prefix='/api/applications')
app.register_blueprint(sessions_bp, url_prefix='/api/sessions')

if __name__ == '__main__':
    init_db()
    port = int(os.getenv('PORT', '3000'))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')
