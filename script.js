document.addEventListener('DOMContentLoaded', () => {
    const splashSlide = document.getElementById('splash-slide');
    const cakeSlide = document.getElementById('cake-slide');
    const envelopeSlide = document.getElementById('envelope-slide');
    const rejectionSlide = document.getElementById('rejection-slide');
    const letterSlide = document.getElementById('letter-slide');

    const startButton = document.getElementById('start-button');
    const yesButton = document.getElementById('yes-button');
    const noButton = document.getElementById('no-button');
    const tryAgainButton = document.getElementById('try-again-button');
    const closeLetterButton = document.getElementById('close-letter-button');
    const blowCandleButton = document.getElementById('blow-candle-button');
    const nextFromCakeButton = document.getElementById('next-from-cake');

    const backgroundMusic = document.getElementById('background-music');
    const youtubeAudioPlayer = document.getElementById('youtube-audio-player');
    const youtubeIframe = youtubeAudioPlayer.querySelector('iframe'); // Dapatkan iframe
    const flames = document.querySelectorAll('.flame');
    const candlesticks = document.querySelectorAll('.candlestick');
    const speechStatus = document.getElementById('speech-status');

    let currentSlide = splashSlide;
    let recognition;
    let isBlowingEnabled = false;
    let candlesExtinguished = false;
    let audioContext; // Declare globally for cleanup
    let mediaStreamSource; // To store the microphone stream source
    let scriptProcessor; // To store the ScriptProcessorNode
    let hasUserInteracted = false; // Flag untuk melacak interaksi pengguna

    // --- Slide Management ---
    function showSlide(slideToShow) {
        if (currentSlide) {
            currentSlide.classList.remove('active');
        }
        slideToShow.classList.add('active');
        currentSlide = slideToShow;
    }

    // --- 🎵 Background Music ---
    function playMusic() {
        if (!hasUserInteracted) return; // Jangan mainkan jika belum ada interaksi

        // Coba aktifkan YouTube iframe
        if (youtubeIframe && youtubeAudioPlayer.style.display === 'none') {
            // Unmute the YouTube iframe and make it potentially playable
            // Note: Autoplay with sound is still heavily restricted.
            // This URL removes 'mute=1' from the iframe's source.
            const currentSrc = youtubeIframe.src;
            const newSrc = currentSrc.replace(/mute=1/, 'mute=0');
            youtubeIframe.src = newSrc;
            youtubeAudioPlayer.style.display = 'block'; // Bisa juga disembunyikan jika ukuran 0x0
            console.log("Attempting to play YouTube audio (unmuted).");
        }
        
        // Fallback untuk audio tag jika YouTube tidak berfungsi (pastikan audio tag punya src yang valid)
        if (backgroundMusic.paused) {
            backgroundMusic.play().catch(e => {
                console.warn("Autoplay audio tag blocked:", e);
            });
        }
    }

    function pauseMusic() {
        backgroundMusic.pause();
        if (youtubeIframe) {
            // Mute and pause the YouTube iframe by resetting its source with mute=1
            const currentSrc = youtubeIframe.src;
            const newSrc = currentSrc.replace(/mute=0/, 'mute=1'); // Mute it again
            youtubeIframe.src = newSrc; // Resetting src will stop playback
            console.log("YouTube audio paused and muted.");
        }
    }

    function resumeMusic() {
        playMusic(); 
    }

    // --- Confetti Animation ---
    function createConfetti() {
        const confettiContainer = document.querySelector('.confetti-container');
        confettiContainer.innerHTML = ''; // Clear previous confetti

        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#FF69B4', '#FFA500'];
        const shapes = ['square', 'circle', 'triangle'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
            confetti.classList.add(randomShape);

            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            if (randomShape === 'triangle') {
                 confetti.style.borderBottomColor = randomColor; 
            } else {
                 confetti.style.backgroundColor = randomColor;
            }
            confettiContainer.appendChild(confetti);
        }
    }

    // --- Cake & Candle Animations ---
    function animateCandles() {
        candlesticks.forEach((candlestick, index) => {
            candlestick.style.transform = `translateY(-100px) rotate(${Math.random() * 20 - 10}deg)`;
            candlestick.style.opacity = '0';

            setTimeout(() => {
                candlestick.style.transition = 'transform 0.8s ease-out, opacity 0.8s ease-out';
                candlestick.style.transform = 'translateY(0) rotate(0deg)';
                candlestick.style.opacity = '1';

                setTimeout(() => {
                    candlestick.classList.add('show-text');
                }, 800); 
            }, 500 * index); 
        });
    }

    function extinguishCandles() {
        if (!candlesExtinguished) {
            flames.forEach(flame => {
                flame.classList.add('extinguished');
            });
            candlesExtinguished = true;
            speechStatus.textContent = "Candles extinguished! Make a wish! ✨";
            nextFromCakeButton.classList.remove('hidden');
            if (recognition) {
                recognition.stop(); 
            }
            cleanupAudioContext(); 
            resumeMusic(); 
        }
    }

    function cleanupAudioContext() {
        if (scriptProcessor) {
            scriptProcessor.disconnect();
            scriptProcessor.onaudioprocess = null;
            scriptProcessor = null;
        }
        if (mediaStreamSource) {
            mediaStreamSource.disconnect();
            mediaStreamSource = null;
        }
        if (audioContext) {
            audioContext.close().then(() => {
                audioContext = null;
                console.log("AudioContext closed.");
            }).catch(e => console.error("Error closing AudioContext:", e));
        }
    }

    // --- Web Speech API for Candle Blowing ---
    function enableSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            speechStatus.textContent = "Speech Recognition not supported in this browser. Please use Chrome.";
            blowCandleButton.disabled = true;
            return;
        }

        pauseMusic(); 

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true; 
        recognition.lang = 'en-US';

        let analyser;
        
        recognition.onstart = () => {
            speechStatus.textContent = "Listening for a blow... 🌬️ (Grant microphone permission)";
            isBlowingEnabled = true;

            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        mediaStreamSource = audioContext.createMediaStreamSource(stream);
                        analyser = audioContext.createAnalyser();
                        analyser.smoothingTimeConstant = 0.3;
                        analyser.fftSize = 1024;
                        mediaStreamSource.connect(analyser);

                        scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
                        analyser.connect(scriptProcessor);
                        scriptProcessor.connect(audioContext.destination);

                        scriptProcessor.onaudioprocess = () => {
                            if (!isBlowingEnabled || candlesExtinguished) return;

                            const array = new Uint8Array(analyser.frequencyBinCount);
                            analyser.getByteFrequencyData(array);
                            let sum = 0;
                            for (let i = 0; i < array.length; i++) {
                                sum += array[i];
                            }
                            const average = sum / array.length;

                            const BLOW_THRESHOLD = 70; 
                            if (average > BLOW_THRESHOLD) {
                                extinguishCandles();
                            }
                        };
                    })
                    .catch(err => {
                        speechStatus.textContent = "Microphone access denied or error: " + err.message;
                        blowCandleButton.disabled = false; 
                        blowCandleButton.textContent = "Enable Blowing";
                        isBlowingEnabled = false;
                        cleanupAudioContext(); 
                        resumeMusic(); 
                    });
            } catch (e) {
                speechStatus.textContent = "Web Audio API not supported in this browser.";
                blowCandleButton.disabled = true;
                isBlowingEnabled = false;
                resumeMusic(); 
            }
        };

        recognition.onresult = (event) => {
            // Tidak perlu implementasi untuk kasus ini
        };

        recognition.onerror = (event) => {
            speechStatus.textContent = "Speech recognition error: " + event.error;
            console.error('Speech recognition error:', event.error);
            isBlowingEnabled = false;
            blowCandleButton.disabled = false;
            blowCandleButton.textContent = "Enable Blowing";
            cleanupAudioContext();
            resumeMusic(); 
        };

        recognition.onend = () => {
            if (!candlesExtinguished) { 
                speechStatus.textContent = "Listening stopped. Try again?";
                blowCandleButton.textContent = "Enable Blowing";
                blowCandleButton.disabled = false;
            }
            isBlowingEnabled = false;
            cleanupAudioContext(); 
            if (!candlesExtinguished) { 
                resumeMusic();
            }
        };

        recognition.start();
        blowCandleButton.textContent = "Listening...";
        blowCandleButton.disabled = true;
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        hasUserInteracted = true; // Set flag interaksi pengguna
        showSlide(cakeSlide);
        createConfetti();
        playMusic(); 
        animateCandles();
    });

    blowCandleButton.addEventListener('click', () => {
        if (!isBlowingEnabled && !candlesExtinguished) {
            enableSpeechRecognition();
        }
    });

    nextFromCakeButton.addEventListener('click', () => {
        showSlide(envelopeSlide);
    });

    yesButton.addEventListener('click', () => {
        showSlide(letterSlide);
    });

    noButton.addEventListener('click', () => {
        showSlide(rejectionSlide);
    });

    tryAgainButton.addEventListener('click', () => {
        showSlide(envelopeSlide);
    });

    closeLetterButton.addEventListener('click', () => {
        const letterCard = document.querySelector('.letter-card');
        letterCard.style.transform = 'scale(0.2) rotate(30deg)';
        letterCard.style.opacity = '0';
        letterCard.style.filter = 'drop-shadow(0 0 0 rgba(0,0,0,0))';

        setTimeout(() => {
            showSlide(splashSlide);
            letterCard.style.transform = 'scale(1) rotate(0deg)';
            letterCard.style.opacity = '1';
            letterCard.style.filter = 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))';

            flames.forEach(flame => flame.classList.remove('extinguished'));
            candlesExtinguished = false;
            nextFromCakeButton.classList.add('hidden');
            speechStatus.textContent = "";
            blowCandleButton.textContent = "Enable Blowing";
            blowCandleButton.disabled = false;

            // Clear old confetti and recreate for fresh animation
            const confettiContainer = document.querySelector('.confetti-container');
            confettiContainer.innerHTML = '';
            createConfetti();

        }, 700); // Match this with the transition duration of letter-card in CSS
    });

    // Initial load: show splash slide
    showSlide(splashSlide);
    createConfetti(); // Create confetti once on initial load

    // Add event listener for user interaction to attempt playing music
    // This is a common workaround for browser autoplay policies
    document.body.addEventListener('click', playMusic, { once: true });
    startButton.addEventListener('click', playMusic, { once: true });


});
