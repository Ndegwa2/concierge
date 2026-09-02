import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User, ChevronDown } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { api, ChatMessage } from '@/services/api';
import { aiChatApi } from '@/services/api/aiChat';

export function AIChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AutoConcierge assistant. How can I help you with your vehicle care needs today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setIsAtBottom(true);
    setHasNewMessages(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 80;

    setIsAtBottom(nearBottom);
    if (nearBottom) {
      setHasNewMessages(false);
    }
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom('smooth');
    } else {
      setHasNewMessages(true);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom('auto');
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, scrollToBottom]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmedInput };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setIsAtBottom(true);
    setHasNewMessages(false);

    try {
      const response = await aiChatApi.chatWithAI({
        message: trimmedInput,
        conversation_history: updatedMessages.filter(m => m.role !== 'system')
      });

      if (response.success && response.data?.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data!.response }]);
      } else {
        toast.error(response.message || 'Failed to get response');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-slate-900 hover:bg-slate-800 z-50"
          size="icon"
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[380px] h-[520px] shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-semibold text-sm">AutoConcierge Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-slate-800"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative flex-1">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto p-4"
            >
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-slate-900 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-900 rounded-bl-none'
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-700" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {hasNewMessages && !isAtBottom && (
              <Button
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 h-8 px-3 bg-slate-900/90 hover:bg-slate-800 text-white text-xs gap-1 shadow-lg"
                size="sm"
              >
                <ChevronDown className="h-3 w-3" />
                New messages
              </Button>
            )}
          </div>

          <div className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <Input
                id="ai-chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about our services..."
                className="flex-1 text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 bg-slate-900 hover:bg-slate-800"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
