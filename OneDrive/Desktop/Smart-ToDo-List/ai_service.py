import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env relative to this file
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

try:
    from google import genai
    from google.genai import types
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

def friendly_gemini_error(error):
    message = str(error)

    if "429" in message or "RESOURCE_EXHAUSTED" in message:
        return {
            "success": False,
            "error_type": "quota",
            "message": "AI request limit reached. Please try again later."
        }

    return {
        "success": False,
        "error_type": "api",
        "message": "AI service is temporarily unavailable."
    }

def chat_with_ai(message, task_context=None, user_id=1):
    if task_context is None:
        try:
            import database
            rows = database.get_all_tasks(user_id=user_id)
            if not rows:
                task_context = "No active tasks."
            else:
                task_strings = []
                for r in rows:
                    task_strings.append(
                        f"Task: {r.get('title')}, Priority: {r.get('priority')}, Status: {r.get('status')}, Due: {r.get('due_date')}, Progress: {r.get('progress')}%"
                    )
                task_context = "\n".join(task_strings)
        except Exception:
            task_context = "No active tasks."
            
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        return {
            "success": False,
            "error_type": "config",
            "message": "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file."
        }
        
    if not HAS_GEMINI:
        return {
            "success": False,
            "error_type": "config",
            "message": "google-genai SDK is not installed or initialized."
        }
        
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    if model == "gemini-2.5-flash":
        model = "gemini-3.6-flash"
        
    prompt = f"""
You are an AI Task Manager.

Task Context:
{task_context}

User Question:
{message}

If the question is about tasks, use the task context.
Otherwise answer normally.
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model,
            contents=prompt
        )

        return {
            "success": True,
            "reply": response.text
        }

    except Exception as e:
        return friendly_gemini_error(e)

class AIService:
    def __init__(self):
        self.api_key = os.environ.get('GEMINI_API_KEY')
        self.model = os.environ.get('GEMINI_MODEL', 'gemini-3.6-flash')
        if self.model == "gemini-2.5-flash":
            self.model = "gemini-3.6-flash"
        if HAS_GEMINI and self.api_key and self.api_key.strip():
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                self.client = None
        else:
            self.client = None
        
    @property
    def is_fallback_mode(self):
        return self.client is None

    def _call_gemini_json(self, system_instruction, prompt):
        if self.is_fallback_mode:
            return None
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text.strip())
        except Exception as e:
            print(f"Gemini JSON error: {e}")
            return None

    def _call_gemini_text(self, system_instruction, prompt):
        if self.is_fallback_mode:
            return None
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"Gemini Text error: {e}")
            return None

    def generate_plan(self, accomplish_text):
        system_instruction = (
            "You are an AI Productivity Assistant. Create a structured plan to accomplish the user's goal. "
            "Suggest 4 to 6 specific tasks. For each task, provide: "
            "1. 'title' (specific action phrase) "
            "2. 'priority' ('low', 'medium', or 'high') "
            "3. 'estimated_time' (integer minutes, e.g., 60, 120, 180) "
            "4. 'due_days_offset' (integer days from today, e.g., 1, 2, 5, 7) "
            "Return a JSON list of these tasks. Example format: "
            "[{\"title\": \"Task Title\", \"priority\": \"high\", \"estimated_time\": 60, \"due_days_offset\": 1}]"
        )
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, accomplish_text)
            if res:
                return res
        title = accomplish_text.strip()
        words = title.split()
        noun = " ".join(words[1:]) if len(words) > 1 else "key components"
        return [
            {"title": f"Initial research and outlining requirements for '{title}'", "priority": "high", "estimated_time": 60, "due_days_offset": 1},
            {"title": f"Set up environment and gather resources for {noun}", "priority": "medium", "estimated_time": 45, "due_days_offset": 2},
            {"title": f"Execute core milestones of '{title}'", "priority": "high", "estimated_time": 180, "due_days_offset": 3},
            {"title": f"Refine details and perform verification on {noun}", "priority": "medium", "estimated_time": 60, "due_days_offset": 4},
            {"title": f"Final review and package deliverables for '{title}'", "priority": "low", "estimated_time": 45, "due_days_offset": 5}
        ]

    def breakdown_task(self, task_title, task_desc=""):
        system_instruction = (
            "Break down the user's task into 4 to 6 smaller, actionable, concrete subtask titles. "
            "Return a JSON list of strings. Example: "
            "[\"Subtask 1 Title\", \"Subtask 2 Title\", \"Subtask 3 Title\"]"
        )
        prompt = f"Task Title: {task_title}\nDescription: {task_desc}"
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, prompt)
            if res:
                return res
        title = task_title.strip()
        words = title.split()
        noun = " ".join(words[1:]) if len(words) > 1 else "requirements"
        return [
            f"Define goals and research guidelines for '{title}'",
            f"Gather resources and prepare tools for {noun}",
            f"Draft initial outline/implementation of '{title}'",
            f"Perform detailed revisions and debugging on {noun}",
            f"Verify final outcomes of '{title}' against criteria"
        ]

    def suggest_priority(self, task_title, task_desc="", due_date="", estimated_time=0, status="to_do"):
        system_instruction = (
            "Analyze the task attributes and suggest a priority level ('low', 'medium', or 'high') and a clear "
            "user-friendly reason based on the description, due date, estimated time, and status. "
            "Return a JSON object with keys: 'priority' and 'reason'. Example format: "
            "{\"priority\": \"high\", \"reason\": \"The deadline is close and the task is core.\"}"
        )
        prompt = f"Title: {task_title}\nDescription: {task_desc}\nDue Date: {due_date}\nEstimated Time: {estimated_time}m\nStatus: {status}"
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, prompt)
            if res:
                return res
        priority = "medium"
        reason = "The task has standard deadlines and complexity. Reviewing details shows no critical urgency."
        title_lower = task_title.lower()
        is_urgent = False
        if due_date:
            try:
                due = datetime.strptime(due_date, "%Y-%m-%d")
                diff = due - datetime.now()
                if diff.days <= 1:
                    is_urgent = True
            except:
                pass
        if "exam" in title_lower or "submit" in title_lower or "urgent" in title_lower or "critical" in title_lower or is_urgent:
            priority = "high"
            reason = "The task matches high-importance criteria (exam or deadline) or its due date is very close."
        elif "review" in title_lower or "read" in title_lower or "optional" in title_lower or "casual" in title_lower:
            priority = "low"
            reason = "This appears to be a review or casual task with no strict critical deadline dependencies."
        return {"priority": priority, "reason": reason}

    def suggest_estimate(self, task_title, task_desc=""):
        system_instruction = (
            "Analyze the task title and description. Suggest a realistic estimated time in minutes as a number. "
            "Return a JSON object with key: 'estimated_time' (integer). Example: "
            "{\"estimated_time\": 90}"
        )
        prompt = f"Title: {task_title}\nDescription: {task_desc}"
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, prompt)
            if res:
                return res
        title_lower = task_title.lower()
        est = 60
        if "exam" in title_lower or "study" in title_lower:
            est = 120
        elif "seminar" in title_lower or "present" in title_lower:
            est = 90
        elif "quick" in title_lower or "check" in title_lower or "email" in title_lower:
            est = 15
        elif "code" in title_lower or "project" in title_lower or "assignment" in title_lower:
            est = 180
        return {"estimated_time": est}

    def generate_daily_plan(self, active_tasks):
        system_instruction = (
            "Analyze the list of active tasks. Generate a suggested structured chronological daily schedule (plan) "
            "for today starting at 09:00. Rules:\n"
            "1. Overdue tasks first.\n"
            "2. High priority before Medium.\n"
            "3. Earlier due dates before later dates.\n"
            "4. Continue partially completed tasks before new ones.\n"
            "5. Respect estimated duration.\n"
            "6. Avoid completed tasks.\n"
            "Return a JSON list of objects, each containing:\n"
            "1. 'task_id' (integer ID of task)\n"
            "2. 'time' (e.g., '09:00-10:30')\n"
            "3. 'task' (task title)\n"
            "4. 'reason' (brief rationale explaining why this was scheduled here)\n"
            "Example format:\n"
            "[{\"task_id\": 3, \"time\": \"09:00-10:30\", \"task\": \"AI Assignment\", \"reason\": \"High priority and due tomorrow.\"}]"
        )
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, str(active_tasks))
            if res:
                return res

        # Fallback Mode - Genuinely Intelligent Sorting & Slotting
        if not active_tasks:
            return []
            
        today_str = datetime.now().strftime('%Y-%m-%d')
        
        def task_sort_key(t):
            # Overdue
            is_overdue = 1 if (t.get('due_date') and t.get('due_date') < today_str and t.get('status') != 'completed') else 0
            # Priority
            prio_val = {"high": 3, "medium": 2, "low": 1}.get(t.get('priority', 'medium'), 2)
            # Due date weight
            due_str = t.get('due_date') or '9999-12-31'
            # Progress weight
            prog = t.get('progress') or 0
            started = 1 if (prog > 0 and t.get('status') == 'in_progress') else 0
            
            return (-is_overdue, -prio_val, -started, due_str)
            
        sorted_tasks = sorted(active_tasks, key=task_sort_key)
        
        plan = []
        start_hour = 9
        start_minute = 0
        
        for task in sorted_tasks[:4]:
            duration = int(task.get('estimated_time') or 60)
            if duration <= 0:
                duration = 60
                
            start_str = f"{start_hour:02d}:{start_minute:02d}"
            
            end_minute = start_minute + duration
            end_hour = start_hour + (end_minute // 60)
            end_minute = end_minute % 60
            
            end_str = f"{end_hour:02d}:{end_minute:02d}"
            time_slot = f"{start_str}-{end_str}"
            
            start_hour = end_hour
            start_minute = end_minute
            start_minute += 15
            if start_minute >= 60:
                start_hour += 1
                start_minute = start_minute % 60
                
            reason = "Standard task scheduling."
            if task.get('due_date') and task.get('due_date') < today_str:
                reason = f"Overdue since {task.get('due_date')} - requires immediate action."
            elif (task.get('progress') or 0) > 0:
                reason = f"Continue working on this partially completed task ({task.get('progress')}% progress)."
            elif task.get('priority') == 'high':
                reason = "High priority task scheduled early for peak morning focus."
            elif task.get('due_date'):
                reason = f"Scheduled to match upcoming due date of {task.get('due_date')}."
                
            plan.append({
                "task_id": task.get('id'),
                "time": time_slot,
                "task": task.get('title'),
                "reason": reason
            })
            
        return plan

    def recommend_next_task(self, active_tasks):
        system_instruction = (
            "Analyze the user's active tasks. Recommend the single best task they should work on next. "
            "Return a JSON object with keys: "
            "1. 'task_id' (integer ID of the recommended task) "
            "2. 'task_title' (title of the task) "
            "3. 'reason' (list of 2 or 3 short bullet points outlining why) "
            "Example format: "
            "{\"task_id\": 5, \"task_title\": \"AI Exam Revise\", \"reason\": [\"High priority level\", \"Due tomorrow\"]}"
        )
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, str(active_tasks))
            if res:
                return res
        if not active_tasks:
            return {"task_id": None, "task_title": None, "reason": ["No active tasks in database."]}
        prio_map = {"high": 3, "medium": 2, "low": 1}
        sorted_tasks = sorted(active_tasks, key=lambda t: prio_map.get(t.get('priority', 'medium'), 2), reverse=True)
        rec_task = sorted_tasks[0]
        reasons = [
            f"Set as {rec_task.get('priority', 'medium').upper()} priority.",
            f"Currently has {rec_task.get('progress', 0)}% completion progress."
        ]
        if rec_task.get('due_date'):
            reasons.append(f"Due date set for {rec_task.get('due_date')}.")
        return {
            "task_id": rec_task.get('id'),
            "task_title": rec_task.get('title'),
            "reason": reasons
        }

    def generate_insights(self, completed_tasks, active_tasks):
        system_instruction = (
            "Generate exactly 3 actionable, user-friendly productivity insights based on these tasks. "
            "completed: {completed_tasks}, active: {active_tasks}. "
            "Do not invent facts or metrics outside the provided data. "
            "Return a JSON object with key: 'insights' (array of strings). Example format: "
            "{\"insights\": [\"You completed 5 tasks this week!\", \"Study tasks represent 80% of your work.\"]}"
        )
        prompt = f"Completed Tasks: {completed_tasks}\nActive Tasks: {active_tasks}"
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, prompt)
            if res:
                return res
        total_completed = len(completed_tasks)
        high_prio_remaining = sum(1 for t in active_tasks if t.get('priority') == 'high')
        cat_counts = {}
        for t in completed_tasks + active_tasks:
            cat = t.get('category', 'other')
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        top_cat = max(cat_counts, key=cat_counts.get) if cat_counts else "general focus"
        insights = [
            f"Insight: You have completed {total_completed} task(s) recently.",
            f"Distribution: Most of your tasks were related to '{top_cat.upper()}' topics.",
            f"Recommendation: You have {high_prio_remaining} high-priority task(s) remaining. Prioritize these next."
        ]
        return {"insights": insights}

    def chat_assistant(self, query, all_tasks):
        try:
            tasks_list = []
            for t in all_tasks:
                tasks_list.append(
                    f"Task: {t.get('title')}, Priority: {t.get('priority')}, Status: {t.get('status')}, Due: {t.get('due_date')}, Progress: {t.get('progress')}%"
                )
            tasks_context = "\n".join(tasks_list) if tasks_list else "No active tasks."
            
            res = chat_with_ai(query, tasks_context)
            return res
        except Exception as e:
            return {"success": False, "message": str(e)}

    def generate_weekly_plan(self, active_tasks):
        system_instruction = (
            "Analyze the active tasks and build a complete weekly schedule grouped across seven days (Monday to Sunday). "
            "Balance the workload intelligently across the days (avoid clustering all high priority tasks on a single day). "
            "Return a JSON list of objects. Each object should have: "
            "1. 'day' (e.g. 'Monday', 'Tuesday', ...) "
            "2. 'tasks' (list of tasks assigned to that day, where each task contains: 'title', 'priority', 'reason') "
            "Example format: "
            "[{\"day\": \"Monday\", \"tasks\": [{\"title\": \"Task Title\", \"priority\": \"high\", \"reason\": \"High priority task scheduled early.\"}]}]"
        )
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, str(active_tasks))
            if res:
                return res
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        weekly_schedule = {d: [] for d in days}
        if not active_tasks:
            return [{"day": d, "tasks": []} for d in days]
        prio_map = {"high": 3, "medium": 2, "low": 1}
        sorted_tasks = sorted(active_tasks, key=lambda t: prio_map.get(t.get('priority', 'medium'), 2), reverse=True)
        for idx, t in enumerate(sorted_tasks):
            day_name = days[idx % 7]
            weekly_schedule[day_name].append({
                "title": t.get('title'),
                "priority": t.get('priority', 'medium'),
                "reason": "Workload balance distribution."
            })
        return [{"day": d, "tasks": weekly_schedule[d]} for d in days]

    def parse_natural_language_task(self, text_prompt):
        today = datetime.now()
        today_str = today.strftime("%Y-%m-%d")
        system_instruction = (
            "You are a Natural Language Voice & Text Task Creator. Parse the user's spoken/written prompt and extract: "
            "1. 'title' (cleaned, concise, actionable task description with filler words removed) "
            "2. 'description' (any supplementary context or notes mentioned, or empty string) "
            "3. 'due_date' (format YYYY-MM-DD, calculated accurately relative to today which is " + today_str + ") "
            "4. 'priority' ('low', 'medium', or 'high') "
            "5. 'category' ('study', 'work', 'personal', or 'other') "
            "6. 'estimated_time' (integer in minutes, e.g. 30, 45, 60, 90, 120) "
            "Return a JSON object with these keys. Example: "
            "{\"title\": \"Finish Physics Assignment\", \"description\": \"Chapter 4 problems due by 5 PM\", \"due_date\": \"2026-09-01\", \"priority\": \"high\", \"category\": \"study\", \"estimated_time\": 90}"
        )
        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, text_prompt)
            if res and isinstance(res, dict) and res.get('title'):
                return {
                    "title": res.get("title", text_prompt).strip(),
                    "description": res.get("description", "").strip(),
                    "due_date": res.get("due_date") or today_str,
                    "priority": res.get("priority", "medium").lower() if res.get("priority") in ["low", "medium", "high"] else "medium",
                    "category": res.get("category", "other").lower() if res.get("category") in ["study", "work", "personal", "other"] else "other",
                    "estimated_time": int(res.get("estimated_time", 60))
                }

        # Comprehensive smart fallback parser
        text_lower = text_prompt.lower()
        
        # Priority detection
        priority = "medium"
        if any(w in text_lower for w in ["urgent", "high priority", "asap", "critical", "important", "top priority", "high"]):
            priority = "high"
        elif any(w in text_lower for w in ["low priority", "when free", "casual", "optional", "low"]):
            priority = "low"

        # Category detection
        category = "other"
        if any(w in text_lower for w in ["study", "exam", "assignment", "homework", "quiz", "class", "lecture", "revise", "read", "chapter"]):
            category = "study"
        elif any(w in text_lower for w in ["work", "meeting", "client", "project", "code", "bug", "deploy", "email", "office", "presentation"]):
            category = "work"
        elif any(w in text_lower for w in ["gym", "workout", "buy", "groceries", "personal", "clean", "cook", "call", "family", "doctor", "health"]):
            category = "personal"

        # Due date detection
        due_date = today_str
        if "day after tomorrow" in text_lower:
            due_date = (today + timedelta(days=2)).strftime("%Y-%m-%d")
        elif "tomorrow" in text_lower:
            due_date = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        elif "next week" in text_lower:
            due_date = (today + timedelta(days=7)).strftime("%Y-%m-%d")
        elif "today" in text_lower or "tonight" in text_lower:
            due_date = today_str
        else:
            days_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            for i, day in enumerate(days_of_week):
                if day in text_lower:
                    current_day = today.weekday()
                    days_ahead = (i - current_day) % 7
                    if days_ahead == 0:
                        days_ahead = 7
                    due_date = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
                    break

        # Estimated time detection
        estimated_time = 60
        if "30 min" in text_lower or "half hour" in text_lower:
            estimated_time = 30
        elif "45 min" in text_lower:
            estimated_time = 45
        elif "90 min" in text_lower or "1.5 hour" in text_lower or "1 and half hour" in text_lower:
            estimated_time = 90
        elif "2 hour" in text_lower or "120 min" in text_lower:
            estimated_time = 120
        elif "3 hour" in text_lower or "180 min" in text_lower:
            estimated_time = 180
        elif "15 min" in text_lower or "quick" in text_lower:
            estimated_time = 15

        # Clean title
        clean_title = text_prompt
        remove_phrases = [
            "create a task to", "create a task", "add a task to", "add task", "remind me to", "i need to",
            "high priority", "low priority", "medium priority", "by tomorrow", "tomorrow", "today", "tonight",
            "day after tomorrow", "next week", "with high priority", "with low priority", "by 5 pm", "by 6 pm"
        ]
        for phrase in remove_phrases:
            pattern = phrase
            if pattern in clean_title.lower():
                # Case-insensitive replacement
                import re
                clean_title = re.sub(re.escape(pattern), "", clean_title, flags=re.IGNORECASE)

        clean_title = " ".join(clean_title.split()).strip()
        if not clean_title:
            clean_title = text_prompt.strip()

        return {
            "title": clean_title,
            "description": f"Created via voice/natural language on {today_str}",
            "due_date": due_date,
            "priority": priority,
            "category": category,
            "estimated_time": estimated_time
        }

    def generate_briefing(self, active_tasks, completed_tasks, habits, user_name="User", mode="morning"):
        """
        Generates an AI Daily Morning Briefing or Evening Standup Generator.
        mode can be 'morning' or 'evening'.
        """
        today_str = datetime.now().strftime("%Y-%m-%d")
        now_hour = datetime.now().hour
        
        system_instruction = (
            "You are an inspiring executive AI Chief of Staff and Productivity Coach. "
            "Generate a structured " + ("Morning Briefing" if mode == "morning" else "Evening Standup") + " for " + user_name + ". "
            "Analyze their tasks, overdue items, today's schedule, and habits. "
            "Return a JSON object containing:\n"
            "1. 'greeting': A personalized, motivating greeting headline.\n"
            "2. 'quote': An inspiring, punchy productivity quote or tip for today.\n"
            "3. 'top_priorities': A list of up to 3 objects with 'title', 'reason', 'suggested_time' (minutes).\n"
            "4. 'workload_summary': A brief sentence on total expected workload (e.g. 'You have 4 hours of focused work scheduled').\n"
            "5. 'habit_callout': A sentence acknowledging habits or reminding them to build consistency.\n"
            "6. 'standup_bullets': A list of 3-4 bullet points formatted like a modern standup "
            + ("(What to tackle first, critical deadlines, potential roadblocks)" if mode == "morning" else "(What was accomplished, what slipped, readiness for tomorrow)") + ".\n"
            "Example format:\n"
            "{\n"
            "  \"greeting\": \"Good morning, Alex! Let's conquer the day.\",\n"
            "  \"quote\": \"Focus is a muscle. Train it one task at a time.\",\n"
            "  \"top_priorities\": [{\"title\": \"Finish AI Project\", \"reason\": \"Due today with high priority\", \"suggested_time\": 90}],\n"
            "  \"workload_summary\": \"You have 3.5 hours of planned deep work across 4 active tasks.\",\n"
            "  \"habit_callout\": \"Keep your 5-day habit streak alive with your morning study session!\",\n"
            "  \"standup_bullets\": [\"Priority 1: AI Project submission\", \"Block 2 hours for deep focus before lunch\", \"Wrap up pending code review\"]\n"
            "}"
        )

        prompt_data = {
            "user_name": user_name,
            "mode": mode,
            "today_date": today_str,
            "active_tasks_count": len(active_tasks),
            "active_tasks": [{"id": t.get("id"), "title": t.get("title"), "priority": t.get("priority"), "due_date": t.get("due_date"), "progress": t.get("progress"), "est_time": t.get("estimated_time")} for t in active_tasks[:10]],
            "completed_tasks_count": len(completed_tasks),
            "completed_recently": [t.get("title") for t in completed_tasks[:5]],
            "habits_count": len(habits),
            "habits": [{"name": h.get("name"), "completed_today": h.get("completed_today")} for h in habits[:5]]
        }

        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, json.dumps(prompt_data))
            if res and isinstance(res, dict) and res.get("greeting"):
                return res

        # Smart rule-based fallback briefing
        total_mins = sum(int(t.get('estimated_time') or 60) for t in active_tasks)
        total_hours = round(total_mins / 60, 1)
        overdue_tasks = [t for t in active_tasks if t.get('due_date') and t.get('due_date') < today_str]
        today_tasks = [t for t in active_tasks if t.get('due_date') == today_str]
        high_prio_tasks = [t for t in active_tasks if t.get('priority') == 'high']

        top_priorities = []
        prio_pool = overdue_tasks + high_prio_tasks + today_tasks + active_tasks
        seen_ids = set()
        for t in prio_pool:
            if t.get('id') not in seen_ids and len(top_priorities) < 3:
                seen_ids.add(t.get('id'))
                reason = "Key active priority."
                if t in overdue_tasks:
                    reason = f"⚠️ Overdue since {t.get('due_date')} - needs immediate resolution."
                elif t in high_prio_tasks:
                    reason = "🔥 High priority item requiring prime morning focus."
                elif t in today_tasks:
                    reason = "📅 Due today. Keep momentum going."
                top_priorities.append({
                    "title": t.get("title", "Active Task"),
                    "reason": reason,
                    "suggested_time": int(t.get("estimated_time") or 60)
                })

        if not top_priorities:
            top_priorities.append({
                "title": "Plan upcoming milestones",
                "reason": "All tasks are complete! Great time to set new goals.",
                "suggested_time": 30
            })

        completed_habits_count = sum(1 for h in habits if h.get('completed_today') == 1)
        
        if mode == "morning":
            greeting = f"Good morning, {user_name}! ☀️"
            quote = "Action is the foundational key to all success. — Pablo Picasso"
            workload_summary = f"You have {len(active_tasks)} active tasks scheduled (~{total_hours}h estimated focus time)."
            habit_callout = f"You have {len(habits)} routine habits tracked. Let's aim for 100% completion today!" if habits else "Tip: Add daily habits to reinforce consistent focus."
            standup_bullets = [
                f"Tackle top priority: '{top_priorities[0]['title']}' first.",
                f"You have {len(overdue_tasks)} overdue tasks and {len(today_tasks)} tasks due today.",
                "Schedule a 25-minute Pomodoro session in Focus Studio to build early momentum."
            ]
        else:
            greeting = f"Evening Standup & Reflection, {user_name} 🌙"
            quote = "Well done is better than well said. — Benjamin Franklin"
            workload_summary = f"You completed {len(completed_tasks)} tasks today and logged {completed_habits_count} habit completions."
            habit_callout = f"Habits check: {completed_habits_count}/{len(habits)} completed today." if habits else "Review your accomplishments and recharge for tomorrow."
            standup_bullets = [
                f"Completed {len(completed_tasks)} tasks successfully today.",
                f"{len(active_tasks)} tasks remaining in pipeline for tomorrow.",
                "Wind down, review tomorrow's plan, and get restful sleep."
            ]

        return {
            "greeting": greeting,
            "quote": quote,
            "top_priorities": top_priorities,
            "workload_summary": workload_summary,
            "habit_callout": habit_callout,
            "standup_bullets": standup_bullets
        }

    def audit_workload(self, active_tasks, user_max_daily_hours=8):
        """
        Audits user workload, estimates cognitive capacity, and detects burnout risk.
        """
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        system_instruction = (
            "You are an AI Workload Auditor & Burnout Prevention Specialist. "
            "Analyze the user's active task list against a standard daily capacity of " + str(user_max_daily_hours) + " hours. "
            "Determine burnout risk ('optimal', 'moderate', 'high', or 'critical'). "
            "Return a JSON object containing:\n"
            "1. 'risk_level': 'optimal' (<= 5h/day), 'moderate' (5-7h/day), 'high' (7-9h/day), or 'critical' (>9h/day or excessive overdue).\n"
            "2. 'risk_score': Integer between 0 and 100 representing burnout risk percentage.\n"
            "3. 'total_scheduled_hours': Total estimated hours for today/upcoming tasks.\n"
            "4. 'capacity_hours': " + str(user_max_daily_hours) + "\n"
            "5. 'status_headline': Punchy summary headline (e.g. 'Healthy Workload', 'Approaching Capacity', 'High Burnout Warning').\n"
            "6. 'analysis_text': 2-3 sentences assessing density, cognitive load, and risk factors.\n"
            "7. 'recommendations': A list of 3 actionable rebalancing steps (e.g. 'Push Task X to Friday', 'Break 3-hour task into smaller chunks').\n"
            "8. 'tasks_to_reschedule': A list of task IDs that should be deferred to ease the burden.\n"
            "Example format:\n"
            "{\n"
            "  \"risk_level\": \"high\",\n"
            "  \"risk_score\": 78,\n"
            "  \"total_scheduled_hours\": 9.5,\n"
            "  \"capacity_hours\": 8.0,\n"
            "  \"status_headline\": \"Workload Exceeds Recommended Capacity\",\n"
            "  \"analysis_text\": \"You have 9.5 hours of high-priority work scheduled today. Concentrated cognitive demand may lead to fatigue.\",\n"
            "  \"recommendations\": [\"Reschedule lower-priority tasks to tomorrow\", \"Take a mandatory 15-minute break between focus blocks\", \"Delegate or defer non-urgent items\"],\n"
            "  \"tasks_to_reschedule\": [2, 7]\n"
            "}"
        )

        prompt_data = {
            "capacity_hours": user_max_daily_hours,
            "today_date": today_str,
            "active_tasks": [
                {"id": t.get("id"), "title": t.get("title"), "priority": t.get("priority"), "due_date": t.get("due_date"), "estimated_time": t.get("estimated_time", 60), "progress": t.get("progress", 0)}
                for t in active_tasks
            ]
        }

        if not self.is_fallback_mode:
            res = self._call_gemini_json(system_instruction, json.dumps(prompt_data))
            if res and isinstance(res, dict) and res.get("risk_level"):
                return res

        # Smart rule-based calculation
        total_mins = sum(int(t.get('estimated_time') or 60) for t in active_tasks)
        total_hours = round(total_mins / 60, 1)
        overdue_count = sum(1 for t in active_tasks if t.get('due_date') and t.get('due_date') < today_str)
        high_prio_count = sum(1 for t in active_tasks if t.get('priority') == 'high')

        capacity = float(user_max_daily_hours)
        load_ratio = (total_hours / capacity) if capacity > 0 else 1.0

        if load_ratio > 1.25 or overdue_count >= 3 or total_hours > 10:
            risk_level = "critical"
            risk_score = min(98, int(80 + (load_ratio - 1.25) * 40))
            status_headline = "Critical Burnout Alert: Extreme Overload"
            analysis_text = f"You have {total_hours}h of work scheduled against an {capacity}h daily capacity, plus {overdue_count} overdue items. Attempting this all at once risks severe mental fatigue."
        elif load_ratio > 0.9 or high_prio_count >= 4 or total_hours >= 7:
            risk_level = "high"
            risk_score = min(79, int(60 + (load_ratio - 0.9) * 50))
            status_headline = "High Load: Near Peak Capacity"
            analysis_text = f"You have {total_hours}h of scheduled commitments today ({int(load_ratio * 100)}% capacity). Keep your focus tight and protect your rest intervals."
        elif load_ratio > 0.5:
            risk_level = "moderate"
            risk_score = int(35 + (load_ratio - 0.5) * 40)
            status_headline = "Balanced & Sustainable Workload"
            analysis_text = f"Your scheduled load of {total_hours}h is well-balanced within your {capacity}h capacity. You have ample room for deep focus and routine breaks."
        else:
            risk_level = "optimal"
            risk_score = max(10, int(load_ratio * 50))
            status_headline = "Optimal Light Workload"
            analysis_text = f"Light task load ({total_hours}h scheduled). Great opportunity for deep learning, tackling side projects, or resting."

        # Suggest tasks to reschedule (low or medium priority with future flexibility)
        tasks_to_reschedule = []
        recommendations = []
        if risk_level in ["critical", "high"]:
            low_prio = [t for t in active_tasks if t.get('priority') == 'low' or (t.get('priority') == 'medium' and t.get('due_date') != today_str)]
            tasks_to_reschedule = [t.get('id') for t in low_prio[:3] if t.get('id')]
            recommendations.append("Defer non-critical tasks to later in the week.")
            recommendations.append("Limit deep work to 90-minute blocks with 15-minute breaks.")
            recommendations.append("Focus solely on the top 2 urgent items today.")
        else:
            recommendations.append("Maintain steady pace using 25-minute Pomodoro sessions.")
            recommendations.append("Check off your daily habits to build consistency.")
            recommendations.append("Prepare upcoming tasks for tomorrow before ending the day.")

        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "total_scheduled_hours": total_hours,
            "capacity_hours": capacity,
            "status_headline": status_headline,
            "analysis_text": analysis_text,
            "recommendations": recommendations,
            "tasks_to_reschedule": tasks_to_reschedule
        }

