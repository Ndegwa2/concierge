from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required

from app import db
from app.utils.decorators import role_required, get_current_user
from app.utils.media_signing import verify_media_sig, sign_media_url
from app.services.proof_of_work.service import (
    upload_proof_of_work,
    list_proof_of_work,
    get_proof_of_work,
    serialize_for_api,
    resolve_media_path,
    delete_proof_of_work,
)
from app.services.proof_of_work.models import ProofOfWorkMedia

import logging

logger = logging.getLogger(__name__)
proof_of_work_bp = Blueprint('proof_of_work', __name__)


@proof_of_work_bp.route('/proof-of-work/media', methods=['POST'])
@jwt_required()
@role_required('employee', 'concierge', 'admin', 'super_admin')
def upload_media():
    try:
        assignment_id = request.form.get('assignment_id')
        if not assignment_id:
            return jsonify({'success': False, 'message': 'assignment_id is required'}), 400
        assignment_id = int(assignment_id)
        caption = request.form.get('caption', '')
        is_public = request.form.get('is_public', 'false').lower() == 'true'

        if 'files' in request.files:
            files = request.files.getlist('files')
        elif 'file' in request.files:
            files = [request.files['file']]
        else:
            files = []
        if not files:
            return jsonify({'success': False, 'message': 'No file(s) provided'}), 400

        created = upload_proof_of_work(files, assignment_id, caption, is_public)

        return jsonify({
            'success': True,
            'message': 'Proof-of-work media uploaded',
            'data': {'media': [serialize_for_api(m) for m in created]},
        }), 201

    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to upload media',
            'error': 'An internal server error occurred.',
        }), 500


@proof_of_work_bp.route('/proof-of-work/media', methods=['GET'])
@jwt_required()
def list_media():
    try:
        user = get_current_user()
        assignment_id = request.args.get('assignment_id', type=int) or None
        appointment_id = request.args.get('appointment_id', type=int) or None

        items = list_proof_of_work(user, assignment_id, appointment_id)
        return jsonify({
            'success': True,
            'data': {
                'media': [serialize_for_api(m) for m in items],
                'count': len(items),
            },
        }), 200

    except Exception as e:
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to list media',
            'error': 'An internal server error occurred.',
        }), 500


@proof_of_work_bp.route('/proof-of-work/media/<int:media_id>', methods=['GET'])
@jwt_required()
def get_media(media_id):
    try:
        user = get_current_user()
        item = get_proof_of_work(user, media_id)
        return jsonify({'success': True, 'data': {'media': serialize_for_api(item)}}), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get media',
            'error': 'An internal server error occurred.',
        }), 500


@proof_of_work_bp.route('/proof-of-work/media/<int:media_id>/signed', methods=['GET'])
@jwt_required()
def signed_media_url(media_id):
    try:
        user = get_current_user()
        item = get_proof_of_work(user, media_id)
        size = request.args.get('size', 'thumb')
        if size not in ('thumb', 'original'):
            return jsonify({'success': False, 'message': 'Invalid size'}), 400
        return jsonify({
            'success': True,
            'data': {'url': sign_media_url(item.id, size)},
        }), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to generate media URL',
            'error': 'An internal server error occurred.',
        }), 500


@proof_of_work_bp.route('/proof-of-work/media/<int:media_id>/raw/<size>/<path:token>', methods=['GET'])
def serve_raw_file(media_id, size, token):
    """Serve the media file itself.

    No JWT is required here: authorization happened when the signed URL was
    issued (JWT + visibility-checked). The signature is short-lived, so a
    leaked URL is only useful for ``ttl`` seconds.
    """
    if size not in ('thumb', 'original'):
        return jsonify({'success': False, 'message': 'Invalid size'}), 400

    if not verify_media_sig(media_id, size, token):
        return jsonify({'success': False, 'message': 'Invalid or expired media URL'}), 403

    try:
        disk_path, mime, original_name = resolve_media_path(media_id, size)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 404

    download = size == 'original'
    return send_file(
        disk_path,
        mimetype=mime,
        as_attachment=download,
        download_name=original_name if download else None,
    )


@proof_of_work_bp.route('/proof-of-work/media/<int:media_id>', methods=['DELETE'])
@jwt_required()
def delete_media(media_id):
    try:
        user = get_current_user()
        delete_proof_of_work(user, media_id)
        return jsonify({'success': True, 'message': 'Media deleted'}), 200
    except PermissionError as e:
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        db.session.rollback()
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to delete media',
            'error': 'An internal server error occurred.',
        }), 500
