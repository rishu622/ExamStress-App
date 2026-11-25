"""Keyword screening of free text written by students.

This is a deliberately simple, transparent safety net: it errs on the side of
flagging text for a human to look at. It is not a diagnosis and must never be
used to clear a student as "fine".
"""
import re

# Any of these routes the text straight to counselors as a critical alert.
CRISIS_PATTERNS = [
    r'\bsuicid\w*', r'\bkill(ing)?\s+my\s*self\b', r'\bend\s+(my|it)\s+(life|all)\b', r'\bwant\s+to\s+die\b',
    r'\bwanna\s+die\b', r'\bself[\s-]?harm\w*', r'\bhurt(ing)?\s+my\s*self\b', r'\bcut(ting)?\s+my\s*self\b',
    r'\bno\s+reason\s+to\s+live\b', r'\bbetter\s+off\s+dead\b', r'\bdon\'?t\s+want\s+to\s+(live|be\s+alive|exist)\b',
    r'\bnot\s+worth\s+living\b', r'\bend\s+my\s+life\b', r'\boverdose\b',
]

CUE_GROUPS: dict[str, list[str]] = {
    'hopelessness': [r'\bhopeless\w*', r'\bworthless\b', r'\buseless\b', r'\bgive\s+up\b', r'\bpointless\b', r'\bno\s+point\b'],
    'anxiety': [r'\banxious\b', r'\banxiety\b', r'\bpanic\w*', r'\bscared\b', r'\bnervous\b', r'\bcan\'?t\s+breathe\b', r'\bworr(y|ied|ying)\b'],
    'overwhelm': [r'\boverwhelm\w*', r'\bburn(ed|t)?\s*out\b', r'\bexhausted\b', r'\bcan\'?t\s+cope\b', r'\btoo\s+much\b', r'\bpressure\b'],
    'low_mood': [r'\bdepress\w*', r'\bsad\b', r'\bcry(ing)?\b', r'\blonely\b', r'\balone\b', r'\bempty\b', r'\bmiserable\b'],
    'sleep': [r'\bcan\'?t\s+sleep\b', r'\binsomnia\b', r'\bno\s+sleep\b', r'\bnot\s+sleeping\b'],
    'safety': [r'\bbull(y|ied|ying)\b', r'\babus\w*', r'\bhit(s|ting)?\s+me\b', r'\bunsafe\b', r'\bthreat\w*'],
}

PHONE_RE = re.compile(r'(?<!\d)(\+?\d[\d\s-]{8,}\d)(?!\d)')
EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
HANDLE_RE = re.compile(r'(?i)\b(insta(gram)?|snap(chat)?|whats\s?app|telegram)\b\s*[:@]?\s*@?[\w.]{3,}')


def detect_crisis(text: str) -> bool:
    lowered = text.lower()
    return any(re.search(pattern, lowered) for pattern in CRISIS_PATTERNS)


def detect_cues(text: str) -> list[str]:
    lowered = text.lower()
    return [group for group, patterns in CUE_GROUPS.items() if any(re.search(p, lowered) for p in patterns)]


def redact_contact_details(text: str) -> tuple[str, bool]:
    """Removes phone numbers, e-mails and social handles so anonymous chats stay anonymous."""
    redacted = EMAIL_RE.sub('[contact removed]', text)
    redacted = HANDLE_RE.sub('[contact removed]', redacted)
    redacted = PHONE_RE.sub('[contact removed]', redacted)
    return redacted, redacted != text
