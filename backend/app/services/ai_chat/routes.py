"""AI chat HTTP API.

The chat endpoint used to enqueue a Celery task and then block on
``result.get(timeout=100)`` inside the request, occupying a gunicorn worker for
up to 100 seconds and turning an asynchronous design back into a synchronous,
timeout-prone one. It now accepts the job (202) and exposes a polling endpoint.

Image attachments (JPEG/PNG/WEBP/HEIC, max 10 MB) can be uploaded via a
dedicated sub-resource; the signed URL returned there is consumed by the chat
front-end and may also be forwarded to the AI model when it supports vision.
"""
from flask import Blueprint, request, jsonify, current_app, send_file
import os
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import limiter, db
from app.services.auth.models import User
from app.utils.cache import cache_get, cache_set
from app.utils.decorators import role_required, get_current_user
from app.services.ai_chat.service import (
    upload_chat_image,
    get_chat_image,
    list_chat_images,
    delete_chat_image,
    serialize_for_api,
    resolve_image_path,
)
from app.utils.chat_image_signing import sign_chat_image_url, verify_chat_image_sig

ai_chat_bp = Blueprint('ai_chat', __name__)

MAX_MESSAGE_LENGTH = 2000
TASK_OWNER_TTL = 900


def _task_owner_key(task_id):
    return f'ai:task:{task_id}'


@ai_chat_bp.route('/chat', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def chat():
    try:
        data = request.get_json(silent=True)

        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'message': 'Message is required'
            }), 400

        user_message = str(data['message']).strip()

        if not user_message:
            return jsonify({
                'success': False,
                'message': 'Message cannot be empty'
            }), 400

        if len(user_message) > MAX_MESSAGE_LENGTH:
            return jsonify({
                'success': False,
                'message': f'Message is too long. Please keep it under {MAX_MESSAGE_LENGTH} characters.'
            }), 400

        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid user session'
            }), 401

        if not os.environ.get('COHERE_API_KEY'):
            return jsonify({
                'success': False,
                'message': 'AI service is not configured. Please contact support.'
            }), 500

        conversation_history = data.get("conversation_history", [])
        if not isinstance(conversation_history, list):
            conversation_history = []
        # Bound what we forward to the model: prompt-injection surface and cost
        # both scale with history length.
        conversation_history = conversation_history[-10:]

        # Optional image attachments — signed URLs that the front-end already
        # uploaded via /images.  Forwarded to the model when it has vision
        # support; the front-end renders them regardless.
        image_urls = data.get('image_urls')
        if image_urls is not None and not isinstance(image_urls, list):
            image_urls = []
        if isinstance(image_urls, list):
            image_urls = [str(u) for u in image_urls][:5]  # cap for safety

        from app.tasks.ai_tasks import generate_ai_response
        task = generate_ai_response.delay(user_message, conversation_history, image_urls)

        # Remember who asked, so another authenticated user cannot read the
        # answer by guessing a task id.
        cache_set(_task_owner_key(task.id), str(current_user_id), TASK_OWNER_TTL)

        return jsonify({
            'success': True,
            'message': 'AI request accepted',
            'data': {'task_id': task.id, 'status': 'pending'}
        }), 202

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


@ai_chat_bp.route('/chat/<task_id>', methods=['GET'])
@jwt_required()
@limiter.limit("120 per minute")
def chat_result(task_id):
    """Poll the status/result of a previously submitted AI request."""
    try:
        current_user_id = get_jwt_identity()
        owner = cache_get(_task_owner_key(task_id))
        if owner is None or str(owner) != str(current_user_id):
            # Unknown or expired task, or not the requester.
            return jsonify({
                'success': False,
                'message': 'AI request not found or expired'
            }), 404

        from app.tasks.ai_tasks import generate_ai_response
        async_result = generate_ai_response.AsyncResult(task_id)
        state = async_result.state

        if state in ('PENDING', 'RECEIVED', 'STARTED', 'RETRY'):
            return jsonify({
                'success': True,
                'data': {'task_id': task_id, 'status': 'processing', 'response': None}
            }), 202

        if state == 'SUCCESS':
            response_text = async_result.result
            if not isinstance(response_text, str):
                return jsonify({
                    'success': False,
                    'message': 'Failed to process your request. Please try again later.',
                    'data': {'task_id': task_id, 'status': 'failed'}
                }), 500
            return jsonify({
                'success': True,
                'data': {'task_id': task_id, 'status': 'complete', 'response': response_text}
            }), 200

        current_app.logger.error('AI Chat task %s failed with state %s', task_id, state)
        return jsonify({
            'success': False,
            'message': 'Failed to process your request. Please try again later.',
            'data': {'task_id': task_id, 'status': 'failed'}
        }), 500

    except Exception as e:
        current_app.logger.error(f"AI Chat result error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to process your request. Please try again later.'
        }), 500


@ai_chat_bp.route('/health', methods=['GET'])
@limiter.limit("30 per minute")
def health_check():
    try:
        api_key = os.environ.get('COHERE_API_KEY')
        if not api_key:
            return jsonify({
                'success': False,
                'message': 'Cohere API key not configured'
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


# ---- Chat image attachment endpoints -----------------------------------------

@ai_chat_bp.route('/images', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def upload_image():
    """Upload a single image attachment for use in the AI chat.

    Accepts ``multipart/form-data`` with a ``file`` field.  The image is
    validated (format + size), persisted, and a signed display URL plus
    auto-generated alt text are returned.
    """
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400

        file_storage = request.files['file']
        image = upload_chat_image(file_storage)

        return jsonify({
            'success': True,
            'message': 'Image uploaded successfully',
            'data': {'image': serialize_for_api(image)},
        }), 201

    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Chat image upload error: {str(e)}", exc_info=True)
        db.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to upload image. Please try again.',
        }), 500


@ai_chat_bp.route('/images', methods=['GET'])
@jwt_required()
def list_images():
    """List the current user's uploaded chat images (newest first)."""
    try:
        user = get_current_user()
        if user is None:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401

        images = list_chat_images(user)
        return jsonify({
            'success': True,
            'data': {'images': [serialize_for_api(img) for img in images]},
        }), 200
    except Exception as e:
        current_app.logger.error(f"Chat image list error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to list images.',
        }), 500


@ai_chat_bp.route('/images/<int:image_id>/signed', methods=['GET'])
@jwt_required()
def signed_image_url(image_id):
    """Return a fresh short-lived signed URL for displaying the image."""
    try:
        user = get_current_user()
        if user is None:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401

        item = get_chat_image(user, image_id)
        size = request.args.get('size', 'thumb')
        # Chat images don't currently store thumbnails — serve the original.
        _ = size  # accepted for API consistency; ignored for now

        return jsonify({
            'success': True,
            'data': {'url': sign_chat_image_url(item.id), 'size': size},
        }), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        current_app.logger.error(f"Chat image signed URL error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to generate image URL.',
        }), 500


@ai_chat_bp.route('/images/<int:image_id>', methods=['GET'])
@jwt_required()
def get_image(image_id):
    """Return metadata for a single chat image."""
    try:
        user = get_current_user()
        if user is None:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401

        item = get_chat_image(user, image_id)
        return jsonify({
            'success': True,
            'data': {'image': serialize_for_api(item)},
        }), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        current_app.logger.error(f"Chat image get error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve image.',
        }), 500


@ai_chat_bp.route('/images/<int:image_id>/raw/<path:token>', methods=['GET'])
def serve_raw_image(image_id, token):
    """Serve the image file itself.

    No JWT is required — authorization happened when the signed URL was issued
    (JWT + ownership-checked).  The signature is short-lived, so a leaked URL
    is only useful for ``ttl`` seconds.
    """
    if not verify_chat_image_sig(image_id, token):
        return jsonify({'success': False, 'message': 'Invalid or expired image URL'}), 403

    try:
        disk_path, mime, original_name = resolve_image_path(image_id)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 404

    response = send_file(
        disk_path,
        mimetype=mime,
        as_attachment=False,
        download_name=original_name,
    )
    # Images embedded in chat are served inline; allow a short browser cache.
    response.headers['Cache-Control'] = 'private, max-age=300'
    return response


@ai_chat_bp.route('/images/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_image(image_id):
    """Delete a chat image that the current user owns."""
    try:
        user = get_current_user()
        if user is None:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401

        image = delete_chat_image(user, image_id)
        return jsonify({
            'success': True,
            'message': 'Image deleted',
            'data': {'id': image.id},
        }), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Chat image delete error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to delete image.',
        }), 500
