import sqlite3

def create_db():
    # Kapcsolódás az adatbázishoz
    conn = sqlite3.connect('map_objects.db')
    c = conn.cursor()

    # Tábla létrehozása
    c.execute('''CREATE TABLE IF NOT EXISTS map_objects (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 name TEXT NOT NULL,
                 description TEXT,
                 lat REAL NOT NULL,
                 lon REAL NOT NULL,
                 image_url TEXT)''')

    conn.commit()
    conn.close()

if __name__ == '__main__':
    create_db()
    print("Adatbázis létrehozva.")
