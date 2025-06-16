from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import pandas as pd
import os
import cv2
import numpy as np
from datetime import datetime
import base64

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(10), nullable=False)
    enrollment_number = db.Column(db.String(20), unique=True, nullable=True)

# Create database
with app.app_context():
    db.create_all()

# Timetable Database Setup
def get_db_connection():
    conn = sqlite3.connect('config.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_timetable_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS teacher_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            config_type TEXT NOT NULL,
            name TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# Attendance System Setup
face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_alt.xml")
dataset_path = "./face_dataset/"
attendance_path = "./attendance_data/"
os.makedirs(dataset_path, exist_ok=True)
os.makedirs(attendance_path, exist_ok=True)

# Combined Routes
@app.route('/')
def index():
    return render_template('index.html')

# Authentication Routes (from interface code)
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    full_name = data.get('full_name')
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    enrollment_number = data.get('enrollment_number') if role == 'student' else None

    if not all([full_name, email, username, password, role]):
        return jsonify({'success': False, 'message': 'All fields are required!'})

    if role == 'student' and not enrollment_number:
        return jsonify({'success': False, 'message': 'Enrollment number is required for students!'})

    if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Username or email already exists!'})

    hashed_password = generate_password_hash(password)
    new_user = User(
        full_name=full_name,
        email=email,
        username=username,
        password=hashed_password,
        role=role,
        enrollment_number=enrollment_number
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Account created successfully! Please log in.'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    user = User.query.filter_by(username=username, role=role).first()
    if user and check_password_hash(user.password, password):
        session['user_id'] = user.id
        session['role'] = user.role
        redirect_url = '/teacher_dashboard' if role == 'teacher' else '/student_dashboard'
        return jsonify({'success': True, 'redirect': redirect_url})
    return jsonify({'success': False, 'message': 'Invalid username or password'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/teacher_dashboard')
def teacher_dashboard():
    if 'user_id' not in session or session['role'] != 'teacher':
        return redirect(url_for('index'))
    user = User.query.get(session['user_id'])
    return render_template('teacher_dashboard.html', user=user)

# get_attendance_data
@app.route('/get_attendance_data', methods=['GET'])
def get_attendance_data():
    class_name = request.args.get("class")
    if not class_name:
        return jsonify({"error": "Class parameter is required"}), 400
    
    filename = os.path.join(attendance_path, f"{class_name}.xlsx")
    if not os.path.exists(filename):
        return jsonify({"error": f"Attendance file not found for {class_name}"}), 404
    
    try:
        # Read Excel file with proper datetime handling
        df = pd.read_excel(filename, parse_dates=['Date'])
        
        # Convert datetime columns to readable strings
        if 'Date' in df.columns:
            df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
        if 'CheckIn' in df.columns:
            df['CheckIn'] = pd.to_datetime(df['CheckIn'], errors='coerce').dt.strftime('%H:%M:%S')
        if 'CheckOut' in df.columns:
            df['CheckOut'] = pd.to_datetime(df['CheckOut'], errors='coerce').dt.strftime('%H:%M:%S')
        
        # Replace NaN/NaT with empty strings
        df = df.fillna('')
        
        # Convert to list of dictionaries
        data = df.to_dict(orient='records')
        return jsonify({
            "success": True,
            "data": data,
            "columns": df.columns.tolist(),
            "count": len(data)
        })
    except Exception as e:
        return jsonify({
            "error": f"Error processing attendance data: {str(e)}",
            "success": False
        }), 500

@app.route('/student_dashboard')
def student_dashboard():
    if 'user_id' not in session or session['role'] != 'student':
        return redirect(url_for('index'))
    user = User.query.get(session['user_id'])
    return render_template('student_dashboard.html', user=user)

# Timetable Routes (from timetable code)
def get_excel_filename(class_name):
    if class_name:
        return f"{class_name}_timetable.xlsx"
    return "timetable.xlsx" 
    
@app.route('/timetable')
def timetable_page():
    if 'user_id' not in session or session['role'] != 'teacher':
        return redirect(url_for('index'))
    return render_template('timetable.html')

@app.route('/add_config', methods=['POST'])
def add_config():
    data = request.get_json()
    class_name = data.get("class")
    config_type = data.get("type")
    name = data.get("name")
    if not (class_name and config_type and name):
        return jsonify({"error": "Missing parameters"}), 400
    conn = get_db_connection()
    conn.execute('INSERT INTO teacher_config (class_name, config_type, name) VALUES (?, ?, ?)',
                 (class_name, config_type, name))
    conn.commit()
    conn.close()
    return jsonify({"message": "Added successfully"})

@app.route('/delete_config', methods=['POST'])
def delete_config():
    data = request.get_json()
    class_name = data.get("class")
    config_type = data.get("type")
    name = data.get("name")
    if not (class_name and config_type and name):
        return jsonify({"error": "Missing parameters"}), 400
    conn = get_db_connection()
    conn.execute('DELETE FROM teacher_config WHERE class_name=? AND config_type=? AND name=?',
                 (class_name, config_type, name))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted successfully"})

@app.route('/get_config', methods=['GET'])
def get_config():
    class_name = request.args.get("class")
    config_type = request.args.get("type")
    if not (class_name and config_type):
        return jsonify([])
    conn = get_db_connection()
    configs = conn.execute('SELECT name FROM teacher_config WHERE class_name=? AND config_type=?',
                           (class_name, config_type)).fetchall()
    conn.close()
    return jsonify([row["name"] for row in configs])

@app.route('/load', methods=['GET'])
def load_timetable():
    class_name = request.args.get('class')
    filename = get_excel_filename(class_name)
    if not os.path.exists(filename):
        return jsonify({})
    df = pd.read_excel(filename, index_col=0)
    return df.to_json()

@app.route('/save', methods=['POST'])
def save_timetable():
    payload = request.get_json()
    teacher_class = payload.get("class", "")
    data = payload.get("timetable", {})
    filename = get_excel_filename(teacher_class)
    df = pd.DataFrame(data)
    df.to_excel(filename)
    return jsonify({'message': f'Saved successfully to {filename}!'})

from flask import send_file

@app.route('/download_excel', methods=['GET'])
def download_excel():
    class_name = request.args.get('class')
    filename = get_excel_filename(class_name)
    if not os.path.exists(filename):
        return "File not found", 404
    return send_file(filename, as_attachment=True)

# Attendance Routes (from attendance code)

# KNN distance utility
def distance(v1, v2):
    return np.sqrt(((v1 - v2) ** 2).sum())

def knn(train, test, k=5):
    dist = []
    for i in range(train.shape[0]):
        ix = train[i, :-1]
        iy = train[i, -1]
        d = distance(test, ix)
        dist.append([d, iy])
    dk = sorted(dist, key=lambda x: x[0])[:k]
    labels = np.array(dk)[:, -1]
    return np.unique(labels, return_counts=True)[0][0]

# Attendance management per class
class AttendanceSystem:
    def __init__(self, class_name):
        self.class_name = class_name
        self.file = os.path.join(attendance_path, f"{class_name}.xlsx")
        self.columns = ["Enrollment", "Name", "Date", "CheckIn", "CheckOut"]
        if not os.path.exists(self.file):
            df = pd.DataFrame(columns=self.columns)
            df.to_excel(self.file, index=False)

    def checkin(self, enrollment, name):
        today = datetime.now().strftime("%Y-%m-%d")
        now = datetime.now().strftime("%H:%M:%S")
        df = pd.read_excel(self.file)
        existing = df[(df["Enrollment"] == enrollment) & (df["Date"] == today)]
        if existing.empty:
            new_entry = pd.DataFrame([[enrollment, name, today, now, ""]], columns=self.columns)
            df = pd.concat([df, new_entry], ignore_index=True)
            df.to_excel(self.file, index=False)
            return True, "Check-in successful"
        return False, "Already checked in"

    def checkout(self, enrollment):
        today = datetime.now().strftime("%Y-%m-%d")
        now = datetime.now().strftime("%H:%M:%S")
        df = pd.read_excel(self.file)
        idx = df[(df["Enrollment"] == enrollment) & (df["Date"] == today)].index
        if idx.empty:
            return False, "Please check-in first"
        row = df.loc[idx[0]]
        if pd.isna(row["CheckOut"]) or row["CheckOut"] == "":
            df.at[idx[0], "CheckOut"] = now
            df.to_excel(self.file, index=False)
            return True, "Check-out successful"
        return False, "Already checked out"

@app.route('/mark_attendance')
def mark_attendance_page():
    return render_template('mark.html')

@app.route('/register_face')
def register_face_page():
    if 'user_id' not in session or session['role'] != 'student':
        return redirect(url_for('index'))
    return render_template('register.html')

# ... include all attendance API routes (/api/register_face, /api/identify_face, /api/checkin, /api/checkout) ...

@app.route('/api/register_face', methods=['POST'])
def register_face():
    data = request.json
    class_name = data['class_name']
    name = data['name']
    enrollment = data['enrollment']
    images = data['images']  # List of base64 images

    class_folder = os.path.join(dataset_path, class_name)
    os.makedirs(class_folder, exist_ok=True)

    face_data = []

    for img_data in images:
        img_bytes = base64.b64decode(img_data.split(",")[1])
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces[:1]:
            face = img[y:y+h, x:x+w]
            face = cv2.resize(face, (100, 100))
            face_data.append(face.flatten())
            flipped = cv2.flip(face, 1)
            face_data.append(flipped.flatten())

    if face_data:
        face_data = np.array(face_data)
        filename = f"{enrollment}_{name}.npy"
        np.save(os.path.join(class_folder, filename), face_data)
        return jsonify({"status": "success", "message": f"{len(face_data)} faces saved"})
    return jsonify({"status": "fail", "message": "No faces detected"})

# API to identify face without marking
@app.route('/api/identify_face', methods=['POST'])
def identify_face():
    data = request.json
    class_name = data['class_name']
    img_data = data['image']
    img_bytes = base64.b64decode(img_data.split(",")[1])
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    class_folder = os.path.join(dataset_path, class_name)
    if not os.path.exists(class_folder):
        return jsonify({"status": "fail", "message": "No data for this class"})

    # Load training data for this class
    face_data = []
    labels = []
    names = {}
    class_id = 0
    for file in os.listdir(class_folder):
        if file.endswith('.npy'):
            data_arr = np.load(os.path.join(class_folder, file))
            face_data.append(data_arr)
            parts = file[:-4].split('_', 1)
            labels.extend([class_id] * data_arr.shape[0])
            names[class_id] = {'enrollment': parts[0], 'name': parts[1]}
            class_id += 1

    if not face_data:
        return jsonify({"status": "fail", "message": "No trained data found"})

    X_train = np.concatenate(face_data, axis=0)
    y_train = np.array(labels).reshape(-1, 1)
    trainset = np.hstack((X_train, y_train))

    for (x, y, w, h) in faces[:1]:
        face = img[y:y+h, x:x+w]
        face = cv2.resize(face, (100, 100)).flatten()
        pred_id = knn(trainset, face)
        info = names.get(pred_id)
        if info:
            return jsonify({
                "status": "success",
                "name": info['name'],
                "enrollment": info['enrollment']
            })
    return jsonify({"status": "fail", "message": "Face not recognized"})

# API to check-in
@app.route('/api/checkin', methods=['POST'])
def api_checkin():
    data = request.json
    class_name = data['class_name']
    enrollment = data['enrollment']
    name = data['name']
    attendance = AttendanceSystem(class_name)
    ok, msg = attendance.checkin(enrollment, name)
    status = "success" if ok else "fail"
    return jsonify({"status": status, "message": msg})

# API to check-out
@app.route('/api/checkout', methods=['POST'])
def api_checkout():
    data = request.json
    class_name = data['class_name']
    enrollment = data['enrollment']
    attendance = AttendanceSystem(class_name)
    ok, msg = attendance.checkout(enrollment)
    status = "success" if ok else "fail"
    return jsonify({"status": status, "message": msg})



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)