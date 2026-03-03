import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../services/api';
import './AIChatPanel.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIChatPanel: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const { reply } = await aiApi.chat(trimmed);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errMsg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message ||
          (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : t('aiChat.error', 'Failed to get response. Please try again.');
      setError(errMsg || t('aiChat.error', 'Failed to get response. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`ai-chat-panel ${isOpen ? 'open' : ''}`}>
      {/* Chat window */}
      <div className="ai-chat-window">
        <div className="ai-chat-header">
          <h3 className="ai-chat-title">
            <span className="ai-chat-icon">🤖</span>
            {t('aiChat.title', 'AI Assistant')}
          </h3>
          <button
            className="ai-chat-close"
            onClick={() => setIsOpen(false)}
            aria-label={t('common.close', 'Close')}
          >
            ×
          </button>
        </div>

        <div className="ai-chat-messages">
          {messages.length === 0 && (
            <div className="ai-chat-welcome">
              <p>{t('aiChat.welcome', "Hi! I'm your Fair Marketplace assistant. Ask me about fairs, vendors, or the map!")}</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`ai-chat-message ai-chat-message-${msg.role}`}>
              <div className="ai-chat-bubble">
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="ai-chat-message ai-chat-message-assistant">
              <div className="ai-chat-bubble ai-chat-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          {error && (
            <div className="ai-chat-error">{error}</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-chat-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="ai-chat-input"
            placeholder={t('aiChat.placeholder', 'Ask about fairs, vendors...')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className="ai-chat-send"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            aria-label={t('aiChat.send', 'Send')}
          >
            {isLoading ? '⋯' : '➤'}
          </button>
        </div>
      </div>

      {/* Toggle button - bottom left */}
      <button
        className="ai-chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? t('common.close', 'Close') : t('aiChat.open', 'Open AI chat')}
      >
        <span className="ai-chat-toggle-icon">{isOpen ? '×' : '🤖'}</span>
      </button>
    </div>
  );
};

export default AIChatPanel;
