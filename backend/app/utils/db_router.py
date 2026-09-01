from flask import current_app
from app import db


def get_read_session():
    if current_app.config.get('SQLALCHEMY_BINDS', {}).get('read_replica'):
        return db.session.using_bind('read_replica')
    return db.session


def get_read_model_query(model):
    if current_app.config.get('SQLALCHEMY_BINDS', {}).get('read_replica'):
        return db.session.query(model).using_bind('read_replica')
    return model.query
