from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'heic'}  # HEIC hozzáadva

# Kiterjesztés ellenőrzése
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Adatbázis kapcsolódás
def connect_db():
    conn = sqlite3.connect('markers.db')
    return conn

# Adatbázis inicializálása
def init_db():
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS markers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        description TEXT,
                        image TEXT,
                        lat REAL NOT NULL,
                        lng REAL NOT NULL
                    )''')
    conn.commit()
    conn.close()

# Kép feltöltése
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            # Kép mentése
            file.save(file_path)
            return jsonify({'image_url': f'/static/uploads/{filename}'})
        except Exception as e:
            print(f"Error saving file: {e}")
            return jsonify({'error': 'File saving failed.'}), 500
    else:
        return jsonify({'error': 'File type not allowed. Only images are permitted.'}), 400

# Új pont hozzáadása
@app.route('/add_point', methods=['POST'])
def add_point():
    name = request.form['name']
    description = request.form['description']
    image = request.form['image']
    lat = float(request.form['lat'])
    lng = float(request.form['lng'])

    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO markers (name, description, image, lat, lng) VALUES (?, ?, ?, ?, ?)',
                   (name, description, image, lat, lng))
    conn.commit()
    conn.close()

    return jsonify({'status': 'success'})

# Marker-ek lekérése
@app.route('/get_markers', methods=['GET'])
def get_markers():
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute('SELECT name, description, image, lat, lng FROM markers')
    markers = cursor.fetchall()
    conn.close()

    marker_list = []
    for marker in markers:
        marker_list.append({
            'name': marker[0],
            'description': marker[1],
            'image': marker[2],
            'lat': marker[3],
            'lng': marker[4]
        })
    return jsonify(marker_list)

# Alapértelmezett route, a térkép megjelenítése
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    if not os.path.exists('static/uploads'):
        os.makedirs('static/uploads')
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)  # Minden IP-ről elérhető a szerver
