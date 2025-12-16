import { useState, useRef, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

const API_BASE = "http://127.0.0.1:80";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const MarkdownLink = (props: any) => (
  <a {...props} target="_blank" rel="noopener noreferrer">{props.children}</a>
);

export function AiChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/ai/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const history = await response.json();
            if (history.length > 0) {
                const formattedHistory = history.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setMessages(formattedHistory);
            } else {
                setMessages([
                    {
                        role: 'assistant',
                        content: `Hello ${user?.email?.split('@')[0] || 'there'}! 👋 How can I help you manage your tasks or purchases today?`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ]);
            }
        }
      } catch (error) {
        console.error("Failed to fetch history", error);
      }
    };
    
    if (user) {
        fetchHistory();
    }
  }, [user]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMsg })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let assistantMsg = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        assistantMsg += text;
        
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = assistantMsg;
          return newMsgs;
        });
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full relative bg-background-200 dark:bg-background-50 text-text-950 font-sans">
      {/* Header */}
      <div className="shrink-0 z-20 bg-background-200 dark:bg-background-50 sticky top-0 px-8">
        <div className="w-full max-w-7xl mx-auto flex flex-col pt-8 pb-4">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-text-950 text-xl lg:text-2xl font-bold leading-tight tracking-tight whitespace-nowrap shrink-0">AI Agent Chat</h2>
            </div>
            <button 
              onClick={() => setMessages([])}
              className="flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-full h-10 px-5 bg-primary hover:bg-primary-dark transition-colors text-white text-xs font-bold shadow-lg shadow-purple-900/20 group"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Start New Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 pb-40 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                msg.role === 'user' 
                ? 'bg-orange-100 border-text-950/10' 
                : 'bg-primary/10 border-primary/20'
            }`}>
                {msg.role === 'user' ? (
                    <span className="text-orange-600 font-bold text-sm">{user?.email?.charAt(0).toUpperCase()}</span>
                ) : (
                    <span className="material-symbols-outlined text-primary">smart_toy</span>
                )}
            </div>

            {/* Content */}
            <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'w-full max-w-2xl'}`}>
                <div className={`flex items-baseline gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-sm">{msg.role === 'user' ? 'You' : 'TaskAI'}</span>
                    <span className="text-xs text-text-950/60">{msg.timestamp}</span>
                </div>
                <div className={`p-4 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                    ? 'bg-text-950/5 text-text-950 rounded-tr-none'
                    : 'bg-surface border border-border text-text-950/80 rounded-tl-none w-full'
                }`}>
                    {msg.role === 'assistant' ? (
                        <ReactMarkdown
                            children={msg.content}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              a: MarkdownLink
                            }}
                        />
                    ) : (
                        msg.content
                    )}
                </div>
                
                {/* Action Buttons for Assistant */}
                {msg.role === 'assistant' && idx === messages.length - 1 && !isLoading && (
                    <div className="flex gap-2 mt-1">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-medium transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            New Task
                        </button>
                    </div>
                )}
            </div>
          </div>
        ))}
        
        {isLoading && (
           <div className="flex gap-4 max-w-4xl">
             <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary">smart_toy</span>
             </div>
             <div className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">TaskAI</span>
                </div>
                <div className="bg-surface border border-border p-4 rounded-2xl rounded-tl-none shadow-sm">
                   <span className="animate-pulse text-text-950/40">Thinking...</span>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-4xl mx-auto relative flex flex-col">
            {/* Floating Start Button (Optional, maybe redundant if header has it, but design has it) */}
            {messages.length > 2 && (
                <div className="self-center mb-6">
                    <button 
                        onClick={() => setMessages([])}
                        className="flex items-center gap-2 px-5 py-2.5 bg-surface/90 hover:bg-surface-dark border border-primary/40 hover:border-primary text-primary hover:text-primary-light rounded-full shadow-lg shadow-text-950/10 transition-all duration-300 backdrop-blur-md group hover:scale-105 active:scale-95 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform duration-500">add_circle</span>
                        <span className="text-sm font-medium">Start New Chat</span>
                    </button>
                </div>
            )}

            <div className="relative flex items-end bg-surface rounded-2xl shadow-lg border border-border ring-1 ring-text-950/5 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all duration-300">
                <button className="p-3 ml-1 mb-1 text-text-950/40 hover:text-primary transition-colors cursor-pointer">
                    <span className="material-symbols-outlined rotate-45">attach_file</span>
                </button>
                <textarea 
                    ref={textareaRef}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-text-950 placeholder-text-950/40 py-4 px-2 outline-none resize-none overflow-hidden min-h-[56px]" 
                    placeholder="Type a message to your assistant..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    rows={1}
                />
                <div className="flex items-center pr-2 gap-1 mb-1">
                    <button className="p-2 text-text-950/40 hover:text-text-950 transition-colors rounded-full hover:bg-text-950/5 cursor-pointer">
                        <span className="material-symbols-outlined">mic</span>
                    </button>
                    <button 
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="p-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow-md transform hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
