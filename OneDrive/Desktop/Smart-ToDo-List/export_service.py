import io
import csv
import json
from datetime import datetime, timedelta
import database
import gamification_service

def generate_tasks_csv(user_id):
    """
    Generates a CSV string containing all tasks for the specified user.
    Includes UTF-8 BOM so Excel opens it with proper character encoding.
    """
    tasks = database.get_all_tasks(user_id=user_id)
    output = io.StringIO()
    
    # Write UTF-8 BOM for Microsoft Excel compatibility
    output.write('\ufeff')
    
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    
    # Header row
    writer.writerow([
        'Task ID',
        'Title',
        'Description',
        'Category',
        'Priority',
        'Status',
        'Progress (%)',
        'Due Date',
        'Estimated Time (Mins)',
        'Created At',
        'Completed Date',
        'AI Suggested Priority',
        'AI Reason'
    ])
    
    for t in tasks:
        writer.writerow([
            t.get('id', ''),
            t.get('title', ''),
            t.get('description', '') or '',
            (t.get('category', '') or 'other').capitalize(),
            (t.get('priority', '') or 'medium').capitalize(),
            (t.get('status', '') or 'to_do').replace('_', ' ').title(),
            t.get('progress', 0) or 0,
            t.get('due_date', '') or 'No Deadline',
            t.get('estimated_time', 0) or 0,
            t.get('created_at', '') or '',
            t.get('completed_date', '') or t.get('completed_at', '') or 'N/A',
            (t.get('ai_priority', '') or '').capitalize(),
            t.get('ai_reason', '') or ''
        ])
        
    return output.getvalue()


def generate_tasks_ics(user_id, app_name="Smart To-Do List"):
    """
    Generates an RFC 5545 compliant iCalendar (.ics) string containing all user tasks
    with due dates. Compatible with Google Calendar, Apple Calendar, and Outlook.
    """
    tasks = database.get_all_tasks(user_id=user_id)
    now_utc = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:-//{app_name}//Task Manager Export//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{app_name} Tasks",
        "X-WR-TIMEZONE:UTC"
    ]
    
    for t in tasks:
        task_id = t.get('id')
        title = (t.get('title') or 'Untitled Task').replace('\n', ' ').replace(',', '\\,').replace(';', '\\;')
        desc = (t.get('description') or '').replace('\n', '\\n').replace(',', '\\,').replace(';', '\\;')
        category = (t.get('category') or 'General').upper()
        priority_str = (t.get('priority') or 'medium').lower()
        status_str = t.get('status', 'to_do')
        
        # Priority mapping (RFC 5545: 1=Highest, 5=Medium, 9=Lowest)
        ics_priority = 5
        if priority_str == 'high':
            ics_priority = 1
        elif priority_str == 'low':
            ics_priority = 9
            
        due_date_str = t.get('due_date')
        if due_date_str:
            try:
                # Format as YYYYMMDD
                due_clean = due_date_str.replace('-', '')
                dt_due = f"{due_clean}"
            except Exception:
                due_clean = datetime.utcnow().strftime('%Y%m%d')
                dt_due = f"{due_clean}"
        else:
            # If no due date, use creation date + 1 day
            due_clean = (datetime.utcnow() + timedelta(days=1)).strftime('%Y%m%d')
            dt_due = f"{due_clean}"
            
        is_completed = (status_str == 'completed')
        ical_status = "COMPLETED" if is_completed else ("IN-PROCESS" if status_str == 'in_progress' else "NEEDS-ACTION")
        
        lines.append("BEGIN:VTODO")
        lines.append(f"UID:task-{task_id}-{user_id}@smarttodolist.app")
        lines.append(f"DTSTAMP:{now_utc}")
        lines.append(f"DUE;VALUE=DATE:{dt_due}")
        lines.append(f"SUMMARY:{title}")
        if desc:
            lines.append(f"DESCRIPTION:{desc}")
        lines.append(f"CATEGORIES:{category}")
        lines.append(f"PRIORITY:{ics_priority}")
        lines.append(f"STATUS:{ical_status}")
        lines.append(f"PERCENT-COMPLETE:{t.get('progress', 0) or 0}")
        
        # Add alarm/reminder 1 day prior to due date
        lines.append("BEGIN:VALARM")
        lines.append("TRIGGER:-P1D")
        lines.append("ACTION:DISPLAY")
        lines.append(f"DESCRIPTION:Reminder: {title}")
        lines.append("END:VALARM")
        
        lines.append("END:VTODO")
        
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


def generate_full_backup_json(user_id):
    """
    Generates a full JSON snapshot of the user's workspace,
    including tasks, habits, focus logs, user progress, and achievements.
    """
    user = database.get_user_by_id(user_id)
    user_meta = {
        'id': user.get('id') if user else user_id,
        'full_name': user.get('full_name') if user else 'User',
        'email': user.get('email') if user else '',
        'exported_at': datetime.utcnow().isoformat() + 'Z',
        'app_version': '2.0-smart-todo'
    }
    
    tasks = database.get_all_tasks(user_id=user_id)
    habits = database.get_all_habits(user_id=user_id)
    focus_sessions = database.get_focus_sessions(user_id=user_id, limit=100)
    achievements = gamification_service.get_all_achievements_with_progress(user_id=user_id)
    gamification = gamification_service.get_gamification_overview(user_id=user_id)
    
    backup_data = {
        'metadata': user_meta,
        'gamification_progress': gamification,
        'tasks': tasks,
        'habits': habits,
        'focus_sessions': focus_sessions,
        'achievements': achievements
    }
    
    return json.dumps(backup_data, indent=2, default=str)


def import_tasks_from_data(user_id, file_content, file_type='json'):
    """
    Parses imported CSV or JSON text and creates tasks in the user's account.
    Returns a dict with success count and error messages.
    """
    imported_count = 0
    errors = []
    
    if file_type == 'json':
        try:
            parsed = json.loads(file_content)
            task_items = []
            if isinstance(parsed, list):
                task_items = parsed
            elif isinstance(parsed, dict) and 'tasks' in parsed:
                task_items = parsed['tasks']
            else:
                return {'success': False, 'imported_count': 0, 'message': 'JSON format must contain a task list or {"tasks": [...]}.'}
                
            for item in task_items:
                title = item.get('title', '').strip()
                if not title:
                    continue
                desc = item.get('description', '') or ''
                priority = (item.get('priority') or 'medium').lower()
                if priority not in ['low', 'medium', 'high']:
                    priority = 'medium'
                category = (item.get('category') or 'other').lower()
                if category not in ['work', 'study', 'personal', 'other']:
                    category = 'other'
                due_date = item.get('due_date') or None
                est_time = item.get('estimated_time', 0) or 0
                
                new_id = database.add_task(
                    title=title,
                    description=desc,
                    priority=priority,
                    category=category,
                    due_date=due_date,
                    estimated_time=est_time,
                    user_id=user_id
                )
                if new_id:
                    status = item.get('status', 'to_do')
                    progress = item.get('progress', 0) or 0
                    if status != 'to_do' or progress > 0:
                        database.update_task(
                            task_id=new_id,
                            title=title,
                            description=desc,
                            priority=priority,
                            category=category,
                            due_date=due_date,
                            estimated_time=est_time,
                            status=status,
                            progress=progress,
                            user_id=user_id
                        )
                    imported_count += 1
                    
            return {
                'success': True,
                'imported_count': imported_count,
                'message': f'Successfully imported {imported_count} task(s) from JSON backup.'
            }
        except Exception as e:
            return {'success': False, 'imported_count': 0, 'message': f'Invalid JSON format: {str(e)}'}
            
    elif file_type == 'csv':
        try:
            # Handle BOM if present
            if file_content.startswith('\ufeff'):
                file_content = file_content[1:]
                
            csv_file = io.StringIO(file_content)
            reader = csv.DictReader(csv_file)
            
            for row in reader:
                # Support multiple header styles (Title / title / Task Title)
                title = row.get('Title') or row.get('title') or row.get('Task Title') or ''
                title = title.strip()
                if not title:
                    continue
                    
                desc = row.get('Description') or row.get('description') or ''
                category = (row.get('Category') or row.get('category') or 'other').strip().lower()
                if category not in ['work', 'study', 'personal', 'other']:
                    category = 'other'
                priority = (row.get('Priority') or row.get('priority') or 'medium').strip().lower()
                if priority not in ['low', 'medium', 'high']:
                    priority = 'medium'
                    
                due_date = row.get('Due Date') or row.get('due_date') or None
                if due_date and (due_date == 'No Deadline' or due_date.strip() == ''):
                    due_date = None
                    
                est_time_raw = row.get('Estimated Time (Mins)') or row.get('estimated_time') or 0
                try:
                    est_time = int(est_time_raw)
                except Exception:
                    est_time = 0
                    
                status_raw = (row.get('Status') or row.get('status') or 'to_do').strip().lower().replace(' ', '_')
                if status_raw not in ['to_do', 'in_progress', 'completed']:
                    status_raw = 'to_do'
                    
                progress_raw = row.get('Progress (%)') or row.get('progress') or 0
                try:
                    progress = int(progress_raw)
                except Exception:
                    progress = 0
                    
                new_id = database.add_task(
                    title=title,
                    description=desc,
                    priority=priority,
                    category=category,
                    due_date=due_date,
                    estimated_time=est_time,
                    user_id=user_id
                )
                if new_id:
                    if status_raw != 'to_do' or progress > 0:
                        database.update_task(
                            task_id=new_id,
                            title=title,
                            description=desc,
                            priority=priority,
                            category=category,
                            due_date=due_date,
                            estimated_time=est_time,
                            status=status_raw,
                            progress=progress,
                            user_id=user_id
                        )
                    imported_count += 1
                    
            return {
                'success': True,
                'imported_count': imported_count,
                'message': f'Successfully imported {imported_count} task(s) from CSV spreadsheet.'
            }
        except Exception as e:
            return {'success': False, 'imported_count': 0, 'message': f'CSV parsing error: {str(e)}'}
            
    return {'success': False, 'imported_count': 0, 'message': 'Unsupported file type.'}
