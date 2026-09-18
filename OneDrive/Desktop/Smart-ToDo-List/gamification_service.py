import datetime
from datetime import datetime as dt, timedelta
import database

# Level Configuration
LEVEL_TIERS = [
    {"level": 1, "title": "Starter", "min_xp": 0, "max_xp": 99, "icon": "🌱"},
    {"level": 2, "title": "Organizer", "min_xp": 100, "max_xp": 249, "icon": "📋"},
    {"level": 3, "title": "Focused", "min_xp": 250, "max_xp": 499, "icon": "⚡"},
    {"level": 4, "title": "Achiever", "min_xp": 500, "max_xp": 999, "icon": "🏆"},
    {"level": 5, "title": "Productivity Master", "min_xp": 1000, "max_xp": 1999, "icon": "👑"},
    {"level": 6, "title": "Grandmaster", "min_xp": 2000, "max_xp": 4999, "icon": "💎"},
    {"level": 7, "title": "Productivity Legend", "min_xp": 5000, "max_xp": 999999, "icon": "🌟"}
]

ACHIEVEMENT_DEFINITIONS = [
    {
        "key": "first_step",
        "name": "First Step",
        "description": "Complete your first task.",
        "icon": "🎯",
        "target": 1
    },
    {
        "key": "getting_things_done",
        "name": "Getting Things Done",
        "description": "Complete 10 tasks.",
        "icon": "📋",
        "target": 10
    },
    {
        "key": "task_master",
        "name": "Task Master",
        "description": "Complete 50 tasks.",
        "icon": "🏆",
        "target": 50
    },
    {
        "key": "high_priority_hero",
        "name": "High Priority Hero",
        "description": "Complete 10 high-priority tasks.",
        "icon": "⚡",
        "target": 10
    },
    {
        "key": "focus_champion",
        "name": "Focus Champion",
        "description": "Complete 10 Focus Studio sessions.",
        "icon": "🧠",
        "target": 10
    },
    {
        "key": "habit_builder",
        "name": "Habit Builder",
        "description": "Maintain a 7-day habit streak.",
        "icon": "🌿",
        "target": 7
    },
    {
        "key": "consistency_king",
        "name": "Consistency King",
        "description": "Complete at least one task for 14 consecutive days.",
        "icon": "👑",
        "target": 14
    },
    {
        "key": "deadline_defender",
        "name": "Deadline Defender",
        "description": "Complete 10 tasks on or before their deadline.",
        "icon": "🛡️",
        "target": 10
    },
    {
        "key": "zero_overdue",
        "name": "Zero Overdue",
        "description": "Finish a day with no overdue tasks remaining.",
        "icon": "🌟",
        "target": 1
    },
    {
        "key": "productivity_pro",
        "name": "Productivity Pro",
        "description": "Reach Level 5 (Productivity Master).",
        "icon": "💎",
        "target": 5
    }
]

def get_level_info(total_xp):
    current_tier = LEVEL_TIERS[0]
    for tier in LEVEL_TIERS:
        if total_xp >= tier["min_xp"]:
            current_tier = tier
        else:
            break

    level = current_tier["level"]
    title = current_tier["title"]
    min_xp = current_tier["min_xp"]
    max_xp = current_tier["max_xp"]
    icon = current_tier["icon"]

    range_xp = (max_xp - min_xp) + 1
    progress_xp = total_xp - min_xp
    progress_pct = min(100, max(0, int((progress_xp / range_xp) * 100)))
    xp_to_next = max(0, (max_xp + 1) - total_xp)

    return {
        "level": level,
        "title": title,
        "icon": icon,
        "total_xp": total_xp,
        "min_xp": min_xp,
        "max_xp": max_xp,
        "current_level_xp": progress_xp,
        "level_target_xp": range_xp,
        "progress_pct": progress_pct,
        "xp_to_next": xp_to_next
    }

def award_xp(source_type, source_id, amount, description="", user_id=1):
    conn = database.get_db_connection()
    if conn is None:
        return 0, 0, False, 1, 1

    try:
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id FROM xp_history
            WHERE source_type = ? AND source_id = ? AND user_id = ?
        ''', (source_type, str(source_id), user_id))
        if cursor.fetchone():
            cursor.execute('SELECT total_xp, current_level FROM user_progress WHERE id = ?', (user_id,))
            row = cursor.fetchone()
            total_xp = row['total_xp'] if row else 0
            curr_level = row['current_level'] if row else 1
            return 0, total_xp, False, curr_level, curr_level

        now_str = dt.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute('''
            INSERT INTO xp_history (user_id, source_type, source_id, xp_amount, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, source_type, str(source_id), amount, now_str))

        cursor.execute('SELECT total_xp, current_level FROM user_progress WHERE id = ?', (user_id,))
        prog = cursor.fetchone()
        
        old_xp = prog['total_xp'] if prog else 0
        old_level = prog['current_level'] if prog else 1
        new_xp = old_xp + amount
        
        level_info = get_level_info(new_xp)
        new_level = level_info['level']
        leveled_up = new_level > old_level

        cursor.execute('''
            INSERT INTO user_progress (id, total_xp, current_level, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                total_xp = ?,
                current_level = ?,
                updated_at = ?
        ''', (user_id, new_xp, new_level, now_str, new_xp, new_level, now_str))

        conn.commit()
        return amount, new_xp, leveled_up, old_level, new_level
    except Exception as e:
        print(f"Error awarding XP: {e}")
        return 0, 0, False, 1, 1
    finally:
        conn.close()

def evaluate_task_completion(task_id, user_id=1):
    task = database.get_task_by_id(task_id, user_id=user_id)
    if not task:
        return {"xp_earned": 0, "new_achievements": [], "leveled_up": False}

    priority = str(task.get('priority', 'low')).lower()
    base_xp = 10
    if priority == 'medium':
        base_xp = 20
    elif priority == 'high':
        base_xp = 30

    today_str = dt.now().strftime('%Y-%m-%d')
    due_date = task.get('due_date')
    is_overdue = False
    if due_date and due_date < today_str:
        is_overdue = True

    total_task_xp = base_xp
    if is_overdue:
        total_task_xp += 15

    awarded, new_total, leveled_up, old_lvl, new_lvl = award_xp(
        source_type="task_complete",
        source_id=f"task_{task_id}",
        amount=total_task_xp,
        description=f"Completed {priority.capitalize()} Task: {task.get('title', '')}",
        user_id=user_id
    )

    total_earned = awarded

    daily_goal_bonus, daily_leveled_up = check_and_award_daily_goal_bonus(user_id=user_id)
    total_earned += daily_goal_bonus
    if daily_leveled_up:
        leveled_up = True

    new_achievements = check_and_unlock_achievements(user_id=user_id)
    level_info = get_level_info(new_total if awarded > 0 else get_total_xp(user_id=user_id))

    return {
        "xp_earned": total_earned,
        "task_xp": awarded,
        "daily_goal_bonus": daily_goal_bonus,
        "total_xp": level_info["total_xp"],
        "level": level_info["level"],
        "level_title": level_info["title"],
        "level_icon": level_info["icon"],
        "progress_pct": level_info["progress_pct"],
        "leveled_up": leveled_up,
        "old_level": old_lvl,
        "new_level": new_lvl,
        "new_achievements": new_achievements
    }

def evaluate_focus_session(duration_minutes, completed=1, user_id=1):
    if completed != 1:
        return {"xp_earned": 0, "new_achievements": [], "leveled_up": False}

    now_str = dt.now().strftime('%Y%m%d_%H%M%S')
    awarded, new_total, leveled_up, old_lvl, new_lvl = award_xp(
        source_type="focus_session",
        source_id=f"focus_{now_str}",
        amount=15,
        description="Completed Focus Studio Session",
        user_id=user_id
    )

    new_achievements = check_and_unlock_achievements(user_id=user_id)
    level_info = get_level_info(new_total if awarded > 0 else get_total_xp(user_id=user_id))

    return {
        "xp_earned": awarded,
        "total_xp": level_info["total_xp"],
        "level": level_info["level"],
        "level_title": level_info["title"],
        "leveled_up": leveled_up,
        "new_achievements": new_achievements
    }

def evaluate_habit_completion(habit_id, user_id=1):
    today_str = dt.now().strftime('%Y-%m-%d')
    awarded, new_total, leveled_up, old_lvl, new_lvl = award_xp(
        source_type="habit_complete",
        source_id=f"habit_{habit_id}_{today_str}",
        amount=10,
        description="Completed Daily Habit",
        user_id=user_id
    )

    habit_streak = database.get_habit_streak_stats(user_id=user_id).get('current_streak', 0)
    streak_bonus = 0
    leveled_up_streak = False
    if habit_streak >= 7:
        streak_awarded, s_total, s_leveled, _, _ = award_xp(
            source_type="habit_streak_7",
            source_id=f"streak_7_{today_str}",
            amount=100,
            description="Achieved 7-Day Habit Streak!",
            user_id=user_id
        )
        streak_bonus = streak_awarded
        if s_leveled:
            leveled_up_streak = True

    new_achievements = check_and_unlock_achievements(user_id=user_id)
    level_info = get_level_info(get_total_xp(user_id=user_id))

    return {
        "xp_earned": awarded + streak_bonus,
        "total_xp": level_info["total_xp"],
        "level": level_info["level"],
        "level_title": level_info["title"],
        "leveled_up": leveled_up or leveled_up_streak,
        "new_achievements": new_achievements
    }

def check_and_award_daily_goal_bonus(user_id=1):
    today_str = dt.now().strftime('%Y-%m-%d')
    stats = get_daily_goal_stats(user_id=user_id)
    
    if stats["completed_today"] >= stats["daily_goal"] and stats["daily_goal"] > 0:
        awarded, new_total, leveled_up, _, _ = award_xp(
            source_type="daily_goal_reached",
            source_id=f"daily_goal_{today_str}",
            amount=50,
            description="Completed All Daily Goal Tasks!",
            user_id=user_id
        )
        return awarded, leveled_up
    return 0, False

def get_total_xp(user_id=1):
    conn = database.get_db_connection()
    if conn is None:
        return 0
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT total_xp FROM user_progress WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        return row['total_xp'] if row else 0
    except Exception:
        return 0
    finally:
        conn.close()

def get_daily_goal_stats(user_id=1):
    conn = database.get_db_connection()
    if conn is None:
        return {"completed_today": 0, "daily_goal": 5, "progress_pct": 0, "goal_reached": False}
    try:
        cursor = conn.cursor()
        today_str = dt.now().strftime('%Y-%m-%d')
        
        cursor.execute('SELECT daily_goal FROM user_progress WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        daily_goal = row['daily_goal'] if row and row['daily_goal'] else 5

        cursor.execute('''
            SELECT COUNT(*) FROM tasks
            WHERE status = 'completed' AND user_id = ? AND (
                (completed_date = ?) OR
                (completed_at IS NOT NULL AND DATE(completed_at) = ?)
            )
        ''', (user_id, today_str, today_str))
        completed_today = cursor.fetchone()[0]

        progress_pct = min(100, int((completed_today / daily_goal) * 100)) if daily_goal > 0 else 0
        goal_reached = completed_today >= daily_goal

        return {
            "completed_today": completed_today,
            "daily_goal": daily_goal,
            "progress_pct": progress_pct,
            "goal_reached": goal_reached
        }
    except Exception as e:
        print(f"Error getting daily goal stats: {e}")
        return {"completed_today": 0, "daily_goal": 5, "progress_pct": 0, "goal_reached": False}
    finally:
        conn.close()

def set_daily_goal(goal_number, user_id=1):
    conn = database.get_db_connection()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        now_str = dt.now().strftime('%Y-%m-%d %H:%M:%S')
        goal = max(1, min(50, int(goal_number)))
        
        cursor.execute('''
            INSERT INTO user_progress (id, total_xp, current_level, daily_goal, updated_at)
            VALUES (?, 0, 1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                daily_goal = ?,
                updated_at = ?
        ''', (user_id, goal, now_str, goal, now_str))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error setting daily goal: {e}")
        return False
    finally:
        conn.close()

def get_weekly_challenge(user_id=1):
    conn = database.get_db_connection()
    if conn is None:
        return {"title": "Complete 15 tasks this week", "progress": 0, "target": 15, "progress_pct": 0, "completed": False}
    try:
        cursor = conn.cursor()
        today = dt.today().date()
        start_of_week = (today - timedelta(days=today.weekday())).strftime('%Y-%m-%d')
        
        cursor.execute('''
            SELECT COUNT(*) FROM tasks
            WHERE status = 'completed' AND user_id = ? AND (
                (completed_date >= ?) OR
                (completed_at IS NOT NULL AND DATE(completed_at) >= ?)
            )
        ''', (user_id, start_of_week, start_of_week))
        weekly_completed = cursor.fetchone()[0]

        target = 15
        progress_pct = min(100, int((weekly_completed / target) * 100))
        
        return {
            "title": "Complete 15 tasks this week",
            "description": "Finish 15 tasks before Sunday midnight to master your weekly productivity.",
            "reward_xp": 150,
            "progress": weekly_completed,
            "target": target,
            "progress_pct": progress_pct,
            "completed": weekly_completed >= target
        }
    except Exception as e:
        print(f"Error computing weekly challenge: {e}")
        return {"title": "Complete 15 tasks this week", "progress": 0, "target": 15, "progress_pct": 0, "completed": False}
    finally:
        conn.close()

def get_productivity_task_streak(user_id=1):
    conn = database.get_db_connection()
    if conn is None:
        return {"current_streak": 0, "longest_streak": 0, "total_days": 0}
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT DISTINCT COALESCE(completed_date, DATE(completed_at)) as comp_date
            FROM tasks
            WHERE status = 'completed' AND user_id = ? AND (completed_date IS NOT NULL OR completed_at IS NOT NULL)
            ORDER BY comp_date DESC
        ''', (user_id,))
        rows = cursor.fetchall()
        dates = [row['comp_date'] for row in rows if row['comp_date']]

        if not dates:
            return {"current_streak": 0, "longest_streak": 0, "total_days": 0}

        import datetime as dt_module
        date_objs = []
        for d in dates:
            try:
                date_objs.append(dt_module.datetime.strptime(d, '%Y-%m-%d').date())
            except ValueError:
                continue

        date_objs = sorted(list(set(date_objs)), reverse=True)
        if not date_objs:
            return {"current_streak": 0, "longest_streak": 0, "total_days": 0}

        today = dt_module.date.today()
        yesterday = today - dt_module.timedelta(days=1)
        
        current_streak = 0
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
                curr_check -= dt_module.timedelta(days=1)
                idx += 1

        longest_streak = 1
        temp_streak = 1
        sorted_dates_asc = sorted(date_objs)
        for i in range(1, len(sorted_dates_asc)):
            diff = (sorted_dates_asc[i] - sorted_dates_asc[i-1]).days
            if diff == 1:
                temp_streak += 1
            elif diff > 1:
                longest_streak = max(longest_streak, temp_streak)
                temp_streak = 1
        longest_streak = max(longest_streak, temp_streak)

        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "total_days": len(date_objs)
        }
    except Exception as e:
        print(f"Error calculating productivity streak: {e}")
        return {"current_streak": 0, "longest_streak": 0, "total_days": 0}
    finally:
        conn.close()

def check_and_unlock_achievements(user_id=1):
    conn = database.get_db_connection()
    if conn is None:
        return []

    newly_unlocked = []
    try:
        cursor = conn.cursor()
        now_str = dt.now().strftime('%Y-%m-%d %H:%M:%S')
        today_str = dt.now().strftime('%Y-%m-%d')

        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND user_id = ?", (user_id,))
        total_completed_tasks = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND priority = 'high' AND user_id = ?", (user_id,))
        high_prio_completed = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM focus_sessions WHERE completed = 1 AND user_id = ?", (user_id,))
        focus_sessions_completed = cursor.fetchone()[0]

        habit_streak = database.get_habit_streak_stats(user_id=user_id).get('current_streak', 0)
        task_streak = get_productivity_task_streak(user_id=user_id).get('current_streak', 0)

        cursor.execute('''
            SELECT COUNT(*) FROM tasks
            WHERE status = 'completed'
              AND user_id = ?
              AND due_date IS NOT NULL
              AND due_date != ''
              AND (
                  (completed_date IS NOT NULL AND completed_date <= due_date) OR
                  (completed_at IS NOT NULL AND DATE(completed_at) <= due_date)
              )
        ''', (user_id,))
        deadline_met_tasks = cursor.fetchone()[0]

        cursor.execute('''
            SELECT COUNT(*) FROM tasks
            WHERE status != 'completed' AND user_id = ? AND due_date IS NOT NULL AND due_date != '' AND due_date < ?
        ''', (user_id, today_str))
        overdue_active = cursor.fetchone()[0]
        zero_overdue_met = 1 if (overdue_active == 0 and total_completed_tasks > 0) else 0

        total_xp = get_total_xp(user_id=user_id)
        level_info = get_level_info(total_xp)
        current_level = level_info["level"]

        metrics_map = {
            "first_step": total_completed_tasks,
            "getting_things_done": total_completed_tasks,
            "task_master": total_completed_tasks,
            "high_priority_hero": high_prio_completed,
            "focus_champion": focus_sessions_completed,
            "habit_builder": habit_streak,
            "consistency_king": task_streak,
            "deadline_defender": deadline_met_tasks,
            "zero_overdue": zero_overdue_met,
            "productivity_pro": current_level
        }

        for ach in ACHIEVEMENT_DEFINITIONS:
            key = ach["key"]
            target = ach["target"]
            current_val = metrics_map.get(key, 0)
            
            cursor.execute("SELECT id, unlocked FROM achievements WHERE achievement_key = ? AND user_id = ?", (key, user_id))
            row = cursor.fetchone()
            
            if row:
                is_unlocked = row["unlocked"]
                if not is_unlocked and current_val >= target:
                    cursor.execute('''
                        UPDATE achievements
                        SET unlocked = 1, unlocked_at = ?
                        WHERE achievement_key = ? AND user_id = ?
                    ''', (now_str, key, user_id))
                    newly_unlocked.append({
                        "key": key,
                        "name": ach["name"],
                        "description": ach["description"],
                        "icon": ach["icon"]
                    })
            else:
                unlocked_state = 1 if current_val >= target else 0
                unlocked_time = now_str if unlocked_state else None
                cursor.execute('''
                    INSERT INTO achievements (user_id, achievement_key, name, description, icon, unlocked, unlocked_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, key, ach["name"], ach["description"], ach["icon"], unlocked_state, unlocked_time))
                if unlocked_state:
                    newly_unlocked.append({
                        "key": key,
                        "name": ach["name"],
                        "description": ach["description"],
                        "icon": ach["icon"]
                    })

        conn.commit()
        return newly_unlocked
    except Exception as e:
        print(f"Error checking achievements: {e}")
        return []
    finally:
        conn.close()

def get_all_achievements_with_progress(user_id=1):
    check_and_unlock_achievements(user_id=user_id)

    conn = database.get_db_connection()
    if conn is None:
        return []

    try:
        cursor = conn.cursor()
        today_str = dt.now().strftime('%Y-%m-%d')

        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND user_id = ?", (user_id,))
        total_completed_tasks = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND priority = 'high' AND user_id = ?", (user_id,))
        high_prio_completed = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM focus_sessions WHERE completed = 1 AND user_id = ?", (user_id,))
        focus_sessions_completed = cursor.fetchone()[0]

        habit_streak = database.get_habit_streak_stats(user_id=user_id).get('current_streak', 0)
        task_streak = get_productivity_task_streak(user_id=user_id).get('current_streak', 0)

        cursor.execute('''
            SELECT COUNT(*) FROM tasks
            WHERE status = 'completed'
              AND user_id = ?
              AND due_date IS NOT NULL
              AND due_date != ''
              AND (
                  (completed_date IS NOT NULL AND completed_date <= due_date) OR
                  (completed_at IS NOT NULL AND DATE(completed_at) <= due_date)
              )
        ''', (user_id,))
        deadline_met_tasks = cursor.fetchone()[0]

        cursor.execute('''
            SELECT COUNT(*) FROM tasks
            WHERE status != 'completed' AND user_id = ? AND due_date IS NOT NULL AND due_date != '' AND due_date < ?
        ''', (user_id, today_str))
        overdue_active = cursor.fetchone()[0]
        zero_overdue_met = 1 if (overdue_active == 0 and total_completed_tasks > 0) else 0

        total_xp = get_total_xp(user_id=user_id)
        current_level = get_level_info(total_xp)["level"]

        metrics_map = {
            "first_step": total_completed_tasks,
            "getting_things_done": total_completed_tasks,
            "task_master": total_completed_tasks,
            "high_priority_hero": high_prio_completed,
            "focus_champion": focus_sessions_completed,
            "habit_builder": habit_streak,
            "consistency_king": task_streak,
            "deadline_defender": deadline_met_tasks,
            "zero_overdue": zero_overdue_met,
            "productivity_pro": current_level
        }

        cursor.execute("SELECT * FROM achievements WHERE user_id = ?", (user_id,))
        db_achievements = {row["achievement_key"]: dict(row) for row in cursor.fetchall()}

        result = []
        for ach in ACHIEVEMENT_DEFINITIONS:
            key = ach["key"]
            db_entry = db_achievements.get(key, {})
            unlocked = bool(db_entry.get("unlocked", 0))
            unlocked_at = db_entry.get("unlocked_at")
            
            curr_val = metrics_map.get(key, 0)
            target = ach["target"]
            progress_pct = min(100, int((curr_val / target) * 100)) if target > 0 else 0

            result.append({
                "key": key,
                "name": ach["name"],
                "description": ach["description"],
                "icon": ach["icon"],
                "target": target,
                "current": min(curr_val, target),
                "progress_pct": progress_pct,
                "unlocked": unlocked,
                "unlocked_at": unlocked_at
            })

        return result
    except Exception as e:
        print(f"Error fetching achievements: {e}")
        return []
    finally:
        conn.close()

def get_gamification_overview(user_id=1):
    total_xp = get_total_xp(user_id=user_id)
    level_info = get_level_info(total_xp)
    daily_stats = get_daily_goal_stats(user_id=user_id)
    weekly_challenge = get_weekly_challenge(user_id=user_id)
    streak_stats = get_productivity_task_streak(user_id=user_id)
    achievements = get_all_achievements_with_progress(user_id=user_id)
    unlocked_count = sum(1 for a in achievements if a["unlocked"])

    return {
        "level_info": level_info,
        "daily_goal": daily_stats,
        "weekly_challenge": weekly_challenge,
        "streak": streak_stats,
        "total_achievements": len(achievements),
        "unlocked_achievements": unlocked_count
    }

def get_xp_history_log(limit=20, user_id=1):
    conn = database.get_db_connection()
    if conn is None:
        return []
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM xp_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error fetching XP history: {e}")
        return []
    finally:
        conn.close()
