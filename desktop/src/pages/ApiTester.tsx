import { useState } from 'react';
import { useAuth } from "@/context/AuthContext";

const API_BASE = "http://127.0.0.1:80";

export function ApiTester() {
  const { user, logout } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  
  // Get token from localStorage directly for raw fetch calls
  // In a real app, we'd use the api.ts wrapper, but here we want to test raw endpoints
  const token = localStorage.getItem('access_token');

  const log = (msg: any) => {
    const str = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${str}`, ...prev]);
  };

  const clearLogs = () => setLogs([]);

  // --- State for Inputs ---
  const [taskTitle, setTaskTitle] = useState('New Task');
  const [taskCategoryId, setTaskCategoryId] = useState('');
  const [taskId, setTaskId] = useState('');
  
  const [categoryTitle, setCategoryTitle] = useState('New Category');
  const [categoryType, setCategoryType] = useState('mixed');
  
  const [purchaseTitle, setPurchaseTitle] = useState('New Purchase');
  const [purchaseCost, setPurchaseCost] = useState('100');
  const [purchaseCategoryId, setPurchaseCategoryId] = useState('');
  const [purchaseId, setPurchaseId] = useState('');
  
  const [smartViewTitle, setSmartViewTitle] = useState('My View');
  const [smartViewId, setSmartViewId] = useState('');
  
  const [analyticsPeriod, setAnalyticsPeriod] = useState('week');
  const [analyticsLimit, setAnalyticsLimit] = useState('10');
  const [analyticsDays, setAnalyticsDays] = useState('365');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [aiMessage, setAiMessage] = useState('Create a task called Buy Milk');

  // --- Helpers ---
  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetcher = async (url: string, options?: RequestInit) => {
    try {
      log(`${options?.method || 'GET'} ${url}...`);
      const res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: { ...headers(), ...options?.headers }
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      log({ status: res.status, data });
      return data;
    } catch (e) {
      log(e);
    }
  };

  // --- Auth Actions ---
  const doMe = () => fetcher('/auth/users/me');
  const doHealth = () => fetcher('/auth/health');
  const doSessions = () => fetcher('/auth/sessions');
  const doLogoutServer = () => {
    const refreshToken = localStorage.getItem('refresh_token');
    fetcher(`/auth/logout?refresh_token=${refreshToken}`, { method: 'POST' });
  };
  const doDeleteAccount = () => fetcher('/auth/users/me', { method: 'DELETE' });

  // --- Tasks Actions ---
  const getTasks = () => fetcher('/api/tasks/?filter=today');
  const createTask = () => fetcher('/api/tasks/', {
    method: 'POST',
    body: JSON.stringify({ 
      title: taskTitle,
      category_id: taskCategoryId || null
    })
  });
  const toggleTask = () => fetcher(`/api/tasks/${taskId}/toggle`, { method: 'POST' });
  const deleteTask = () => fetcher(`/api/tasks/${taskId}`, { method: 'DELETE' });
  const updateTask = () => fetcher(`/api/tasks/${taskId}`, { 
    method: 'PATCH',
    body: JSON.stringify({ title: taskTitle }) 
  });

  // --- AI Actions ---
  const doAiChat = async () => {
    if (!user?.id) {
      log("No user logged in");
      return;
    }
    
    log(`POST /ai/chat...`);
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          message: aiMessage,
          user_id: user.id
        })
      });
      
      if (!res.body) {
        log("No response body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      log("Streaming response...");
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });
        text += chunkValue;
        
        // Update logs with current accumulated text
        setLogs(prev => {
            const newLogs = [...prev];
            if (newLogs.length > 0 && newLogs[0].startsWith("[STREAM]")) {
                newLogs[0] = `[STREAM] ${text}`;
                return newLogs;
            } else {
                return [`[STREAM] ${text}`, ...prev];
            }
        });
      }
      log("Stream complete");
    } catch (e) {
      log(e);
    }
  };

  // --- Categories Actions ---
  const getCategories = async () => {
    const data = await fetcher('/api/categories/');
    if (Array.isArray(data)) {
      setCategories(data);
    }
  };
  const createCategory = () => fetcher('/api/categories/', {
    method: 'POST',
    body: JSON.stringify({ title: categoryTitle, type: categoryType })
  });

  // --- Purchases Actions ---
  const getPurchases = () => fetcher('/api/purchases/');
  const createPurchase = () => fetcher('/api/purchases/', {
    method: 'POST',
    body: JSON.stringify({ 
      title: purchaseTitle, 
      cost: Number(purchaseCost), 
      quantity: 1,
      category_id: purchaseCategoryId || null
    })
  });
  const togglePurchase = () => fetcher(`/api/purchases/${purchaseId}/toggle`, { method: 'POST' });
  const deletePurchase = () => fetcher(`/api/purchases/${purchaseId}`, { method: 'DELETE' });
  const updatePurchase = () => fetcher(`/api/purchases/${purchaseId}`, { 
    method: 'PATCH',
    body: JSON.stringify({ title: purchaseTitle, cost: Number(purchaseCost) }) 
  });

  // --- Smart Views Actions ---
  const getSmartViews = () => fetcher('/api/smart-views/');
  const createSmartView = () => fetcher('/api/smart-views/', {
    method: 'POST',
    body: JSON.stringify({ title: smartViewTitle, rules: { "filter": "all" } })
  });
  const getSmartViewItems = () => fetcher(`/api/smart-views/${smartViewId}/items`);

  // --- Analytics Actions ---
  const getStats = () => fetcher(`/stats/dashboard?period=${analyticsPeriod}`);
  const getRecentEvents = () => fetcher(`/stats/events/recent?limit=${analyticsLimit}`);
  const getActivityHeatmap = () => fetcher(`/stats/activity-heatmap?days=${analyticsDays}`);
  const getBoughtPurchaseIds = () => fetcher(`/stats/purchases/bought?period=${analyticsPeriod}`);

  return (
    <div className="p-4 bg-background text-text-950 min-h-screen flex gap-4 font-mono text-sm">
      {/* Left Panel: Controls */}
      <div className="w-1/2 space-y-6 overflow-y-auto h-screen pb-20 pr-2">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-primary">API Tester</h1>
          <div className="flex items-center gap-4">
            <span className="text-text-secondary">User: {user?.username}</span>
            <button onClick={logout} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs text-white">Logout (Client)</button>
          </div>
        </div>
        
        {/* Auth Section */}
        <div className="p-4 border border-border rounded bg-surface">
          <h2 className="text-lg font-bold mb-2 text-blue-500">Auth Service</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white" onClick={doMe}>Get Me</button>
            <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white" onClick={doSessions}>Get Sessions</button>
            <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white" onClick={doHealth}>Health Check</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-white" onClick={doLogoutServer}>Logout (Server)</button>
            <button className="bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-white" onClick={doDeleteAccount}>Delete Account</button>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="p-4 border border-border rounded bg-surface">
          <h2 className="text-lg font-bold mb-2 text-purple-500">Core: Tasks</h2>
          <div className="flex gap-2 mb-2">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded flex-1 text-text-950" 
              placeholder="Task Title" 
              value={taskTitle} 
              onChange={e => setTaskTitle(e.target.value)} 
            />
            <select 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded w-32 text-text-950"
              value={taskCategoryId}
              onChange={e => setTaskCategoryId(e.target.value)}
            >
              <option value="">No Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white" onClick={createTask}>Create</button>
          </div>
          <div className="flex gap-2 mb-2">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded flex-1 text-text-950" 
              placeholder="Task ID (for Toggle/Update/Delete)" 
              value={taskId} 
              onChange={e => setTaskId(e.target.value)} 
            />
            <button className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white" onClick={toggleTask}>Toggle</button>
            <button className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white" onClick={updateTask}>Update</button>
            <button className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white" onClick={deleteTask}>Delete</button>
          </div>
          <div className="flex gap-2">
            <button className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white" onClick={getTasks}>List Tasks (Today)</button>
          </div>
        </div>

        {/* Categories Section */}
        <div className="p-4 border border-border rounded bg-surface">
          <h2 className="text-lg font-bold mb-2 text-yellow-500">Core: Categories</h2>
          <div className="flex gap-2 mb-2">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded flex-1 text-text-950" 
              placeholder="Category Title" 
              value={categoryTitle} 
              onChange={e => setCategoryTitle(e.target.value)} 
            />
            <select 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded w-24 text-text-950"
              value={categoryType}
              onChange={e => setCategoryType(e.target.value)}
            >
              <option value="mixed">Mixed</option>
              <option value="tasks">Tasks</option>
              <option value="purchases">Purchases</option>
            </select>
            <button className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-white" onClick={createCategory}>Create</button>
          </div>
          <div className="flex gap-2">
            <button className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-white" onClick={getCategories}>List Categories</button>
          </div>
        </div>

        {/* Purchases Section */}
        <div className="p-4 border border-border rounded bg-surface">
          <h2 className="text-lg font-bold mb-2 text-green-500">Core: Purchases</h2>
          <div className="flex gap-2 mb-2">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded flex-1 text-text-950" 
              placeholder="Purchase Title" 
              value={purchaseTitle} 
              onChange={e => setPurchaseTitle(e.target.value)} 
            />
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded w-20 text-text-950" 
              placeholder="Cost" 
              type="number"
              value={purchaseCost} 
              onChange={e => setPurchaseCost(e.target.value)} 
            />
            <select 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded w-32 text-text-950"
              value={purchaseCategoryId}
              onChange={e => setPurchaseCategoryId(e.target.value)}
            >
              <option value="">No Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white" onClick={createPurchase}>Create</button>
          </div>
          <div className="flex gap-2 mb-2">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded flex-1 text-text-950" 
              placeholder="Purchase ID (for Toggle/Update/Delete)" 
              value={purchaseId} 
              onChange={e => setPurchaseId(e.target.value)} 
            />
            <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white" onClick={togglePurchase}>Toggle</button>
            <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white" onClick={updatePurchase}>Update</button>
            <button className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white" onClick={deletePurchase}>Delete</button>
          </div>
          <div className="flex gap-2">
            <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white" onClick={getPurchases}>List Purchases</button>
          </div>
        </div>

        {/* Smart Views Section */}
        <div className="p-4 border border-border rounded bg-surface">
          <h2 className="text-lg font-bold mb-2 text-pink-500">Core: Smart Views</h2>
          <div className="flex gap-2 mb-2">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded flex-1 text-text-950" 
              placeholder="View Title" 
              value={smartViewTitle} 
              onChange={e => setSmartViewTitle(e.target.value)} 
            />
            <button className="bg-pink-600 hover:bg-pink-700 px-3 py-1 rounded text-white" onClick={createSmartView}>Create</button>
          </div>
          <div className="flex gap-2 mb-2">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded flex-1 text-text-950" 
              placeholder="Smart View ID" 
              value={smartViewId} 
              onChange={e => setSmartViewId(e.target.value)} 
            />
            <button className="bg-pink-600 hover:bg-pink-700 px-3 py-1 rounded text-white" onClick={getSmartViewItems}>Get Items</button>
          </div>
          <div className="flex gap-2">
            <button className="bg-pink-600 hover:bg-pink-700 px-3 py-1 rounded text-white" onClick={getSmartViews}>List Smart Views</button>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="p-4 border border-border rounded bg-surface">
          <h2 className="text-lg font-bold mb-2 text-orange-500">Analytics</h2>
          
          <div className="flex gap-2 mb-2 items-center">
            <select 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded text-text-950"
              value={analyticsPeriod}
              onChange={e => setAnalyticsPeriod(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
            <button className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-white" onClick={getStats}>Get Dashboard Stats</button>
            <button className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-white" onClick={getBoughtPurchaseIds}>Get Bought IDs</button>
          </div>

          <div className="flex gap-2 mb-2 items-center">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded w-20 text-text-950" 
              placeholder="Limit" 
              value={analyticsLimit} 
              onChange={e => setAnalyticsLimit(e.target.value)} 
            />
            <button className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-white" onClick={getRecentEvents}>Get Recent Events</button>
          </div>

          <div className="flex gap-2 items-center">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded w-20 text-text-950" 
              placeholder="Days" 
              value={analyticsDays} 
              onChange={e => setAnalyticsDays(e.target.value)} 
            />
            <button className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-white" onClick={getActivityHeatmap}>Get Heatmap</button>
          </div>
        </div>

        {/* AI Service Section */}
        <div className="p-4 border border-border rounded bg-surface">
          <h2 className="text-lg font-bold mb-2 text-purple-500">AI Service</h2>
          <div className="flex gap-2 mb-2">
            <input 
              className="bg-text-950/5 border border-text-950/10 p-1 rounded flex-1 text-text-950" 
              placeholder="Message to AI..." 
              value={aiMessage} 
              onChange={e => setAiMessage(e.target.value)} 
            />
            <button className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white" onClick={doAiChat}>Send</button>
          </div>
        </div>

      </div>

      {/* Right Panel: Logs */}
      <div className="w-1/2 bg-surface-dark p-4 rounded border border-border flex flex-col h-screen">
        <div className="flex justify-between items-center mb-2 border-b border-border pb-2">
          <h2 className="text-xl font-bold text-text-950">Response Logs</h2>
          <button className="text-red-400 hover:text-red-300 text-xs uppercase tracking-wider" onClick={clearLogs}>Clear Logs</button>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2">
          {logs.length === 0 && <div className="text-text-secondary italic">No logs yet...</div>}
          {logs.map((l, i) => (
            <div key={i} className="border-b border-border pb-1 whitespace-pre-wrap break-words text-text-950/80 hover:bg-text-950/5 p-1 rounded transition-colors">
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

