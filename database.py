import sqlite3
import os

def init_db(db_name="pilltrack.db"):
    """
    Initializes the SQLite database and creates the drugs table if it doesn't exist.
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    # Create drugs table
    # interval_days: 0 means every day, 1 means every other day, etc.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS drugs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dosage TEXT,
            amount TEXT,
            start_date TEXT NOT NULL,
            interval_days INTEGER DEFAULT 0,
            stock REAL DEFAULT 0
        )
    ''')
    
    # Add some initial data if empty
    cursor.execute("SELECT COUNT(*) FROM drugs")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO drugs (name, dosage, amount, start_date, interval_days, stock)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('羟氯喹', '早晚饭后', '2粒', '2024-01-01', 3, 100))
        cursor.execute('''
            INSERT INTO drugs (name, dosage, amount, start_date, interval_days, stock)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('中药', '晚饭后', '1袋', '2024-01-01', 2, 30))
        conn.commit()
        
    conn.close()

if __name__ == "__main__":
    init_db()
