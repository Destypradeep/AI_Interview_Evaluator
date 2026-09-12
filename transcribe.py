from faster_whisper import WhisperModel


# Load Whisper model
whisper_model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)


def transcribe_audio(audio_path):

    # Transcribe the recorded audio.
    # The interview is conducted in English,
    # so we explicitly set the language to English.
    segments, info = whisper_model.transcribe(
        audio_path,
        beam_size=5,
        language="en"
    )

    # Combine all detected speech segments
    # into one transcript.
    transcript = " ".join(
        segment.text.strip()
        for segment in segments
    )

    return transcript