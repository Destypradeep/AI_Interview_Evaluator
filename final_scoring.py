# ==========================================
# Final Interview Scoring
# ==========================================


def calculate_voice_score(voice):
    """
    Convert voice features into a 0-100 score.

    This is a presentation-signal score,
    not a direct measure of confidence
    or personality.
    """

    speaking_rate = voice.get(
        "speaking_rate",
        0
    )

    pause_count = voice.get(
        "pause_count",
        0
    )

    duration = voice.get(
        "duration",
        0
    )


    # ------------------------------------------
    # Speaking Rate Score
    # ------------------------------------------

    # A moderate speaking rate receives
    # a higher score.
    #
    # Target range:
    # approximately 100-150 words/minute

    if speaking_rate == 0:

        rate_score = 0

    elif 100 <= speaking_rate <= 150:

        rate_score = 100

    elif speaking_rate < 100:

        rate_score = max(
            0,
            100 - (100 - speaking_rate) * 2
        )

    else:

        rate_score = max(
            0,
            100 - (speaking_rate - 150) * 2
        )


    # ------------------------------------------
    # Pause Score
    # ------------------------------------------

    if duration > 0:

        pause_rate = (
            pause_count / duration
        )

    else:

        pause_rate = 0


    # Lower excessive pause frequency
    # receives a higher score.

    if pause_rate <= 1.0:

        pause_score = 100

    elif pause_rate <= 2.0:

        pause_score = 80

    elif pause_rate <= 3.0:

        pause_score = 60

    elif pause_rate <= 4.0:

        pause_score = 40

    else:

        pause_score = 20


    # ------------------------------------------
    # Combine Voice Features
    # ------------------------------------------

    voice_score = (
        rate_score * 0.60
        +
        pause_score * 0.40
    )


    return round(
        max(
            0,
            min(
                100,
                voice_score
            )
        ),
        2
    )


# ==========================================
# Face Signal Score
# ==========================================

def calculate_face_score(face):
    """
    Convert facial-expression signals into
    an experimental presentation score.

    This must NOT be interpreted as a
    measurement of confidence, honesty,
    personality, or hiring suitability.
    """

    if not face:

        return 0


    smile = face.get(
        "average_smile",
        0
    )

    blink = face.get(
        "average_blink",
        0
    )

    brow = face.get(
        "average_brow",
        0
    )


    frames = face.get(
        "frames_analyzed",
        0
    )


    if frames == 0:

        return 0


    # ------------------------------------------
    # Smile Signal
    # ------------------------------------------

    smile_score = min(
        smile * 200,
        100
    )


    # ------------------------------------------
    # Blink Signal
    # ------------------------------------------

    # Moderate blink activity is treated
    # as a neutral presentation signal.

    if 0.03 <= blink <= 0.20:

        blink_score = 100

    elif blink < 0.03:

        blink_score = max(
            0,
            blink / 0.03 * 100
        )

    else:

        blink_score = max(
            0,
            100 - (blink - 0.20) * 200
        )


    # ------------------------------------------
    # Brow Signal
    # ------------------------------------------

    brow_score = min(
        brow * 200,
        100
    )


    # ------------------------------------------
    # Combine Face Signals
    # ------------------------------------------

    face_score = (
        smile_score * 0.40
        +
        blink_score * 0.30
        +
        brow_score * 0.30
    )


    return round(
        max(
            0,
            min(
                100,
                face_score
            )
        ),
        2
    )


# ==========================================
# Overall Score
# ==========================================

def calculate_overall_score(
    nlp_score,
    voice_score,
    face_score
):

    overall_score = (

        nlp_score * 0.60

        +

        voice_score * 0.25

        +

        face_score * 0.15

    )


    return round(
        max(
            0,
            min(
                100,
                overall_score
            )
        ),
        2
    )


# ==========================================
# Performance Category
# ==========================================

def get_category(score):

    if score >= 85:

        return "Excellent"

    elif score >= 70:

        return "Good"

    elif score >= 50:

        return "Average"

    else:

        return "Needs Improvement"