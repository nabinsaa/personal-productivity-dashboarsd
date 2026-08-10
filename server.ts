import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for local smart summary computation
function getLocalDailySummary(notes: any[], tasks: any[], reminders: any[], dailyGoals: any[]) {
  const pendingTasks = tasks.filter((t: any) => !t.completed);
  const completedTasks = tasks.filter((t: any) => t.completed);
  const highPriority = pendingTasks.filter((t: any) => t.priority === 'High');
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const completedGoals = dailyGoals.filter((g: any) => g.completed).length;

  return {
    briefing: `You have ${pendingTasks.length} active tasks (${highPriority.length} high priority) and ${notes.length} total notes stored.`,
    insights: [
      `Overall task completion rate is currently at ${completionRate}%.`,
      highPriority.length > 0
        ? `${highPriority.length} high-priority task${highPriority.length > 1 ? 's' : ''} require focus today.`
        : 'All high-priority tasks are currently clear or completed!',
      `Daily goals progress: ${completedGoals}/${dailyGoals.length} goals completed today.`,
    ],
    focusAreas: pendingTasks.length > 0
      ? pendingTasks.slice(0, 3).map((t: any) => t.title)
      : ['All tasks completed! Take time to plan your next goals or relax.'],
    encouragement: 'Consistent progress every day leads to long-term success!',
  };
}

// Helper for local smart voice command parsing
function parseVoiceCommandLocal(transcript: string, categoriesList: any[] = []) {
  const lower = transcript.toLowerCase();
  let priority: 'High' | 'Medium' | 'Low' = 'Medium';
  if (lower.includes('high') || lower.includes('urgent') || lower.includes('important')) {
    priority = 'High';
  } else if (lower.includes('low')) {
    priority = 'Low';
  }

  let matchedCategoryName = '';
  // Try matching against provided categories
  if (Array.isArray(categoriesList) && categoriesList.length > 0) {
    for (const cat of categoriesList) {
      if (cat.name && lower.includes(cat.name.toLowerCase())) {
        matchedCategoryName = cat.name;
        break;
      }
    }
  }

  // Regex fallback for category phrases like "to shopping category" or "in work category"
  if (!matchedCategoryName) {
    const catMatch = transcript.match(/(?:to|in|under|for)\s+([a-zA-Z0-9\s]+?)\s+category/i);
    if (catMatch && catMatch[1]) {
      matchedCategoryName = catMatch[1].trim();
    }
  }

  let cleanedTitle = transcript
    .replace(/^add (a )?task (to )?/i, '')
    .replace(/^create (a )?task (to )?/i, '')
    .replace(/^remind me to /i, '')
    .replace(/(?:to|in|under|for)\s+[a-zA-Z0-9\s]+?\s+category/i, '')
    .trim();

  let dueDate = '';
  if (lower.includes('today')) {
    dueDate = new Date().toISOString().split('T')[0];
  } else if (lower.includes('tomorrow')) {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    dueDate = tm.toISOString().split('T')[0];
  }

  return {
    title: cleanedTitle || transcript,
    priority,
    dueDate,
    dueTime: '',
    categoryName: matchedCategoryName,
    description: 'Created via Voice Command',
  };
}

// API Route 1: Daily AI Summary & Focus Insights
app.post('/api/gemini/daily-summary', async (req, res) => {
  const { notes = [], tasks = [], reminders = [], dailyGoals = [] } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ success: true, summary: getLocalDailySummary(notes, tasks, reminders, dailyGoals) });
  }

  try {
    const context = {
      notesCount: notes.length,
      recentNotes: notes.slice(0, 5).map((n: any) => ({ title: n.title, content: n.content })),
      pendingTasks: tasks.filter((t: any) => !t.completed).map((t: any) => ({
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
      })),
      completedTasksCount: tasks.filter((t: any) => t.completed).length,
      upcomingReminders: reminders.slice(0, 3).map((r: any) => r.title),
      dailyGoals: dailyGoals.map((g: any) => ({ title: g.title, completed: g.completed, streak: g.streak })),
    };

    const prompt = `You are a personal executive productivity assistant. Analyze this user's productivity data and generate a clear, highly structured Daily Summary & Focus Strategy.

Context:
${JSON.stringify(context, null, 2)}

Instructions:
1. Provide a brief 2-sentence executive summary briefing for today.
2. Provide 3 key analytical insights or observations based on workload and completion status.
3. Provide top 3 recommended focus areas or priority actions for today.
4. Include a brief motivational thought or encouragement.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            briefing: { type: Type.STRING, description: 'Executive summary briefing for today' },
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 key analytical insights',
            },
            focusAreas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Top 3 recommended focus action items',
            },
            encouragement: { type: Type.STRING, description: 'Motivational thought or slogan' },
          },
          required: ['briefing', 'insights', 'focusAreas', 'encouragement'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, summary: parsed });
  } catch (error: any) {
    console.log('[Gemini API] Daily summary request fallback active.');
    return res.json({ success: true, summary: getLocalDailySummary(notes, tasks, reminders, dailyGoals) });
  }
});

// API Route 2: Voice Command Smart Task Parsing
app.post('/api/gemini/parse-voice-task', async (req, res) => {
  const { transcript, categories = [] } = req.body;
  if (!transcript) {
    return res.status(400).json({ success: false, error: 'Transcript is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ success: true, task: parseVoiceCommandLocal(transcript, categories) });
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const categoryNamesList = categories.map((c: any) => c.name).join(', ');
    const prompt = `Extract structured task information from this spoken command: "${transcript}".
Today's date is ${todayStr}.
Existing user categories available: [${categoryNamesList}].

Infer:
- title: concise task title without the category or priority keywords
- dueDate: (YYYY-MM-DD or empty string if not mentioned)
- dueTime: (HH:MM in 24hr or empty string)
- priority: ('High', 'Medium', or 'Low')
- categoryName: (Name of category explicitly mentioned or best matching available category like 'Shopping', 'Work', 'Personal', or empty string if none mentioned)
- description: (brief description if spoken)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            dueDate: { type: Type.STRING },
            dueTime: { type: Type.STRING },
            priority: { type: Type.STRING },
            categoryName: { type: Type.STRING, description: 'Spoken or matched category name' },
            description: { type: Type.STRING },
          },
          required: ['title', 'priority'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, task: parsed });
  } catch (error: any) {
    console.log('[Gemini API] Voice task parsing fallback active.');
    return res.json({ success: true, task: parseVoiceCommandLocal(transcript, categories) });
  }
});

async function startServer() {
  // Vite middleware for development vs production static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
