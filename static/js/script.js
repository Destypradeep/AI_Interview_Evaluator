let candidateName = "";
let selectedRole = "";

let currentQuestionIndex = 0;
let questions = [];

let mediaRecorder = null;
let audioChunks = [];

let videoStream = null;
let faceInterval = null;
let pendingFaceRequests = [];

let currentFaceData = [];

let answerScores = [];
let voiceScores = [];
let faceScores = [];
let answerResults = [];

let isProcessingAnswer = false;
let isFinalizing = false;


// ======================================================
// QUESTION BANK
// ======================================================

const roleQuestions = {

    python: [
        "What is Python?",
        "What is a list in Python?",
        "What is a Python function?",
        "What is a dictionary in Python?",
        "What is a tuple in Python?"
    ],

    ml: [
        "What is machine learning?",
        "What is a machine learning model?",
        "What is accuracy in machine learning?",
        "What is overfitting in machine learning?",
        "What is supervised learning?"
    ],

    data: [
        "What is Pandas?",
        "What is a DataFrame in Pandas?",
        "What is NumPy?",
        "What is a histogram?",
        "What is data analysis?"
    ],

    sql: [
        "What is a SQL query?",
        "What is a JOIN in SQL?",
        "What is a SQL GROUP BY clause?",
        "What is a foreign key in SQL?",
        "What is a SQL primary key?"
    ],

    software: [
        "What is abstraction in OOP?",
        "What is encapsulation in OOP?",
        "What is inheritance in OOP?",
        "What is method overriding in OOP?",
        "What is polymorphism in OOP?"
    ]
};


// ======================================================
// START INTERVIEW
// ======================================================

async function startInterview() {

    candidateName =
        document.getElementById("name").value.trim();

    selectedRole =
        document.getElementById("role").value;

    if (candidateName === "") {

        alert("Please enter your name.");

        document.getElementById(
            "name"
        ).focus();

        return;
    }

    questions =
        roleQuestions[selectedRole];

    if (!questions ||
        questions.length === 0) {

        alert(
            "Please select a valid interview role."
        );

        return;
    }

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        alert(
            "Your browser does not support camera " +
            "and microphone access."
        );

        return;
    }

    const cameraStarted =
        await startCamera();

    if (!cameraStarted) {
        return;
    }

    currentQuestionIndex = 0;

    answerScores = [];
    voiceScores = [];
    faceScores = [];
    answerResults = [];

    currentFaceData = [];
    pendingFaceRequests = [];

    isProcessingAnswer = false;
    isFinalizing = false;

    document.getElementById(
        "candidate-section"
    ).style.display = "none";

    document.getElementById(
        "interview-section"
    ).style.display = "block";

    showQuestion();
}


// ======================================================
// CAMERA
// ======================================================

async function startCamera() {

    try {

        videoStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

        const video =
            document.getElementById("video");

        video.srcObject =
            videoStream;

        try {

            await video.play();

        } catch (playError) {

            console.warn(
                "Video play warning:",
                playError
            );
        }

        document.getElementById(
            "camera-status"
        ).textContent =
            "Camera: Active";

        return true;

    } catch (error) {

        console.error(
            "Camera error:",
            error
        );

        let message =
            "Unable to access camera and microphone.";

        if (error.name === "NotAllowedError") {

            message =
                "Camera/microphone permission was denied. " +
                "Please allow access in your browser " +
                "and try again.";

        } else if (error.name === "NotFoundError") {

            message =
                "Camera or microphone was not found. " +
                "Please check your device.";

        } else if (error.name === "NotReadableError") {

            message =
                "Camera or microphone is already being " +
                "used by another application.";
        }

        document.getElementById(
            "camera-status"
        ).textContent =
            message;

        alert(message);

        return false;
    }
}


// ======================================================
// SHOW QUESTION
// ======================================================

function showQuestion() {

    document.getElementById(
        "question-number"
    ).textContent =
        `Question ${currentQuestionIndex + 1} of ${questions.length}`;

    document.getElementById(
        "question"
    ).textContent =
        questions[currentQuestionIndex];

    document.getElementById(
        "recording-status"
    ).textContent =
        "Status: Not Recording";


    // --------------------------------------------------
    // Answer buttons
    // --------------------------------------------------

    document.getElementById(
        "answer-button"
    ).style.display =
        "inline-block";

    document.getElementById(
        "answer-button"
    ).disabled =
        false;

    document.getElementById(
        "stop-button"
    ).style.display =
        "none";

    document.getElementById(
        "stop-button"
    ).disabled =
        false;


    // --------------------------------------------------
    // Final question button
    // --------------------------------------------------

    const nextButton =
        document.getElementById(
            "next-button"
        );

    if (
        currentQuestionIndex ===
        questions.length - 1
    ) {

        nextButton.textContent =
            "✅ Finish Interview";

    } else {

        nextButton.textContent =
            "➡️ Next Question";
    }

    nextButton.style.display =
        "inline-block";

    nextButton.disabled =
        false;


    // --------------------------------------------------
    // Hide previous evaluation
    // --------------------------------------------------

    document.getElementById(
        "evaluation-result"
    ).style.display =
        "none";


    // --------------------------------------------------
    // Reset loading
    // --------------------------------------------------

    const loading =
        document.getElementById(
            "evaluation-loading"
        );

    if (loading) {

        loading.style.display =
            "none";
    }


    // --------------------------------------------------
    // Reset audio player
    // --------------------------------------------------

    const audioPlayer =
        document.getElementById(
            "audio-player"
        );

    audioPlayer.style.display =
        "none";

    audioPlayer.src =
        "";


    // --------------------------------------------------
    // Reset face data
    // --------------------------------------------------

    currentFaceData = [];
    pendingFaceRequests = [];

    isProcessingAnswer = false;

    startFaceAnalysis();
}


// ======================================================
// START RECORDING
// ======================================================

function startRecording() {

    if (
        isProcessingAnswer ||
        isFinalizing
    ) {
        return;
    }

    if (!videoStream) {

        alert(
            "Camera and microphone are not available."
        );

        return;
    }

    if (!window.MediaRecorder) {

        alert(
            "Your browser does not support audio recording."
        );

        return;
    }

    const audioTracks =
        videoStream.getAudioTracks();

    if (!audioTracks.length) {

        alert(
            "Microphone is not available."
        );

        return;
    }

    audioChunks = [];
    currentFaceData = [];
    pendingFaceRequests = [];


    // Create audio-only stream

    const audioStream =
        new MediaStream(
            videoStream.getAudioTracks()
        );


    try {

        mediaRecorder =
            new MediaRecorder(
                audioStream
            );

    } catch (error) {

        console.error(
            "MediaRecorder error:",
            error
        );

        alert(
            "Unable to start audio recording."
        );

        return;
    }


    mediaRecorder.ondataavailable =
        function (event) {

            if (
                event.data &&
                event.data.size > 0
            ) {

                audioChunks.push(
                    event.data
                );
            }
        };


    mediaRecorder.onstop =
        async function () {

            await finishRecording();
        };


    mediaRecorder.start();


    document.getElementById(
        "answer-button"
    ).style.display =
        "none";


    document.getElementById(
        "stop-button"
    ).style.display =
        "inline-block";


    document.getElementById(
        "stop-button"
    ).disabled =
        false;


    document.getElementById(
        "next-button"
    ).disabled =
        true;


    document.getElementById(
        "recording-status"
    ).textContent =
        "Status: Recording...";


    startFaceAnalysis();
}


// ======================================================
// STOP RECORDING
// ======================================================

function stopRecording() {

    if (
        mediaRecorder &&
        mediaRecorder.state === "recording"
    ) {

        isProcessingAnswer = true;

        mediaRecorder.stop();

        stopFaceAnalysis();


        document.getElementById(
            "stop-button"
        ).style.display =
            "none";


        document.getElementById(
            "stop-button"
        ).disabled =
            true;


        document.getElementById(
            "next-button"
        ).disabled =
            true;


        const loading =
            document.getElementById(
                "evaluation-loading"
            );

        if (loading) {

            loading.style.display =
                "block";
        }


        document.getElementById(
            "recording-status"
        ).textContent =
            "Status: Processing answer...";
    }
}


// ======================================================
// FACE ANALYSIS
// ======================================================

function startFaceAnalysis() {

    stopFaceAnalysis();

    faceInterval =
        setInterval(
            captureFaceFrame,
            1000
        );
}


function stopFaceAnalysis() {

    if (faceInterval) {

        clearInterval(
            faceInterval
        );

        faceInterval = null;
    }
}


async function captureFaceFrame() {

    const video =
        document.getElementById("video");


    if (
        !video ||
        video.readyState < 2
    ) {

        return;
    }


    if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
    ) {

        return;
    }


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext("2d");


    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    const blob =
        await new Promise(
            resolve =>
                canvas.toBlob(
                    resolve,
                    "image/jpeg"
                )
        );


    if (!blob) {
        return;
    }


    const formData =
        new FormData();


    formData.append(
        "frame",
        blob,
        "frame.jpg"
    );


    const request =
        fetch(
            "/analyze-face",
            {
                method: "POST",
                body: formData
            }
        )
        .then(
            async response => {

                if (!response.ok) {

                    throw new Error(
                        `Face analysis error: ${response.status}`
                    );
                }

                return response.json();
            }
        )
        .then(
            data => {

                if (
                    data.success &&
                    data.face_detected
                ) {

                    currentFaceData.push({

                        smile:
                            Number(
                                data.smile || 0
                            ),

                        blink:
                            Number(
                                data.blink || 0
                            ),

                        brow:
                            Number(
                                data.brow || 0
                            )
                    });
                }
            }
        )
        .catch(
            error => {

                console.error(
                    "Face analysis error:",
                    error
                );
            }
        );


    pendingFaceRequests.push(
        request
    );


    await request;
}
// ======================================================
// FINISH RECORDING
// ======================================================

async function finishRecording() {

    const loading =
        document.getElementById(
            "evaluation-loading"
        );

    if (loading) {

        loading.style.display =
            "block";
    }


    try {

        // --------------------------------------------------
        // Wait for all face-analysis requests
        // --------------------------------------------------

        await Promise.all(
            pendingFaceRequests
        );


        // --------------------------------------------------
        // Create audio blob
        // --------------------------------------------------

        const audioBlob =
            new Blob(
                audioChunks,
                {
                    type: "audio/webm"
                }
            );


        if (audioBlob.size === 0) {

            throw new Error(
                "No audio was recorded."
            );
        }


        // --------------------------------------------------
        // Create audio player URL
        // --------------------------------------------------

        const audioURL =
            URL.createObjectURL(
                audioBlob
            );


        const audioPlayer =
            document.getElementById(
                "audio-player"
            );


        audioPlayer.src =
            audioURL;


        audioPlayer.style.display =
            "block";


        // --------------------------------------------------
        // Prepare upload
        // --------------------------------------------------

        const formData =
            new FormData();


        formData.append(
            "audio",
            audioBlob,
            "answer.webm"
        );


        formData.append(
            "question_number",
            currentQuestionIndex + 1
        );


        formData.append(
            "question",
            questions[currentQuestionIndex]
        );


        // --------------------------------------------------
        // Send audio to Flask
        // --------------------------------------------------

        const response =
            await fetch(
                "/upload-audio",
                {
                    method: "POST",
                    body: formData
                }
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );
        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Evaluation failed."
            );
        }


        // --------------------------------------------------
        // Display evaluation
        // --------------------------------------------------

        displayEvaluation(
            result
        );


        // --------------------------------------------------
        // Save NLP score
        // --------------------------------------------------

        answerScores[
            currentQuestionIndex
        ] =
            result.score;


        // --------------------------------------------------
        // Save voice features
        // --------------------------------------------------

        voiceScores[
            currentQuestionIndex
        ] =
            result.voice;


        // --------------------------------------------------
        // Save face data
        // --------------------------------------------------

        faceScores[
            currentQuestionIndex
        ] =
            currentFaceData;


        // --------------------------------------------------
        // Save complete result
        // --------------------------------------------------

        answerResults[
            currentQuestionIndex
        ] = {

            nlp_score:
                result.score,

            voice:
                result.voice,

            face:
                currentFaceData
        };


        document.getElementById(
            "recording-status"
        ).textContent =
            "Status: Answer Evaluated";


        // --------------------------------------------------
        // Restore controls
        // --------------------------------------------------

        isProcessingAnswer =
            false;


        const answerButton =
            document.getElementById(
                "answer-button"
            );


        answerButton.style.display =
            "inline-block";


        answerButton.disabled =
            false;


        const stopButton =
            document.getElementById(
                "stop-button"
            );


        stopButton.style.display =
            "none";


        stopButton.disabled =
            false;


        const nextButton =
            document.getElementById(
                "next-button"
            );


        nextButton.disabled =
            false;


        if (loading) {

            loading.style.display =
                "none";
        }


    } catch (error) {

        console.error(
            "Recording processing error:",
            error
        );


        isProcessingAnswer =
            false;


        if (loading) {

            loading.style.display =
                "none";
        }


        // Restore answer button
        const answerButton =
            document.getElementById(
                "answer-button"
            );


        answerButton.style.display =
            "inline-block";


        answerButton.disabled =
            false;


        // Restore stop button
        const stopButton =
            document.getElementById(
                "stop-button"
            );


        stopButton.style.display =
            "none";


        stopButton.disabled =
            false;


        // Keep Next disabled because
        // this answer was not completed
        const nextButton =
            document.getElementById(
                "next-button"
            );


        nextButton.disabled =
            true;


        document.getElementById(
            "recording-status"
        ).textContent =
            "Status: Evaluation failed";


        alert(
            error.message ||
            "There was a problem evaluating your answer."
        );
    }
}


// ======================================================
// DISPLAY QUESTION EVALUATION
// ======================================================

function displayEvaluation(result) {

    document.getElementById(
        "evaluation-result"
    ).style.display =
        "block";


    // --------------------------------------------------
    // Transcript
    // --------------------------------------------------

    document.getElementById(
        "transcript"
    ).textContent =
        result.transcript ||
        "No transcript";


    // --------------------------------------------------
    // NLP score
    // --------------------------------------------------

    document.getElementById(
        "answer-score"
    ).textContent =
        result.score ?? 0;


    // --------------------------------------------------
    // Voice analysis
    // --------------------------------------------------

    const voice =
        result.voice || {};


    document.getElementById(
        "voice-duration"
    ).textContent =
        voice.duration ?? 0;


    document.getElementById(
        "speaking-rate"
    ).textContent =
        voice.speaking_rate ?? 0;


    document.getElementById(
        "pause-count"
    ).textContent =
        voice.pause_count ?? 0;


    document.getElementById(
        "average-pause"
    ).textContent =
        voice.average_pause_duration ?? 0;


    document.getElementById(
        "average-energy"
    ).textContent =
        voice.average_energy ?? 0;


    // --------------------------------------------------
    // Face analysis
    // --------------------------------------------------

    if (
        currentFaceData.length > 0
    ) {

        const totalSmile =
            currentFaceData.reduce(
                (sum, item) =>
                    sum + Number(item.smile || 0),
                0
            );


        const totalBlink =
            currentFaceData.reduce(
                (sum, item) =>
                    sum + Number(item.blink || 0),
                0
            );


        const totalBrow =
            currentFaceData.reduce(
                (sum, item) =>
                    sum + Number(item.brow || 0),
                0
            );


        const count =
            currentFaceData.length;


        document.getElementById(
            "face-smile"
        ).textContent =
            (
                totalSmile /
                count
            ).toFixed(3);


        document.getElementById(
            "face-blink"
        ).textContent =
            (
                totalBlink /
                count
            ).toFixed(3);


        document.getElementById(
            "face-brow"
        ).textContent =
            (
                totalBrow /
                count
            ).toFixed(3);


        document.getElementById(
            "face-frames"
        ).textContent =
            count;


    } else {

        document.getElementById(
            "face-smile"
        ).textContent =
            "0";


        document.getElementById(
            "face-blink"
        ).textContent =
            "0";


        document.getElementById(
            "face-brow"
        ).textContent =
            "0";


        document.getElementById(
            "face-frames"
        ).textContent =
            "0";
    }
}


// ======================================================
// NEXT QUESTION / FINISH INTERVIEW
// ======================================================

async function nextQuestion() {

    // Don't allow action while processing
    if (
        isProcessingAnswer ||
        isFinalizing
    ) {

        return;
    }


    // Don't allow moving while recording
    if (
        mediaRecorder &&
        mediaRecorder.state === "recording"
    ) {

        alert(
            "Please stop recording before continuing."
        );

        return;
    }


    // Make sure answer is completed
    if (
        answerResults[
            currentQuestionIndex
        ] === undefined
    ) {

        alert(
            "Please record and complete your answer first."
        );

        return;
    }


    // --------------------------------------------------
    // More questions remaining
    // --------------------------------------------------

    if (
        currentQuestionIndex <
        questions.length - 1
    ) {

        currentQuestionIndex++;

        showQuestion();
    }


    // --------------------------------------------------
    // Final question completed
    // --------------------------------------------------

    else {

        await submitFinalScore();
    }
}


// ======================================================
// FINAL SCORE SUBMISSION
// ======================================================

async function submitFinalScore() {

    if (isFinalizing) {

        return;
    }


    if (isProcessingAnswer) {

        alert(
            "Please wait while your answer is being evaluated."
        );

        return;
    }


    if (
        answerResults.length !==
        questions.length
    ) {

        alert(
            "Please complete all interview questions first."
        );

        return;
    }


    isFinalizing =
        true;


    const nextButton =
        document.getElementById(
            "next-button"
        );


    nextButton.disabled =
        true;


    nextButton.textContent =
        "Generating Final Report...";


    // --------------------------------------------------
    // Loading indicator
    // --------------------------------------------------

    const loading =
        document.getElementById(
            "evaluation-loading"
        );


    if (loading) {

        loading.style.display =
            "block";

        loading.innerHTML = `
            <div class="spinner"></div>

            <strong>
                🤖 Generating your final report...
            </strong>

            <p>
                Please wait while all your
                interview results are combined.
            </p>
        `;
    }


    try {

        const response =
            await fetch(
                "/final-score",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            candidate_name:
                                candidateName,

                            role:
                                selectedRole,

                            answers:
                                answerResults
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );
        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Unable to generate final report."
            );
        }


        if (loading) {

            loading.style.display =
                "none";
        }


        displayFinalReport(
            result
        );


    } catch (error) {

        console.error(
            "Final report error:",
            error
        );


        isFinalizing =
            false;


        if (loading) {

            loading.style.display =
                "none";
        }


        nextButton.disabled =
            false;


        nextButton.textContent =
            "✅ Finish Interview";


        alert(
            error.message ||
            "Unable to generate final report."
        );
    }
}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}
// ======================================================
// FINAL REPORT
// ======================================================

function displayFinalReport(result) {

    // --------------------------------------------------
    // Stop face analysis
    // --------------------------------------------------

    stopFaceAnalysis();


    // --------------------------------------------------
    // Stop camera and microphone
    // --------------------------------------------------

    if (videoStream) {

        videoStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        videoStream = null;
    }


    // ==================================================
    // FEEDBACK
    // ==================================================

    const feedback =
        result.feedback || {};


    const strengths =
        feedback.strengths || [];


    const improvements =
        feedback.improvements || [];


    const recommendation =
        feedback.recommendation ||
        "Continue practicing interview questions.";


    // ==================================================
    // ROLE NAME
    // ==================================================

    let roleDisplayName =
        selectedRole;


    const roleElement =
        document.getElementById(
            "role"
        );


    if (
        roleElement &&
        roleElement.selectedOptions &&
        roleElement.selectedOptions.length > 0
    ) {

        roleDisplayName =
            roleElement
                .selectedOptions[0]
                .textContent;
    }


    // ==================================================
    // SCORE VALUES
    // ==================================================

    const finalScore =
        Number(
            result.final_score || 0
        );


    const nlpScore =
        Number(
            result.average_nlp || 0
        );


    const voiceScore =
        Number(
            result.average_voice || 0
        );


    const faceScore =
        Number(
            result.average_face || 0
        );


    // ==================================================
    // SCORE BAR FUNCTION
    // ==================================================

    function scoreBar(score) {

        return `

            <div class="score-bar">

                <div
                    class="score-bar-fill"
                    style="width: ${score}%"
                ></div>

            </div>

        `;
    }


    // ==================================================
    // STRENGTHS
    // ==================================================

    const strengthsHTML =
        strengths.length > 0

            ? strengths
                .map(
                    item =>
                        `<li>${escapeHtml(item)}</li>`
                )
                .join("")

            : "<li>No specific strengths identified.</li>";


    // ==================================================
    // IMPROVEMENTS
    // ==================================================

    const improvementsHTML =
        improvements.length > 0

            ? improvements
                .map(
                    item =>
                        `<li>${escapeHtml(item)}</li>`
                )
                .join("")

            : "<li>No major improvement areas identified.</li>";


    // ==================================================
    // QUESTION TABLE
    // ==================================================

    const questionRows =
        (result.questions || [])
            .map(
                item => `

                    <tr>

                        <td>
                            <strong>
                                Q${item.question_number}
                            </strong>
                        </td>

                        <td>
                            ${item.nlp_score}
                        </td>

                        <td>
                            ${item.voice_score}
                        </td>

                        <td>
                            ${item.face_score}
                        </td>

                        <td>
                            <strong>
                                ${item.overall_score}
                            </strong>
                        </td>

                        <td>
                            <span class="category-badge">
                                ${escapeHtml(
                                    item.category
                                )}
                            </span>
                        </td>

                    </tr>

                `
            )
            .join("");


    // ==================================================
    // FINAL REPORT HTML
    // ==================================================

    const reportHTML = `

        <div id="final-report">


            <!-- =========================================
                 HEADER
            ========================================== -->

            <div class="report-header">

                <div>

                    <p class="report-label">
                        AI-POWERED ASSESSMENT
                    </p>

                    <h1>
                        📊 Final Interview Report
                    </h1>

                    <p class="report-subtitle">

                        Interview performance analysis
                        across answer quality, voice and
                        facial-expression signals.

                    </p>

                </div>

            </div>


            <!-- =========================================
                 CANDIDATE CARD
            ========================================== -->

            <div class="candidate-card">

                <div class="candidate-item">

                    <span class="candidate-label">
                        Candidate
                    </span>

                    <strong>
                        ${escapeHtml(candidateName)}
                    </strong>

                </div>


                <div class="candidate-item">

                    <span class="candidate-label">
                        Interview Role
                    </span>

                    <strong>
                        ${escapeHtml(roleDisplayName)}
                    </strong>

                </div>


                <div class="candidate-item">

                    <span class="candidate-label">
                        Questions Completed
                    </span>

                    <strong>
                        ${(result.questions || []).length} / 5
                    </strong>

                </div>

            </div>


            <!-- =========================================
                 OVERALL SCORE
            ========================================== -->

            <div class="overall-card">

                <div class="overall-content">

                    <p class="score-label">
                        OVERALL INTERVIEW SCORE
                    </p>

                    <div class="overall-score">
                        ${finalScore}
                    </div>

                    <div class="score-out-of">
                        out of 100
                    </div>

                    <div class="performance-badge">

                        ${escapeHtml(
                            result.category
                        )}

                    </div>

                </div>

            </div>


            <!-- =========================================
                 COMPONENT SCORES
            ========================================== -->

            <div class="score-grid">


                <!-- NLP -->

                <div class="score-card">

                    <div class="score-card-icon">
                        📝
                    </div>

                    <h3>
                        NLP Answer Quality
                    </h3>

                    <div class="component-score">
                        ${nlpScore}
                    </div>

                    <p>
                        Relevance & completeness
                    </p>

                    ${scoreBar(nlpScore)}

                </div>


                <!-- VOICE -->

                <div class="score-card">

                    <div class="score-card-icon">
                        🎤
                    </div>

                    <h3>
                        Voice Analysis
                    </h3>

                    <div class="component-score">
                        ${voiceScore}
                    </div>

                    <p>
                        Speaking pace & pauses
                    </p>

                    ${scoreBar(voiceScore)}

                </div>


                <!-- FACE -->

                <div class="score-card">

                    <div class="score-card-icon">
                        📷
                    </div>

                    <h3>
                        Facial Signals
                    </h3>

                    <div class="component-score">
                        ${faceScore}
                    </div>

                    <p>
                        Expression signals
                    </p>

                    ${scoreBar(faceScore)}

                </div>

            </div>


            <!-- =========================================
                 QUESTION PERFORMANCE
            ========================================== -->

            <div class="report-section">

                <h2>
                    📋 Question-wise Performance
                </h2>

                <p class="section-description">

                    Individual evaluation for each
                    interview question.

                </p>


                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Question
                                </th>

                                <th>
                                    NLP
                                </th>

                                <th>
                                    Voice
                                </th>

                                <th>
                                    Face
                                </th>

                                <th>
                                    Overall
                                </th>

                                <th>
                                    Performance
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${questionRows}

                        </tbody>

                    </table>

                </div>

            </div>


            <!-- =========================================
                 FEEDBACK GRID
            ========================================== -->

            <div class="feedback-grid">


                <!-- STRENGTHS -->

                <div class="feedback-card strengths-card">

                    <div class="feedback-title">

                        <span>
                            💪
                        </span>

                        <h2>
                            Strengths
                        </h2>

                    </div>


                    <ul>

                        ${strengthsHTML}

                    </ul>

                </div>


                <!-- IMPROVEMENTS -->

                <div class="feedback-card improvement-card">

                    <div class="feedback-title">

                        <span>
                            📈
                        </span>

                        <h2>
                            Areas for Improvement
                        </h2>

                    </div>


                    <ul>

                        ${improvementsHTML}

                    </ul>

                </div>

            </div>


            <!-- =========================================
                 RECOMMENDATION
            ========================================== -->

            <div class="recommendation-card">

                <div class="recommendation-icon">
                    💡
                </div>


                <div>

                    <h2>
                        Recommendation
                    </h2>

                    <p>
                        ${escapeHtml(
                            recommendation
                        )}
                    </p>

                </div>

            </div>


            <!-- =========================================
                 SCORING WEIGHTS
            ========================================== -->

            <div class="report-section">

                <h2>
                    ⚖️ Scoring Methodology
                </h2>

                <p class="section-description">

                    The final score combines three
                    evaluation components.

                </p>


                <div class="weights-grid">


                    <div class="weight-item">

                        <strong>
                            NLP
                        </strong>

                        <span>
                            60%
                        </span>

                    </div>


                    <div class="weight-item">

                        <strong>
                            Voice
                        </strong>

                        <span>
                            25%
                        </span>

                    </div>


                    <div class="weight-item">

                        <strong>
                            Facial Signals
                        </strong>

                        <span>
                            15%
                        </span>

                    </div>


                </div>

            </div>


            <!-- =========================================
                 EVALUATION NOTE
            ========================================== -->

            <div class="evaluation-note">

                <strong>
                    ℹ️ Evaluation Note
                </strong>

                <p>

                    This system provides an experimental
                    interview-performance assessment using
                    answer quality, measurable voice
                    features and facial-expression signals.

                </p>

                <p>

                    Facial and voice signals should not be
                    interpreted as reliable measures of
                    personality, honesty, confidence or
                    hiring suitability.

                </p>

            </div>


            <!-- =========================================
                 ACTION
            ========================================== -->

            <button
                class="new-interview-button"
                onclick="location.reload()"
            >

                🔄 Start New Interview

            </button>


        </div>

    `;


    // --------------------------------------------------
    // Replace interview screen completely
    // --------------------------------------------------

    document.getElementById(
        "interview-section"
    ).innerHTML =
        reportHTML;
}
// ======================================================
// PAGE CLEANUP
// ======================================================

window.addEventListener(
    "beforeunload",
    function () {

        // Stop face analysis
        stopFaceAnalysis();


        // Stop camera and microphone
        if (videoStream) {

            videoStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );
        }
    }
);