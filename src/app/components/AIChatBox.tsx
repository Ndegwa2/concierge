import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User, ChevronDown, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { api, ChatMessage, ChatImage } from '@/services/api';
import { aiChatApi } from '@/services/api/aiChat';
import { ImageGallery } from '@/app/components/ui/ImageGallery';
import { UploadedImagePreview } from '@/app/components/ui/ImageUploader';
import { validateImageFile, generateAltText } from '@/utils/imageUtils';

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
  const [selectedPreviews, setSelectedPreviews] = useState<UploadedImagePreview[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
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

    const handleImageSelect = (previews: UploadedImagePreview[]) => {
    setSelectedPreviews(previews);
  };

  const handleClearImages = () => {
    setSelectedPreviews([]);
  };

  /**
   * Upload each selected image to the backend (POST /ai-chat/images) and
   * return the server-issued ChatImage objects with proper signed URLs.
   * Images that fail server-side validation are reported inline.
   */
  const uploadSelectedImages = useCallback(async (): Promise<ChatImage[]> => {
    const validPreviews = selectedPreviews.filter(p => p.valid);
    if (validPreviews.length === 0) return [];

    setUploadingImages(true);
    const uploaded: ChatImage[] = [];

    try {
      for (const preview of validPreviews) {
        try {
          const res = await aiChatApi.uploadImage(preview.file);
          if (res.success && res.data?.image) {
            uploaded.push(res.data.image);
          } else {
            toast.error(`Failed to upload "${preview.file.name}": ${res.message || 'unknown error'}`);
          }
        } catch (e: any) {
          toast.error(`Failed to upload "${preview.file.name}": ${e?.message || 'network error'}`);
        }
      }
    } finally {
      setUploadingImages(false);
    }

    return uploaded;
  }, [selectedPreviews]);

  const handleSend = async () => {
    const trimmedInput = input.trim();

    // Need at least text or images to send.
    if ((!trimmedInput && selectedPreviews.length === 0) || isLoading) return;

    // --- Upload images first ---
    let uploadedImages: ChatImage[] = [];
    if (selectedPreviews.length > 0) {
      uploadedImages = await uploadSelectedImages();
    }

    const imageUrls = uploadedImages.map(img => img.url);
    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmedInput,
      images: uploadedImages,
    };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setSelectedPreviews([]);
    setIsLoading(true);
    setIsAtBottom(true);
    setHasNewMessages(false);

    // --- Send the chat request (text + image URLs) ---
    try {
      const response = await aiChatApi.chatAndWait({
        message: trimmedInput,
        conversation_history: updatedMessages.filter(m => m.role !== 'system'),
        image_urls: imageUrls,
      });

      if (response.success && response.data?.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data!.response }]);
      } else {
        toast.error(response.message || 'Failed to get response');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Network error. Please check your connection and try again.');
      }
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
                      {message.images && message.images.length > 0 && (
                        <ImageGallery
                          images={message.images}
                          columns={message.images.length === 1 ? 1 : 2}
                          compact={true}
                        />
                      )}
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
                disabled={isLoading || uploadingImages}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => {
                  const el = document.getElementById('chat-image-input');
                  el?.click();
                }}
                disabled={isLoading || uploadingImages}
                title="Attach an image"
              >
                <Upload className="h-4 w-4 text-slate-600" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && selectedPreviews.length === 0) || isLoading || uploadingImages}
                size="icon"
                className="h-10 w-10 bg-slate-900 hover:bg-slate-800"
              >
                {isLoading || uploadingImages ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

                        {/* Image previews */}
            {selectedPreviews.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {selectedPreviews.map((p) => (
                  <div
                    key={p.id}
                    className="relative aspect-square rounded-md overflow-hidden border bg-slate-100"
                  >
                    <img
                      src={p.preview}
                      alt={p.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {!p.valid && p.errors.length > 0 && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-start p-1">
                        <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 ml-auto" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleImageSelect(
                        selectedPreviews.filter(x => x.id !== p.id)
                      )}
                      className="absolute top-0.5 right-0.5 h-5 w-5 p-0 rounded-full bg-white/80 hover:bg-white"
                      title="Remove"
                    >
                      <X className="h-3 w-3 text-slate-700" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Hidden native file input */}
            <input
              id="chat-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const fileArray = Array.from(e.target.files);
                  const newPreviews: UploadedImagePreview[] = fileArray.map(file => {
                    const result = validateImageFile(file);
                    return {
                      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      file,
                      preview: URL.createObjectURL(file),
                      alt: generateAltText(file.name),
                      size: file.size,
                      valid: result.valid,
                      errors: result.errors,
                    };
                  });
                  handleImageSelect([...selectedPreviews, ...newPreviews].slice(0, 3));
                  e.target.value = '';
                }
              }}
            />
          </div>
        </Card>
      )}
    </>
  );
}
