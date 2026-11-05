import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { marked } from 'marked';
import {
  Send, Mic, MicOff, Volume2, VolumeX, Copy, Check,
  ExternalLink, Plus, MessageSquare, Trash2, Search, Menu, X,
  ShieldCheck, ArrowRight,
  Globe, Sparkles, Monitor, Download,
  Settings, ChevronsLeft, ChevronsRight, Phone,
  FileText, Bookmark
} from 'lucide-react';
import { LOGO_EMBLEM_BASE64 } from './assets/logo_base64';
import { AISaathiExtensionModal } from './components/AISaathiExtensionModal';
import { CivicSettingsModal, type SettingsLanguage } from './components/CivicSettingsModal';
import { CivicHelplineModal } from './components/CivicHelplineModal';
import { speakCivicText, stopAllSpeech, deduplicateConsecutiveWords, mergeTranscripts, sanitizeCitizenPII, isMobileDevice } from './utils/civicAudioEngine';
import {
  playTactileClick,
  playSendChime,
  playMicOnSound,
  playMicOffSound,
  playActionSuccess,
  isSoundMuted,
  toggleSoundMute
} from './utils/civicSoundEffects';

// Civic Language Support
export type CivicLanguage = 'en' | 'hi' | 'te' | 'ta';

interface SchemeCitation {
  id: string;
  name: string;
  department: string;
  level: string;
  state: string;
  benefit: string;
  eligibility_summary: string;
  official_url: string;
  source_text: string;
  last_verified_date: string;
  confidence_score: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  language?: CivicLanguage;
  citations?: SchemeCitation[];
  retrievalBadge?: string;
  suggestedFollowups?: string[];
}

interface ChatThread {
  id: string;
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  language: CivicLanguage;
}

// Ultra-reliable Triple-Layer Logo Emblem Component
export const NagarikEmblem: React.FC<{ className?: string; size?: number }> = ({ className = "w-7 h-7", size = 28 }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  if (retryFailed) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" fill="#0c0e11" stroke="#ffb692" strokeWidth="3" />
        <circle cx="50" cy="50" r="28" fill="#16191f" stroke="#ffb692" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="8" fill="#ffb692" />
        <path d="M50 12 L50 88 M12 50 L88 50 M23 23 L77 77 M23 77 L77 23" stroke="#ffb692" strokeWidth="1.5" strokeOpacity="0.8" />
      </svg>
    );
  }

  const src = !imgFailed ? LOGO_EMBLEM_BASE64 : './logo_emblem.png';

  return (
    <img
      src={src}
      alt="Nagarik AI Emblem"
      className={`${className} object-cover rounded-xl`}
      onError={() => {
        if (!imgFailed) setImgFailed(true);
        else setRetryFailed(true);
      }}
    />
  );
};

export function App() {
  // Element-Emitted Physical Adjacent Reflection States
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [hoveredLangIdx, setHoveredLangIdx] = useState<number | null>(null);
  const [hoveredMenuIdx, setHoveredMenuIdx] = useState<number | null>(null);

  // Calculate which facing edge of a card gets lit up by the currently hovered card
  const getCardReflectionClass = (cardIdx: number, hoveredIdx: number | null): string => {
    if (hoveredIdx === null || hoveredIdx === cardIdx) return '';
    const reflections: string[] = [];
    const isSameRow = Math.floor(hoveredIdx / 3) === Math.floor(cardIdx / 3);

    // Left neighbor is lit -> Light casts onto this card's LEFT border
    if (isSameRow && hoveredIdx === cardIdx - 1) {
      reflections.push('reflect-from-left');
    }
    // Right neighbor is lit -> Light casts onto this card's RIGHT border
    if (isSameRow && hoveredIdx === cardIdx + 1) {
      reflections.push('reflect-from-right');
    }
    // Neighbor above is lit -> Light casts onto this card's TOP border
    if (hoveredIdx === cardIdx - 3) {
      reflections.push('reflect-from-top');
    }
    // Neighbor below is lit -> Light casts onto this card's BOTTOM border
    if (hoveredIdx === cardIdx + 3) {
      reflections.push('reflect-from-bottom');
    }
    return reflections.join(' ');
  };

  // Calculate adjacent reflection for language buttons (horizontal row of 3)
  const getLangReflectionClass = (langIdx: number, hoveredIdx: number | null): string => {
    if (hoveredIdx === null || hoveredIdx === langIdx) return '';
    if (hoveredIdx === langIdx - 1) return 'reflect-from-left';
    if (hoveredIdx === langIdx + 1) return 'reflect-from-right';
    return '';
  };

  // Calculate adjacent reflection for menu pills (vertical stack of 4)
  const getMenuReflectionClass = (menuIdx: number, hoveredIdx: number | null): string => {
    if (hoveredIdx === null || hoveredIdx === menuIdx) return '';
    if (hoveredIdx === menuIdx - 1) return 'reflect-from-top';
    if (hoveredIdx === menuIdx + 1) return 'reflect-from-bottom';
    return '';
  };

  // 3D Gyroscopic Tilt & Parallax Physics Handlers
  const handleCardTiltMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    e.currentTarget.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`;
  };

  const handleCardTiltLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  // Magnetic Cursor Physics Handlers
  const handleMagneticMove = (e: React.MouseEvent<HTMLElement>, intensity: number = 0.2) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    e.currentTarget.style.transform = `translate(${(x * intensity).toFixed(1)}px, ${(y * intensity).toFixed(1)}px) scale(1.03)`;
  };

  const handleMagneticLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translate(0px, 0px) scale(1)';
  };

  // Global Viewport Pointer Tracking for Physical Ray-Traced Adjacent Specular Reflections
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // State: Language & Threads
  const [selectedLanguage, setSelectedLanguage] = useState<CivicLanguage>('en');
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem('nagarik_civic_threads');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const initialId = 'thread_' + Date.now();
    const initialSession = 'sess_' + Math.random().toString(36).substring(2, 10);
    return [{
      id: initialId,
      sessionId: initialSession,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      language: 'en'
    }];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nagarik_civic_threads');
      if (saved) {
        const parsed: ChatThread[] = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      }
    } catch {
      // ignore
    }
    return threads[0]?.id || 'thread_default';
  });

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const item = localStorage.getItem('nagarik_sidebar_collapsed');
    return item === null ? true : item === 'true';
  });

  const toggleSidebarCollapsed = () => {
    playTactileClick();
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('nagarik_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  };

  const [threadSearch, setThreadSearch] = useState('');
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Sound Effects
  const [soundMuted, setSoundMuted] = useState<boolean>(() => isSoundMuted());
  const handleToggleSound = () => {
    const next = toggleSoundMute();
    setSoundMuted(next);
  };

  // Modals
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelplineModal, setShowHelplineModal] = useState(false);
  const [incognito, setIncognito] = useState<boolean>(() => {
    return sessionStorage.getItem('nagarik_incognito') === 'true';
  });

  const handleToggleIncognito = (enabled: boolean) => {
    setIncognito(enabled);
    sessionStorage.setItem('nagarik_incognito', enabled ? 'true' : 'false');
  };

  const handleClearAllHistory = () => {
    localStorage.removeItem('nagarik_civic_threads');
    const initialId = 'thread_' + Date.now();
    const initialSession = 'sess_' + Math.random().toString(36).substring(2, 10);
    const resetThread: ChatThread = {
      id: initialId,
      sessionId: initialSession,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      language: selectedLanguage
    };
    setThreads([resetThread]);
    setActiveThreadId(initialId);
  };

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const mobileBaseTranscriptRef = useRef<string>('');
  const latestInputQueryRef = useRef<string>('');

  // Active thread
  const currentThread = threads.find(t => t.id === activeThreadId) || threads[0];
  const messages = currentThread?.messages || [];

  // Persist threads
  useEffect(() => {
    if (incognito) return;
    try {
      localStorage.setItem('nagarik_civic_threads', JSON.stringify(threads));
    } catch {
      // ignore
    }
  }, [threads, incognito]);

  // Rock-Solid, Zero-Jitter Scroll: ONLY scrolls the chat container, NEVER scrolls the page
  const scrollToBottomIfNear = (force: boolean = false) => {
    if (!messagesContainerRef.current) return;
    const el = messagesContainerRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    if (force || isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottomIfNear();
  }, [messages, generationStep]);

  // Keyboard shortcut Alt+N for new chat, Alt+S for sidebar toggle, Alt+E for Extension
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateNewThread();
      } else if (e.altKey && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 't')) {
        e.preventDefault();
        toggleSidebarCollapsed();
      } else if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowExtensionModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [threads]);

  // Speak Text Function with Robust Multilingual Regional Voice Matching (Telugu, Hindi, English)
  const speakText = (text: string, onEnd?: () => void, targetLang?: CivicLanguage) => {
    speakCivicText(text, targetLang || selectedLanguage, () => {
      setSpeakingId(null);
      if (onEnd) onEnd();
    });
  };

  // Create New Thread
  const handleCreateNewThread = () => {
    playTactileClick();
    const newId = 'thread_' + Date.now();
    const newSession = 'sess_' + Math.random().toString(36).substring(2, 10);
    const newThread: ChatThread = {
      id: newId,
      sessionId: newSession,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      language: selectedLanguage
    };
    setThreads([newThread, ...threads]);
    setActiveThreadId(newId);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Delete Thread
  const handleDeleteThread = (e: React.MouseEvent, threadId: string) => {
    playTactileClick();
    e.stopPropagation();
    const filtered = threads.filter(t => t.id !== threadId);
    if (filtered.length === 0) {
      handleCreateNewThread();
    } else {
      setThreads(filtered);
      if (activeThreadId === threadId) {
        setActiveThreadId(filtered[0].id);
      }
    }
  };

  // Input Bar Voice Typing (Speech Recognition)
  const toggleListening = () => {
    // Avoid speaker-to-mic feedback loop
    stopAllSpeech();

    if (isListeningRef.current || isListening) {
      playMicOffSound();
      isListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      return;
    }

    playMicOnSound();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice typing is not supported in this browser. Please try Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      const isMobile = isMobileDevice();
      const rec = new SpeechRecognition();
      // On mobile (Android Chrome/iOS), continuous = true triggers Chromium bug #654137 / #1159981
      // which produces repeated duplicated buffers. Desktop / Mac retains full continuous mode.
      rec.continuous = !isMobile;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = selectedLanguage === 'hi' ? 'hi-IN' : selectedLanguage === 'te' ? 'te-IN' : selectedLanguage === 'ta' ? 'ta-IN' : 'en-IN';

      mobileBaseTranscriptRef.current = inputQuery.trim();
      latestInputQueryRef.current = inputQuery.trim();
      isListeningRef.current = true;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        if (isMobile) {
          // On mobile Android/iOS, separate final results from interim hypotheses
          let utteranceFinal = '';
          let utteranceInterim = '';

          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            const text = (item[0]?.transcript || '').trim();
            if (!text) continue;
            if (item.isFinal) {
              utteranceFinal = mergeTranscripts(utteranceFinal, text);
            } else {
              utteranceInterim = mergeTranscripts(utteranceInterim, text);
            }
          }

          const currentBase = mobileBaseTranscriptRef.current;
          let combined = currentBase;
          if (utteranceFinal) {
            combined = currentBase ? mergeTranscripts(currentBase, utteranceFinal) : utteranceFinal;
            mobileBaseTranscriptRef.current = deduplicateConsecutiveWords(combined);
            combined = mobileBaseTranscriptRef.current;
          }
          if (utteranceInterim) {
            combined = combined ? mergeTranscripts(combined, utteranceInterim) : utteranceInterim;
          }

          const cleaned = deduplicateConsecutiveWords(combined);
          const finalTxt = cleaned || combined;
          if (finalTxt) {
            latestInputQueryRef.current = finalTxt;
            setInputQuery(finalTxt);
          }
        } else {
          // Desktop / Mac: continuous stream
          let assembled = '';
          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            const chunk = (item[0]?.transcript || '').trim();
            if (!chunk) continue;
            assembled = mergeTranscripts(assembled, chunk);
          }
          const cleaned = deduplicateConsecutiveWords(assembled);
          const finalTxt = cleaned || assembled;
          if (finalTxt) {
            latestInputQueryRef.current = finalTxt;
            setInputQuery(finalTxt);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.warn('[Nagarik Voice] Recognition error:', e?.error);
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
          recognitionRef.current = null;
        }
      };

      rec.onend = () => {
        if (isMobile && isListeningRef.current) {
          // Sync base transcript with latest query to avoid stale closure state
          if (latestInputQueryRef.current) {
            mobileBaseTranscriptRef.current = deduplicateConsecutiveWords(latestInputQueryRef.current);
          }
          // Restart single utterance on mobile to provide uninterrupted dictation
          // without triggering cumulative buffer duplicates
          try {
            rec.start();
            return;
          } catch {
            // Gracefully stop if restart fails
          }
        }
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('[Nagarik Voice] Failed to start:', err);
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  // Audio Playback Toggle for Individual Message with Full Multilingual Regional Support
  const handleToggleSpeak = (msgId: string, text: string, lang?: CivicLanguage) => {
    if (speakingId === msgId) {
      stopAllSpeech();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(msgId);
    speakCivicText(text, lang || selectedLanguage, () => {
      setSpeakingId(null);
    });
  };

  // Copy Message to Clipboard
  const handleCopy = (id: string, text: string) => {
    playActionSuccess();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send Chat Message
  const handleSendChat = async (
    overrideQuery?: string,
    isVoiceAgentQuery: boolean = false,
    overrideLang?: CivicLanguage
  ) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);

    const query = (overrideQuery || inputQuery).trim();
    if (!query || isGenerating) return;
    playSendChime();

    const currentThread = threads.find(t => t.id === activeThreadId);
    if (!currentThread) return;

    const activeLang = overrideLang || selectedLanguage;

    setInputQuery('');
    const userMsgId = 'user_' + Date.now();
    const botMsgId = 'bot_' + Date.now();

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: activeLang
    };

    const initialBotMessage: ChatMessage = {
      id: botMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: activeLang,
      citations: []
    };

    const newTitle = currentThread.messages.length === 0 ? query.slice(0, 32) : currentThread.title;
    const updatedMessages = [...currentThread.messages, userMessage, initialBotMessage];

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          title: newTitle,
          updatedAt: new Date().toISOString(),
          messages: updatedMessages
        };
      }
      return t;
    }));

    setIsGenerating(true);
    setGenerationStep('Retrieving gazetted government welfare schemes...');

    // Immediate scroll on submission
    setTimeout(() => scrollToBottomIfNear(true), 50);

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    let streamSucceeded = false;
    let fullBotText = '';

    // Client-side PII protection: mask citizen identity before network transmission
    const { cleanText: sanitizedQuery } = sanitizeCitizenPII(query);

    const payload = {
      query: sanitizedQuery,
      language: activeLang,
      session_id: currentThread.sessionId,
      thread_id: currentThread.id,
      history: currentThread.messages.slice(-6).map(m => ({
        role: m.role,
        content: sanitizeCitizenPII(m.content).cleanText
      })),
      is_incognito: incognito,
      incognito: incognito
    };

    const appendChunk = (chunk: string, citations?: SchemeCitation[], followups?: string[]) => {
      fullBotText += chunk;
      setThreads(prevThreads => prevThreads.map(t => {
        if (t.id === activeThreadId) {
          const msgs = t.messages.map(m => {
            if (m.id === botMsgId) {
              return {
                ...m,
                content: m.content + chunk,
                citations: citations || m.citations,
                suggestedFollowups: followups || m.suggestedFollowups
              };
            }
            return m;
          });
          return { ...t, messages: msgs };
        }
        return t;
      }));
      // Rock-solid inner container scroll
      scrollToBottomIfNear();
    };

    // 1. Attempt Streaming
    try {
      const streamUrl = isLocalhost
        ? 'http://localhost:8000/api/v1/chat/stream'
        : 'https://ocplgpmsfwibjzjvxynv.supabase.co/functions/v1/chat?stream=true';

      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcGxncG1zZndpYmp6anZ4eW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MDQyMDQsImV4cCI6MjEwOTA4MDIwNH0.ve2ATBpUVCOBYZ5FtexNu897vLLe3oGJgOYeccLv_zY'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === '[DONE]') {
                streamSucceeded = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                const textChunk = parsed.text ?? parsed.content ?? (parsed.type === 'chunk' || parsed.type === 'token' ? (parsed.chunk || parsed.token) : undefined);

                if (parsed.type === 'step') {
                  setGenerationStep(parsed.title || 'Verifying official criteria...');
                } else if (textChunk !== undefined) {
                  appendChunk(String(textChunk), parsed.citations, parsed.suggested_followups);
                  streamSucceeded = true;
                } else if (parsed.type === 'citations' && parsed.citations) {
                  appendChunk('', parsed.citations, parsed.suggested_followups);
                } else if (parsed.type === 'done') {
                  if (parsed.suggested_followups) {
                    appendChunk('', parsed.citations, parsed.suggested_followups);
                  }
                } else if (parsed.answer) {
                  appendChunk(String(parsed.answer), parsed.citations, parsed.suggested_followups);
                  streamSucceeded = true;
                }
              } catch {
                if (dataStr) {
                  appendChunk(dataStr);
                  streamSucceeded = true;
                }
              }
            }
          }
        }
      }
    } catch {
      // streaming fallback below
    }

    // 2. Fallback to Supabase Cloud Function if streaming had zero tokens
    if (!streamSucceeded) {
      try {
        setGenerationStep('Connecting to sovereign civic knowledge base...');
        const resp = await axios.post(
          'https://ocplgpmsfwibjzjvxynv.supabase.co/functions/v1/chat',
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcGxncG1zZndpYmp6anZ4eW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MDQyMDQsImV4cCI6MjEwOTA4MDIwNH0.ve2ATBpUVCOBYZ5FtexNu897vLLe3oGJgOYeccLv_zY'
            },
            timeout: 15000
          }
        );

        if (resp.data) {
          const content = resp.data.answer || resp.data.content || 'Information retrieved.';
          const citations = resp.data.citations || [];
          const followups = resp.data.suggested_followups || [];
          fullBotText = content;

          if (isVoiceAgentQuery) {
            setVoiceAssistantReply(content);
          }

          setThreads(prevThreads => prevThreads.map(t => {
            if (t.id === activeThreadId) {
              const msgs = t.messages.map(m => {
                if (m.id === botMsgId) {
                  return { ...m, content, citations, suggestedFollowups: followups };
                }
                return m;
              });
              return { ...t, messages: msgs };
            }
            return t;
          }));
        }
      } catch {
        fullBotText = 'Kindly check your internet connection or verify your query. Nagarik AI is ready to assist.';
        setThreads(prevThreads => prevThreads.map(t => {
          if (t.id === activeThreadId) {
            const msgs = t.messages.map(m => {
              if (m.id === botMsgId) {
                return { ...m, content: fullBotText };
              }
              return m;
            });
            return { ...t, messages: msgs };
          }
          return t;
        }));
      }
    }

    setIsGenerating(false);
    setGenerationStep('');
    setTimeout(() => scrollToBottomIfNear(true), 100);
  };

  const [savedSchemeToast, setSavedSchemeToast] = useState<string | null>(null);

  const handleSaveCitationToBasta = (cite: SchemeCitation) => {
    playActionSuccess();
    try {
      const existingStr = localStorage.getItem('nagarik_saved_schemes');
      const list = existingStr ? JSON.parse(existingStr) : [];
      if (!list.some((s: any) => s.name === cite.name)) {
        list.push({
          id: cite.id || 'scheme_' + Date.now(),
          name: cite.name,
          department: cite.department || 'Government Welfare Portal',
          benefit: cite.benefit || 'Verified Government Scheme',
          eligibility_summary: cite.eligibility_summary || 'Check official guidelines on portal',
          official_url: cite.official_url,
          saved_at: new Date().toLocaleDateString()
        });
        localStorage.setItem('nagarik_saved_schemes', JSON.stringify(list));
      }
      setSavedSchemeToast(cite.name);
      setTimeout(() => setSavedSchemeToast(null), 2500);
    } catch {
      // ignore
    }
  };

  const filteredThreads = threads.filter(t =>
    t.title.toLowerCase().includes(threadSearch.toLowerCase())
  );

  // Quick Prompt Cards for welcome screen (Sovereign Theme)
  const promptCards = [
    {
      icon: '🌾',
      title: selectedLanguage === 'hi' ? 'पीएम किसान ₹6,000' : selectedLanguage === 'te' ? 'పీఎం కిసాన్ ₹6,000' : 'PM-KISAN ₹6,000 Aid',
      desc: selectedLanguage === 'hi' ? 'पात्रता व आवेदन प्रक्रिया' : selectedLanguage === 'te' ? 'అర్హత మరియు దరఖాస్తు' : 'Annual income support for farmers',
      query: selectedLanguage === 'hi' ? 'पीएम किसान योजना के लिए पात्रता और आवेदन कैसे करें?' : selectedLanguage === 'te' ? 'పీఎం కిసాన్ పథకం అర్హతలు మరియు దరఖాస్తు విధానం ఏమిటి?' : 'What are the eligibility criteria and application steps for PM-KISAN?'
    },
    {
      icon: '🏥',
      title: selectedLanguage === 'hi' ? 'आयुष्मान भारत कार्ड' : selectedLanguage === 'te' ? 'ఆయుష్మాన్ భారత్ కార్డు' : 'Ayushman Bharat PM-JAY',
      desc: selectedLanguage === 'hi' ? '₹5 लाख तक मुफ्त इलाज' : selectedLanguage === 'te' ? '₹5 లక్షల ఉచిత వైద్యం' : '₹5 Lakh cashless hospital treatment',
      query: selectedLanguage === 'hi' ? 'आयुष्मान भारत कार्ड कैसे बनाएं और कौन से अस्पताल मान्य हैं?' : selectedLanguage === 'te' ? 'ఆయుష్మాన్ భారత్ హెల్త్ కార్డు ఎలా పొందాలి?' : 'How to apply for Ayushman Bharat card and get ₹5 Lakh hospital coverage?'
    },
    {
      icon: '🎓',
      title: selectedLanguage === 'hi' ? 'छात्रवृत्ति योजनाएं' : selectedLanguage === 'te' ? 'విద్యార్థి స్కాలర్‌షిప్‌లు' : 'Student Scholarships',
      desc: selectedLanguage === 'hi' ? '10वीं, 12वीं व कॉलेज छात्र' : selectedLanguage === 'te' ? 'పాఠశాల మరియు కాలేజీ విద్యార్థులకు' : 'National Scholarship Portal schemes',
      query: selectedLanguage === 'hi' ? 'कॉलेज और स्कूल छात्रों के लिए नेशनल स्कॉलरशिप पोर्टल की योजनाएं बताएं' : selectedLanguage === 'te' ? 'విద్యార్థుల కోసం అందుబాటులో ఉన్న ముఖ్యమైన స్కాలర్‌షిప్‌లు ఏమిటి?' : 'What government scholarships are available for school and college students?'
    },
    {
      icon: '🚗',
      title: selectedLanguage === 'hi' ? 'ड्राइविंग लाइसेंस' : selectedLanguage === 'te' ? 'డ్రైవింగ్ లైసెన్స్' : 'Driving Licence Online',
      desc: selectedLanguage === 'hi' ? 'सारथी पोर्टल पर ऑनलाइन प्रक्रिया' : selectedLanguage === 'te' ? 'సారథి పోర్టల్ ద్వారా ఆన్‌లైన్' : 'Official Sarathi Parivahan portal steps',
      query: selectedLanguage === 'hi' ? 'ड्राइविंग लाइसेंस के लिए ऑनलाइन आवेदन कैसे करें?' : selectedLanguage === 'te' ? 'ఆన్‌లైన్‌లో డ్రైవింగ్ లైసెన్స్ ఎలా దరఖాస్తు చేయాలి?' : 'How to apply for a Driving Licence online through Sarathi Parivahan?'
    },
    {
      icon: '💼',
      title: selectedLanguage === 'hi' ? 'मुद्रा व्यापार ऋण' : selectedLanguage === 'te' ? 'ముద్రా వ్యాపార రుణాలు' : 'Mudra Business Loan',
      desc: selectedLanguage === 'hi' ? 'बिना गारंटी ₹20 लाख तक लोन' : selectedLanguage === 'te' ? 'హామీ లేకుండా వ్యాపార రుణాలు' : 'Collateral-free loans up to ₹20 Lakh',
      query: selectedLanguage === 'hi' ? 'मुद्रा लोन के तहत नया बिजनेस शुरू करने के लिए लोन कैसे मिलेगा?' : selectedLanguage === 'te' ? 'ముద్రా లోన్ ద్వారా చిన్న వ్యాపారానికి రుణం ఎలా పొందాలి?' : 'How can I get a Mudra loan to start a small business?'
    },
    {
      icon: '🏠',
      title: selectedLanguage === 'hi' ? 'पीएम आवास योजना' : selectedLanguage === 'te' ? 'పీఎం ఆవాస్ యోజన' : 'PM Awas Yojana (PMAY)',
      desc: selectedLanguage === 'hi' ? 'पक्का मकान बनाने के लिए सब्सिडी' : selectedLanguage === 'te' ? 'సొంత ఇల్లు నిర్మాణానికి సాయం' : 'Housing subsidy for eligible families',
      query: selectedLanguage === 'hi' ? 'प्रधानमंत्री आवास योजना के तहत घर बनाने के लिए कितनी सब्सिडी मिलती है?' : selectedLanguage === 'te' ? 'పీఎం ఆవాస్ యోజన కింద ఇల్లు కట్టుకోవడానికి ఎలా దరఖాస్తు చేయాలి?' : 'How do I apply for PM Awas Yojana housing subsidy?'
    }
  ];

  return (
    <div className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-hidden bg-[#0c0e11] text-[#e2e2e6] font-sans antialiased">
      {/* ================================================================= */}
      {/* 1. LEFT SIDEBAR (COLLAPSIBLE / EXTENDABLE CONVERSATION HISTORY)   */}
      {/* ================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#111318] border-r border-[#242938] sidebar-transition md:static ${
          sidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full w-80'
        } ${
          sidebarCollapsed
            ? 'md:w-0 md:opacity-0 md:border-none md:p-0 md:overflow-hidden md:pointer-events-none'
            : 'md:w-80 md:opacity-100 md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#22262f] bg-[#16191f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1c2230] border border-[#E58C5C]/40 shadow-inner p-0.5">
              <NagarikEmblem className="w-8 h-8 rounded-lg" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="brand-serif italic font-bold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ffdbcb] via-[#ffb692] to-[#E58C5C]">
                  Nagarik AI
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#E58C5C]/15 text-[#ffb692] border border-[#E58C5C]/30 font-mono">
                  Sovereign
                </span>
              </div>
              <p className="text-[11px] text-[#8F93B5]">Civic Intelligence Copilot</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Button */}
            <button
              onClick={() => {
                setSidebarCollapsed(true);
                try { localStorage.setItem('nagarik_sidebar_collapsed', 'true'); } catch {}
              }}
              className="hidden md:flex p-1.5 rounded-lg text-[#8F93B5] hover:text-[#ffb692] hover:bg-[#22262f] transition-colors"
              title="Collapse menu (Alt+S)"
              aria-label="Collapse Menu"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-[#8F93B5] hover:text-white hover:bg-[#22262f]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Start Fresh Conversation CTA */}
        <div className="p-3 shrink-0">
          <button
            onClick={handleCreateNewThread}
            className="hover-pop-btn-saffron shimmer-sweep w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm shadow-lg group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Consultation</span>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ============================================================= */}
        {/* CIVIC TOOLS & SERVICES (MOVED FROM TOP HEADER INTO MENU BAR)  */}
        {/* ============================================================= */}
        <div className="px-3 pb-3 space-y-2 shrink-0 border-b border-[#22262f]">
          <div className="px-1 text-[10px] font-bold text-[#8F93B5] uppercase tracking-wider">
            Civic Tools & Services
          </div>

          {/* 1. AI Saathi Browser Extension */}
          <button
            onClick={() => {
              playTactileClick();
              setShowExtensionModal(true);
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            onMouseEnter={() => setHoveredMenuIdx(0)}
            onMouseLeave={() => setHoveredMenuIdx(null)}
            className={`pill-luxury-menu w-full p-2.5 flex items-center justify-between text-left group transition-all duration-200 ${getMenuReflectionClass(0, hoveredMenuIdx)}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#221c18] border border-[#E58C5C]/40 flex items-center justify-center text-[#ffb692] group-hover:scale-110 transition-transform shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#E8E9F2] group-hover:text-[#ffb692] transition-colors truncate">
                  AI Saathi Assistant
                </div>
                <div className="text-[10px] text-[#8F93B5] truncate">Browser autofill & guardian</div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E58C5C]/15 text-[#ffb692] border border-[#E58C5C]/30 shrink-0">
              Chrome
            </span>
          </button>

          {/* 2. National Helplines (SOS / 24x7) */}
          <button
            onClick={() => {
              playTactileClick();
              setShowHelplineModal(true);
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            onMouseEnter={() => setHoveredMenuIdx(1)}
            onMouseLeave={() => setHoveredMenuIdx(null)}
            className={`pill-luxury-menu w-full p-2.5 flex items-center justify-between text-left group transition-all duration-200 ${getMenuReflectionClass(1, hoveredMenuIdx)}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#241717] border border-red-500/40 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform shrink-0">
                <Phone className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#E8E9F2] group-hover:text-[#ffb692] transition-colors truncate">
                  National Helplines
                </div>
                <div className="text-[10px] text-[#8F93B5] truncate">112 • 1930 • 181 • 1098</div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
              24x7 SOS
            </span>
          </button>

          {/* 3. Tactile Sound Effects Audio Toggle */}
          <button
            onClick={handleToggleSound}
            onMouseEnter={() => setHoveredMenuIdx(2)}
            onMouseLeave={() => setHoveredMenuIdx(null)}
            className={`pill-luxury-menu w-full p-2.5 flex items-center justify-between text-left group transition-all duration-200 ${getMenuReflectionClass(2, hoveredMenuIdx)}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1c2230] border border-[#ffb692]/30 flex items-center justify-center text-[#ffb692] group-hover:scale-110 transition-transform shrink-0">
                {soundMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#E8E9F2] group-hover:text-[#ffb692] transition-colors truncate">
                  Sound Effects
                </div>
                <div className="text-[10px] text-[#8F93B5] truncate">Tactile acoustic haptics</div>
              </div>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
              soundMuted
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : 'bg-[#E58C5C]/20 text-[#ffb692] border border-[#E58C5C]/40'
            }`}>
              {soundMuted ? 'Muted' : 'Active'}
            </span>
          </button>

          {/* 4. Settings & Accessibility */}
          <button
            onClick={() => {
              playTactileClick();
              setShowSettingsModal(true);
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            onMouseEnter={() => setHoveredMenuIdx(3)}
            onMouseLeave={() => setHoveredMenuIdx(null)}
            className={`pill-luxury-menu w-full p-2.5 flex items-center justify-between text-left group transition-all duration-200 ${getMenuReflectionClass(3, hoveredMenuIdx)}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1c2230] border border-white/10 flex items-center justify-center text-[#8F93B5] group-hover:text-[#ffb692] group-hover:scale-110 transition-transform shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#E8E9F2] group-hover:text-[#ffb692] transition-colors truncate">
                  Display & Privacy
                </div>
                <div className="text-[10px] text-[#8F93B5] truncate">Font size, contrast & history</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#8F93B5] group-hover:text-[#ffb692] group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        </div>

        {/* Search Past Conversations */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8F93B5]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              className="w-full bg-[#16191f] border border-[#22262f] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E8E9F2] placeholder-[#8F93B5] focus:outline-none focus:border-[#ffb692]/60"
            />
          </div>
        </div>

        {/* Conversation Threads List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin">
          <div className="px-2 pt-1 pb-1 text-[11px] font-semibold text-[#8F93B5] uppercase tracking-wider flex items-center justify-between">
            <span>Past Consultations</span>
            <span className="text-[10px] bg-[#1a1d24] px-1.5 py-0.5 rounded text-[#8F93B5] font-mono">
              {filteredThreads.length}
            </span>
          </div>

          {filteredThreads.map(thread => {
            const isActive = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  setSidebarOpen(false);
                }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-xs transition-all ${
                  isActive
                    ? 'bg-[#1a1d24] text-white font-medium border border-[#E58C5C]/50 shadow-sm'
                    : 'text-[#8F93B5] hover:bg-[#16191f] hover:text-[#E8E9F2]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#ffb692]' : 'text-[#8F93B5]'}`} />
                  <span className="truncate">{thread.title || 'Civic Consultation'}</span>
                </div>
                {threads.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteThread(e, thread.id)}
                    title="Delete conversation"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#22262f] space-y-2 bg-[#101216] shrink-0">
          {threads.length > 1 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all conversation history?')) {
                  handleClearAllHistory();
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-[#8F93B5] hover:text-red-400 hover:bg-[#16191f] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          <div className="pt-1 px-1 flex items-center justify-between text-[10px] text-[#8F93B5] border-t border-[#22262f]/60">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Zero-Knowledge Architecture
            </span>
            <span className="text-[#ffb692] font-mono">Sovereign AI</span>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ================================================================= */}
      {/* 2. MAIN CONVERSATION WORKSPACE                                    */}
      {/* ================================================================= */}
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#0c0e11] relative">
        {/* Top Minimal Sovereign Header - Fully Responsive on Mobile (< 640px) */}
        <header className="flex items-center justify-between h-14 px-3 sm:px-6 border-b border-[#22262f] bg-[#101216]/95 backdrop-blur-2xl shrink-0 overflow-hidden shadow-md">
          {/* Left: Collapsible Menu Bar Toggle Button & Sovereign Copilot Identity */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <button
              onClick={() => {
                playTactileClick();
                if (window.innerWidth < 768) {
                  setSidebarOpen(prev => !prev);
                } else {
                  toggleSidebarCollapsed();
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161922] border border-[#2a3040] hover:border-[#ffb692]/70 text-[#ffb692] shadow-sm transition-all active:scale-95 group cursor-pointer"
              title="Open Menu & Civic Services (Alt+S)"
              aria-label="Open Menu & Civic Services"
            >
              <Menu className="w-4 h-4 text-[#ffb692] group-hover:rotate-90 transition-transform duration-300" />
              <span className="hidden sm:inline text-xs font-semibold text-[#E8E9F2]">Menu</span>
              {threads.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E58C5C]/20 text-[#ffb692] font-mono">
                  {threads.length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <NagarikEmblem className="w-6 h-6 rounded-lg shrink-0" size={24} />
              <span className="font-bold text-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ffdbcb] via-[#ffb692] to-[#E58C5C]">
                Nagarik AI
              </span>
              <span className="hidden md:inline text-xs text-[#8F93B5] border-l border-white/10 pl-2.5 truncate max-w-sm">
                {currentThread?.title || 'Sovereign Civic Intelligence'}
              </span>
            </div>
          </div>

          {/* Right: ONLY THE LANGUAGE SWITCHER BUTTON (As Requested by Citizen) */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center bg-[#13161f] border border-[#262c3a] rounded-xl p-1 text-xs shadow-inner">
              {(['en', 'hi', 'te'] as CivicLanguage[]).map((lang, lIdx) => (
                <button
                  key={lang}
                  onClick={() => {
                    playTactileClick();
                    setSelectedLanguage(lang);
                  }}
                  onMouseEnter={() => setHoveredLangIdx(lIdx)}
                  onMouseLeave={() => setHoveredLangIdx(null)}
                  className={`lang-btn-segment px-3 py-1 sm:px-3.5 sm:py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${getLangReflectionClass(lIdx, hoveredLangIdx)} ${
                    selectedLanguage === lang
                      ? 'bg-gradient-to-r from-[#ffdbcb] via-[#ffb692] to-[#E58C5C] text-[#0B0C1E] font-bold shadow-md'
                      : 'text-[#8F93B5] hover:text-[#ffb692]'
                  }`}
                  aria-label={`Switch language to ${lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Telugu'}`}
                  data-lang-btn={lang}
                >
                  {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिंदी' : 'తెలుగు'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Message Feed / Welcome Screen (Rock-Solid Scrolling Container) */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 scrollbar-thin overscroll-contain"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* EMPTY STATE: Welcome Screen */}
            {messages.length === 0 && (
              <div className="py-8 sm:py-12 text-center space-y-10 sm:space-y-14 animate-fade-in max-w-5xl mx-auto">
                {/* Hero Header */}
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="saffron-aura inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#161922] border border-[#E58C5C]/50 shadow-2xl">
                    <NagarikEmblem className="w-12 h-12" size={48} />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    {selectedLanguage === 'hi'
                      ? 'नमस्ते! आप किस योजना या सेवा की तलाश में हैं?'
                      : selectedLanguage === 'te'
                      ? 'నమస్కారం! మీరు ఏ ప్రభుత్వ పథకం లేదా సేవ కోసం చూస్తున్నారు?'
                      : 'Namaste! How can Nagarik AI assist you today?'}
                  </h1>
                  <p className="text-sm sm:text-base text-[#8F93B5] leading-relaxed">
                    {selectedLanguage === 'hi'
                      ? 'प्रमाणित केंद्रीय व राज्य योजनाओं, पात्रता नियमों और आधिकारिक सरकारी पोर्टलों की सटीक जानकारी।'
                      : selectedLanguage === 'te'
                      ? 'అధికారిక కేంద్ర మరియు రాష్ట్ర సంక్షేమ పథకాలు, అర్హత నిబంధనలు మరియు ప్రత్యక్ష ప్రయోజనాల సమాచారం.'
                      : 'Official Central & State Welfare Schemes, Eligibility Criteria & Direct Benefit Access.'}
                  </p>
                </div>

                {/* THE SIX SCHEMES: 3D GYROSCOPIC TILT, PARALLAX & ADJACENT SPECULAR REFLECTION */}
                <div className="spotlight-group perspective-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8 text-left pt-2">
                  {promptCards.map((card, idx) => (
                    <button
                      key={idx}
                      onClick={() => { playTactileClick(); handleSendChat(card.query); }}
                      onMouseMove={handleCardTiltMove}
                      onMouseEnter={() => setHoveredCardIndex(idx)}
                      onMouseLeave={(e) => { handleCardTiltLeave(e); setHoveredCardIndex(null); }}
                      className={`card-spacious-glow spotlight-card card-3d-tilt group flex flex-col justify-between p-6 sm:p-7 min-h-[185px] text-left transition-all duration-300 ${getCardReflectionClass(idx, hoveredCardIndex)}`}
                    >
                      <div className="space-y-3 parallax-layer-front">
                        <div className="w-12 h-12 rounded-2xl bg-[#1c2230] border border-[#ffb692]/25 flex items-center justify-center text-2xl shadow-inner group-hover:scale-115 group-hover:border-[#ffb692]/60 transition-all duration-300">
                          {card.icon}
                        </div>
                        <h2 className="font-bold text-base text-[#E8E9F2] group-hover:text-[#ffb692] transition-colors tracking-tight">
                          {card.title}
                        </h2>
                        <p className="text-xs sm:text-[13px] text-[#8F93B5] leading-relaxed line-clamp-2 parallax-layer-mid">
                          {card.desc}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-5 text-xs font-semibold text-[#ffb692] group-hover:translate-x-2 transition-transform duration-300 parallax-layer-front">
                        <span>Consult Scheme</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CONVERSATION MESSAGES */}
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isLatestBotMessage = !isUser && idx === messages.length - 1;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Bot Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[#16191f] border border-[#B8643A]/50 flex items-center justify-center shrink-0 mt-0.5">
                      <NagarikEmblem className="w-5 h-5" size={20} />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#1e2330] text-white rounded-tr-sm border border-[#2b303b] shadow-sm'
                        : 'bg-[#121418] text-[#e2e2e6] rounded-tl-sm border border-[#22262f] shadow-md'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Bot Content with live streaming cursor */}
                        <div className="relative">
                          <div
                            className="prose-civic"
                            dangerouslySetInnerHTML={{
                              __html: marked.parse(msg.content || '') as string
                            }}
                          />
                          {isGenerating && isLatestBotMessage && (
                            <span className="streaming-cursor" title="Streaming response..." />
                          )}
                        </div>

                        {/* Official Citations & Portals */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="pt-3 border-t border-[#22262f] space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ffb692]">
                              <Globe className="w-3.5 h-3.5" />
                              <span>Verified Official Portals:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((cite, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="inline-flex items-center rounded-lg bg-[#16191f] border border-[#22262f] hover:border-[#ffb692]/60 transition-colors overflow-hidden"
                                >
                                  <a
                                    href={cite.official_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#ffb692] hover:text-[#ffdbcb] transition-colors"
                                  >
                                    <span>{cite.name}</span>
                                    <ExternalLink className="w-3 h-3 text-[#8F93B5]" />
                                  </a>
                                  <button
                                    onClick={() => handleSaveCitationToBasta(cite)}
                                    title="Bookmark Scheme to Civic Dossier"
                                    className="p-1.5 border-l border-[#22262f] text-[#8F93B5] hover:text-[#ffb692] hover:bg-[#22262f] transition-colors"
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggested Follow-ups */}
                        {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {msg.suggestedFollowups.map((followup, fIdx) => (
                              <button
                                key={fIdx}
                                onClick={() => handleSendChat(followup)}
                                className="px-2.5 py-1 rounded-full bg-[#1a1d24] border border-[#22262f] hover:border-[#ffb692]/40 text-xs text-[#c5cfdb] hover:text-white transition-colors"
                              >
                                {followup}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Bottom Actions Bar */}
                        <div className="flex items-center gap-3 pt-2 text-xs text-[#8F93B5]">
                          <button
                            onClick={() => handleToggleSpeak(msg.id, msg.content, msg.language)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
                              speakingId === msg.id
                                ? 'bg-[#ffb692]/15 text-[#ffb692] border border-[#ffb692]/30 shadow-sm'
                                : 'hover:text-white hover:bg-[#16191f]'
                            }`}
                            title={speakingId === msg.id ? "Stop voice audio" : "Listen in authentic Telugu / Hindi / English"}
                          >
                            {speakingId === msg.id ? (
                              <>
                                <div className="flex items-center gap-0.5 px-0.5 h-3.5">
                                  <div className="w-0.5 bg-[#ffb692] rounded-full animate-soundwave-1" />
                                  <div className="w-0.5 bg-[#ffb692] rounded-full animate-soundwave-2" />
                                  <div className="w-0.5 bg-[#ffb692] rounded-full animate-soundwave-3" />
                                </div>
                                <span className="text-[#ffb692] font-medium text-[11px]">Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Listen</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Stable Live Reasoning Status (Zero layout shift) */}
            {isGenerating && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#16191f] border border-[#ffb692]/30 max-w-md text-xs text-[#8F93B5]">
                <div className="w-2 h-2 rounded-full bg-[#ffb692] animate-ping" />
                <span className="truncate">{generationStep || 'Searching gazettes...'}</span>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. PINNED BOTTOM INPUT BAR (SOVEREIGN GLOW)                       */}
        {/* ================================================================= */}
        <div className="p-3 sm:p-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] border-t border-[#22262f] bg-[#101216]/95 backdrop-blur-md shrink-0 z-20">
          <div className="max-w-3xl mx-auto space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="input-bar-glow relative flex items-center bg-[#16191f] border border-[#22262f] rounded-2xl shadow-xl focus-within:border-[#ffb692]/70 focus-within:ring-1 focus-within:ring-[#ffb692]/30 transition-all"
            >
              {/* Mic / Voice Search with Concentric Shockwave Fluid Physics */}
              <button
                type="button"
                onClick={toggleListening}
                onMouseMove={(e) => handleMagneticMove(e, 0.18)}
                onMouseLeave={handleMagneticLeave}
                className={`magnetic-btn relative p-3.5 rounded-l-2xl transition-all flex items-center justify-center ${
                  isListening
                    ? 'text-[#E58C5C] bg-[#E58C5C]/15 ring-2 ring-[#E58C5C]/40'
                    : 'text-[#ffb692] hover:text-white hover:bg-white/5'
                }`}
                title={isListening ? 'Listening... Speak in Telugu, Hindi, or English (Click to stop)' : 'Voice typing'}
                aria-label="Voice typing"
              >
                {isListening ? (
                  <div className="relative flex items-center justify-center">
                    {/* Concentric expanding fluid shockwave rings */}
                    <span className="absolute w-8 h-8 rounded-full bg-[#E58C5C]/35 animate-shockwave-1" />
                    <span className="absolute w-8 h-8 rounded-full bg-[#ffb692]/25 animate-shockwave-2" />
                    <span className="absolute w-8 h-8 rounded-full bg-[#ffdbcb]/20 animate-shockwave-3" />
                    <MicOff className="w-5 h-5 text-[#E58C5C] relative z-10" />
                  </div>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  isListening
                    ? (selectedLanguage === 'hi' ? 'सुन रहा हूँ... बोलिए' : selectedLanguage === 'te' ? 'వింటున్నాను... మాట్లాడండి' : 'Listening... Speak now')
                    : (selectedLanguage === 'hi'
                    ? 'सरकारी योजनाओं, पात्रता या सेवाओं के बारे में पूछें...'
                    : selectedLanguage === 'te'
                    ? 'ప్రభుత్వ పథకాలు లేదా సేవల గురించి అడగండి...'
                    : 'Ask about any government scheme, eligibility, or civic service...')
                }
                disabled={isGenerating}
                className="flex-1 bg-transparent py-3 px-2 text-base sm:text-sm text-[#E8E9F2] placeholder-[#8F93B5] focus:outline-none disabled:opacity-50"
              />

              {/* Send Button with Magnetic Spring Attraction */}
              <button
                type="submit"
                disabled={!inputQuery.trim() || isGenerating}
                onMouseMove={(e) => {
                  if (inputQuery.trim() && !isGenerating) handleMagneticMove(e, 0.22);
                }}
                onMouseLeave={handleMagneticLeave}
                className={`magnetic-btn p-2.5 mr-2 rounded-xl transition-all ${
                  inputQuery.trim() && !isGenerating
                    ? 'hover-pop-btn-saffron text-[#0B0C1E] shadow-lg cursor-pointer font-bold'
                    : 'text-[#3f3a2f] cursor-not-allowed opacity-50'
                }`}
                title="Send message"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between px-2 text-[10px] sm:text-[11px] text-[#8F93B5]">
              <span className="truncate flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">UIDAI Aadhaar Redacted • Voice Enabled in 22 Official Languages</span>
              </span>
              <span className="hidden sm:inline shrink-0 ml-2">Press Enter to send</span>
            </div>
          </div>
        </div>
      </main>

      {/* ================================================================= */}
      {/* 4. MODALS: AI SAATHI EXTENSION & CONSULTATION SUMMARIZER          */}
      {/* ================================================================= */}

      {/* AI Saathi Browser Extension Modal */}
      <AISaathiExtensionModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
        selectedLanguage={selectedLanguage}
      />

      {/* National Helplines Directory Modal (SOS / 24x7) */}
      <CivicHelplineModal
        isOpen={showHelplineModal}
        onClose={() => setShowHelplineModal(false)}
        currentLanguage={selectedLanguage === 'ta' ? 'en' : selectedLanguage}
      />

      {/* Citizen Preferences & Settings Modal */}
      <CivicSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        selectedLanguage={selectedLanguage}
        onLanguageChange={(lang) => setSelectedLanguage(lang as CivicLanguage)}
        onClearHistory={handleClearAllHistory}
        incognito={incognito}
        onToggleIncognito={handleToggleIncognito}
      />

      {/* Toast Notification for Bookmarked Scheme */}
      {savedSchemeToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16191f] border border-[#E58C5C]/50 text-white text-xs font-semibold shadow-2xl animate-slide-smooth">
          <Check className="w-4 h-4 text-[#ffb692]" />
          <span>Saved to your civic dossier: <strong>{savedSchemeToast}</strong></span>
        </div>
      )}
    </div>
  );
}

export default App;
