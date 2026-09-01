from flask import Blueprint, request, jsonify, current_app
import os
from app import limiter
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.auth.models import User

ai_chat_bp = Blueprint('ai_chat', __name__)


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

        if not os.environ.get('GOOGLE_API_KEY'):
            return jsonify({
                'success': False,
                'message': 'AI service is not configured. Please contact support.'
            }), 500

        conversation_history = data.get('conversation_history', [])
        if not isinstance(conversation_history, list):
            conversation_history = []

        from app.tasks.ai_tasks import generate_ai_response
        result = generate_ai_response.delay(user_message, conversation_history)

        try:
            assistant_message = result.get(timeout=45)
        except Exception as exc:
            current_app.logger.error(f"AI Chat task failed: {str(exc)}")
            return jsonify({
                'success': False,
                'message': 'Failed to process your request. Please try again later.'
            }), 500

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
