import sqlite3
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask import session, has_request_context

# Path to the SQLite database file
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

def get_current_user_id():
    """
    Returns the currently logged-in user's ID from Flask session if request context exists,
    otherwise defaults to 1.
    """
    if has_request_context() and 'user_id' in session:
        return session['user_id']
    return 1

def get_db_connection():
    """
    Establishes and returns a connection to the SQLite database.
    Configured to return rows that behave like dictionaries.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"Database connection error: {e}")
        return None

def init_db():
    """
    Initializes the database by creating the 'users', 'tasks', and other tables if they do not exist.
    Also handles incremental schema migrations to add new columns if they are missing
    and runs data migrations to update task statuses and progress fields.
    """
    conn = get_db_connection()
    if conn is None:
        return False
        
    try:
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                unique_id TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                role TEXT,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        ''')
        
        # Create base tasks table with the updated columns including AI helper fields and user_id
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                title TEXT NOT NULL,
                description TEXT,
                priority TEXT NOT NULL,
                category TEXT NOT NULL,
                due_date TEXT,
                status TEXT NOT NULL DEFAULT 'to_do',
                created_at TEXT NOT NULL,
                board_status TEXT NOT NULL DEFAULT 'to_do',
                completed_date TEXT,
                estimated_time INTEGER DEFAULT 0,
                progress INTEGER DEFAULT 0,
                started_at TEXT,
                completed_at TEXT,
                updated_at TEXT,
                ai_priority TEXT,
                ai_reason TEXT
            )
        ''')
        
        # Create daily_plan table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_plan (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                task_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
            )
        ''')
        
        # Create focus_sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS focus_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER,
                user_id INTEGER NOT NULL DEFAULT 1,
                session_date TEXT NOT NULL,
                duration_minutes INTEGER DEFAULT 20,
                started_at TEXT,
                ended_at TEXT,
                status TEXT DEFAULT 'completed',
                completed INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL
            )
        ''')
        
        # Create habits table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS habits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                color TEXT NOT NULL,
                icon TEXT NOT NULL,
                frequency TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Create habit_logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS habit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id INTEGER NOT NULL,
                completed_date TEXT NOT NULL,
                completed INTEGER NOT NULL,
                FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
            )
        ''')
        
        # Create notifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                task_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                snooze_until TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
            )
        ''')
        
        # Create user_progress table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_progress (
                id INTEGER PRIMARY KEY,
                total_xp INTEGER DEFAULT 0,
                current_level INTEGER DEFAULT 1,
                daily_goal INTEGER DEFAULT 5,
                longest_streak INTEGER DEFAULT 0,
                updated_at TEXT
            )
        ''')
        
        # Create achievements table (with UNIQUE per user)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                achievement_key TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                unlocked INTEGER DEFAULT 0,
                unlocked_at TEXT,
                UNIQUE(user_id, achievement_key)
            )
        ''')
        
        # Create xp_history table (with UNIQUE per user)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS xp_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                source_type TEXT NOT NULL,
                source_id TEXT NOT NULL,
                xp_amount INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, source_type, source_id)
            )
        ''')

        # Create password_resets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS password_resets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used INTEGER DEFAULT 0
            )
        ''')
        
        # Insert initial user_progress row if missing
        cursor.execute("INSERT OR IGNORE INTO user_progress (id, total_xp, current_level, daily_goal, longest_streak) VALUES (1, 0, 1, 5, 0)")
        
        conn.commit()
        
        # --- Migrations Loop ---
        migrated = False

        # Ensure users table has updated schema (unique_id, full_name, email, phone, role, password_hash)
        cursor.execute("PRAGMA table_info(users)")
        user_info = {row['name']: dict(row) for row in cursor.fetchall()}
        if 'unique_id' not in user_info or (user_info.get('age') and user_info['age'].get('notnull') == 1):
            print("Migration: Upgrading users table schema...")
            cursor.execute("ALTER TABLE users RENAME TO users_old")
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    unique_id TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    role TEXT DEFAULT 'Other',
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            ''')
            cursor.execute("SELECT * FROM users_old")
            old_users = cursor.fetchall()
            for u in old_users:
                u_dict = dict(u)
                u_id = u_dict.get('id')
                uid = u_dict.get('unique_id') or f"ATM-{100000 + u_id}"
                fn = u_dict.get('full_name', 'User')
                em = u_dict.get('email', f'user_{u_id}@example.com')
                ph = u_dict.get('phone', None)
                rl = u_dict.get('role', 'Other')
                pwd = u_dict.get('password_hash', '')
                ca = u_dict.get('created_at')
                ua = u_dict.get('updated_at')
                ll = u_dict.get('last_login')
                cursor.execute('''
                    INSERT OR IGNORE INTO users (id, unique_id, full_name, email, phone, role, password_hash, created_at, updated_at, last_login)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (u_id, uid, fn, em, ph, rl, pwd, ca, ua, ll))
            cursor.execute("DROP TABLE users_old")
            migrated = True

        # Query column info and run ALTER TABLE if columns are missing for backwards compatibility
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [row['name'] for row in cursor.fetchall()]
        
        # Ensure older properties exist
        if 'board_status' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN board_status TEXT NOT NULL DEFAULT 'to_do'")
            migrated = True
        if 'completed_date' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN completed_date TEXT")
            migrated = True
        if 'estimated_time' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN estimated_time INTEGER DEFAULT 0")
            migrated = True
            
        # Ensure new status/progress properties exist
        if 'progress' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0")
            migrated = True
            print("Migration: Added 'progress' column.")
            
        if 'started_at' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN started_at TEXT")
            migrated = True
            print("Migration: Added 'started_at' column.")
            
        if 'completed_at' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN completed_at TEXT")
            migrated = True
            print("Migration: Added 'completed_at' column.")
            
        if 'updated_at' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN updated_at TEXT")
            migrated = True
            print("Migration: Added 'updated_at' column.")
            
        # Ensure AI columns exist
        if 'ai_priority' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN ai_priority TEXT")
            migrated = True
            print("Migration: Added 'ai_priority' column.")
            
        if 'ai_reason' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN ai_reason TEXT")
            migrated = True
            print("Migration: Added 'ai_reason' column.")

        # Ensure user_id exists in tasks
        if 'user_id' not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1")
            migrated = True
            print("Migration: Added 'user_id' column to tasks.")

        # Focus Sessions Migrations
        cursor.execute("PRAGMA table_info(focus_sessions)")
        focus_columns = [row['name'] for row in cursor.fetchall()]
        if 'user_id' not in focus_columns:
            cursor.execute("ALTER TABLE focus_sessions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1")
            migrated = True
            print("Migration: Added 'user_id' column to focus_sessions.")
        if 'started_at' not in focus_columns:
            cursor.execute("ALTER TABLE focus_sessions ADD COLUMN started_at TEXT")
            migrated = True
            print("Migration: Added 'started_at' column to focus_sessions.")
        if 'ended_at' not in focus_columns:
            cursor.execute("ALTER TABLE focus_sessions ADD COLUMN ended_at TEXT")
            migrated = True
            print("Migration: Added 'ended_at' column to focus_sessions.")
        if 'status' not in focus_columns:
            cursor.execute("ALTER TABLE focus_sessions ADD COLUMN status TEXT DEFAULT 'completed'")
            migrated = True
            print("Migration: Added 'status' column to focus_sessions.")

        # Habits user_id migration
        cursor.execute("PRAGMA table_info(habits)")
        habit_columns = [row['name'] for row in cursor.fetchall()]
        if 'user_id' not in habit_columns:
            cursor.execute("ALTER TABLE habits ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1")
            migrated = True
            print("Migration: Added 'user_id' column to habits.")

        # Notifications user_id migration
        cursor.execute("PRAGMA table_info(notifications)")
        notif_columns = [row['name'] for row in cursor.fetchall()]
        if 'user_id' not in notif_columns:
            cursor.execute("ALTER TABLE notifications ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1")
            migrated = True
            print("Migration: Added 'user_id' column to notifications.")

        # Daily Plan user_id migration
        cursor.execute("PRAGMA table_info(daily_plan)")
        dp_columns = [row['name'] for row in cursor.fetchall()]
        if 'user_id' not in dp_columns:
            cursor.execute("ALTER TABLE daily_plan ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1")
            migrated = True
            print("Migration: Added 'user_id' column to daily_plan.")

        # Achievements user_id and UNIQUE constraint migration
        cursor.execute("PRAGMA table_info(achievements)")
        ach_columns = [row['name'] for row in cursor.fetchall()]
        if 'user_id' not in ach_columns:
            print("Migration: Upgrading achievements table layout...")
            cursor.execute("ALTER TABLE achievements RENAME TO achievements_old")
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL DEFAULT 1,
                    achievement_key TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    icon TEXT NOT NULL,
                    unlocked INTEGER DEFAULT 0,
                    unlocked_at TEXT,
                    UNIQUE(user_id, achievement_key)
                )
            ''')
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='achievements_old'")
            if cursor.fetchone():
                cursor.execute('''
                    INSERT OR IGNORE INTO achievements (id, user_id, achievement_key, name, description, icon, unlocked, unlocked_at)
                    SELECT id, 1, achievement_key, name, description, icon, unlocked, unlocked_at FROM achievements_old
                ''')
                cursor.execute("DROP TABLE achievements_old")
            migrated = True

        # XP History user_id and UNIQUE constraint migration
        cursor.execute("PRAGMA table_info(xp_history)")
        xp_columns = [row['name'] for row in cursor.fetchall()]
        if 'user_id' not in xp_columns:
            print("Migration: Upgrading xp_history table layout...")
            cursor.execute("ALTER TABLE xp_history RENAME TO xp_history_old")
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS xp_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL DEFAULT 1,
                    source_type TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    xp_amount INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(user_id, source_type, source_id)
                )
            ''')
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='xp_history_old'")
            if cursor.fetchone():
                cursor.execute('''
                    INSERT OR IGNORE INTO xp_history (id, user_id, source_type, source_id, xp_amount, created_at)
                    SELECT id, 1, source_type, source_id, xp_amount, created_at FROM xp_history_old
                ''')
                cursor.execute("DROP TABLE xp_history_old")
            migrated = True
            
        if migrated:
            conn.commit()
            print("Database schema successfully migrated.")
            
        # --- Data Migrations (Ensure old data is converted safely) ---
        data_updated = False
        
        # 1. Convert 'active' statuses to 'to_do'
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status = 'active'")
        if cursor.fetchone()['count'] > 0:
            cursor.execute("UPDATE tasks SET status = 'to_do' WHERE status = 'active'")
            data_updated = True
            print("Data Migration: Converted 'active' status tasks to 'to_do'.")
            
        # 2. Convert null/empty statuses to 'to_do'
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status IS NULL OR status = ''")
        if cursor.fetchone()['count'] > 0:
            cursor.execute("UPDATE tasks SET status = 'to_do' WHERE status IS NULL OR status = ''")
            data_updated = True
            print("Data Migration: Converted empty status tasks to 'to_do'.")
            
        # 3. Synchronize progress on completed tasks (force 100%)
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed' AND (progress != 100 OR progress IS NULL)")
        if cursor.fetchone()['count'] > 0:
            cursor.execute("UPDATE tasks SET progress = 100 WHERE status = 'completed'")
            data_updated = True
            print("Data Migration: Forced progress = 100% on completed tasks.")
            
        # 4. Synchronize progress on to_do tasks (default to 0% if null)
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status = 'to_do' AND progress IS NULL")
        if cursor.fetchone()['count'] > 0:
            cursor.execute("UPDATE tasks SET progress = 0 WHERE status = 'to_do' AND progress IS NULL")
            data_updated = True
            print("Data Migration: Defaulted progress = 0% on to_do tasks.")
            
        # 5. Synchronize board_status field with status field
        cursor.execute("UPDATE tasks SET board_status = status WHERE board_status != status")
        
        if data_updated:
            conn.commit()
            print("Database data successfully migrated.")
            
        print("Database initialized successfully.")
        return True
    except sqlite3.Error as e:
        print(f"Error initializing/migrating database: {e}")
        return False
    finally:
        conn.close()

def create_user(unique_id, full_name, email, phone=None, role='Other', password=''):
    """
    Creates a new user in the database with a unique login ID.
    """
    conn = get_db_connection()
    if conn is None:
        return None
    try:
        cursor = conn.cursor()
        password_hash = generate_password_hash(password)
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            INSERT INTO users (unique_id, full_name, email, phone, role, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (str(unique_id).strip(), full_name.strip(), email.strip().lower(), phone.strip() if phone else None, role.strip() if role else 'Other', password_hash, now_str, now_str))
        conn.commit()
        user_id = cursor.lastrowid
        
        # Initialize user progress row for the new user
        cursor.execute('''
            INSERT OR IGNORE INTO user_progress (id, total_xp, current_level, daily_goal, longest_streak)
            VALUES (?, 0, 1, 5, 0)
        ''', (user_id,))
        conn.commit()
        return user_id
    except sqlite3.IntegrityError as e:
        print(f"IntegrityError creating user: {e}")
        return None
    except sqlite3.Error as e:
        print(f"Error creating user: {e}")
        return None
    finally:
        conn.close()

def get_user_by_unique_id(unique_id):
    """
    Retrieves a user by their Unique ID (e.g. ATM-483921).
    """
    if not unique_id:
        return None
    conn = get_db_connection()
    if conn is None:
        return None
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE UPPER(unique_id) = UPPER(?)', (str(unique_id).strip(),))
        row = cursor.fetchone()
        return dict(row) if row else None
    except sqlite3.Error:
        return None
    finally:
        conn.close()

def get_user_by_id(user_id):
    """
    Retrieves a user by their database ID.
    """
    if not user_id:
        return None
    conn = get_db_connection()
    if conn is None:
        return None
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    except sqlite3.Error:
        return None
    finally:
        conn.close()

def get_user_by_email(email):
    """
    Retrieves a user by their email address.
    """
    if not email:
        return None
    conn = get_db_connection()
    if conn is None:
        return None
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', (str(email).strip(),))
        row = cursor.fetchone()
        return dict(row) if row else None
    except sqlite3.Error:
        return None
    finally:
        conn.close()

def verify_user_credentials(login_identifier, password):
    """
    Verifies user credentials. Matches unique_id (primary) or email.
    Returns user dictionary if password matches, None otherwise.
    """
    if not login_identifier or not password:
        return None
    ident = str(login_identifier).strip()
    user = get_user_by_unique_id(ident) or get_user_by_email(ident)
    if user and check_password_hash(user['password_hash'], password):
        # Update last login
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                cursor.execute('UPDATE users SET last_login = ? WHERE id = ?', (now_str, user['id']))
                conn.commit()
            except sqlite3.Error:
                pass
            finally:
                conn.close()
        return user
    return None

def update_user_profile(user_id, full_name, email, phone=None, role=None):
    """
    Updates the user's profile details.
    """
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            UPDATE users
            SET full_name = ?, email = ?, phone = ?, role = ?, updated_at = ?
            WHERE id = ?
        ''', (full_name.strip(), email.strip().lower(), phone.strip() if phone else None, role.strip() if role else 'Other', now_str, user_id))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        # Email collision
        return False
    except sqlite3.Error as e:
        print(f"Error updating user profile: {e}")
        return False
    finally:
        conn.close()

def update_user_password(user_id, new_password):
    """
    Updates the user's password.
    """
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        password_hash = generate_password_hash(new_password)
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            UPDATE users
            SET password_hash = ?, updated_at = ?
            WHERE id = ?
        ''', (password_hash, now_str, user_id))
        conn.commit()
        return True
    except sqlite3.Error:
        return False
    finally:
        conn.close()

def store_password_reset_otp(email, otp, validity_minutes=10):
    """
    Stores a generated password reset OTP for the given email with an expiration time.
    Invalidates any previous unused OTPs for the same email.
    """
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        now = datetime.now()
        created_at = now.strftime('%Y-%m-%d %H:%M:%S')
        expires_at = (now + timedelta(minutes=validity_minutes)).strftime('%Y-%m-%d %H:%M:%S')
        
        # Invalidate previous unused OTPs for this email
        cursor.execute('''
            UPDATE password_resets
            SET used = 1
            WHERE email = ? AND used = 0
        ''', (email,))
        
        # Insert fresh OTP
        cursor.execute('''
            INSERT INTO password_resets (email, otp, created_at, expires_at, used)
            VALUES (?, ?, ?, ?, 0)
        ''', (email, str(otp).strip(), created_at, expires_at))
        
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error storing password reset OTP: {e}")
        return False
    finally:
        conn.close()

def verify_password_reset_otp(email, otp):
    """
    Checks whether the OTP provided for the email is valid, not expired, and not yet used.
    Returns True if valid, False otherwise.
    """
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            SELECT id FROM password_resets
            WHERE email = ? AND otp = ? AND used = 0 AND expires_at >= ?
            ORDER BY id DESC LIMIT 1
        ''', (email.strip().lower(), str(otp).strip(), now_str))
        row = cursor.fetchone()
        return row is not None
    except sqlite3.Error as e:
        print(f"Error verifying OTP: {e}")
        return False
    finally:
        conn.close()

def mark_otp_as_used(email, otp):
    """
    Marks an OTP as used so it cannot be re-used.
    """
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE password_resets
            SET used = 1
            WHERE email = ? AND otp = ?
        ''', (email.strip().lower(), str(otp).strip()))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error marking OTP as used: {e}")
        return False
    finally:
        conn.close()

def add_task(title, description, priority, category, due_date, estimated_time=0, user_id=None):
    """
    Inserts a new task into the database.
    Default status: 'to_do', default progress: 0.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return None
        
    try:
        cursor = conn.cursor()
        created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        est_val = int(estimated_time) if estimated_time else 0
        
        # Check if an identical task was just created within the last 2 seconds (prevents accidental double submission)
        cursor.execute('''
            SELECT id FROM tasks 
            WHERE user_id = ? AND title = ? AND category = ? AND priority = ? 
              AND created_at >= datetime('now', '-2 seconds')
            ORDER BY id DESC LIMIT 1
        ''', (user_id, title.strip(), category, priority))
        recent_duplicate = cursor.fetchone()
        if recent_duplicate:
            return recent_duplicate['id']

        cursor.execute('''
            INSERT INTO tasks (user_id, title, description, priority, category, due_date, status, created_at, board_status, completed_date, estimated_time, progress, started_at, completed_at, updated_at, ai_priority, ai_reason)
            VALUES (?, ?, ?, ?, ?, ?, 'to_do', ?, 'to_do', NULL, ?, 0, NULL, NULL, NULL, NULL, NULL)
        ''', (user_id, title.strip(), description.strip(), priority, category, due_date, created_at, est_val))
        conn.commit()
        task_id = cursor.lastrowid
        return task_id
    except sqlite3.Error as e:
        print(f"Error adding task: {e}")
        return None
    finally:
        conn.close()

def get_all_tasks(user_id=None):
    """
    Retrieves all tasks for a specific user ordered by creation date descending.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return []
        
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"Error fetching tasks: {e}")
        return []
    finally:
        conn.close()

def get_task_by_id(task_id, user_id=None):
    """
    Retrieves a single task by its ID and user ID.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return None
        
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
        row = cursor.fetchone()
        return dict(row) if row else None
    except sqlite3.Error as e:
        print(f"Error fetching task {task_id}: {e}")
        return None
    finally:
        conn.close()

def update_task(task_id, title, description, priority, category, due_date, estimated_time=0, status='to_do', progress=0, user_id=None):
    """
    Updates all details of an existing task.
    Enforces status/progress rules and auto-updates activity timestamps.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
        
    try:
        cursor = conn.cursor()
        est_val = int(estimated_time) if estimated_time else 0
        progress_val = int(progress) if progress else 0
        
        # Enforce progress ranges based on status
        if status == 'completed':
            progress_val = 100
        elif status == 'in_progress':
            if progress_val < 1:
                progress_val = 5  # default starting progress
            elif progress_val > 99:
                progress_val = 99
        elif status == 'to_do':
            if progress_val > 99:
                progress_val = 0  # reset if moved back from completed to to_do
                
        # Fetch current timestamps to determine transitions
        cursor.execute('SELECT started_at, completed_at, status FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
        task_row = cursor.fetchone()
        if not task_row:
            return False
        
        started_at = task_row['started_at']
        completed_at = task_row['completed_at']
        
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        updated_at = current_time
        
        # Started timestamp checks
        if status == 'in_progress' and not started_at:
            started_at = current_time
            
        # Completed timestamp checks
        if status == 'completed':
            if not completed_at:
                completed_at = current_time
        else:
            completed_at = None
            
        # Synchronize board_status field (backwards compatibility for Kanban tab)
        board_status = status
        completed_date = completed_at[:10] if completed_at else None
        
        cursor.execute('''
            UPDATE tasks 
            SET title = ?, description = ?, priority = ?, category = ?, due_date = ?, estimated_time = ?, 
                status = ?, board_status = ?, completed_date = ?, progress = ?, started_at = ?, completed_at = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        ''', (title.strip(), description.strip(), priority, category, due_date, est_val, 
              status, board_status, completed_date, progress_val, started_at, completed_at, updated_at, task_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Error updating task {task_id}: {e}")
        return False
    finally:
        conn.close()

def update_task_status_and_progress(task_id, new_status, new_progress=None, user_id=None):
    """
    Directly updates the status and progress value of a task.
    Handles timestamp transitions and synchronizes board status fields.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
        
    try:
        cursor = conn.cursor()
        
        # Fetch current state
        cursor.execute('SELECT status, progress, started_at, completed_at FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
        row = cursor.fetchone()
        if not row:
            return False
            
        curr_progress = row['progress']
        started_at = row['started_at']
        completed_at = row['completed_at']
        
        # Determine target progress if not explicitly provided
        if new_progress is None:
            if new_status == 'completed':
                progress_val = 100
            elif new_status == 'in_progress':
                # If moving to in_progress from to_do, restore progress or default to 5%
                progress_val = curr_progress if (curr_progress > 0 and curr_progress < 100) else 5
            else: # to_do
                # Retain progress (paused state) unless it was 100% (completed), then reset to 0%
                progress_val = curr_progress if curr_progress < 100 else 0
        else:
            progress_val = int(new_progress)
            
        # Re-enforce ranges
        if new_status == 'completed':
            progress_val = 100
        elif new_status == 'in_progress':
            if progress_val < 1:
                progress_val = 5
            elif progress_val > 99:
                progress_val = 99
            else:
                progress_val = min(max(progress_val, 5), 99)
        elif new_status == 'to_do':
            if progress_val > 99:
                progress_val = 0
                
        # Set timestamps
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        updated_at = current_time
        
        if new_status == 'in_progress' and not started_at:
            started_at = current_time
            
        if new_status == 'completed':
            if not completed_at:
                completed_at = current_time
        else:
            completed_at = None
            
        board_status = new_status
        completed_date = completed_at[:10] if completed_at else None
        
        cursor.execute('''
            UPDATE tasks 
            SET status = ?, board_status = ?, completed_date = ?, progress = ?, 
                started_at = ?, completed_at = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        ''', (new_status, board_status, completed_date, progress_val, started_at, completed_at, updated_at, task_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Error updating status/progress for task {task_id}: {e}")
        return False
    finally:
        conn.close()

def toggle_task_status(task_id, user_id=None):
    """
    Toggles completion status of a task.
    If 'completed' -> moves to 'to_do' (progress resets to 0).
    If 'to_do'/'in_progress' -> moves to 'completed' (progress forced to 100).
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return None
        
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT status FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
        row = cursor.fetchone()
        if not row:
            return None
            
        current_status = row['status']
        new_status = 'completed' if current_status != 'completed' else 'to_do'
        
        success = update_task_status_and_progress(task_id, new_status, user_id=user_id)
        return new_status if success else None
    except sqlite3.Error as e:
        print(f"Error toggling status for task {task_id}: {e}")
        return None
    finally:
        conn.close()

def delete_task(task_id, user_id=None):
    """
    Deletes a task by ID.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
        
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Error deleting task {task_id}: {e}")
        return False
    finally:
        conn.close()

def save_ai_suggestion(task_id, ai_priority, ai_reason, user_id=None):
    """
    Saves the AI recommended priority and reason for a task.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE tasks 
            SET ai_priority = ?, ai_reason = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        ''', (ai_priority, ai_reason, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), task_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Error saving AI suggestion for task {task_id}: {e}")
        return False
    finally:
        conn.close()

def update_task_estimate(task_id, estimated_time, user_id=None):
    """
    Updates the estimated time for a task.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE tasks 
            SET estimated_time = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        ''', (int(estimated_time), datetime.now().strftime('%Y-%m-%d %H:%M:%S'), task_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Error updating task estimate: {e}")
        return False
    finally:
        conn.close()

def reschedule_task(task_id, due_date, user_id=None):
    """
    Updates the due date for a task.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE tasks 
            SET due_date = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        ''', (due_date, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), task_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Error rescheduling task {task_id}: {e}")
        return False
    finally:
        conn.close()

def save_daily_plan(plan_items, user_id=None):
    """
    Wipes existing plans for today's date and saves the new plan items for the user.
    Each item is a dict containing: task_id, start_time, end_time.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        today_str = datetime.now().strftime('%Y-%m-%d')
        # Delete existing plans for today
        cursor.execute('DELETE FROM daily_plan WHERE date = ? AND user_id = ?', (today_str, user_id))
        
        for item in plan_items:
            cursor.execute('''
                INSERT INTO daily_plan (user_id, task_id, date, start_time, end_time)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, item['task_id'], today_str, item['start_time'], item['end_time']))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error saving daily plan: {e}")
        return False
    finally:
        conn.close()

def get_daily_plan(date_str=None, user_id=None):
    """
    Retrieves the daily plan schedule for the specified date (defaults to today).
    Returns a list of dicts.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return []
    try:
        cursor = conn.cursor()
        if date_str is None:
            date_str = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('''
            SELECT dp.*, t.title as task_title, t.priority, t.progress, t.status
            FROM daily_plan dp
            JOIN tasks t ON dp.task_id = t.id
            WHERE dp.date = ? AND dp.user_id = ?
            ORDER BY dp.start_time ASC
        ''', (date_str, user_id))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"Error fetching daily plan: {e}")
        return []
    finally:
        conn.close()

def get_analytics_data(user_id=None):
    """
    Computes all database metrics for the AI Productivity Dashboard for a specific user.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return {}
    try:
        cursor = conn.cursor()
        
        # 1. Productivity Overview
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE user_id = ?", (user_id,))
        total_tasks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND user_id = ?", (user_id,))
        completed_tasks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'in_progress' AND user_id = ?", (user_id,))
        in_progress_tasks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status != 'completed' AND user_id = ?", (user_id,))
        active_tasks = cursor.fetchone()[0]
        
        today_str = datetime.now().strftime('%Y-%m-%d')
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status != 'completed' AND due_date < ? AND due_date IS NOT NULL AND due_date != '' AND user_id = ?", (today_str, user_id))
        overdue_tasks = cursor.fetchone()[0]
        
        completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

        # 2. Weekly Productivity Chart (Last 7 days)
        import datetime as dt
        weekly_trend = []
        for i in range(6, -1, -1):
            day_date = dt.date.today() - dt.timedelta(days=i)
            day_str = day_date.strftime('%Y-%m-%d')
            day_label = day_date.strftime('%a')
            
            cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND completed_at LIKE ? AND user_id = ?", (f"{day_str}%", user_id))
            count = cursor.fetchone()[0]
            weekly_trend.append({
                'day': day_label,
                'date': day_str,
                'count': count
            })

        # 3. Category Distribution
        categories = ['study', 'work', 'personal', 'other']
        category_distribution = {}
        for cat in categories:
            cursor.execute("SELECT COUNT(*) FROM tasks WHERE category = ? AND user_id = ?", (cat, user_id))
            category_distribution[cat] = cursor.fetchone()[0]

        # 4. Priority Analysis
        priorities = ['high', 'medium', 'low']
        priority_analysis = {}
        for prio in priorities:
            cursor.execute("SELECT COUNT(*) FROM tasks WHERE priority = ? AND status = 'completed' AND user_id = ?", (prio, user_id))
            comp = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM tasks WHERE priority = ? AND status != 'completed' AND user_id = ?", (prio, user_id))
            pend = cursor.fetchone()[0]
            priority_analysis[prio] = {
                'completed': comp,
                'pending': pend
            }

        # 5. Progress Heatmap (last 30 days)
        heatmap = []
        for i in range(29, -1, -1):
            day_date = dt.date.today() - dt.timedelta(days=i)
            day_str = day_date.strftime('%Y-%m-%d')
            cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND completed_at LIKE ? AND user_id = ?", (f"{day_str}%", user_id))
            count = cursor.fetchone()[0]
            heatmap.append({
                'date': day_str,
                'count': count
            })

        # 6. Monthly Comparison
        curr_month_str = datetime.now().strftime('%Y-%m')
        prev_month_date = dt.date.today().replace(day=1) - dt.timedelta(days=1)
        prev_month_str = prev_month_date.strftime('%Y-%m')
        
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE created_at LIKE ? AND user_id = ?", (f"{curr_month_str}%", user_id))
        curr_created = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND completed_at LIKE ? AND user_id = ?", (f"{curr_month_str}%", user_id))
        curr_completed = cursor.fetchone()[0]
        curr_rate = round((curr_completed / curr_created * 100), 1) if curr_created > 0 else 0.0
        
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE created_at LIKE ? AND user_id = ?", (f"{prev_month_str}%", user_id))
        prev_created = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND completed_at LIKE ? AND user_id = ?", (f"{prev_month_str}%", user_id))
        prev_completed = cursor.fetchone()[0]
        prev_rate = round((prev_completed / prev_created * 100), 1) if prev_created > 0 else 0.0
        
        monthly_comparison = {
            'current': {
                'month': datetime.now().strftime('%B'),
                'created': curr_created,
                'completed': curr_completed,
                'rate': curr_rate
            },
            'previous': {
                'month': prev_month_date.strftime('%B'),
                'created': prev_created,
                'completed': prev_completed,
                'rate': prev_rate
            }
        }

        # 7. Focus Time Analytics (Estimated Time)
        cursor.execute("SELECT SUM(estimated_time) FROM tasks WHERE estimated_time IS NOT NULL AND user_id = ?", (user_id,))
        total_planned_hours = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT SUM(estimated_time) FROM tasks WHERE status = 'completed' AND estimated_time IS NOT NULL AND user_id = ?", (user_id,))
        completed_hours = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT SUM(estimated_time) FROM tasks WHERE status != 'completed' AND estimated_time IS NOT NULL AND user_id = ?", (user_id,))
        remaining_hours = cursor.fetchone()[0] or 0

        focus_time = {
            'total_planned': total_planned_hours,
            'completed': completed_hours,
            'remaining': remaining_hours
        }

        return {
            'overview': {
                'total_tasks': total_tasks,
                'active_tasks': active_tasks,
                'completed_tasks': completed_tasks,
                'overdue_tasks': overdue_tasks,
                'in_progress': in_progress_tasks,
                'completion_rate': completion_rate
            },
            'weekly_trend': weekly_trend,
            'category_distribution': category_distribution,
            'priority_analysis': priority_analysis,
            'heatmap': heatmap,
            'monthly_comparison': monthly_comparison,
            'focus_time': focus_time
        }
        
    except sqlite3.Error as e:
        print(f"Error fetching database analytics: {e}")
        return {}
    finally:
        conn.close()

def create_focus_session(task_id=None, duration_minutes=20, started_at=None, user_id=None):
    """
    Inserts a new focus session record in 'running' status.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return None
    try:
        cursor = conn.cursor()
        now = datetime.now()
        session_date = now.strftime('%Y-%m-%d')
        start_time = started_at or now.strftime('%Y-%m-%d %H:%M:%S')
        created_at = start_time
        t_id = int(task_id) if task_id else None
        dur = int(duration_minutes) if duration_minutes else 20
        
        cursor.execute('''
            INSERT INTO focus_sessions (task_id, user_id, session_date, duration_minutes, started_at, ended_at, status, completed, created_at)
            VALUES (?, ?, ?, ?, ?, NULL, 'running', 0, ?)
        ''', (t_id, user_id, session_date, dur, start_time, created_at))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.Error as e:
        print(f"Error creating focus session: {e}")
        return None
    finally:
        conn.close()

def update_focus_session_status(session_id, status, ended_at=None, completed=None, user_id=None):
    """
    Updates the status (running, paused, completed, cancelled) and completion state of a focus session.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        now_str = ended_at or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if completed is not None:
            cursor.execute('''
                UPDATE focus_sessions 
                SET status = ?, ended_at = ?, completed = ?
                WHERE id = ? AND user_id = ?
            ''', (status, now_str if status in ('completed', 'cancelled') else None, int(completed), session_id, user_id))
        else:
            cursor.execute('''
                UPDATE focus_sessions 
                SET status = ?, ended_at = ?
                WHERE id = ? AND user_id = ?
            ''', (status, now_str if status in ('completed', 'cancelled') else None, session_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Error updating focus session {session_id}: {e}")
        return False
    finally:
        conn.close()

def complete_focus_session(session_id=None, task_id=None, duration_minutes=20, user_id=None):
    """
    Marks a focus session as completed. If session_id is provided, updates it.
    Otherwise inserts a new completed session record.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        now = datetime.now()
        now_str = now.strftime('%Y-%m-%d %H:%M:%S')
        session_date = now.strftime('%Y-%m-%d')
        dur = int(duration_minutes) if duration_minutes else 20
        t_id = int(task_id) if task_id else None

        if session_id:
            cursor.execute('''
                UPDATE focus_sessions 
                SET status = 'completed', completed = 1, ended_at = ?, duration_minutes = COALESCE(?, duration_minutes)
                WHERE id = ? AND user_id = ?
            ''', (now_str, dur, session_id, user_id))
            if cursor.rowcount > 0:
                conn.commit()
                return True

        cursor.execute('''
            INSERT INTO focus_sessions (task_id, user_id, session_date, duration_minutes, started_at, ended_at, status, completed, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'completed', 1, ?)
        ''', (t_id, user_id, session_date, dur, now_str, now_str, now_str))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error completing focus session: {e}")
        return False
    finally:
        conn.close()

def log_focus_session(task_id, duration_minutes, completed, status='completed', user_id=None):
    """
    Legacy wrapper for logging focus sessions.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        now = datetime.now()
        session_date = now.strftime('%Y-%m-%d')
        created_at = now.strftime('%Y-%m-%d %H:%M:%S')
        t_id = int(task_id) if task_id is not None else None
        stat = status or ('completed' if completed else 'cancelled')
        
        cursor.execute('''
            INSERT INTO focus_sessions (task_id, user_id, session_date, duration_minutes, started_at, ended_at, status, completed, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (t_id, user_id, session_date, int(duration_minutes), created_at, created_at, stat, int(completed), created_at))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error logging focus session: {e}")
        return False
    finally:
        conn.close()

def get_focus_history(limit=10, user_id=None):
    """
    Retrieves latest focus sessions logged in the database for the user.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return []
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT fs.*, t.title as task_title, t.priority as task_priority
            FROM focus_sessions fs
            LEFT JOIN tasks t ON fs.task_id = t.id
            WHERE fs.user_id = ?
            ORDER BY fs.created_at DESC
            LIMIT ?
        ''', (user_id, int(limit)))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"Error fetching focus history: {e}")
        return []
    finally:
        conn.close()

def get_focus_stats(user_id=None):
    """
    Computes completed sessions today, streak count, and total focus minutes for the user.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return {'completed_today': 0, 'streak': 0, 'total_time_today': 0, 'total_sessions': 0}
    try:
        cursor = conn.cursor()
        today_str = datetime.now().strftime('%Y-%m-%d')
        
        cursor.execute('''
            SELECT COUNT(*), COALESCE(SUM(duration_minutes), 0) FROM focus_sessions
            WHERE session_date = ? AND completed = 1 AND user_id = ?
        ''', (today_str, user_id))
        today_row = cursor.fetchone()
        completed_today = today_row[0] if today_row else 0
        total_time_today = today_row[1] if today_row else 0

        cursor.execute('''
            SELECT COUNT(*), COALESCE(SUM(duration_minutes), 0) FROM focus_sessions
            WHERE completed = 1 AND user_id = ?
        ''', (user_id,))
        total_row = cursor.fetchone()
        total_sessions = total_row[0] if total_row else 0
        total_time_all = total_row[1] if total_row else 0
        
        cursor.execute('''
            SELECT DISTINCT session_date FROM focus_sessions
            WHERE completed = 1 AND user_id = ?
            ORDER BY session_date DESC
        ''', (user_id,))
        dates = [row['session_date'] for row in cursor.fetchall()]
        
        streak = 0
        import datetime as dt
        check_date = dt.date.today()
        
        if today_str not in dates:
            yesterday_str = (check_date - dt.timedelta(days=1)).strftime('%Y-%m-%d')
            if yesterday_str in dates:
                check_date = check_date - dt.timedelta(days=1)
            else:
                return {
                    'completed_today': completed_today,
                    'streak': 0,
                    'total_time_today': total_time_today,
                    'total_sessions': total_sessions,
                    'total_time_all': total_time_all
                }
                
        while True:
            date_str = check_date.strftime('%Y-%m-%d')
            if date_str in dates:
                streak += 1
                check_date = check_date - dt.timedelta(days=1)
            else:
                break
                
        return {
            'completed_today': completed_today,
            'streak': streak,
            'total_time_today': total_time_today,
            'total_sessions': total_sessions,
            'total_time_all': total_time_all
        }
    except sqlite3.Error as e:
        print(f"Error computing focus stats: {e}")
        return {'completed_today': 0, 'streak': 0, 'total_time_today': 0, 'total_sessions': 0}
    finally:
        conn.close()

def create_habit(name, category, color, icon, frequency, user_id=None):
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            INSERT INTO habits (user_id, name, category, color, icon, frequency, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, name, category, color, icon, frequency, created_at))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error creating habit: {e}")
        return False
    finally:
        conn.close()

def get_habits_list(date_str=None, user_id=None):
    if user_id is None:
        user_id = get_current_user_id()
    if date_str is None:
        date_str = datetime.now().strftime('%Y-%m-%d')
    conn = get_db_connection()
    if conn is None:
        return []
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT h.*, 
                   COALESCE((SELECT hl.completed FROM habit_logs hl 
                             WHERE hl.habit_id = h.id AND hl.completed_date = ?), 0) as completed_today
            FROM habits h
            WHERE h.user_id = ?
            ORDER BY h.id DESC
        ''', (date_str, user_id))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"Error fetching habits: {e}")
        return []
    finally:
        conn.close()

def complete_habit(habit_id, date_str, completed=1, user_id=None):
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        
        # Verify habit ownership
        cursor.execute('SELECT id FROM habits WHERE id = ? AND user_id = ?', (habit_id, user_id))
        if not cursor.fetchone():
            return False
            
        cursor.execute('''
            SELECT id FROM habit_logs
            WHERE habit_id = ? AND completed_date = ?
        ''', (habit_id, date_str))
        row = cursor.fetchone()
        
        if row:
            cursor.execute('''
                UPDATE habit_logs
                SET completed = ?
                WHERE habit_id = ? AND completed_date = ?
            ''', (completed, habit_id, date_str))
        else:
            cursor.execute('''
                INSERT INTO habit_logs (habit_id, completed_date, completed)
                VALUES (?, ?, ?)
            ''', (habit_id, date_str, completed))
            
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error logging habit completion: {e}")
        return False
    finally:
        conn.close()

def get_habit_streak_stats(habit_id=None, user_id=None):
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return {'current_streak': 0, 'longest_streak': 0, 'total_completed': 0}
    try:
        cursor = conn.cursor()
        
        if habit_id:
            # Verify habit ownership
            cursor.execute('SELECT id FROM habits WHERE id = ? AND user_id = ?', (habit_id, user_id))
            if not cursor.fetchone():
                return {'current_streak': 0, 'longest_streak': 0, 'total_completed': 0}
            cursor.execute('''
                SELECT DISTINCT completed_date FROM habit_logs
                WHERE habit_id = ? AND completed = 1
                ORDER BY completed_date DESC
            ''', (habit_id,))
        else:
            cursor.execute('''
                SELECT DISTINCT hl.completed_date FROM habit_logs hl
                JOIN habits h ON hl.habit_id = h.id
                WHERE h.user_id = ? AND hl.completed = 1
                ORDER BY hl.completed_date DESC
            ''', (user_id,))
            
        dates = [row['completed_date'] for row in cursor.fetchall()]
        
        if not dates:
            return {'current_streak': 0, 'longest_streak': 0, 'total_completed': 0}
            
        total_completed = len(dates)
        
        import datetime as dt
        date_objs = []
        for d in dates:
            try:
                date_objs.append(dt.datetime.strptime(d, '%Y-%m-%d').date())
            except ValueError:
                continue
                
        date_objs = sorted(list(set(date_objs)), reverse=True)
        if not date_objs:
            return {'current_streak': 0, 'longest_streak': 0, 'total_completed': 0}
            
        current_streak = 0
        today = dt.date.today()
        yesterday = today - dt.timedelta(days=1)
        
        start_date = None
        if date_objs[0] == today:
            start_date = today
        elif date_objs[0] == yesterday:
            start_date = yesterday
            
        if start_date:
            curr_check = start_date
            idx = 0
            while idx < len(date_objs) and date_objs[idx] == curr_check:
                current_streak += 1
                curr_check -= dt.timedelta(days=1)
                idx += 1
                
        longest_streak = 0
        temp_streak = 0
        sorted_dates_asc = sorted(date_objs)
        
        if sorted_dates_asc:
            temp_streak = 1
            longest_streak = 1
            for i in range(1, len(sorted_dates_asc)):
                diff = (sorted_dates_asc[i] - sorted_dates_asc[i-1]).days
                if diff == 1:
                    temp_streak += 1
                elif diff > 1:
                    longest_streak = max(longest_streak, temp_streak)
                    temp_streak = 1
            longest_streak = max(longest_streak, temp_streak)
            
        return {
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'total_completed': total_completed
        }
    except sqlite3.Error as e:
        print(f"Error computing habit streaks: {e}")
        return {'current_streak': 0, 'longest_streak': 0, 'total_completed': 0}
    finally:
        conn.close()

def get_habit_heatmap(user_id=None):
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return []
    try:
        cursor = conn.cursor()
        
        import datetime as dt
        today = dt.date.today()
        heatmap_data = []
        
        for i in range(29, -1, -1):
            date_str = (today - dt.timedelta(days=i)).strftime('%Y-%m-%d')
            cursor.execute('''
                SELECT COUNT(*) FROM habit_logs hl
                JOIN habits h ON hl.habit_id = h.id
                WHERE hl.completed_date = ? AND hl.completed = 1 AND h.user_id = ?
            ''', (date_str, user_id))
            count = cursor.fetchone()[0]
            heatmap_data.append({
                'date': date_str,
                'count': count
            })
            
        return heatmap_data
    except sqlite3.Error as e:
        print(f"Error fetching habit heatmap: {e}")
        return []
    finally:
        conn.close()

def create_notification(task_id, title, message, type_str, user_id=None):
    """
    Creates a notification if a duplicate hasn't already been created today for the same task and type.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        now = datetime.now()
        today_str = now.strftime('%Y-%m-%d')
        created_at = now.strftime('%Y-%m-%d %H:%M:%S')
        
        # If task_id is given but user_id is not custom, verify ownership and set correct user_id
        if task_id is not None:
            cursor.execute('SELECT user_id FROM tasks WHERE id = ?', (task_id,))
            row = cursor.fetchone()
            if row:
                user_id = row['user_id']
        
        # Check for existing duplicate notification on the same date for the user
        if task_id is not None:
            cursor.execute('''
                SELECT id FROM notifications
                WHERE task_id = ? AND type = ? AND DATE(created_at) = ? AND user_id = ?
            ''', (task_id, type_str, today_str, user_id))
            if cursor.fetchone():
                return False
        else:
            # Check by title, date, and user
            cursor.execute('''
                SELECT id FROM notifications
                WHERE title = ? AND type = ? AND DATE(created_at) = ? AND user_id = ?
            ''', (title, type_str, today_str, user_id))
            if cursor.fetchone():
                return False

        cursor.execute('''
            INSERT INTO notifications (user_id, task_id, title, message, type, is_read, snooze_until, created_at)
            VALUES (?, ?, ?, ?, ?, 0, NULL, ?)
        ''', (user_id, task_id, title, message, type_str, created_at))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error creating notification: {e}")
        return False
    finally:
        conn.close()

def get_notifications(include_read=True, filter_type=None, user_id=None):
    """
    Retrieves notifications for the user that are not currently snoozed.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return []
    try:
        cursor = conn.cursor()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        query = '''
            SELECT n.*, t.title as task_title, t.priority as task_priority, t.due_date as task_due_date
            FROM notifications n
            LEFT JOIN tasks t ON n.task_id = t.id
            WHERE (n.snooze_until IS NULL OR n.snooze_until <= ?) AND n.user_id = ?
        '''
        params = [now_str, user_id]
        
        if not include_read:
            query += ' AND n.is_read = 0'
        if filter_type and filter_type != 'all':
            query += ' AND n.type = ?'
            params.append(filter_type)
            
        query += ' ORDER BY n.is_read ASC, n.created_at DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"Error fetching notifications: {e}")
        return []
    finally:
        conn.close()

def mark_notification_as_read(notification_id=None, user_id=None):
    """
    Marks a single notification or all notifications for the user as read.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        if notification_id and str(notification_id).lower() != 'all':
            cursor.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', (int(notification_id), user_id))
        else:
            cursor.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', (user_id,))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error marking notification as read: {e}")
        return False
    finally:
        conn.close()

def snooze_notification(notification_id, snooze_until, user_id=None):
    """
    Sets the snooze_until datetime string on a notification.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE notifications
            SET snooze_until = ?, is_read = 0
            WHERE id = ? AND user_id = ?
        ''', (snooze_until, int(notification_id), user_id))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Error snoozing notification: {e}")
        return False
    finally:
        conn.close()

def get_unread_notifications_count(user_id=None):
    """
    Returns total count of unread and unsnoozed notifications for the user.
    """
    if user_id is None:
        user_id = get_current_user_id()
    conn = get_db_connection()
    if conn is None:
        return 0
    try:
        cursor = conn.cursor()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            SELECT COUNT(*) FROM notifications
            WHERE is_read = 0 AND (snooze_until IS NULL OR snooze_until <= ?) AND user_id = ?
        ''', (now_str, user_id))
        return cursor.fetchone()[0]
    except sqlite3.Error as e:
        print(f"Error getting unread notification count: {e}")
        return 0
    finally:
        conn.close()
