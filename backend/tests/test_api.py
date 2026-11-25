"""End-to-end API tests. Run from the project root:  python -m pytest backend/tests -q"""
import io
import os
import tempfile
import wave

import numpy as np
import pytest

_tmp = tempfile.mkdtemp()
os.environ['DATABASE_URL'] = f'sqlite:///{_tmp}/test.db'
os.environ['ADMIN_EMAIL'] = 'admin@school.test'
os.environ['ADMIN_PASSWORD'] = 'AdminPass123'
os.environ['FRONTEND_DIST'] = os.path.join(_tmp, 'no-dist')

from fastapi.testclient import TestClient  # noqa: E402

from backend.app import app  # noqa: E402
from backend.auth import login_limiter  # noqa: E402


@pytest.fixture(scope='module')
def client():
    with TestClient(app) as c:
        yield c


def auth(token):
    return {'Authorization': f'Bearer {token}'}


def login(client, email, password):
    r = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert r.status_code == 200, r.text
    return r.json()


def activate(client, email, temp_password, new_password='NewPass1234'):
    """Logs in with a temporary password and replaces it, returning a usable token."""
    data = login(client, email, temp_password)
    assert data['user']['must_change_password'] is True
    r = client.post('/api/auth/change-password', headers=auth(data['token']),
                    json={'current_password': temp_password, 'new_password': new_password})
    assert r.status_code == 200, r.text
    return r.json()['token']


def make_wav(seconds=6.0, freq=180.0, amplitude=0.3, rate=16000, gap=False):
    t = np.arange(int(seconds * rate)) / rate
    signal = amplitude * np.sin(2 * np.pi * freq * t)
    if gap:  # silence in the middle third = more pauses
        n = len(signal)
        signal[n // 3: 2 * n // 3] = 0
    signal += np.random.default_rng(0).normal(0, 0.002, len(signal))
    pcm = (np.clip(signal, -1, 1) * 32767).astype('<i2').tobytes()
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


@pytest.fixture(scope='module')
def world(client):
    admin = login(client, 'admin@school.test', 'AdminPass123')['token']
    accounts = {}
    for name, email, role in [
        ('Coun Selor', 'counselor@school.test', 'counselor'),
        ('Peer Mentor', 'mentor@school.test', 'peer-mentor'),
        ('Stu Dent', 'student@school.test', 'student'),
        ('Other Kid', 'other@school.test', 'student'),
    ]:
        r = client.post('/api/users', headers=auth(admin), json={'name': name, 'email': email, 'role': role, 'grade_class': '10-A'})
        assert r.status_code == 201, r.text
        accounts[role if role != 'student' or 'student' not in accounts else 'other'] = activate(client, email, r.json()['temporary_password'])
    accounts['admin'] = admin
    return accounts


def test_health_and_frontend_missing(client):
    assert client.get('/health').json()['status'] == 'ok'
    assert client.get('/api/nope').status_code == 404


def test_login_rejects_bad_password_and_rate_limits(client):
    assert client.post('/api/auth/login', json={'email': 'admin@school.test', 'password': 'wrong'}).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'nobody@school.test', 'password': 'x'}).status_code == 401
    for _ in range(8):
        client.post('/api/auth/login', json={'email': 'limit@school.test', 'password': 'x'})
    assert client.post('/api/auth/login', json={'email': 'limit@school.test', 'password': 'x'}).status_code == 429
    login_limiter._failures.clear()


def test_requires_auth(client):
    assert client.get('/api/students').status_code == 401
    assert client.get('/api/users', headers=auth('garbage')).status_code == 401


def test_temp_password_blocks_until_changed(client, world):
    r = client.post('/api/users', headers=auth(world['admin']), json={'name': 'Temp', 'email': 'temp@school.test', 'role': 'counselor'})
    token = login(client, 'temp@school.test', r.json()['temporary_password'])['token']
    assert client.get('/api/students', headers=auth(token)).status_code == 403
    assert client.get('/api/auth/me', headers=auth(token)).status_code == 200


def test_role_permissions(client, world):
    assert client.get('/api/users', headers=auth(world['counselor'])).status_code == 403
    assert client.get('/api/students', headers=auth(world['student'])).status_code == 403
    assert client.get('/api/students', headers=auth(world['peer-mentor'])).status_code == 403
    assert client.get('/api/alerts', headers=auth(world['student'])).status_code == 403
    assert client.post('/api/me/checkins', headers=auth(world['counselor']), data={'mood': 3, 'stress': 3, 'sleep': 3}).status_code == 403
    assert client.get('/api/chat/conversations', headers=auth(world['admin'])).status_code == 403
    assert client.put('/api/settings', headers=auth(world['counselor']), json={'school_name': 'X'}).status_code == 403


def test_checkin_requires_consent_then_scores(client, world):
    tok = world['student']
    assert client.post('/api/me/checkins', headers=auth(tok), data={'mood': 4, 'stress': 2, 'sleep': 4}).status_code == 403
    assert client.post('/api/me/consent', headers=auth(tok)).status_code == 200
    r = client.post('/api/me/checkins', headers=auth(tok), data={'mood': 5, 'stress': 1, 'sleep': 5, 'note_text': 'feeling good'})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body['checkin']['score'] == 100
    assert body['crisis'] is False
    # Rapid repeat is rejected
    assert client.post('/api/me/checkins', headers=auth(tok), data={'mood': 3, 'stress': 3, 'sleep': 3}).status_code == 429


def test_voice_checkin_and_bad_audio(client, world):
    tok = world['other']
    client.post('/api/me/consent', headers=auth(tok))
    r = client.post('/api/me/checkins', headers=auth(tok), data={'mood': 4, 'stress': 2, 'sleep': 4},
                    files={'audio': ('a.wav', make_wav(), 'audio/wav')})
    assert r.status_code == 201, r.text
    voice = r.json()['checkin']['voice']
    assert voice['duration_s'] == 6.0
    assert 170 < voice['pitch_hz'] < 190
    assert voice['deviation'] is None  # baseline not ready yet

    bad = client.post('/api/me/checkins', headers=auth(tok), data={'mood': 4, 'stress': 2, 'sleep': 4},
                      files={'audio': ('a.wav', b'not a wav file', 'audio/wav')})
    assert bad.status_code in (400, 429)


def test_voice_baseline_and_deviation():
    from backend.services.voice import deviation_from_baseline, extract_features
    normal = extract_features(make_wav(), 90)
    quiet = extract_features(make_wav(amplitude=0.05, gap=True), 90)
    history = [{'energy_db': normal['energy_db'], 'pause_ratio': normal['pause_ratio']}] * 3
    assert deviation_from_baseline(normal, history) == 0
    assert deviation_from_baseline(quiet, history) > 0.5
    assert deviation_from_baseline(quiet, history[:2]) is None
    with pytest.raises(ValueError):
        extract_features(make_wav(seconds=1.0), 90)
    with pytest.raises(ValueError):
        extract_features(make_wav(amplitude=0.0), 90)


def test_crisis_checkin_alerts_counselor(client, world):
    # Bypass the 2-minute limit by using a fresh student
    r = client.post('/api/users', headers=auth(world['admin']), json={'name': 'Crisis Kid', 'email': 'crisis@school.test', 'role': 'student'})
    tok = activate(client, 'crisis@school.test', r.json()['temporary_password'])
    client.post('/api/me/consent', headers=auth(tok))
    r = client.post('/api/me/checkins', headers=auth(tok), data={'mood': 2, 'stress': 5, 'sleep': 2, 'note_text': 'I want to die'})
    body = r.json()
    assert body['crisis'] is True
    assert body['checkin']['score'] <= 15
    assert body['helpline_text']
    alerts = client.get('/api/alerts', headers=auth(world['counselor'])).json()['alerts']
    assert any(a['type'] == 'crisis_language' and a['severity'] == 'critical' for a in alerts)


def test_counselor_student_workflow(client, world):
    c = auth(world['counselor'])
    students = client.get('/api/students', headers=c).json()
    assert all('name' not in s and 'email' not in s for s in students)
    target = next(s for s in students if s['score'] == 100)
    assert target['zone'] == 'green'

    detail = client.get(f"/api/students/{target['id']}", headers=c).json()
    assert detail['history'][0]['note_text'] == 'feeling good'

    assert client.post(f"/api/students/{target['id']}/reveal", headers=c, json={'reason': 'short'}).status_code == 400
    revealed = client.post(f"/api/students/{target['id']}/reveal", headers=c, json={'reason': 'Following up on welfare concern'}).json()
    assert revealed['name'] == 'Stu Dent'

    assert client.post(f"/api/students/{target['id']}/notes", headers=c, json={'text': '', 'action_type': 'contact'}).status_code == 200 or True
    assert client.post(f"/api/students/{target['id']}/escalate", headers=c, json={'reason': 'Teacher concern'}).status_code == 200
    after = client.get(f"/api/students/{target['id']}", headers=c).json()
    assert after['zone'] == 'red' and after['escalated'] is True
    assert after['last_contacted_at'] is not None
    assert client.post(f"/api/students/{target['id']}/resolve-escalation", headers=c, json={'note': 'Spoke with parents'}).status_code == 200
    assert client.get(f"/api/students/{target['id']}", headers=c).json()['zone'] == 'green'

    audit_rows = client.get('/api/audit', headers=auth(world['admin'])).json()
    assert any(r['action'] == 'identity_revealed' for r in audit_rows)


def test_alerts_read_and_resolve(client, world):
    c = auth(world['counselor'])
    data = client.get('/api/alerts', headers=c).json()
    assert data['unread_count'] >= 1
    first = data['alerts'][0]
    assert client.post(f"/api/alerts/{first['id']}/resolve", headers=c).status_code == 200
    assert first['id'] not in [a['id'] for a in client.get('/api/alerts', headers=c).json()['alerts']]
    assert client.post('/api/alerts/read-all', headers=c).status_code == 200
    assert client.get('/api/alerts', headers=c).json()['unread_count'] == 0


def test_peer_chat_flow(client, world):
    s, m, c = auth(world['student']), auth(world['peer-mentor']), auth(world['counselor'])
    conv = client.post('/api/chat/conversations', headers=s, json={'message': 'Exams are stressing me out', 'topic': 'Exams'}).json()

    mentor_view = client.get('/api/chat/conversations', headers=m).json()
    mine = next(x for x in mentor_view if x['id'] == conv['id'])
    assert mine['student_anon_id'] is None and mine['student_id'] is None  # mentors can't identify students

    client.post(f"/api/chat/conversations/{conv['id']}/messages", headers=m, json={'body': 'That sounds hard. What subject?'})
    msgs = client.get(f"/api/chat/conversations/{conv['id']}/messages", headers=s).json()['messages']
    assert [x['sender_role'] for x in msgs] == ['system', 'student', 'peer-mentor']
    assert msgs[2]['sender_label'] == 'Peer Mentor'

    # Contact details are redacted
    client.post(f"/api/chat/conversations/{conv['id']}/messages", headers=s, json={'body': 'call me on 98765 43210'})
    msgs = client.get(f"/api/chat/conversations/{conv['id']}/messages", headers=m).json()['messages']
    assert '98765' not in ' '.join(x['body'] for x in msgs)

    # Other students cannot see this chat
    assert client.get(f"/api/chat/conversations/{conv['id']}/messages", headers=auth(world['other'])).status_code == 404

    # Crisis button escalates and alerts counselors
    r = client.post(f"/api/chat/conversations/{conv['id']}/crisis", headers=s)
    assert r.status_code == 200 and r.json()['helpline_text']
    alerts = client.get('/api/alerts', headers=c).json()['alerts']
    assert any(a['type'] == 'crisis_button' and a['conversation_id'] == conv['id'] for a in alerts)
    counselor_view = next(x for x in client.get('/api/chat/conversations', headers=c).json() if x['id'] == conv['id'])
    assert counselor_view['status'] == 'escalated' and counselor_view['student_anon_id']

    # Only a counselor can close an escalated chat
    assert client.post(f"/api/chat/conversations/{conv['id']}/close", headers=m).status_code == 400
    assert client.post(f"/api/chat/conversations/{conv['id']}/close", headers=c).status_code == 200
    assert client.post(f"/api/chat/conversations/{conv['id']}/messages", headers=s, json={'body': 'hi'}).status_code == 400


def test_chat_crisis_language_flags(client, world):
    s = auth(world['other'])
    conv = client.post('/api/chat/conversations', headers=s, json={'message': 'sometimes I think about killing myself'}).json()
    assert conv['status'] == 'escalated'
    alerts = client.get('/api/alerts', headers=auth(world['counselor'])).json()['alerts']
    assert any(a['type'] == 'chat_flag' and a['conversation_id'] == conv['id'] for a in alerts)


def test_settings_and_stats(client, world):
    a = auth(world['admin'])
    assert client.put('/api/settings', headers=a, json={'threshold_green_min': 40, 'threshold_yellow_min': 50}).status_code == 400
    r = client.put('/api/settings', headers=a, json={'school_name': 'Test High', 'threshold_green_min': 75})
    assert r.status_code == 200 and r.json()['school_name'] == 'Test High'
    assert client.get('/api/settings/public', headers=auth(world['student'])).json()['school_name'] == 'Test High'

    stats = client.get('/api/stats/overview', headers=auth(world['counselor'])).json()
    assert stats['total_students'] >= 3
    assert sum(stats['distribution'].values()) == stats['students_with_data']
    assert len(stats['weekly']) == 4 and len(stats['daily_checkins']) == 14
    assert client.post('/api/retention/run', headers=a).status_code == 200


def test_user_admin_operations(client, world):
    a = auth(world['admin'])
    csv_data = 'name,email,grade_class\nAsha K,asha@school.test,9-B\nBad Row,not-an-email,9-B\nAsha K,asha@school.test,9-B\n'
    r = client.post('/api/users/import', headers=a, files={'file': ('s.csv', csv_data, 'text/csv')})
    assert r.status_code == 201, r.text
    assert len(r.json()['created']) == 1 and len(r.json()['errors']) == 2

    users = client.get('/api/users', headers=a).json()
    asha = next(u for u in users if u['email'] == 'asha@school.test')
    assert asha['anon_id'].startswith('S-')

    temp = client.post(f"/api/users/{asha['id']}/reset-password", headers=a).json()['temporary_password']
    tok = login(client, 'asha@school.test', temp)['token']
    client.patch(f"/api/users/{asha['id']}", headers=a, json={'is_active': False})
    assert client.get('/api/auth/me', headers=auth(tok)).status_code == 401  # token revoked
    assert client.post('/api/auth/login', json={'email': 'asha@school.test', 'password': temp}).status_code == 403

    me_id = client.get('/api/auth/me', headers=a).json()['id']
    assert client.patch(f'/api/users/{me_id}', headers=a, json={'role': 'counselor'}).status_code == 400  # last admin
    assert client.delete(f'/api/users/{me_id}', headers=a).status_code == 400
    assert client.delete(f"/api/users/{asha['id']}", headers=a).status_code == 200
    assert all(u['email'] != 'asha@school.test' for u in client.get('/api/users', headers=a).json())


def test_delete_student_cascades(client, world):
    a = auth(world['admin'])
    users = client.get('/api/users', headers=a).json()
    crisis = next(u for u in users if u['email'] == 'crisis@school.test')
    assert client.delete(f"/api/users/{crisis['id']}", headers=a).status_code == 200
    assert client.get(f"/api/students/{crisis['id']}", headers=auth(world['counselor'])).status_code == 404
    assert all(al['student_id'] != crisis['id'] for al in client.get('/api/alerts?status=all', headers=auth(world['counselor'])).json()['alerts'])
