import cv2
import mediapipe as mp
import numpy as np


# ==========================================
# MediaPipe Face Landmarker
# ==========================================

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
RunningMode = mp.tasks.vision.RunningMode


MODEL_PATH = "face_landmarker.task"


options = FaceLandmarkerOptions(
    base_options=BaseOptions(
        model_asset_path=MODEL_PATH
    ),
    running_mode=RunningMode.IMAGE,
    num_faces=1,
    output_face_blendshapes=True
)


landmarker = FaceLandmarker.create_from_options(
    options
)


# ==========================================
# Analyze One Image
# ==========================================

def analyze_frame(image_bytes):

    # Convert uploaded bytes into an image
    image_array = np.frombuffer(
        image_bytes,
        dtype=np.uint8
    )

    frame = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )


    if frame is None:

        return None


    # OpenCV BGR → RGB
    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )


    # Create MediaPipe image
    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )


    # Detect face
    result = landmarker.detect(mp_image)


    # No face found
    if not result.face_landmarks:

        return None


    # No blendshape data
    if not result.face_blendshapes:

        return None


    # Convert blendshapes into dictionary
    signals = {
        item.category_name: item.score
        for item in result.face_blendshapes[0]
    }


    # ==========================================
    # Smile Signal
    # ==========================================

    smile_left = signals.get(
        "mouthSmileLeft",
        0
    )

    smile_right = signals.get(
        "mouthSmileRight",
        0
    )

    smile = (
        smile_left + smile_right
    ) / 2


    # ==========================================
    # Blink Signal
    # ==========================================

    blink_left = signals.get(
        "eyeBlinkLeft",
        0
    )

    blink_right = signals.get(
        "eyeBlinkRight",
        0
    )

    blink = (
        blink_left + blink_right
    ) / 2


    # ==========================================
    # Brow Signal
    # ==========================================

    brow_left = signals.get(
        "browOuterUpLeft",
        0
    )

    brow_right = signals.get(
        "browOuterUpRight",
        0
    )

    brow = (
        brow_left + brow_right
    ) / 2


    return {
        "smile": smile,
        "blink": blink,
        "brow": brow
    }


# ==========================================
# Analyze Multiple Frames
# ==========================================

def analyze_frames(frames):

    results = []


    for frame in frames:

        result = analyze_frame(frame)

        if result is not None:

            results.append(result)


    # No usable face frames
    if not results:

        return {
            "face_detected": False,
            "frames_analyzed": 0,
            "average_smile": 0,
            "average_blink": 0,
            "average_brow": 0
        }


    # Calculate averages
    average_smile = sum(
        item["smile"]
        for item in results
    ) / len(results)


    average_blink = sum(
        item["blink"]
        for item in results
    ) / len(results)


    average_brow = sum(
        item["brow"]
        for item in results
    ) / len(results)


    return {
        "face_detected": True,
        "frames_analyzed": len(results),
        "average_smile": round(
            average_smile,
            3
        ),
        "average_blink": round(
            average_blink,
            3
        ),
        "average_brow": round(
            average_brow,
            3
        )
    }