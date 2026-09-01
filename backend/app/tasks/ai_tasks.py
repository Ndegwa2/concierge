"""
AI Chat Tasks for AutoConcierge
=================================
Offloads Cohere API calls from Gunicorn workers.
"""
import logging
import os
from app.celery import celery

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are AutoConcierge AI, a knowledgeable and professional assistant for AutoConcierge — a premium door-to-door vehicle care concierge service.

Your expertise covers:
- Vehicle maintenance & inspection (routine checks, preventive maintenance, service reminders, pre-trip/post-trip inspections, diagnostic coordination)
- Garage & repair management (vehicle delivery/collection, repair quotations, progress monitoring, quality assurance, emergency breakdown coordination)
- Car wash & detailing (standard/exterior/interior wash, premium detailing, mobile car wash, post-service inspection)
- Pick-up & drop-off services (door-to-door collection, secure handling, flexible scheduling, corporate fleet solutions)
- Convenience & lifestyle vehicle support (fuel refilling, tyre pressure/wheel alignment, battery checks, roadside assistance)
- Corporate & fleet concierge (fleet scheduling, multi-vehicle coordination, usage reporting, cost optimization)
- Customer support & transparency (dedicated concierge support, real-time updates, digital records, partner network management)

Guidelines:
- Be helpful, concise, and professional
- Focus exclusively on concierge operations, vehicle care, bookings, appointments, and related services
- If asked about unrelated topics, politely redirect the conversation back to vehicle care and concierge services
- Do not provide medical, legal, or financial advice outside the scope of vehicle care
- Do not store, log, or repeat sensitive personal information (API keys, passwords, full credit card numbers, etc.)
- If you don't know something, say so honestly rather than guessing
- For booking or appointment inquiries, guide users to use the AutoConcierge platform"""


@celery.task(name='app.tasks.ai_tasks.generate_ai_response', bind=True, max_retries=2, default_retry_delay=10, soft_time_limit=60)
def generate_ai_response(self, user_message, conversation_history=None):
    """Generate AI chat response asynchronously using Cohere."""
    import cohere

    api_key = os.environ.get('COHERE_API_KEY')
    if not api_key:
        raise ValueError("Cohere API key not configured")

    conversation_history = conversation_history or []

    try:
        client = cohere.Client(api_key=api_key)

        chat_history = []
        chat_history.append({
            "role": "SYSTEM",
            "message": SYSTEM_PROMPT
        })

        for msg in conversation_history[-10:]:
            if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                role = msg['role']
                content = msg['content']
                if role == 'user':
                    chat_history.append({"role": "USER", "message": content})
                elif role == 'assistant':
                    chat_history.append({"role": "CHATBOT", "message": content})

        response = client.chat(
            model='command-r-plus',
            message=user_message,
            chat_history=chat_history,
            max_tokens=1024,
            temperature=0.7,
            p=0.9,
        )

        return response.text.strip()

    except Exception as exc:
        logger.error('AI generation failed: %s', exc)
        raise self.retry(exc=exc)
