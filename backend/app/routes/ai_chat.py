from flask import Blueprint, request, jsonify, current_app
import os
from google import genai
from app import limiter
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User

ai_chat_bp = Blueprint('ai_chat', __name__)

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


def get_genai_client():
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError("Google AI API key not configured")
    return genai.Client(api_key=api_key)


@ai_chat_bp.route('/chat', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def chat():
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'message': 'Message is required'
            }), 400
        
        user_message = data['message'].strip()
        
        if not user_message:
            return jsonify({
                'success': False,
                'message': 'Message cannot be empty'
            }), 400
        
        if len(user_message) > 2000:
            return jsonify({
                'success': False,
                'message': 'Message is too long. Please keep it under 2000 characters.'
            }), 400
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid user session'
            }), 401
        
        conversation_history = data.get('conversation_history', [])
        
        if not isinstance(conversation_history, list):
            conversation_history = []
        
        client = get_genai_client()
        
        contents = []
        
        contents.append({
            'role': 'user',
            'parts': [{'text': SYSTEM_PROMPT}]
        })
        contents.append({
            'role': 'model',
            'parts': [{'text': "Understood. I am ready to assist with AutoConcierge services."}]
        })
        
        for msg in conversation_history[-10:]:
            if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                role = msg['role']
                content = msg['content']
                if role in ('user', 'assistant'):
                    contents.append({
                        'role': role,
                        'parts': [{'text': content}]
                    })
        
        contents.append({
            'role': 'user',
            'parts': [{'text': user_message}]
        })
        
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=contents,
            config={
                'max_output_tokens': 1024,
                'temperature': 0.7,
                'top_p': 0.9,
            }
        )
        
        assistant_message = response.text.strip()
        
        return jsonify({
            'success': True,
            'data': {
                'response': assistant_message
            }
        }), 200
        
    except ValueError as e:
        current_app.logger.error(f"AI Chat configuration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'AI service is not configured properly. Please contact support.'
        }), 500
    except Exception as e:
        current_app.logger.error(f"AI Chat error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to process your request. Please try again later.'
        }), 500


@ai_chat_bp.route('/health', methods=['GET'])
def health_check():
    try:
        api_key = os.environ.get('GOOGLE_API_KEY')
        if not api_key:
            return jsonify({
                'success': False,
                'message': 'Google AI API key not configured'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'AI Chat service is healthy'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'AI Chat service check failed'
        }), 500
