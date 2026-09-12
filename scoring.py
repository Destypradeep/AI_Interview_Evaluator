import ast
import re
import joblib
import pandas as pd

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


# Load trained model
model = joblib.load("ml/interview_score_model.pkl")

# Load embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Load dataset to obtain expected answers and keywords
dataset = pd.read_csv("ml/interview_dataset_1000.csv")

# Convert keywords from CSV strings back into Python lists
dataset["keywords"] = dataset["keywords"].apply(ast.literal_eval)

# Create question lookup
question_data = (
    dataset[
        ["question", "expected_answer", "keywords"]
    ]
    .drop_duplicates("question")
    .set_index("question")
)


FEATURE_COLUMNS = [
    "semantic_score",
    "keyword_score",
    "answer_length",
    "length_ratio",
    "matched_keywords",
    "sentence_count",
    "avg_sentence_length",
    "unique_word_ratio"
]


def calculate_features(question, candidate_answer):

    expected_answer = question_data.loc[
        question, "expected_answer"
    ]

    keywords = question_data.loc[
        question, "keywords"
    ]

    # Semantic similarity
    expected_embedding = embedding_model.encode(
        [expected_answer]
    )

    candidate_embedding = embedding_model.encode(
        [candidate_answer]
    )

    semantic_score = cosine_similarity(
        expected_embedding,
        candidate_embedding
    )[0][0]

    # Keyword coverage
    candidate_lower = candidate_answer.lower()

    matched_keywords = sum(
        1
        for keyword in keywords
        if keyword.lower() in candidate_lower
    )

    total_keywords = len(keywords)

    keyword_score = (
        matched_keywords / total_keywords
        if total_keywords > 0
        else 0
    )

    # Answer length
    answer_length = len(
        candidate_answer.split()
    )

    expected_length = len(
        expected_answer.split()
    )

    length_ratio = (
        answer_length / expected_length
        if expected_length > 0
        else 0
    )

    # Sentence features
    sentences = re.split(
        r"[.!?]+",
        candidate_answer
    )

    sentences = [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]

    sentence_count = len(sentences)

    avg_sentence_length = (
        answer_length / sentence_count
        if sentence_count > 0
        else 0
    )

    # Unique word ratio
    words = candidate_answer.lower().split()

    unique_word_ratio = (
        len(set(words)) / len(words)
        if words
        else 0
    )

    features = pd.DataFrame([{
        "semantic_score": semantic_score,
        "keyword_score": keyword_score,
        "answer_length": answer_length,
        "length_ratio": length_ratio,
        "matched_keywords": matched_keywords,
        "sentence_count": sentence_count,
        "avg_sentence_length": avg_sentence_length,
        "unique_word_ratio": unique_word_ratio
    }])

    return features[FEATURE_COLUMNS]


def predict_score(question, candidate_answer):

    features = calculate_features(
        question,
        candidate_answer
    )

    prediction = model.predict(features)[0]

    # Keep score within 0–100
    prediction = max(
        0,
        min(100, prediction)
    )

    return round(prediction, 2)