from flask import Flask, render_template, request, jsonify
import os

from transcribe import transcribe_audio
from scoring import predict_score
from face_analysis import analyze_frame
from voice_analysis import analyze_voice

from final_scoring import (
    calculate_voice_score,
    calculate_face_score,
    calculate_overall_score,
    get_category
)

from feedback import generate_feedback


app = Flask(__name__)


# ==========================================
# Audio Folder
# ==========================================

AUDIO_FOLDER = "audio"

os.makedirs(
    AUDIO_FOLDER,
    exist_ok=True
)


# ==========================================
# Home Page
# ==========================================

@app.route("/")
def home():

    return render_template("index.html")


# ==========================================
# Upload Audio
# Whisper + NLP + Voice Analysis
# ==========================================

@app.route(
    "/upload-audio",
    methods=["POST"]
)
def upload_audio():

    audio_file = request.files.get("audio")

    question_number = request.form.get(
        "question_number"
    )

    question = request.form.get("question")


    # ------------------------------------------
    # Validate Request
    # ------------------------------------------

    if audio_file is None:

        return {
            "success": False,
            "message": "No audio received"
        }, 400


    if question_number is None:

        return {
            "success": False,
            "message": "Question number missing"
        }, 400


    if question is None:

        return {
            "success": False,
            "message": "Question missing"
        }, 400


    # ------------------------------------------
    # Save Audio
    # ------------------------------------------

    filename = (
        f"question_{question_number}.webm"
    )

    file_path = os.path.join(
        AUDIO_FOLDER,
        filename
    )

    audio_file.save(file_path)


    # ------------------------------------------
    # Speech To Text
    # ------------------------------------------

    transcript = transcribe_audio(
        file_path
    )


    # ------------------------------------------
    # NLP Score
    # ------------------------------------------

    nlp_score = predict_score(
        question,
        transcript
    )


    # ------------------------------------------
    # Voice Analysis
    # ------------------------------------------

    voice_features = analyze_voice(
        file_path,
        transcript
    )


    # ------------------------------------------
    # Return Answer Evaluation
    # ------------------------------------------

    return {

        "success": True,

        "message":
            f"Question {question_number} "
            "evaluated successfully",

        "transcript":
            transcript,

        "score":
            nlp_score,

        "voice":
            voice_features
    }


# ==========================================
# Face Analysis
# Browser Webcam → MediaPipe
# ==========================================

@app.route(
    "/analyze-face",
    methods=["POST"]
)
def analyze_face():

    image_file = request.files.get("frame")


    if image_file is None:

        return {
            "success": False,
            "message": "No frame received"
        }, 400


    # ------------------------------------------
    # Read Image
    # ------------------------------------------

    image_bytes = image_file.read()


    # ------------------------------------------
    # Analyze Face
    # ------------------------------------------

    result = analyze_frame(
        image_bytes
    )


    # ------------------------------------------
    # No Face Detected
    # ------------------------------------------

    if result is None:

        return {

            "success": True,

            "face_detected": False

        }


    # ------------------------------------------
    # Face Detected
    # ------------------------------------------

    return {

        "success": True,

        "face_detected": True,

        "smile":
            result["smile"],

        "blink":
            result["blink"],

        "brow":
            result["brow"]

    }


# ==========================================
# FINAL INTERVIEW SCORE
# ==========================================

@app.route(
    "/final-score",
    methods=["POST"]
)
def final_score():

    data = request.get_json()


    # ------------------------------------------
    # Validate Request
    # ------------------------------------------

    if not data:

        return {

            "success": False,

            "message":
                "No interview data received"

        }, 400


    answers = data.get(
        "answers",
        []
    )


    if not answers:

        return {

            "success": False,

            "message":
                "No answers received"

        }, 400


    question_results = []


    # ==========================================
    # Process Every Question
    # ==========================================

    for index, answer in enumerate(
        answers
    ):

        # --------------------------------------
        # NLP Score
        # --------------------------------------

        nlp_score = float(
            answer.get(
                "nlp_score",
                0
            )
        )


        # --------------------------------------
        # Voice Data
        # --------------------------------------

        voice = answer.get(
            "voice",
            {}
        )


        # --------------------------------------
        # Face Data
        # --------------------------------------

        face_data = answer.get(
            "face",
            []
        )


        # ======================================
        # Calculate Face Averages
        # ======================================

        face = None


        if face_data:

            total_smile = sum(

                float(
                    item.get(
                        "smile",
                        0
                    )
                )

                for item in face_data

            )


            total_blink = sum(

                float(
                    item.get(
                        "blink",
                        0
                    )
                )

                for item in face_data

            )


            total_brow = sum(

                float(
                    item.get(
                        "brow",
                        0
                    )
                )

                for item in face_data

            )


            frame_count = len(
                face_data
            )


            face = {

                "average_smile":
                    total_smile / frame_count,

                "average_blink":
                    total_blink / frame_count,

                "average_brow":
                    total_brow / frame_count,

                "frames_analyzed":
                    frame_count

            }


        # ======================================
        # Voice Score
        # ======================================

        voice_score = calculate_voice_score(
            voice
        )


        # ======================================
        # Face Score
        # ======================================

        face_score = calculate_face_score(
            face
        )


        # ======================================
        # Overall Question Score
        # ======================================

        overall = calculate_overall_score(

            nlp_score,

            voice_score,

            face_score

        )


        # ======================================
        # Category
        # ======================================

        category = get_category(
            overall
        )


        # ======================================
        # Store Question Result
        # ======================================

        question_results.append({

            "question_number":
                index + 1,

            "nlp_score":
                round(
                    nlp_score,
                    2
                ),

            "voice_score":
                voice_score,

            "face_score":
                face_score,

            "overall_score":
                overall,

            "category":
                category

        })


    # ==========================================
    # Calculate Final Interview Score
    # ==========================================

    overall_scores = [

        result["overall_score"]

        for result in question_results

    ]


    final_score_value = (

        sum(overall_scores)
        /
        len(overall_scores)

    )


    final_score_value = round(
        final_score_value,
        2
    )


    # ==========================================
    # Final Category
    # ==========================================

    final_category = get_category(
        final_score_value
    )


    # ==========================================
    # Generate Feedback
    # ==========================================

    # Calculate average component scores
    # across all questions.

    average_nlp = (

        sum(
            result["nlp_score"]
            for result in question_results
        )
        /
        len(question_results)

    )


    average_voice = (

        sum(
            result["voice_score"]
            for result in question_results
        )
        /
        len(question_results)

    )


    average_face = (

        sum(
            result["face_score"]
            for result in question_results
        )
        /
        len(question_results)

    )


    average_nlp = round(
        average_nlp,
        2
    )


    average_voice = round(
        average_voice,
        2
    )


    average_face = round(
        average_face,
        2
    )


    feedback = generate_feedback(

        average_nlp,

        average_voice,

        average_face,

        final_score_value

    )


    # ==========================================
    # Return Final Report Data
    # ==========================================

    return jsonify({

        "success": True,

        "final_score":
            final_score_value,

        "category":
            final_category,

        "average_nlp":
            average_nlp,

        "average_voice":
            average_voice,

        "average_face":
            average_face,

        "feedback":
            feedback,

        "questions":
            question_results

    })


# ==========================================
# Run Flask
# ==========================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)