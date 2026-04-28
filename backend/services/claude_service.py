"""
Claude service — generates the personalised narrative script
that powers the voice-over and D-ID talking head video.
"""
import logging
import os

import anthropic

logger = logging.getLogger("lifetold.claude")

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")

STYLE_DIRECTION = {
    "cinematic": "sweeping, epic, emotionally grand — like the opening of a great film",
    "documentary": "honest, grounded, intimate — like a Wiseman or Maysles documentary",
    "intimate": "tender and quiet — a whispered letter read by firelight",
    "celebratory": "warm, joyful, full of laughter — a toast at the world's best party",
}

TONE_DIRECTION = {
    "warm": "loving and affectionate throughout",
    "reflective": "contemplative and philosophical, finding meaning in the life lived",
    "joyful": "bright and uplifting — celebrating what was given, not mourning what was lost",
    "reverent": "solemn and dignified — treating the life with sacred respect",
}

SYSTEM_PROMPT = """You are a gifted narrative writer for Lifetold, a digital tribute platform.
Your task is to write a spoken-word script for a tribute video — a narrative that will be voiced
by an AI voice model trained on the person's own recordings.

Rules:
- Write in second-person directed at the deceased ("You were…") or third-person ("She was…")
  based on what feels most natural for the relationship described.
- The script should be 250–350 words — the right length for a 2–3 minute tribute video.
- Do not invent facts. Use only what is provided in the interview answers.
- Include at least one specific detail from the interview — a quote, a habit, a memory.
- End on something that feels like a blessing, not a eulogy closing.
- Write in flowing prose — no bullet points, no headers. This will be read aloud.
- The tone should feel personal and human, not corporate or clinical.
- Do not mention Lifetold or technology anywhere in the script."""


async def build_narrative_prompt(
    name: str,
    birth_year: str,
    passed_year: str,
    relationship: str,
    interview: dict[str, str],
    style: str,
    tone: str,
) -> str:
    """Call Claude to generate the tribute narrative script."""

    interview_block = "\n".join(
        f"Q: {k.replace('_', ' ').title()}\nA: {v}"
        for k, v in interview.items()
        if v and v.strip()
    )

    user_prompt = f"""Create a spoken-word tribute script for the following person.

PERSON: {name}
YEARS: {birth_year or "unknown"} – {passed_year or "unknown"}
RELATIONSHIP OF NARRATOR: {relationship}
VISUAL STYLE: {STYLE_DIRECTION.get(style, style)}
EMOTIONAL TONE: {TONE_DIRECTION.get(tone, tone)}

INTERVIEW ANSWERS (use these as your source material — do not invent):
{interview_block}

Write the tribute script now. 250–350 words. Spoken word. No stage directions."""

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set — returning mock narrative")
        return _mock_narrative(name, interview)

    client = anthropic.AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text


def _mock_narrative(name: str, interview: dict) -> str:
    """Fallback for development without an API key."""
    first = name.split()[0] if name else "they"
    opening = interview.get("opening_memory", "")
    wisdom = interview.get("wisdom", "")
    return f"""There are people who move through the world leaving it changed. {name} was one of them.

{opening[:200] + '…' if len(opening) > 200 else opening}

Those who knew {first} understood that the world was a little warmer for their presence in it — not because they were perfect, but because they were entirely, unapologetically themselves.

{first} used to say: {wisdom[:150] if wisdom else 'that the small moments are the ones worth keeping.'}

And they were right.

We carry you forward — not as a memory that fades, but as a voice still speaking in the quiet moments. In the way we pause before we speak. In the stories we'll tell long after this tribute ends.

You were here. You mattered. You still do."""
