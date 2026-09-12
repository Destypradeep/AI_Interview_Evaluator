# ==========================================
# Interview Feedback Generator
# ==========================================


def generate_feedback(
    nlp_score,
    voice_score,
    face_score,
    overall_score
):
    """
    Generate feedback based on the
    interview evaluation scores.
    """

    strengths = []

    improvements = []


    # ==========================================
    # NLP / Answer Quality
    # ==========================================

    if nlp_score >= 85:

        strengths.append(
            "Strong answer quality and relevance."
        )

    elif nlp_score >= 70:

        strengths.append(
            "Good understanding of the interview questions."
        )

    elif nlp_score >= 50:

        improvements.append(
            "Improve the completeness and relevance of your answers."
        )

    else:

        improvements.append(
            "Focus on understanding the question and providing a relevant answer."
        )


    # ==========================================
    # Voice
    # ==========================================

    if voice_score >= 85:

        strengths.append(
            "Good speaking pace and vocal delivery."
        )

    elif voice_score >= 70:

        strengths.append(
            "Generally good speaking delivery."
        )

    else:

        improvements.append(
            "Work on maintaining a steady and comfortable speaking pace."
        )


    # ==========================================
    # Face Signals
    # ==========================================

    if face_score >= 75:

        strengths.append(
            "Facial-expression signals were relatively consistent during the interview."
        )

    elif face_score > 0:

        improvements.append(
            "Try to maintain a natural and consistent facial expression."
        )

    else:

        improvements.append(
            "Insufficient facial data was available for evaluation."
        )


    # ==========================================
    # Overall Score
    # ==========================================

    if overall_score >= 85:

        recommendation = (
            "Excellent performance. Continue practicing "
            "with more technical and scenario-based questions."
        )

    elif overall_score >= 70:

        recommendation = (
            "Good performance. Focus on improving answer "
            "depth, structure and consistency."
        )

    elif overall_score >= 50:

        recommendation = (
            "Average performance. Practice explaining "
            "technical concepts clearly and provide examples."
        )

    else:

        recommendation = (
            "More preparation is recommended. Review the "
            "fundamental concepts and practice answering "
            "interview questions aloud."
        )


    # ==========================================
    # Return Feedback
    # ==========================================

    return {

        "strengths": strengths,

        "improvements": improvements,

        "recommendation": recommendation

    }