import os
import secrets
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, Response
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import database
import gamification_service
import email_service
import export_service
from ai_service import AIService

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', os.environ.get('SECRET_KEY', 'dev_secret_key_for_bca_project'))
app.config['DEBUG'] = True

# Init DB and run migrations
with app.app_context():
    database.init_db()

# Initialize AI Service
ai_assistant = AIService()

def generate_unique_id():
    """
    Generates a unique, collision-checked user login ID in the format ATM-XXXXXX.
    """
    while True:
        num = secrets.randbelow(900000) + 100000
        uid = f"ATM-{num}"
        if not database.get_user_by_unique_id(uid):
            return uid

def is_ajax_request():
    accept_header = request.headers.get('Accept', '')
    requested_with = request.headers.get('X-Requested-With', '')
    return (requested_with == 'XMLHttpRequest' or 
            'application/json' in accept_header or 
            request.is_json)

@app.before_request
def check_auth():
    # Allow static assets and auth endpoints without logging in
    allowed_routes = ['login', 'register', 'register_success', 'forgot_password', 'reset_password', 'resend_otp', 'static']
    if request.endpoint in allowed_routes:
        return
        
    if request.endpoint is None:
        return

    if 'user_id' not in session:
        if is_ajax_request() or request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Authentication required. Please login.'}), 401
        return redirect(url_for('login'))

@app.context_processor
def inject_user():
    if 'user_id' in session:
        user = database.get_user_by_id(session['user_id'])
        return dict(current_user=user)
    return dict(current_user=None)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('home'))
        
    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        phone = request.form.get('phone', '').strip()
        role = request.form.get('role', 'Other').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        if not full_name:
            flash('Full Name is required.', 'error')
            return render_template('register.html', full_name=full_name, email=email, phone=phone, role=role)
            
        if not email or '@' not in email or '.' not in email:
            flash('Please enter a valid email address.', 'error')
            return render_template('register.html', full_name=full_name, email=email, phone=phone, role=role)
            
        if database.get_user_by_email(email):
            flash('An account with this email address already exists.', 'error')
            return render_template('register.html', full_name=full_name, email=email, phone=phone, role=role)
            
        if len(password) < 8:
            flash('Password must be at least 8 characters long.', 'error')
            return render_template('register.html', full_name=full_name, email=email, phone=phone, role=role)
            
        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('register.html', full_name=full_name, email=email, phone=phone, role=role)
            
        # Generate backend unique login ID (e.g. ATM-483921)
        unique_id = generate_unique_id()
        
        # Create user in database
        user_id = database.create_user(unique_id, full_name, email, phone, role, password)
        if user_id:
            session['new_account_uid'] = unique_id
            session['new_account_name'] = full_name
            return redirect(url_for('register_success'))
        else:
            flash('Registration failed. Please try again.', 'error')
            return render_template('register.html', full_name=full_name, email=email, phone=phone, role=role)
            
    return render_template('register.html')

@app.route('/register-success')
def register_success():
    uid = session.pop('new_account_uid', None) or request.args.get('uid', '')
    name = session.pop('new_account_name', None) or request.args.get('name', '')
    if not uid:
        return redirect(url_for('login'))
    return render_template('register_success.html', unique_id=uid, full_name=name)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('home'))
        
    if request.method == 'POST':
        unique_id = request.form.get('unique_id', '').strip() or request.form.get('email', '').strip()
        password = request.form.get('password', '')
        
        if not unique_id or not password:
            flash('Please enter both your Unique ID and password.', 'error')
            return render_template('login.html', unique_id=unique_id)
            
        user = database.verify_user_credentials(unique_id, password)
        if user:
            session.clear()
            session['user_id'] = user['id']
            session['unique_id'] = user['unique_id']
            session['email'] = user['email']
            session['full_name'] = user['full_name']
            session['role'] = user.get('role', 'Other')
            
            flash(f'Welcome back, {user["full_name"]}!', 'success')
            return redirect(url_for('home'))
        else:
            flash('Invalid User ID or password.', 'error')
            return render_template('login.html', unique_id=unique_id)
            
    return render_template('login.html')

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('login'))

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if 'user_id' in session:
        return redirect(url_for('home'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        if not email:
            flash('Please enter your email address.', 'error')
            return render_template('forgot_password.html')

        user = database.get_user_by_email(email)
        if not user:
            flash('No account found with this email address.', 'error')
            return render_template('forgot_password.html', email=email)

        # Generate secure 6-digit OTP code
        otp = f"{secrets.randbelow(900000) + 100000}"
        
        # Save OTP to database (10 minute validity)
        database.store_password_reset_otp(user['email'], otp, validity_minutes=10)

        # Send OTP email
        email_sent, email_msg = email_service.send_otp_email(user['email'], otp, recipient_name=user.get('full_name', 'User'))

        session['reset_email'] = user['email']
        if email_msg == "DEV_SIMULATION":
            flash(f'SMTP credentials are not set in .env yet. Your OTP code is logged in the server terminal console.', 'info')
        elif not email_sent:
            flash(f'Notice: Could not send email ({email_msg}). Your OTP was logged to the terminal console.', 'error')
        else:
            flash('A 6-digit verification code (OTP) has been sent to your email inbox.', 'success')
            
        return redirect(url_for('reset_password'))

    return render_template('forgot_password.html')

@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    if 'user_id' in session:
        return redirect(url_for('home'))

    email = session.get('reset_email', '') or request.args.get('email', '').strip().lower()

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower() or email
        otp = request.form.get('otp', '').strip()
        new_password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        if not email:
            flash('Email is required. Please restart password reset.', 'error')
            return redirect(url_for('forgot_password'))

        if not all([otp, new_password, confirm_password]):
            flash('All fields are required.', 'error')
            return render_template('reset_password.html', email=email)

        if len(otp) != 6 or not otp.isdigit():
            flash('Please enter a valid 6-digit numeric OTP.', 'error')
            return render_template('reset_password.html', email=email)

        if len(new_password) < 8:
            flash('Password must be at least 8 characters long.', 'error')
            return render_template('reset_password.html', email=email)

        if new_password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('reset_password.html', email=email)

        # Verify OTP
        is_valid = database.verify_password_reset_otp(email, otp)
        if not is_valid:
            flash('Invalid or expired OTP. Please verify or request a new code.', 'error')
            smtp_cfg = email_service.get_smtp_config()
            dev_otp = None
            if not (smtp_cfg['email'] and smtp_cfg['password']) and email:
                conn = database.get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    cursor.execute('SELECT otp FROM password_resets WHERE email = ? AND used = 0 AND expires_at >= ? ORDER BY id DESC LIMIT 1', (email, now_str))
                    r = cursor.fetchone()
                    if r: dev_otp = r['otp']
                    conn.close()
            return render_template('reset_password.html', email=email, dev_otp=dev_otp)

        user = database.get_user_by_email(email)
        if not user:
            flash('User not found.', 'error')
            return redirect(url_for('forgot_password'))

        # Update password & invalidate OTP
        database.update_user_password(user['id'], new_password)
        database.mark_otp_as_used(email, otp)
        session.pop('reset_email', None)

        flash('Password reset successfully! Please sign in with your new password.', 'success')
        return redirect(url_for('login'))

    smtp_cfg = email_service.get_smtp_config()
    dev_otp = None
    if not (smtp_cfg['email'] and smtp_cfg['password']) and email:
        conn = database.get_db_connection()
        if conn:
            cursor = conn.cursor()
            now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('SELECT otp FROM password_resets WHERE email = ? AND used = 0 AND expires_at >= ? ORDER BY id DESC LIMIT 1', (email, now_str))
            r = cursor.fetchone()
            if r: dev_otp = r['otp']
            conn.close()

    return render_template('reset_password.html', email=email, dev_otp=dev_otp)

@app.route('/resend-otp', methods=['POST'])
def resend_otp():
    email = request.form.get('email', '').strip().lower() or session.get('reset_email', '')
    if not email:
        if is_ajax_request():
            return jsonify({'success': False, 'message': 'Email is required to resend OTP.'}), 400
        flash('Email is required to resend OTP.', 'error')
        return redirect(url_for('forgot_password'))

    user = database.get_user_by_email(email)
    if not user:
        if is_ajax_request():
            return jsonify({'success': False, 'message': 'Account not found.'}), 404
        flash('Account not found.', 'error')
        return redirect(url_for('forgot_password'))

    # Generate new OTP
    otp = f"{secrets.randbelow(900000) + 100000}"
    database.store_password_reset_otp(user['email'], otp, validity_minutes=10)
    email_sent, email_msg = email_service.send_otp_email(user['email'], otp, recipient_name=user.get('full_name', 'User'))
    session['reset_email'] = user['email']

    if is_ajax_request():
        if email_msg == "DEV_SIMULATION":
            return jsonify({'success': True, 'message': 'OTP generated & logged to terminal console.'})
        return jsonify({'success': True, 'message': 'A new OTP has been sent to your email.'})

    if email_msg == "DEV_SIMULATION":
        flash('SMTP not configured. OTP was printed to server terminal console.', 'info')
    else:
        flash('A new OTP has been sent to your email.', 'success')
    return redirect(url_for('reset_password'))

@app.route('/profile')
def profile_view():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = database.get_user_by_id(session['user_id'])
    if not user:
        session.clear()
        return redirect(url_for('login'))
    return render_template('profile.html', user=user, current_user=user)

@app.route('/profile/update', methods=['POST'])
def profile_update():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    full_name = request.form.get('full_name', '').strip()
    email = request.form.get('email', '').strip().lower()
    phone = request.form.get('phone', '').strip()
    role = request.form.get('role', 'Other').strip()
    
    if not full_name or not email:
        flash('Full Name and Email are required.', 'error')
        return redirect(url_for('profile_view'))
        
    success = database.update_user_profile(session['user_id'], full_name, email, phone, role)
    if success:
        session['full_name'] = full_name
        session['email'] = email
        session['role'] = role
        flash('Profile details updated successfully.', 'success')
    else:
        flash('Could not update profile. Email might already be in use.', 'error')
        
    return redirect(url_for('profile_view'))

@app.route('/profile/change-password', methods=['POST'])
def profile_change_password():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    current_password = request.form.get('current_password', '')
    password = request.form.get('password', '')
    confirm_password = request.form.get('confirm_password', '')
    
    if not all([current_password, password, confirm_password]):
        flash('All fields are required.', 'error')
        return redirect(url_for('profile_view'))
        
    if len(password) < 8:
        flash('New password must be at least 8 characters long.', 'error')
        return redirect(url_for('profile_view'))
        
    if password != confirm_password:
        flash('Passwords do not match.', 'error')
        return redirect(url_for('profile_view'))
        
    # Verify current password
    user = database.get_user_by_id(session['user_id'])
    if not user or not check_password_hash(user['password_hash'], current_password):
        flash('Incorrect current password.', 'error')
        return redirect(url_for('profile_view'))
        
    success = database.update_user_password(session['user_id'], password)
    if success:
        flash('Password updated successfully.', 'success')
    else:
        flash('Could not update password.', 'error')
        
    return redirect(url_for('profile_view'))

@app.route('/')
def home():
    """
    Home Dashboard Route
    """
    tasks = database.get_all_tasks()
    today_str = datetime.now().strftime('%Y-%m-%d')
    
    # Calculate stats
    stats = {
        'total': len(tasks),
        'active': sum(1 for t in tasks if t['status'] in ('to_do', 'in_progress')),
        'to_do': sum(1 for t in tasks if t['status'] == 'to_do'),
        'in_progress': sum(1 for t in tasks if t['status'] == 'in_progress'),
        'completed': sum(1 for t in tasks if t['status'] == 'completed'),
        'overdue': sum(1 for t in tasks if t['status'] != 'completed' and t['due_date'] and t['due_date'] < today_str),
        'high_priority': sum(1 for t in tasks if t['priority'] == 'high')
    }
    
    productivity = 0
    if len(tasks) > 0:
        total_progress = sum(int(t.get('progress', 0) or 0) for t in tasks)
        productivity = round(total_progress / len(tasks))
        
    saved_plan = database.get_daily_plan(today_str)
        
    return render_template('index.html', tasks=tasks, stats=stats, productivity=productivity, today=today_str, saved_plan=saved_plan)

@app.route('/api/tasks', methods=['GET', 'POST'])
@app.route('/add', methods=['POST'])
def add():
    """
    Add Task / List Tasks Route
    """
    if request.method == 'GET':
        tasks = database.get_all_tasks()
        return jsonify({
            'success': True,
            'tasks': tasks,
            'count': len(tasks)
        }), 200

    if request.is_json:
        data = request.get_json()
        title = data.get('title')
        description = data.get('description', '')
        priority = data.get('priority', 'medium')
        category = data.get('category', 'study')
        due_date = data.get('due_date', '')
        estimated_time = data.get('estimated_time', 0)
    else:
        title = request.form.get('title')
        description = request.form.get('description', '')
        priority = request.form.get('priority', 'medium')
        category = request.form.get('category', 'study')
        due_date = request.form.get('due_date', '')
        estimated_time = request.form.get('estimated_time', 0)
    
    try:
        estimated_time = int(estimated_time) if estimated_time else 0
    except ValueError:
        estimated_time = 0
        
    if not title or not title.strip():
        if is_ajax_request() or request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Task Title is required!'}), 400
        flash("Task Title is required!", "error")
        return redirect(url_for('home'))
        
    task_id = database.add_task(title, description, priority, category, due_date, estimated_time)
    
    if task_id:
        task = database.get_task_by_id(task_id)
        if is_ajax_request() or request.path.startswith('/api/'):
            return jsonify({
                'success': True, 
                'message': 'Task created successfully!',
                'task': task
            }), 201
        flash("Task added successfully!", "success")
    else:
        if is_ajax_request() or request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Failed to save task.'}), 500
        flash("Failed to add task.", "error")
        
    return redirect(url_for('home'))

@app.route('/api/tasks/<int:task_id>', methods=['GET', 'PUT', 'POST', 'DELETE'])
@app.route('/edit/<int:task_id>', methods=['GET', 'POST'])
def edit(task_id):
    """
    Get, Update, or Delete single task route
    """
    if request.method == 'DELETE':
        success = database.delete_task(task_id)
        return jsonify({
            'success': success,
            'message': 'Task deleted successfully' if success else 'Failed to delete task'
        }), 200 if success else 500

    task = database.get_task_by_id(task_id)
    if not task:
        if is_ajax_request() or request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Task not found!'}), 404
        flash("Task not found!", "error")
        return redirect(url_for('home'))
        
    if request.method in ('POST', 'PUT'):
        if request.is_json:
            data = request.get_json() or {}
            title = data.get('title')
            description = data.get('description', '')
            priority = data.get('priority', 'medium')
            category = data.get('category', 'study')
            due_date = data.get('due_date', '')
            estimated_time = data.get('estimated_time', 0)
            status = data.get('status', task.get('status', 'to_do'))
            progress = data.get('progress', task.get('progress', 0))
        else:
            title = request.form.get('title')
            description = request.form.get('description', '')
            priority = request.form.get('priority', 'medium')
            category = request.form.get('category', 'study')
            due_date = request.form.get('due_date', '')
            estimated_time = request.form.get('estimated_time', 0)
            status = request.form.get('status', 'to_do')
            progress = request.form.get('progress', 0)
            
        try:
            estimated_time = int(estimated_time) if estimated_time else 0
        except ValueError:
            estimated_time = 0
            
        try:
            progress = int(progress) if progress is not None else 0
        except ValueError:
            progress = 0
            
        if not title or not title.strip():
            if is_ajax_request() or request.path.startswith('/api/'):
                return jsonify({'success': False, 'message': 'Task Title is required!'}), 400
            flash("Task Title is required!", "error")
            return redirect(url_for('home'))
            
        success = database.update_task(task_id, title, description, priority, category, due_date, estimated_time, status, progress)
        
        if success:
            updated_task = database.get_task_by_id(task_id)
            if is_ajax_request() or request.path.startswith('/api/'):
                return jsonify({
                    'success': True,
                    'message': 'Task updated successfully!',
                    'task': updated_task
                }), 200
            flash("Task updated successfully!", "success")
            return redirect(url_for('home'))
        else:
            if is_ajax_request() or request.path.startswith('/api/'):
                return jsonify({'success': True, 'message': 'No changes were saved.', 'task': task}), 200
            flash("Failed to update task.", "error")
            
    if is_ajax_request() or request.path.startswith('/api/'):
        return jsonify({'success': True, 'task': task}), 200
    return render_template('edit.html', task=task)

@app.route('/complete/<int:task_id>')
def complete(task_id):
    """
    Toggle Complete Fallback Route
    """
    new_status = database.toggle_task_status(task_id)
    if new_status:
        task = database.get_task_by_id(task_id)
        msg = "Task completed successfully 🎉" if new_status == 'completed' else "Task status reset."
        if is_ajax_request():
            return jsonify({'success': True, 'message': msg, 'status': new_status, 'task': task}), 200
        flash(msg, "success")
    else:
        if is_ajax_request():
            return jsonify({'success': False, 'message': 'Failed to complete task.'}), 500
        flash("Failed to update task status.", "error")
    return redirect(url_for('home'))

@app.route('/delete/<int:task_id>')
def delete(task_id):
    """
    Delete Task Fallback Route
    """
    success = database.delete_task(task_id)
    if success:
        if is_ajax_request():
            return jsonify({'success': True, 'message': 'Task deleted successfully.'}), 200
        flash("Task deleted successfully.", "warning")
    else:
        if is_ajax_request():
            return jsonify({'success': False, 'message': 'Failed to delete task.'}), 500
        flash("Failed to delete task.", "error")
    return redirect(url_for('home'))

@app.route('/update_status', methods=['POST'])
def update_status():
    """
    Legacy Status/Progress update handler for backwards compatibility
    """
    data = request.get_json() or {}
    task_id = data.get('task_id')
    status = data.get('status')
    progress = data.get('progress')
    
    task = database.get_task_by_id(task_id)
    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404
        
    if progress is not None and status is None:
        val = int(progress)
        status = 'completed' if val >= 100 else ('to_do' if val <= 0 else 'in_progress')
        
    success = database.update_task_status_and_progress(task_id, status or task['status'], progress)
    if success:
        updated = database.get_task_by_id(task_id)
        return jsonify({'success': True, 'message': 'Task updated successfully', 'task': updated}), 200
    return jsonify({'success': False, 'message': 'Failed to update'}), 500


# ----------------------------------------------------
# Upgraded Live API Endpoints (JSON Only)
# ----------------------------------------------------

@app.route('/api/tasks/<int:task_id>/start', methods=['POST'])
def api_start_task(task_id):
    """
    POST /api/tasks/<id>/start
    """
    task = database.get_task_by_id(task_id)
    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404
        
    current_progress = task.get('progress', 0)
    new_progress = current_progress if current_progress > 0 else 5
    
    success = database.update_task_status_and_progress(task_id, 'in_progress', new_progress)
    if success:
        updated_task = database.get_task_by_id(task_id)
        return jsonify({
            'success': True,
            'message': 'Task started',
            'task': updated_task
        }), 200
    return jsonify({'success': False, 'message': 'Failed to start task'}), 500

@app.route('/api/tasks/<int:task_id>/pause', methods=['POST'])
def api_pause_task(task_id):
    """
    POST /api/tasks/<id>/pause
    """
    task = database.get_task_by_id(task_id)
    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404
        
    current_progress = task.get('progress', 0)
    
    success = database.update_task_status_and_progress(task_id, 'to_do', current_progress)
    if success:
        updated_task = database.get_task_by_id(task_id)
        return jsonify({
            'success': True,
            'message': 'Task paused',
            'task': updated_task
        }), 200
    return jsonify({'success': False, 'message': 'Failed to pause task'}), 500

@app.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
def api_complete_task(task_id):
    """
    POST /api/tasks/<id>/complete
    """
    success = database.update_task_status_and_progress(task_id, 'completed', 100)
    if success:
        updated_task = database.get_task_by_id(task_id)
        gamification = gamification_service.evaluate_task_completion(task_id)
        return jsonify({
            'success': True,
            'message': 'Task completed',
            'task': updated_task,
            'gamification': gamification
        }), 200
    return jsonify({'success': False, 'message': 'Failed to complete task'}), 500

@app.route('/api/tasks/<int:task_id>/progress', methods=['POST'])
def api_task_progress(task_id):
    """
    POST /api/tasks/<id>/progress
    """
    data = request.get_json() or {}
    progress_val = data.get('progress')
    
    if progress_val is None:
        return jsonify({'success': False, 'message': 'Progress value is required'}), 400
        
    try:
        val = int(progress_val)
    except ValueError:
        return jsonify({'success': False, 'message': 'Progress must be an integer'}), 400
        
    if val < 0 or val > 100:
        return jsonify({'success': False, 'message': 'Progress must be between 0 and 100'}), 400
        
    if val >= 100:
        status = 'completed'
    elif val <= 0:
        status = 'to_do'
    else:
        status = 'in_progress'
        
    success = database.update_task_status_and_progress(task_id, status, val)
    if success:
        updated_task = database.get_task_by_id(task_id)
        gamification = gamification_service.evaluate_task_completion(task_id) if status == 'completed' else None
        return jsonify({
            'success': True,
            'message': 'Progress updated',
            'task': updated_task,
            'gamification': gamification
        }), 200
    return jsonify({'success': False, 'message': 'Failed to update progress'}), 500

@app.route('/api/tasks/<int:task_id>/status', methods=['POST'])
def api_task_status(task_id):
    """
    POST /api/tasks/<id>/status
    """
    data = request.get_json() or {}
    status = data.get('status')
    
    if status not in ['to_do', 'in_progress', 'completed']:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400
        
    success = database.update_task_status_and_progress(task_id, status)
    if success:
        updated_task = database.get_task_by_id(task_id)
        gamification = gamification_service.evaluate_task_completion(task_id) if status == 'completed' else None
        return jsonify({
            'success': True,
            'message': 'Status updated',
            'task': updated_task,
            'gamification': gamification
        }), 200
    return jsonify({'success': False, 'message': 'Failed to update status'}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def api_delete_task(task_id):
    """
    DELETE /api/tasks/<id>
    """
    success = database.delete_task(task_id)
    if success:
        return jsonify({
            'success': True,
            'message': 'Task deleted successfully'
        }), 200
    return jsonify({'success': False, 'message': 'Failed to delete task'}), 500


# ----------------------------------------------------
# AI Productivity Assistant Endpoint Handlers
# ----------------------------------------------------

@app.route('/api/ai/plan', methods=['POST'])
def api_ai_plan():
    """
    POST /api/ai/plan
    Generates structured project plan list of tasks from goal.
    """
    data = request.get_json() or {}
    accomplish = data.get('accomplish', '').strip()
    if not accomplish:
        return jsonify({'success': False, 'message': 'Accomplishment goal is required.'}), 400
        
    plan = ai_assistant.generate_plan(accomplish)
    if plan is not None:
        return jsonify({
            'success': True,
            'data': plan,
            'message': 'Structured plan generated successfully'
        }), 200
    return jsonify({'success': False, 'message': 'Unable to generate AI response'}), 500

@app.route('/api/ai/breakdown', methods=['POST'])
def api_ai_breakdown():
    """
    POST /api/ai/breakdown
    Breaks down a task into 4 to 6 actionable subtasks.
    """
    data = request.get_json() or {}
    task_id = data.get('task_id')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    
    if task_id:
        task = database.get_task_by_id(task_id)
        if task:
            title = task['title']
            description = task['description']
            
    if not title:
        return jsonify({'success': False, 'message': 'Task Title is required.'}), 400
        
    subtasks = ai_assistant.breakdown_task(title, description)
    if subtasks is not None:
        return jsonify({
            'success': True,
            'data': subtasks,
            'message': 'AI task breakdown generated successfully'
        }), 200
    return jsonify({'success': False, 'message': 'Unable to generate AI response'}), 500

@app.route('/api/ai/priority', methods=['POST'])
def api_ai_priority():
    """
    POST /api/ai/priority
    Suggests smart priority and reasoning for a task.
    """
    data = request.get_json() or {}
    task_id = data.get('task_id')
    
    if not task_id:
        return jsonify({'success': False, 'message': 'Task ID is required.'}), 400
        
    task = database.get_task_by_id(task_id)
    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404
        
    suggestion = ai_assistant.suggest_priority(
        task['title'], task.get('description', ''), task.get('due_date', ''), task.get('estimated_time', 0), task['status']
    )
    if suggestion:
        # Save suggestion into task details
        database.save_ai_suggestion(task_id, suggestion['priority'], suggestion['reason'])
        return jsonify({
            'success': True,
            'data': suggestion,
            'message': 'AI priority suggestion generated successfully'
        }), 200
    return jsonify({'success': False, 'message': 'Unable to generate AI response'}), 500

@app.route('/api/ai/estimate', methods=['POST'])
def api_ai_estimate():
    """
    POST /api/ai/estimate
    Suggests estimated time for a task title.
    """
    data = request.get_json() or {}
    task_id = data.get('task_id')
    
    if not task_id:
        return jsonify({'success': False, 'message': 'Task ID is required.'}), 400
        
    task = database.get_task_by_id(task_id)
    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404
        
    suggestion = ai_assistant.suggest_estimate(task['title'], task.get('description', ''))
    if suggestion:
        return jsonify({
            'success': True,
            'data': suggestion,
            'message': 'AI estimated time generated successfully'
        }), 200
    return jsonify({'success': False, 'message': 'Unable to generate AI response'}), 500

@app.route('/api/ai/estimate/save', methods=['POST'])
def api_ai_save_estimate():
    """
    POST /api/ai/estimate/save
    Saves approved AI estimate back to task.
    """
    data = request.get_json() or {}
    task_id = data.get('task_id')
    estimate = data.get('estimate')
    
    if not task_id or estimate is None:
        return jsonify({'success': False, 'message': 'Task ID and Estimate value are required.'}), 400
        
    success = database.update_task_estimate(task_id, estimate)
    if success:
        updated_task = database.get_task_by_id(task_id)
        return jsonify({
            'success': True,
            'message': 'Estimated time updated',
            'task': updated_task
        }), 200
    return jsonify({'success': False, 'message': 'Failed to save estimate'}), 500

@app.post('/api/ai/daily-plan')
def api_ai_daily_plan():
    """
    POST /api/ai/daily-plan
    Suggests chronological Daily plan for today.
    """
    tasks = database.get_all_tasks()
    active_tasks = [t for t in tasks if t['status'] != 'completed']
    
    plan = ai_assistant.generate_daily_plan(active_tasks)
    if plan is not None:
        return jsonify({
            'success': True,
            'plan': plan
        }), 200
    return jsonify({'success': False, 'message': 'Unable to generate daily plan'}), 500

@app.post('/api/daily-plan/save')
def api_daily_plan_save():
    """
    POST /api/daily-plan/save
    Saves the approved daily plan schedule to the database.
    """
    try:
        data = request.get_json() or {}
        plan_items = data.get('plan_items', [])
        if not plan_items:
            return jsonify({'success': False, 'message': 'Plan items are required.'}), 400
            
        success = database.save_daily_plan(plan_items)
        if success:
            return jsonify({'success': True, 'message': 'Daily plan saved successfully!'}), 200
        return jsonify({'success': False, 'message': 'Failed to save daily plan to the database.'}), 500
    except Exception as e:
        print(f"Error saving plan: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.get('/api/kanban')
def api_kanban_data():
    """
    GET /api/kanban
    Returns all tasks grouped by their statuses for the Kanban board view.
    """
    try:
        tasks = database.get_all_tasks()
        todo = [t for t in tasks if t['status'] == 'to_do']
        in_progress = [t for t in tasks if t['status'] == 'in_progress']
        completed = [t for t in tasks if t['status'] == 'completed']
        return jsonify({
            'success': True,
            'todo': todo,
            'in_progress': in_progress,
            'completed': completed
        }), 200
    except Exception as e:
        print(f"Error fetching Kanban data: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route("/api/task/move", methods=["POST"])
def move_task():
    try:
        data = request.get_json() or {}
        task_id = data.get("task_id")
        status = data.get("status")

        if not task_id or not status:
            return jsonify({'success': False, 'message': 'Missing task_id or status'}), 400

        user_id = database.get_current_user_id()
        db_status = "to_do"
        if status in ["In Progress", "in_progress"]:
            db_status = "in_progress"
        elif status in ["Completed", "completed"]:
            db_status = "completed"

        progress = 100 if db_status == "completed" else 25 if db_status == "in_progress" else 0
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        completed_at = now_str if db_status == 'completed' else None

        conn = database.get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE tasks
            SET status=?, progress=?, board_status=?, completed_at=?, updated_at=?
            WHERE id=? AND user_id=?
        """, (db_status, progress, db_status, completed_at, now_str, task_id, user_id))
        conn.commit()
        conn.close()

        updated_task = database.get_task_by_id(task_id, user_id=user_id)
        gamification = gamification_service.evaluate_task_completion(task_id, user_id=user_id) if db_status == 'completed' else None
        return jsonify({
            "success": True,
            "task": updated_task,
            "gamification": gamification
        }), 200
    except Exception as e:
        print(f"Error in move_task: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/ai/recommend', methods=['POST'])
def api_ai_recommend():
    """
    POST /api/ai/recommend
    Suggests Recommended next task to focus on.
    """
    tasks = database.get_all_tasks()
    active_tasks = [t for t in tasks if t['status'] != 'completed']
    
    recommendation = ai_assistant.recommend_next_task(active_tasks)
    if recommendation:
        return jsonify({
            'success': True,
            'data': recommendation,
            'message': 'Recommended next task generated successfully'
        }), 200
    return jsonify({'success': False, 'message': 'Unable to generate AI response'}), 500

@app.route('/api/ai/insights', methods=['POST'])
def api_ai_insights():
    """
    POST /api/ai/insights
    Productivity insights compiled from actual completed & active database entries.
    """
    tasks = database.get_all_tasks()
    completed = [t for t in tasks if t['status'] == 'completed']
    active = [t for t in tasks if t['status'] != 'completed']
    
    insights = ai_assistant.generate_insights(completed, active)
    if insights:
        return jsonify({
            'success': True,
            'data': insights,
            'message': 'AI productivity insights generated successfully'
        }), 200
    return jsonify({'success': False, 'message': 'Unable to generate AI response'}), 500

def get_task_context():
    rows = database.get_all_tasks()
    if not rows:
        return "No active tasks."

    context = ""
    for r in rows:
        context += (
            f"Task: {r.get('title')}, "
            f"Priority: {r.get('priority')}, "
            f"Status: {r.get('status')}, "
            f"Due: {r.get('due_date')}, "
            f"Progress: {r.get('progress', 0)}%\n"
        )
    return context

@app.post("/api/ai/chat")
def ai_chat():
    data = request.get_json()
    message = data.get("message", "")

    from ai_service import chat_with_ai
    result = chat_with_ai(message, user_id=session.get('user_id', 1))

    return jsonify(result)

@app.route('/api/calendar', methods=['GET'])
def api_calendar():
    """
    GET /api/calendar?month=8&year=2026
    Returns tasks for calendar display.
    """
    tasks = database.get_all_tasks()
    month = request.args.get('month')
    year = request.args.get('year')
    
    if month and year:
        try:
            m_val = int(month)
            y_val = int(year)
            filtered = []
            for t in tasks:
                d_str = t.get('due_date')
                if d_str:
                    parts = d_str.split('-')
                    if len(parts) == 3:
                        task_y = int(parts[0])
                        task_m = int(parts[1])
                        if task_y == y_val and task_m == m_val:
                            filtered.append(t)
            tasks = filtered
        except ValueError:
            pass
            
    return jsonify({
        'success': True,
        'data': tasks,
        'message': 'Calendar tasks fetched successfully'
    }), 200

@app.route('/api/task/reschedule', methods=['POST'])
@app.route('/api/calendar/reschedule', methods=['POST'])
def api_task_reschedule():
    """
    POST /api/calendar/reschedule
    Updates due date.
    """
    data = request.get_json() or {}
    task_id = data.get('task_id')
    due_date = data.get('due_date')
    
    if not task_id or not due_date:
        return jsonify({'success': False, 'message': 'Task ID and Due Date are required.'}), 400
        
    success = database.reschedule_task(task_id, due_date)
    if success:
        updated = database.get_task_by_id(task_id)
        return jsonify({
            'success': True,
            'task': updated,
            'message': 'Task rescheduled successfully'
        }), 200
    return jsonify({'success': False, 'message': 'Failed to reschedule task'}), 500

@app.route('/api/timeline', methods=['GET'])
def api_timeline():
    """
    GET /api/timeline
    Returns chronological timeline list of tasks.
    """
    tasks = database.get_all_tasks()
    valid_tasks = [t for t in tasks if t.get('due_date')]
    valid_tasks.sort(key=lambda x: x['due_date'])
    no_due = [t for t in tasks if not t.get('due_date')]
    sorted_tasks = valid_tasks + no_due
    
    return jsonify({
        'success': True,
        'data': sorted_tasks,
        'message': 'Timeline tasks fetched successfully'
    }), 200

@app.route('/api/analytics', methods=['GET'])
def api_analytics():
    """
    GET /api/analytics
    Computes tasks analytics directly from SQLite database and calls Gemini
    to generate data-driven productivity score explanations and smart recommendations.
    """
    data = database.get_analytics_data()
    if not data:
        return jsonify({'success': False, 'message': 'No data found'}), 404
        
    overview = data.get('overview', {})
    weekly_trend = data.get('weekly_trend', [])
    focus_time = data.get('focus_time', {})
    
    rate = overview.get('completion_rate', 0.0)
    overdue = overview.get('overdue_tasks', 0)
    active = overview.get('active_tasks', 0)
    in_progress = overview.get('in_progress', 0)
    
    all_tasks = database.get_all_tasks()
    active_tasks_list = [t for t in all_tasks if t.get('status') != 'completed']
    avg_progress = 0
    if active_tasks_list:
        avg_progress = sum(t.get('progress', 0) or 0 for t in active_tasks_list) / len(active_tasks_list)
        
    completed_days = sum(1 for d in weekly_trend if d['count'] > 0)
    consistency_factor = (completed_days / 7) * 100 if weekly_trend else 0.0
    
    score = (rate * 0.5) + (avg_progress * 0.2) + (consistency_factor * 0.3)
    penalty = min(overdue * 5, 25)
    score = max(0, min(100, round(score - penalty)))
    
    data['productivity_score'] = score
    
    # Instant rule-based productivity coach feedback based on real data
    if score >= 80:
        ai_explanation = f"Outstanding performance! Your completion rate of {rate}% and consistent task velocity keep you at peak productivity. Keep up the great work!"
    elif score >= 50:
        if overdue > 0:
            ai_explanation = f"Good progress! You have completed {overview.get('completed_tasks', 0)} tasks. Tackle your {overdue} overdue task{'s' if overdue != 1 else ''} today to boost your score."
        else:
            ai_explanation = f"Steady progress! You have an active completion rate of {rate}%. Focus on completing in-progress items to maximize your velocity."
    else:
        if overview.get('total_tasks', 0) == 0:
            ai_explanation = "Welcome to Analytics! Create your first task to start tracking your completion velocity, category breakdowns, and weekly trends."
        else:
            ai_explanation = "You're building your momentum. Try breaking down larger goals into bite-sized tasks and setting realistic deadlines."
        
    data['score_explanation'] = ai_explanation
    
    # Construct smart data-driven insights list
    insights = []
    completed_this_week = sum(d['count'] for d in weekly_trend)
    insights.append(f"You completed {completed_this_week} task{'s' if completed_this_week != 1 else ''} this week.")
    
    cat_dist = data.get('category_distribution', {})
    if cat_dist:
        strongest = max(cat_dist, key=cat_dist.get)
        if cat_dist[strongest] > 0:
            insights.append(f"{strongest.title()} is your most active category with {cat_dist[strongest]} tasks.")
            
    if overdue > 0:
        insights.append(f"You have {overdue} overdue task{'s' if overdue != 1 else ''} needing immediate attention.")
        
    in_p_list = [t for t in all_tasks if t.get('status') == 'in_progress']
    if in_p_list:
        insights.append(f"Focus on finishing '{in_p_list[0]['title']}' first since it's already in progress.")
    elif active_tasks_list:
        prio_order = {'high': 0, 'medium': 1, 'low': 2}
        sorted_active = sorted(active_tasks_list, key=lambda x: prio_order.get(x.get('priority', 'low'), 3))
        insights.append(f"Start on '{sorted_active[0]['title']}' next since it has '{sorted_active[0]['priority']}' priority.")
        
    data['insights'] = insights

    return jsonify({
        'success': True,
        'data': data,
        'message': 'Analytics data computed successfully'
    }), 200

@app.route('/api/ai/weekly-plan', methods=['POST'])
def api_ai_weekly_plan():
    """
    POST /api/ai/weekly-plan
    Suggests a balanced weekly schedule.
    """
    try:
        tasks = database.get_all_tasks()
        active_tasks = [t for t in tasks if t['status'] != 'completed']
        plan = ai_assistant.generate_weekly_plan(active_tasks)
        if plan is not None:
            return jsonify({
                'success': True,
                'data': plan,
                'message': 'Weekly plan generated successfully'
            }), 200
        return jsonify({'success': False, 'message': 'Unable to generate AI response'}), 500
    except Exception as e:
        print(f"Error in api_ai_weekly_plan endpoint: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/ai/create-task', methods=['POST'])
@app.route('/api/ai/voice-task', methods=['POST'])
def api_ai_create_task():
    """
    POST /api/ai/create-task & POST /api/ai/voice-task
    Extracts task parameters from user's natural language or spoken voice transcript.
    """
    try:
        data = request.get_json() or {}
        prompt = (data.get('prompt') or data.get('transcript') or data.get('text') or '').strip()
        
        if not prompt:
            return jsonify({'success': False, 'message': 'Voice prompt / text cannot be empty.'}), 400
            
        parsed = ai_assistant.parse_natural_language_task(prompt)
        if parsed:
            return jsonify({
                'success': True,
                'data': parsed,
                'message': 'Voice task parsed successfully'
            }), 200
        return jsonify({'success': False, 'message': 'Unable to parse task parameters'}), 500
    except Exception as e:
        print(f"Error in api_ai_create_task endpoint: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/ai/briefing', methods=['GET', 'POST'])
def api_ai_briefing():
    """
    GET/POST /api/ai/briefing
    Generates a personalized daily Morning Briefing or Evening Standup.
    """
    try:
        user_id = session.get('user_id', 1)
        current_user = database.get_user_by_id(user_id)
        user_name = current_user['full_name'] if current_user else 'Productivity Champion'
        
        if request.method == 'POST':
            data = request.get_json() or {}
            mode = data.get('mode', 'morning')
        else:
            mode = request.args.get('mode', 'morning')

        all_tasks = database.get_all_tasks(user_id=user_id)
        active_tasks = [t for t in all_tasks if t.get('status') != 'completed']
        completed_tasks = [t for t in all_tasks if t.get('status') == 'completed']
        
        date_str = datetime.now().strftime('%Y-%m-%d')
        habits = database.get_habits_list(date_str=date_str, user_id=user_id)
        
        briefing = ai_assistant.generate_briefing(
            active_tasks=active_tasks,
            completed_tasks=completed_tasks,
            habits=habits,
            user_name=user_name.split()[0] if user_name else 'User',
            mode=mode
        )
        
        return jsonify({
            'success': True,
            'mode': mode,
            'data': briefing,
            'message': 'Daily briefing generated successfully'
        }), 200
    except Exception as e:
        print(f"Error in api_ai_briefing endpoint: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/ai/workload-audit', methods=['GET', 'POST'])
def api_ai_workload_audit():
    """
    GET/POST /api/ai/workload-audit
    Audits cognitive workload, calculates burnout risk, and provides AI rebalancing advice.
    """
    try:
        user_id = session.get('user_id', 1)
        max_hours = 8
        if request.method == 'POST':
            data = request.get_json() or {}
            max_hours = int(data.get('max_hours', 8))
        else:
            max_hours = int(request.args.get('max_hours', 8))
            
        all_tasks = database.get_all_tasks(user_id=user_id)
        active_tasks = [t for t in all_tasks if t.get('status') != 'completed']
        
        audit_result = ai_assistant.audit_workload(active_tasks, user_max_daily_hours=max_hours)
        
        return jsonify({
            'success': True,
            'data': audit_result,
            'message': 'Workload audit generated successfully'
        }), 200
    except Exception as e:
        print(f"Error in api_ai_workload_audit endpoint: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500


@app.route('/api/focus/start', methods=['POST'])
def api_focus_start():
    """
    POST /api/focus/start
    Signals the beginning of a focus session and creates a session record.
    """
    try:
        data = request.get_json() or {}
        task_id = data.get('task_id')
        duration = data.get('duration_minutes', 20)
        
        try:
            duration = max(1, min(180, int(duration)))
        except (ValueError, TypeError):
            duration = 20
            
        updated_task = None
        if task_id:
            task = database.get_task_by_id(task_id)
            if task and task['status'] == 'to_do':
                database.update_task_status_and_progress(task_id, 'in_progress', max(5, task.get('progress', 0) or 5))
                updated_task = database.get_task_by_id(task_id)

        session_id = database.create_focus_session(task_id, duration)
        
        return jsonify({
            'success': True,
            'message': 'Focus session started',
            'session_id': session_id,
            'task': updated_task
        }), 200
    except Exception as e:
        print(f"Error in api_focus_start: {e}")
        return jsonify({'success': False, 'message': 'Unable to start focus session'}), 500

@app.route('/api/focus/pause', methods=['POST'])
def api_focus_pause():
    """
    POST /api/focus/pause
    Pauses an active focus session.
    """
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        if session_id:
            database.update_focus_session_status(session_id, 'paused')
            
        return jsonify({
            'success': True,
            'message': 'Focus session paused'
        }), 200
    except Exception as e:
        print(f"Error in api_focus_pause: {e}")
        return jsonify({'success': False, 'message': 'Unable to pause focus session'}), 500

@app.route('/api/focus/resume', methods=['POST'])
def api_focus_resume():
    """
    POST /api/focus/resume
    Resumes a paused focus session.
    """
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        if session_id:
            database.update_focus_session_status(session_id, 'running')
            
        return jsonify({
            'success': True,
            'message': 'Focus session resumed'
        }), 200
    except Exception as e:
        print(f"Error in api_focus_resume: {e}")
        return jsonify({'success': False, 'message': 'Unable to resume focus session'}), 500

@app.route('/api/focus/reset', methods=['POST'])
def api_focus_reset():
    """
    POST /api/focus/reset
    Resets/cancels the current focus session.
    """
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        if session_id:
            database.update_focus_session_status(session_id, 'cancelled', completed=0)
            
        return jsonify({
            'success': True,
            'message': 'Focus session reset'
        }), 200
    except Exception as e:
        print(f"Error in api_focus_reset: {e}")
        return jsonify({'success': False, 'message': 'Unable to reset focus session'}), 500

@app.route('/api/focus/complete', methods=['POST'])
@app.route('/api/focus/stop', methods=['POST'])
def api_focus_complete():
    """
    POST /api/focus/complete (and POST /api/focus/stop for backwards compatibility)
    Marks focus session as completed, awards XP, and updates stats.
    """
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        task_id = data.get('task_id')
        duration = data.get('duration_minutes', 20)
        is_completed = data.get('completed', 1) in (1, True, '1', 'true')
        
        try:
            duration = int(duration) if duration else 20
        except (ValueError, TypeError):
            duration = 20

        if is_completed:
            success = database.complete_focus_session(session_id, task_id, duration)
        else:
            if session_id:
                success = database.update_focus_session_status(session_id, 'cancelled', completed=0)
            else:
                success = database.log_focus_session(task_id, duration, 0, 'cancelled')
        
        all_tasks = database.get_all_tasks()
        active_tasks = [t for t in all_tasks if t.get('status') != 'completed']
        
        task_title = "General Focus"
        if task_id:
            target = database.get_task_by_id(task_id)
            if target:
                task_title = target.get('title', 'General Focus')
                
        today_str = datetime.now().strftime('%Y-%m-%d')
        overdue_count = sum(1 for t in active_tasks if t.get('due_date') and t.get('due_date') < today_str)

        recommendation = "Great job finishing that session! Take a short 5-minute break to refresh your mind."
        try:
            from ai_service import chat_with_ai
            ai_prompt = f"""
            You are an AI Deep Work Coach.
            The user just finished a focus session of {duration} minutes on task '{task_title}'.
            The session completion status is: {'Completed' if is_completed else 'Interrupted'}.
            Remaining workload details:
            - Active tasks count: {len(active_tasks)}
            - Overdue tasks count: {overdue_count}
            
            Generate a single sentence recommendation on whether they should take a short break (5m), take a long break (15m), continue working on the same task, or switch to another task based on the workload. Do not include markdown titles or prefix phrases.
            """
            res = chat_with_ai(ai_prompt)
            if res.get('success'):
                recommendation = res.get('reply', '').strip()
        except Exception as e:
            print(f"Failed to generate focus break recommendation: {e}")

        stats = database.get_focus_stats()
        gamification = gamification_service.evaluate_focus_session(duration, completed=1 if is_completed else 0)
        
        return jsonify({
            'success': True,
            'recommendation': recommendation,
            'stats': stats,
            'gamification': gamification,
            'message': 'Focus session completed' if is_completed else 'Focus session ended'
        }), 200
    except Exception as e:
        print(f"Error in api_focus_complete: {e}")
        return jsonify({'success': False, 'message': 'Unable to complete focus session'}), 500

@app.route('/api/focus/stats', methods=['GET'])
@app.route('/api/focus/status', methods=['GET'])
def api_focus_stats():
    """
    GET /api/focus/stats (and GET /api/focus/status)
    Retrieves the current recommended task and daily focus stats.
    """
    try:
        all_tasks = database.get_all_tasks()
        active_tasks = [t for t in all_tasks if t.get('status') != 'completed']
        
        recommended_task = None
        if active_tasks:
            prio_order = {'high': 0, 'medium': 1, 'low': 2}
            active_tasks.sort(key=lambda x: (
                0 if x.get('status') == 'in_progress' else 1,
                prio_order.get(x.get('priority', 'low'), 3),
                x.get('due_date') or '9999-12-31',
                -x.get('progress', 0)
            ))
            recommended_task = active_tasks[0]
            
        stats = database.get_focus_stats()
        history = database.get_focus_history(limit=10)
        
        return jsonify({
            'success': True,
            'recommended_task': recommended_task,
            'stats': stats,
            'history': history,
            'message': 'Focus statistics retrieved successfully'
        }), 200
    except Exception as e:
        print(f"Error in api_focus_stats: {e}")
        return jsonify({'success': False, 'message': 'Unable to retrieve focus statistics'}), 500

@app.route('/api/focus/history', methods=['GET'])
def api_focus_history():
    """
    GET /api/focus/history
    Returns logged focus session entries and stats.
    """
    try:
        history = database.get_focus_history(limit=15)
        stats = database.get_focus_stats()
        return jsonify({
            'success': True,
            'history': history,
            'stats': stats,
            'message': 'Focus history fetched successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_focus_history: {e}")
        return jsonify({'success': False, 'message': 'Unable to retrieve focus history'}), 500

@app.route('/api/habit/create', methods=['POST'])
def api_habit_create():
    """
    POST /api/habit/create
    Creates a new daily/weekly habit.
    """
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        category = data.get('category', 'general').strip()
        color = data.get('color', '#3b82f6').strip()
        icon = data.get('icon', '⚡').strip()
        frequency = data.get('frequency', 'daily').strip()
        
        if not name:
            return jsonify({'success': False, 'message': 'Habit name is required.'}), 400
            
        success = database.create_habit(name, category, color, icon, frequency)
        return jsonify({
            'success': success,
            'message': 'Habit created successfully' if success else 'Failed to create habit.'
        }), 201 if success else 500
    except Exception as e:
        print(f"Error in api_habit_create: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/habit/complete', methods=['POST'])
def api_habit_complete():
    """
    POST /api/habit/complete
    Logs completion or interruption status for a habit.
    """
    try:
        data = request.get_json() or {}
        habit_id = data.get('habit_id')
        completed = data.get('completed', 1)
        date_str = data.get('date_str') or datetime.now().strftime('%Y-%m-%d')
        
        if not habit_id:
            return jsonify({'success': False, 'message': 'Habit ID is required.'}), 400
            
        success = database.complete_habit(habit_id, date_str, completed)
        streaks = database.get_habit_streak_stats()
        gamification = gamification_service.evaluate_habit_completion(habit_id) if (completed == 1 or completed is True) else None
        
        return jsonify({
            'success': success,
            'streaks': streaks,
            'gamification': gamification,
            'message': 'Habit completion logged successfully' if success else 'Failed to log completion.'
        }), 200
    except Exception as e:
        print(f"Error in api_habit_complete: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/habit/list', methods=['GET'])
def api_habit_list():
    """
    GET /api/habit/list
    Retrieves the habits list, streak stats, and AI insights.
    """
    try:
        date_str = request.args.get('date_str') or datetime.now().strftime('%Y-%m-%d')
        habits = database.get_habits_list(date_str)
        streaks = database.get_habit_streak_stats()
        
        completed_today = sum(1 for h in habits if h.get('completed_today') == 1)
        total_habits = len(habits)
        rate = (completed_today / total_habits * 100) if total_habits > 0 else 0
        
        insights = []
        if total_habits == 0:
            insights.append("Add a routine habit to begin collecting consistency insights.")
        else:
            insights.append(f"Completed {completed_today} of {total_habits} habits today ({rate:.1f}%).")
            if streaks.get('current_streak', 0) > 0:
                insights.append(f"🔥 Keep it up! You are on a {streaks['current_streak']} day completion streak.")
            else:
                insights.append("Complete a habit today to kickstart a new streak!")
                
            try:
                from ai_service import chat_with_ai
                ai_prompt = f"""
                You are a supportive Habits Coach.
                The user has {total_habits} habits defined.
                Today they completed {completed_today} habits.
                Active streak is: {streaks.get('current_streak', 0)} days.
                Longest streak record: {streaks.get('longest_streak', 0)} days.
                
                Generate a single sentence of habit coaching advice using these facts. Keep it motivational and brief. Do not prefix with title text or markdown.
                """
                res = chat_with_ai(ai_prompt)
                if res.get('success'):
                    insights.append(res.get('reply', '').strip())
            except Exception as e:
                print(f"Failed to generate habit insights: {e}")
                
        return jsonify({
            'success': True,
            'habits': habits,
            'streaks': streaks,
            'insights': insights,
            'overview': {
                'completed_today': completed_today,
                'remaining': total_habits - completed_today,
                'rate': rate
            },
            'message': 'Habits list retrieved successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_habit_list: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/habit/streak', methods=['GET'])
def api_habit_streak():
    """
    GET /api/habit/streak
    Returns streak summary stats.
    """
    try:
        streaks = database.get_habit_streak_stats()
        return jsonify({
            'success': True,
            'streaks': streaks,
            'message': 'Streaks computed successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_habit_streak: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/habit/heatmap', methods=['GET'])
def api_habit_heatmap():
    """
    GET /api/habit/heatmap
    Returns habit completion heatmap log numbers.
    """
    try:
        heatmap = database.get_habit_heatmap()
        return jsonify({
            'success': True,
            'heatmap': heatmap,
            'message': 'Heatmap logs computed successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_habit_heatmap: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/notifications', methods=['GET'])
def api_notifications():
    """
    GET /api/notifications
    Returns notification history and unread count with optional type filtering.
    """
    try:
        filter_type = request.args.get('type', 'all')
        include_read = request.args.get('include_read', 'true').lower() == 'true'
        
        notifications = database.get_notifications(include_read=include_read, filter_type=filter_type)
        unread_count = database.get_unread_notifications_count()
        
        return jsonify({
            'success': True,
            'notifications': notifications,
            'unread_count': unread_count,
            'message': 'Notifications retrieved successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_notifications: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/notifications/read', methods=['POST'])
def api_notifications_read():
    """
    POST /api/notifications/read
    Marks specific notification or all notifications as read.
    """
    try:
        data = request.get_json() or {}
        notification_id = data.get('id')
        
        success = database.mark_notification_as_read(notification_id)
        unread_count = database.get_unread_notifications_count()
        
        return jsonify({
            'success': success,
            'unread_count': unread_count,
            'message': 'Notification(s) marked as read.' if success else 'Failed to mark as read.'
        }), 200
    except Exception as e:
        print(f"Error in api_notifications_read: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/notifications/snooze', methods=['POST'])
def api_notifications_snooze():
    """
    POST /api/notifications/snooze
    Snoozes a notification for a specified duration (10m, 30m, 1h, tomorrow).
    """
    try:
        data = request.get_json() or {}
        notification_id = data.get('id')
        duration = str(data.get('duration', '10m')).lower()
        
        if not notification_id:
            return jsonify({'success': False, 'message': 'Notification ID required'}), 400
            
        now = datetime.now()
        if duration == '10m':
            snooze_until = now + timedelta(minutes=10)
        elif duration == '30m':
            snooze_until = now + timedelta(minutes=30)
        elif duration == '1h':
            snooze_until = now + timedelta(hours=1)
        elif duration == 'tomorrow':
            tomorrow = now.date() + timedelta(days=1)
            snooze_until = datetime.combine(tomorrow, datetime.min.time()) + timedelta(hours=9)
        else:
            snooze_until = now + timedelta(minutes=10)
            
        snooze_until_str = snooze_until.strftime('%Y-%m-%d %H:%M:%S')
        success = database.snooze_notification(notification_id, snooze_until_str)
        unread_count = database.get_unread_notifications_count()
        
        return jsonify({
            'success': success,
            'snooze_until': snooze_until_str,
            'unread_count': unread_count,
            'message': f'Notification snoozed until {snooze_until_str}' if success else 'Failed to snooze notification.'
        }), 200
    except Exception as e:
        print(f"Error in api_notifications_snooze: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/notifications/check', methods=['GET'])
@app.route('/api/notifications/check-reminders', methods=['GET', 'POST'])
def api_notifications_check():
    """
    GET /api/notifications/check
    Scans active tasks in SQLite to generate due, overdue, upcoming, and AI suggestion notifications.
    """
    try:
        tasks = database.get_all_tasks()
        active_tasks = [t for t in tasks if t.get('status') != 'completed']
        
        today = datetime.now().date()
        today_str = today.strftime('%Y-%m-%d')
        tomorrow_str = (today + timedelta(days=1)).strftime('%Y-%m-%d')
        in_3_days_str = (today + timedelta(days=3)).strftime('%Y-%m-%d')
        
        high_prio_count = 0
        in_progress_task = None
        
        for task in active_tasks:
            due_date = task.get('due_date')
            task_id = task.get('id')
            title = task.get('title')
            priority = task.get('priority', 'medium')
            status = task.get('status')
            
            if priority == 'high':
                high_prio_count += 1
            if status == 'in_progress' and not in_progress_task:
                in_progress_task = task
                
            if due_date:
                try:
                    task_due = datetime.strptime(due_date, '%Y-%m-%d').date()
                    if task_due < today:
                        database.create_notification(
                            task_id=task_id,
                            title=f"🔴 Overdue: {title}",
                            message=f"Task '{title}' was due on {due_date} and is currently overdue!",
                            type_str="overdue"
                        )
                    elif task_due == today:
                        database.create_notification(
                            task_id=task_id,
                            title=f"🔴 Due Today: {title}",
                            message=f"Task '{title}' is due today. Make sure to complete it before end of day!",
                            type_str="due_today"
                        )
                    elif due_date == tomorrow_str:
                        database.create_notification(
                            task_id=task_id,
                            title=f"🟡 Due Tomorrow: {title}",
                            message=f"Task '{title}' is due tomorrow ({due_date}).",
                            type_str="upcoming"
                        )
                    elif due_date == in_3_days_str:
                        database.create_notification(
                            task_id=task_id,
                            title=f"📅 Upcoming: {title}",
                            message=f"Task '{title}' is due in 3 days ({due_date}). Plan ahead!",
                            type_str="upcoming"
                        )
                except ValueError:
                    pass

        # AI Reminder Suggestions based on real task data
        if high_prio_count >= 2:
            database.create_notification(
                task_id=None,
                title="✨ AI Suggestion: High Priority Workload",
                message=f"You still have {high_prio_count} high-priority tasks remaining. Tackle them during your peak focus hours!",
                type_str="ai_suggestion"
            )
            
        if in_progress_task:
            database.create_notification(
                task_id=in_progress_task.get('id'),
                title="🚀 AI Suggestion: Active Deep Work",
                message=f"Finish your in-progress task '{in_progress_task.get('title')}' before starting a new one for optimal flow.",
                type_str="ai_suggestion"
            )
            
        notifications = database.get_notifications(include_read=True)
        unread_count = database.get_unread_notifications_count()
        
        return jsonify({
            'success': True,
            'notifications': notifications,
            'unread_count': unread_count,
            'message': 'Notifications scanned and generated successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_notifications_check: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/gamification', methods=['GET'])
@app.route('/api/gamification/stats', methods=['GET'])
def api_gamification_overview():
    """
    GET /api/gamification (and GET /api/gamification/stats)
    Returns full gamification status (level, XP, daily goal, streak, weekly challenge, achievements).
    """
    try:
        overview = gamification_service.get_gamification_overview()
        achievements = gamification_service.get_all_achievements_with_progress()
        return jsonify({
            'success': True,
            'gamification': overview,
            'user': overview.get('level_info', {}),
            'achievements': achievements,
            'message': 'Gamification overview retrieved successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_gamification_overview: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/achievements', methods=['GET'])
def api_achievements():
    """
    GET /api/achievements
    Returns all 10 badges with locked/unlocked state, progress, and unlock dates.
    """
    try:
        achievements = gamification_service.get_all_achievements_with_progress()
        return jsonify({
            'success': True,
            'achievements': achievements,
            'message': 'Achievements retrieved successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_achievements: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/gamification/daily-goal', methods=['POST'])
@app.route('/api/gamification/goal', methods=['POST'])
def api_set_daily_goal():
    """
    POST /api/gamification/daily-goal (and POST /api/gamification/goal)
    Sets the target daily goal tasks count.
    """
    try:
        data = request.get_json() or {}
        goal = data.get('goal') or data.get('daily_goal')
        if not goal:
            return jsonify({'success': False, 'message': 'Goal count is required.'}), 400
            
        success = gamification_service.set_daily_goal(int(goal))
        stats = gamification_service.get_daily_goal_stats()
        return jsonify({
            'success': success,
            'daily_goal': stats,
            'message': f'Daily goal updated to {goal} tasks!' if success else 'Failed to update daily goal.'
        }), 200
    except Exception as e:
        print(f"Error in api_set_daily_goal: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/gamification/history', methods=['GET'])
def api_gamification_history():
    """
    GET /api/gamification/history
    Returns recent XP earnings log.
    """
    try:
        history = gamification_service.get_xp_history_log()
        return jsonify({
            'success': True,
            'history': history,
            'message': 'XP history retrieved successfully.'
        }), 200
    except Exception as e:
        print(f"Error in api_gamification_history: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

# ============================================================
# DATA EXPORT, BACKUP & IMPORT ENDPOINTS
# ============================================================

@app.route('/export/csv', methods=['GET'])
def export_csv():
    """
    GET /export/csv
    Exports all tasks of the logged-in user as a downloadable CSV spreadsheet.
    """
    user_id = session.get('user_id', 1)
    csv_data = export_service.generate_tasks_csv(user_id)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"smart_tasks_{timestamp}.csv"
    return Response(
        csv_data,
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.route('/export/ics', methods=['GET'])
def export_ics():
    """
    GET /export/ics
    Exports tasks as an RFC 5545 iCalendar (.ics) file compatible with
    Google Calendar, Apple Calendar, and Outlook.
    """
    user_id = session.get('user_id', 1)
    ics_data = export_service.generate_tasks_ics(user_id)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"smart_tasks_calendar_{timestamp}.ics"
    return Response(
        ics_data,
        mimetype="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.route('/export/json', methods=['GET'])
def export_json():
    """
    GET /export/json
    Exports complete raw JSON backup containing tasks, habits, focus logs, and gamification data.
    """
    user_id = session.get('user_id', 1)
    json_data = export_service.generate_full_backup_json(user_id)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"smart_todo_backup_{timestamp}.json"
    return Response(
        json_data,
        mimetype="application/json; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.route('/export/report', methods=['GET'])
@app.route('/export/pdf', methods=['GET'])
def export_report():
    """
    GET /export/report or GET /export/pdf
    Renders an executive, print-ready HTML/PDF productivity report.
    """
    try:
        user_id = session.get('user_id', 1)
        current_user = database.get_user_by_id(user_id)
        tasks = database.get_all_tasks(user_id=user_id)
        
        total = len(tasks)
        completed = sum(1 for t in tasks if t.get('status') == 'completed')
        in_progress = sum(1 for t in tasks if t.get('status') == 'in_progress')
        todo = sum(1 for t in tasks if t.get('status') in ['to_do', 'todo', 'pending'])
        stats = {'total': total, 'completed': completed, 'in_progress': in_progress, 'todo': todo}
        productivity = round((completed / total * 100)) if total > 0 else 0
        
        habits = database.get_habits_list(user_id=user_id)
        focus_sessions = database.get_focus_history(user_id=user_id, limit=50)
        total_focus_minutes = sum(int(s.get('duration_minutes', 0) or 0) for s in focus_sessions)
        gamification = gamification_service.get_gamification_overview(user_id=user_id) or {}
        if isinstance(gamification, dict):
            gamification.setdefault('streak_info', gamification.get('streak', {}))
        achievements = gamification_service.get_all_achievements_with_progress(user_id=user_id) or []
        unlocked_badges = sum(1 for a in achievements if isinstance(a, dict) and a.get('unlocked'))
        
        return render_template(
            'report.html',
            current_user=current_user,
            tasks=tasks,
            stats=stats,
            productivity=productivity,
            habits=habits,
            focus_sessions=focus_sessions,
            total_focus_minutes=total_focus_minutes,
            gamification=gamification,
            unlocked_badges_count=unlocked_badges,
            generated_date=datetime.now().strftime('%B %d, %Y - %I:%M %p')
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error generating report: {str(e)}'}), 500

@app.route('/api/import/tasks', methods=['POST'])
def api_import_tasks():
    """
    POST /api/import/tasks
    Uploads and imports tasks from a JSON backup or CSV spreadsheet.
    """
    user_id = session.get('user_id', 1)
    file = request.files.get('file')
    if not file:
        return jsonify({'success': False, 'message': 'No file uploaded. Please select a .json or .csv file.'}), 400
        
    filename = file.filename.lower()
    try:
        content = file.read().decode('utf-8', errors='replace')
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to read file: {str(e)}'}), 400
        
    file_type = 'json' if filename.endswith('.json') else ('csv' if filename.endswith('.csv') else None)
    if not file_type:
        return jsonify({'success': False, 'message': 'Only .json and .csv files are supported.'}), 400
        
    result = export_service.import_tasks_from_data(user_id, content, file_type)
    return jsonify(result), (200 if result.get('success') else 400)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
