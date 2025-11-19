import os
import bcrypt
import jwt
from flask import Blueprint, request, jsonify
from db import db_get, db_run
from sessions_service import record_login_attempt, get_recent_failed_attempts

auth_bp = Blueprint('auth', __name__)

JWT_SECRET = os.getenv('JWT_SECRET', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZXhhbXBsZSJ9.lGrIa8yMwsB_ZSrgoniyr5FF34e9tE7TJboLqTfvifE')


@auth_bp.post('/signup')
def hr_signup():
    try:
        data = request.get_json(force=True)
        full_name = data.get('fullName')
        email = data.get('email')
        password = data.get('password')
        company = data.get('company')

        if not full_name or not email or not password or not company:
            return jsonify({"error": "All fields are required"}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        existing = db_get('SELECT hrid FROM hr_signup WHERE email = ?', (email,))
        if existing:
            return jsonify({"error": "Email already registered"}), 400

        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Generate next HRID like HRID001 based on max existing
        row = db_get("SELECT MAX(CAST(SUBSTRING(hrid,5,10) AS INT)) AS maxn FROM hr_signup", ())
        next_num = int(row['maxn']) + 1 if row and row.get('maxn') is not None else 1
        hrid = f"HRID{next_num:03d}"

        # Insert signup with HRID primary key and hashed password
        db_run('INSERT INTO hr_signup (hrid, full_name, email, company, password) VALUES (?, ?, ?, ?, ?);', (hrid, full_name, email, company, hashed))

        token = jwt.encode({"hrId": hrid, "email": email, "role": "HR"}, JWT_SECRET, algorithm='HS256')

        return jsonify({
            "token": token,
            "user": {
                "hrId": hrid,
                "email": email,
                "fullName": full_name,
                "company": company,
                "role": "HR"
            }
        }), 201
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.post('/login')
def hr_login():
    try:
        data = request.get_json(force=True)
        email = data.get('email')
        password = data.get('password')
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        failed_attempts = get_recent_failed_attempts(email, 'HR', 15)
        if failed_attempts >= 5:
            record_login_attempt(email, 'HR', 'failed', ip_address, user_agent, 'Too many failed attempts')
            return jsonify({"error": "Too many failed login attempts. Please try again later."}), 429

        signup_data = db_get(
            'SELECT hrid, email, password, full_name, company FROM hr_signup WHERE email = ?',
            (email,)
        )
        if not signup_data:
            record_login_attempt(email, 'HR', 'failed', ip_address, user_agent, 'User not found')
            return jsonify({"error": "Invalid email or password"}), 401

        if not bcrypt.checkpw(password.encode('utf-8'), signup_data['password'].encode('utf-8')):
            record_login_attempt(email, 'HR', 'failed', ip_address, user_agent, 'Invalid password')
            return jsonify({"error": "Invalid email or password"}), 401

        user_id = signup_data['hrid']
        token = jwt.encode({"hrId": user_id, "email": signup_data['email'], "role": "HR"}, JWT_SECRET, algorithm='HS256')

        db_run('INSERT INTO hr_login (hrid, email, password) VALUES (?, ?, ?)', (user_id, signup_data['email'], signup_data['password']))
        record_login_attempt(email, 'HR', 'success', ip_address, user_agent)

        return jsonify({
            "token": token,
            "user": {
                "hrId": user_id,
                "email": signup_data['email'],
                "fullName": signup_data['full_name'],
                "company": signup_data['company'],
                "role": "HR"
            }
        })
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.post('/logout')
def hr_logout():
    from sessions_service import deactivate_session
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.split(' ')[1] if auth_header.startswith('Bearer ') else None
        if token:
            deactivate_session(token)
        return jsonify({"message": "Logged out successfully"})
    except Exception:
        return jsonify({"error": "Internal server error"}), 500
