from flask import current_app
from app import db


def get_read_session():
    if current_app.config.get('SQLALCHEMY_BINDS', {}).get('read_replica'):
        return db.session.using_bind('read_replica')
    return db.session


def get_read_model_query(model):
    read_session = get_read_session()
    return read_session.query(model)
