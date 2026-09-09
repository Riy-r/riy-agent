# -*- coding: utf-8 -*-
import os
import json
import urllib.request
import threading
import sqlite3
from kivy.clock import Clock
from kivy.metrics import dp
from kivymd.app import MDApp
from kivymd.uix.label import MDLabel
from kivymd.uix.textfield import MDTextField
from kivymd.uix.button import MDFlatButton
from kivymd.uix.scrollview import MDScrollView
from kivymd.uix.boxlayout import MDBoxLayout
from kivy.core.window import Window

Window.clearcolor = (0.05, 0.05, 0.12, 1)

class MemoryManager:
    def __init__(self, db_path="riy_memory.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.cursor = self.conn.cursor()
        self._init_db()
    
    def _init_db(self):
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT,
                content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                language TEXT DEFAULT 'ar'
            )
        """)
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profile (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fact TEXT,
                source_id INTEGER,
                confidence REAL DEFAULT 0.8
            )
        """)
        self.conn.commit()
    
    def save_message(self, role, content, language='ar'):
        self.cursor.execute(
            "INSERT INTO conversations (role, content, language) VALUES (?, ?, ?)",
            (role, content, language)
        )
        self.conn.commit()
    
    def get_recent_context(self, limit=15):
        self.cursor.execute(
            "SELECT role, content, language FROM conversations ORDER BY id DESC LIMIT ?",
            (limit,)
        )
        rows = self.cursor.fetchall()
        rows.reverse()
        return [{"role": r[0], "content": r[1], "language": r[2]} for r in rows]
    
    def get_user_profile(self):
        self.cursor.execute("SELECT key, value FROM user_profile")
        return {row[0]: row[1] for row in self.cursor.fetchall()}
    
    def save_user_fact(self, key, value):
        self.cursor.execute(
            "INSERT OR REPLACE INTO user_profile (key, value) VALUES (?, ?)",
            (key, value)
        )
        self.conn.commit()
    
    def save_memory(self, fact, confidence=0.8):
        self.cursor.execute(
            "INSERT INTO memories (fact, confidence) VALUES (?, ?)",
            (fact, confidence)
        )
        self.conn.commit()
    
    def get_relevant_memories(self, query, limit=3):
        words = query.split()
        like_clauses = " OR ".join(["fact LIKE ?"] * len(words))
        params = ["%" + w + "%" for w in words]
        self.cursor.execute(
            "SELECT fact FROM memories WHERE " + like_clauses + " LIMIT ?",
            params + [limit]
        )
        return [r[0] for r in self.cursor.fetchall()]
    
    def forget_memory(self, keyword):
        self.cursor.execute(
            "DELETE FROM memories WHERE fact LIKE ?",
            ("%" + keyword + "%",)
        )
        self.conn.commit()
        return self.cursor.rowcount
    
    def get_stats(self):
        self.cursor.execute("SELECT COUNT(*) FROM conversations")
        c = self.cursor.fetchone()[0]
        self.cursor.execute("SELECT COUNT(*) FROM memories")
        m = self.cursor.fetchone()[0]
        return c, m
    
    def close(self):
        self.conn.close()

class AIManager:
    def __init__(self, memory):
        self.api_key = "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"
        self.url = "https://openrouter.ai/api/v1/chat/completions"
        self.memory = memory
        self.headers = {
            "Authorization": "Bearer " + self.api_key,
            "Content-Type": "application/json"
        }
    
    def get_response(self, prompt, callback):
        def _fetch():
            try:
                profile = self.memory.get_user_profile()
                profile_text = "\n".join(["- " + k + ": " + v for k, v in profile.items()]) if profile else "No info yet"
                memories = self.memory.get_relevant_memories(prompt)
                memory_text = "\n".join(["- " + m for m in memories]) if memories else ""
                
                system = "You are Riy Agent. Owner: " + profile_text + ". Memories: " + memory_text + ". Rules: 1) Respond in user language. 2) Be honest. 3) Never fabricate."
                context = self.memory.get_recent_context(10)
                messages = [{"role": "system", "content": system}] + context + [{"role": "user", "content": prompt}]
                
                data = json.dumps({
                    "model": "qwen/qwen-2.5-72b-instruct",
                    "messages": messages,
                    "max_tokens": 1000
                }).encode()
                
                req = urllib.request.Request(self.url, data=data, headers=self.headers, method='POST')
                with urllib.request.urlopen(req, timeout=30) as resp:
                    result = json.loads(resp.read())
                    Clock.schedule_once(
                        lambda dt: callback(True, result['choices'][0]['message']['content']),
                        0
                    )
            except Exception as e:
                Clock.schedule_once(lambda dt: callback(False, str(e)), 0)
        
        threading.Thread(target=_fetch, daemon=True).start()

class RiyAgentApp(MDApp):
    def build(self):
        self.memory = MemoryManager()
        self.ai = AIManager(self.memory)
        self.lang = 'ar'
        
        layout = MDBoxLayout(orientation='vertical', padding=dp(15), spacing=dp(10))
        
        c, m = self.memory.get_stats()
        self.stats = MDLabel(
            text="Memory: " + str(c) + " msg | " + str(m) + " facts",
            font_style="Caption",
            theme_text_color="Custom",
            text_color=(0.7, 0.7, 0.7, 1),
            halign="center",
            size_hint_y=0.05
        )
        layout.add_widget(self.stats)
        
        layout.add_widget(MDLabel(
            text="Riy Agent - Text Mode",
            font_style="H5",
            theme_text_color="Custom",
            text_color=(0.4, 0.9, 1.0, 1),
            halign="center",
            size_hint_y=0.1
        ))
        
        self.scroll = MDScrollView(size_hint_y=0.7)
        self.chat = MDBoxLayout(orientation='vertical', size_hint_y=None, spacing=dp(10))
        self.chat.bind(minimum_height=self.chat.setter('height'))
        self.scroll.add_widget(self.chat)
        layout.add_widget(self.scroll)
        
        self._load_history()
        
        row = MDBoxLayout(size_hint_y=0.15, spacing=dp(10))
        self.input = MDTextField(
            hint_text="Type... (save X / forget X)",
            mode="rectangle",
            size_hint_x=0.7,
            pos_hint={"center_y": 0.5}
        )
        self.input.bind(on_text_validate=self.send)
        
        btn = MDFlatButton(
            text="Send",
            md_bg_color=(0.2, 0.7, 0.9, 1),
            text_color=(1, 1, 1, 1),
            size_hint_x=0.3,
            pos_hint={"center_y": 0.5}
        )
        btn.bind(on_release=self.send)
        
        row.add_widget(self.input)
        row.add_widget(btn)
        layout.add_widget(row)
        
        return layout
    
    def _load_history(self):
        history = self.memory.get_recent_context(limit=10)
        if history:
            self.add_msg("--- Last Session ---", False, is_system=True)
            for msg in history[-6:]:
                self.add_msg(msg['content'], msg['role'] == 'user', skip_save=True)
    
    def add_msg(self, text, is_user, skip=False, is_system=False):
        self.lang = 'ar' if any(c in text for c in 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي') else 'en'
        color = (1, 1, 1, 1) if is_user else (0.4, 0.9, 1.0, 1)
        if is_system:
            color = (0.7, 0.7, 0.7, 1)
        
        lbl = MDLabel(
            text=text,
            font_style="Body1",
            theme_text_color="Custom",
            text_color=color,
            halign="right" if is_user else "left",
            size_hint_y=None,
            padding=[dp(15), dp(10)]
        )
        lbl.texture_update()
        lbl.height = lbl.texture_size[1] + dp(20)
        self.chat.add_widget(lbl)
        Clock.schedule_once(lambda dt: self.scroll.scroll_to(lbl), 0.1)
        
        if not skip and not is_system:
            self.memory.save_message("user" if is_user else "assistant", text, self.lang)
            c, m = self.memory.get_stats()
            self.stats.text = "Memory: " + str(c) + " msg | " + str(m) + " facts"
    
    def send(self, instance):
        text = self.input.text.strip()
        if text:
            self.input.text = ""
            self.process(text)
    
    def process(self, text):
        low = text.lower()
        
        if low.startswith(("forget", "انس", "انسي")):
            kw = text.split(" ", 1)[1] if " " in text else ""
            d = self.memory.forget_memory(kw)
            self.add_msg(text, True)
            self.add_msg("Forgot " + str(d) + " item" if d else "Nothing found about " + kw, False)
            return
        
        if low.startswith(("save", "remember", "احفظ", "تذكر")):
            fact = text.split(" ", 1)[1] if " " in text else ""
            if fact:
                self.memory.save_memory(fact)
                if "name" in fact.lower() or "اسمي" in fact:
                    name = fact.split(" ", 1)[1] if " " in fact else fact
                    self.memory.save_user_fact("name", name)
                self.add_msg(text, True)
                self.add_msg("Saved: " + fact, False)
            return
        
        self.add_msg(text, True)
        self.add_msg("Thinking...", False, skip=True)
        
        def on_resp(success, resp):
            if self.chat.children and "Thinking" in self.chat.children[0].text:
                self.chat.remove_widget(self.chat.children[0])
            self.add_msg(resp, False)
        
        self.ai.get_response(text, on_resp)
    
    def on_stop(self):
        self.memory.close()

if __name__ == '__main__':
    RiyAgentApp().run()
