MIT-ADT University Attendance System
Overview
This project is a comprehensive attendance management system designed for MIT Art, Design and Technology University. It combines facial recognition technology with a timetable management system to automate attendance tracking for both students and faculty members. The system features:

Facial Recognition Attendance: Students can mark attendance through face scanning

Timetable Management: Teachers can create and manage class schedules

Role-based Dashboards: Separate interfaces for students and teachers

Attendance Analytics: Track and export attendance records

Key Features
Student Features
Facial registration and recognition for attendance

Class selection and specialization tracking

Attendance history viewing

Profile management

Teacher Features
Timetable creation with subjects, batches, and practicals

Attendance record viewing

Configuration of class parameters

Excel export functionality

System Features
Secure authentication with password hashing

Real-time face detection using Haar Cascades

KNN algorithm for face recognition

SQLite database for data storage

Responsive web interface

Technologies Used
Backend
Python 3.9+

Flask web framework

SQLAlchemy (ORM)

OpenCV (face detection)

NumPy (matrix operations)

Pandas (Excel processing)

Frontend
HTML5, CSS3, JavaScript

Bootstrap 4.6

Font Awesome icons

Canvas API for video processing

Database
SQLite (users.db and config.db)

Installation Guide
Prerequisites
Python 3.9+

pip package manager

Virtual environment (recommended)

Setup Steps
Clone the repository:


git clone https://github.com/yourusername/mit-attendance-system.git
cd mit-attendance-system
Create and activate virtual environment:


python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate    # Windows
Install dependencies:


pip install -r requirements.txt
Initialize databases:


python init_db.py
Download Haar Cascade classifier:


wget https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_alt.xml
Create required directories:


mkdir face_dataset attendance_data
Run the application:


python app.py
Usage
Accessing the System
Open your browser and navigate to: http://localhost:5000

Use the following test accounts:

Teacher: username: teacher1, password: pass123

Student: username: student1, password: pass123

Key Functionalities
Student Registration:

Register face through webcam

Select classes and specializations

View attendance history

Attendance Marking:

Students can check-in/check-out via face recognition

Real-time face scanning interface

Timetable Management:

Create and edit class schedules

Configure subjects, batches, and practicals

Export to Excel format

Attendance Tracking:

Teachers can view attendance records by class

Filter by date and enrollment number

Export to Excel

Project Structure

mit-attendance-system/
├── app.py                 # Main application
├── init_db.py             # Database initialization
├── requirements.txt       # Python dependencies
├── face_dataset/          # Student face data storage
├── attendance_data/       # Attendance records
├── templates/
│   ├── index.html         # Homepage
│   ├── teacher_dashboard.html
│   ├── student_dashboard.html
│   ├── timetable.html
│   ├── mark.html          # Attendance marking
│   └── register.html      # Face registration
└── haarcascade_frontalface_alt.xml # Face detection model
License
This project is licensed under the MIT License - see the LICENSE file for details.

Acknowledgements
OpenCV for facial recognition capabilities

Flask community for web framework

MIT-ADT University for academic context
