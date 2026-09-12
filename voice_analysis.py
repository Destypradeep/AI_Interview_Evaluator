import av
import numpy as np


# ==========================================
# Load Audio From WebM
# ==========================================

def load_audio(audio_path):

    container = av.open(audio_path)

    audio_stream = container.streams.audio[0]

    samples = []

    sample_rate = audio_stream.rate


    for frame in container.decode(audio=0):

        array = frame.to_ndarray()


        # Convert stereo → mono
        if array.ndim > 1:

            array = np.mean(
                array,
                axis=0
            )


        samples.extend(
            array.tolist()
        )


    container.close()


    audio = np.array(
        samples,
        dtype=np.float32
    )


    return audio, sample_rate


# ==========================================
# Calculate Voice Features
# ==========================================

def analyze_voice(
    audio_path,
    transcript=""
):

    audio, sample_rate = load_audio(
        audio_path
    )


    # No audio
    if len(audio) == 0:

        return {
            "duration": 0,
            "word_count": 0,
            "speaking_rate": 0,
            "pause_count": 0,
            "average_pause_duration": 0,
            "average_energy": 0
        }


    # ==========================================
    # Duration
    # ==========================================

    duration = (
        len(audio) / sample_rate
    )


    # ==========================================
    # Word Count
    # ==========================================

    words = transcript.split()

    word_count = len(words)


    # ==========================================
    # Speaking Rate
    # ==========================================

    if duration > 0:

        speaking_rate = (
            word_count / duration
        ) * 60

    else:

        speaking_rate = 0


    # ==========================================
    # Audio Energy
    # ==========================================

    average_energy = float(
        np.sqrt(
            np.mean(
                audio ** 2
            )
        )
    )


    # ==========================================
    # Pause Detection
    # ==========================================

    # Divide audio into small chunks
    chunk_size = int(
        sample_rate * 0.1
    )


    pause_threshold = (
        average_energy * 0.10
    )


    pause_chunks = []


    for start in range(
        0,
        len(audio),
        chunk_size
    ):

        chunk = audio[
            start:start + chunk_size
        ]


        if len(chunk) == 0:
            continue


        chunk_energy = np.sqrt(
            np.mean(
                chunk ** 2
            )
        )


        if (
            chunk_energy <
            pause_threshold
        ):

            pause_chunks.append(
                len(chunk) / sample_rate
            )


    # ==========================================
    # Pause Statistics
    # ==========================================

    pause_count = len(
        pause_chunks
    )


    if pause_chunks:

        average_pause_duration = (
            sum(pause_chunks) /
            len(pause_chunks)
        )

    else:

        average_pause_duration = 0


    # ==========================================
    # Return Features
    # ==========================================

    return {

        "duration": round(
            duration,
            2
        ),

        "word_count": word_count,

        "speaking_rate": round(
            speaking_rate,
            2
        ),

        "pause_count": pause_count,

        "average_pause_duration": round(
            average_pause_duration,
            3
        ),

        "average_energy": round(
            average_energy,
            4
        )
    }