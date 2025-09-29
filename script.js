class Metronome {
    constructor() {
        this.audioContext = null;
        this.currentBeatNumber = 1;
        this.isPlaying = false;
        this.tempo = 120;
        this.beatsPerMeasure = parseInt(document.getElementById('beatsPerMeasure').value, 10) || 4;
        this.beatUnit = parseInt(document.getElementById('beatUnit').value, 10) || 4;
        this.nextNoteTime = 0;
        this.tapTimes = [];
        this.tapTimeoutId = null;
        this.flashTimeout = null;
        this.masterGain = null;
        this.volume = 0.8;
        this.defaultScheduleAheadTime = 0.12;
        this.backgroundScheduleAheadTime = 6.0;
        this.scheduleAheadTime = this.defaultScheduleAheadTime;
        this.defaultLookahead = 25;
        this.backgroundLookahead = 1000;
        this.lookahead = this.defaultLookahead;
        this.schedulerId = null;
        this.visualTimeouts = [];
        this.storageKey = 'tempoSyncSettings';
        this.isRestoringSettings = false;
        this.volumeValueEl = document.getElementById('volumeValue');
        this.lastBeatTouchTime = 0;
        this.tempoHoldTimeoutId = null;
        this.tempoHoldIntervalId = null;
        this.suppressTempoClick = false;
    this.isTempoHolding = false;

        if (this.volumeValueEl) {
            this.volumeValueEl.textContent = `${Math.round(this.volume * 100)}%`;
        }

        this.loadSettings();
        this.setupEventListeners();
        this.setupThemeToggle();
        this.setupKeyboardShortcuts();
        this.setupVisibilityHandling();
        this.saveSettings();
    }

    setupEventListeners() {
        document.getElementById('playButton').addEventListener('click', () => this.togglePlay());
        document.getElementById('bpmInput').addEventListener('change', (e) => this.updateTempo(e.target.value));

        const tempoSlider = document.getElementById('tempoSlider');
        tempoSlider.addEventListener('input', (e) => this.updateTempo(e.target.value));
        tempoSlider.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                const delta = e.deltaMode === 1 ? e.deltaY : e.deltaY / 40;
                const step = Math.sign(delta) * 2;
                if (step !== 0) {
                    this.updateTempo(this.tempo - step);
                }
            },
            { passive: false }
        );

        const volumeControl = document.getElementById('volumeControl');
        volumeControl.addEventListener('input', (e) => this.updateVolume(e.target.value));
        volumeControl.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                const delta = e.deltaMode === 1 ? e.deltaY : e.deltaY / 40;
                const step = Math.sign(delta) * 2;
                if (step !== 0) {
                    this.updateVolume(this.volume * 100 - step);
                }
            },
            { passive: false }
        );

        const tempoDownButton = document.getElementById('tempoDown');
        const tempoUpButton = document.getElementById('tempoUp');
        this.attachTempoButton(tempoDownButton, -1);
        this.attachTempoButton(tempoUpButton, 1);
        document.getElementById('beatsPerMeasure').addEventListener('change', (e) => {
            this.beatsPerMeasure = parseInt(e.target.value, 10);
            this.currentBeatNumber = 1;
            if (!this.isRestoringSettings) {
                this.saveSettings();
            }
        });
        document.getElementById('beatUnit').addEventListener('change', (e) => {
            this.beatUnit = parseInt(e.target.value, 10) || this.beatUnit;
            if (!this.isRestoringSettings) {
                this.saveSettings();
            }
        });

        const beatDisplay = document.getElementById('beatDisplay');
        beatDisplay.addEventListener('click', () => this.tapTempo());
        beatDisplay.addEventListener(
            'touchend',
            (event) => this.handleBeatTouch(event),
            { passive: false }
        );
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (!currentTheme) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }

        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            if (!this.isRestoringSettings) {
                this.saveSettings();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            } else if (e.code === 'ArrowUp' || e.code === 'KeyI') {
                this.updateTempo(this.tempo + 1);
            } else if (e.code === 'ArrowDown' || e.code === 'KeyD') {
                this.updateTempo(this.tempo - 1);
            } else if (e.code === 'KeyT') {
                this.tapTempo();
            }
        });
    }

    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    loadSettings() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }

        this.isRestoringSettings = true;
        try {
            const saved = window.localStorage.getItem(this.storageKey);
            if (!saved) {
                return;
            }

            const settings = JSON.parse(saved);
            if (!settings || typeof settings !== 'object') {
                return;
            }

            if (settings.theme === 'light' || settings.theme === 'dark') {
                document.documentElement.setAttribute('data-theme', settings.theme);
            }

            if (typeof settings.tempo === 'number') {
                this.updateTempo(settings.tempo);
            }

            if (typeof settings.volume === 'number') {
                this.updateVolume(settings.volume);
            }

            if (typeof settings.beatsPerMeasure === 'number') {
                const beatsValue = Math.min(Math.max(Math.round(settings.beatsPerMeasure), 1), 16);
                this.beatsPerMeasure = beatsValue;
                const beatsSelect = document.getElementById('beatsPerMeasure');
                if (beatsSelect) {
                    beatsSelect.value = beatsValue.toString();
                }
            }

            if (typeof settings.beatUnit === 'number') {
                const allowedUnits = [1, 2, 4, 8];
                const unitValue = allowedUnits.includes(settings.beatUnit) ? settings.beatUnit : this.beatUnit;
                this.beatUnit = unitValue;
                const unitSelect = document.getElementById('beatUnit');
                if (unitSelect) {
                    unitSelect.value = unitValue.toString();
                }
            }
        } catch (error) {
            console.warn('Unable to load Tempo Sync settings:', error);
        } finally {
            this.isRestoringSettings = false;
        }
    }

    saveSettings() {
        if (this.isRestoringSettings || typeof window === 'undefined' || !window.localStorage) {
            return;
        }

        try {
            const settings = {
                tempo: this.tempo,
                volume: Math.round(this.volume * 100),
                beatsPerMeasure: this.beatsPerMeasure,
                beatUnit: this.beatUnit,
                theme: document.documentElement.getAttribute('data-theme') || 'light',
            };
            window.localStorage.setItem(this.storageKey, JSON.stringify(settings));
        } catch (error) {
            console.warn('Unable to save Tempo Sync settings:', error);
        }
    }

    handleVisibilityChange() {
        this.updateSchedulingForVisibility(true);

        if (
            document.visibilityState === 'visible' &&
            this.audioContext &&
            (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted')
        ) {
            this.audioContext.resume();
        }
    }

    updateSchedulingForVisibility(triggerScheduler = false) {
        const isHidden = document.visibilityState === 'hidden';
        this.scheduleAheadTime = isHidden ? this.backgroundScheduleAheadTime : this.defaultScheduleAheadTime;
        const targetLookahead = isHidden ? this.backgroundLookahead : this.defaultLookahead;
        this.setSchedulerInterval(targetLookahead);

        if (triggerScheduler && this.isPlaying) {
            this.scheduler();
        }
    }

    setSchedulerInterval(intervalMs) {
        if (this.schedulerId) {
            clearInterval(this.schedulerId);
            this.schedulerId = null;
        }

        this.lookahead = intervalMs;

        if (this.isPlaying) {
            this.schedulerId = setInterval(() => this.scheduler(), this.lookahead);
        }
    }

    updateTempo(newTempo) {
        const parsedTempo = Math.round(Number(newTempo));
        if (Number.isNaN(parsedTempo)) {
            document.getElementById('bpmInput').value = this.tempo;
            document.getElementById('tempoSlider').value = this.tempo;
            return;
        }

        this.tempo = Math.min(Math.max(parsedTempo, 20), 300);
        document.getElementById('bpmInput').value = this.tempo;
        document.getElementById('tempoSlider').value = this.tempo;

        if (this.isPlaying && this.audioContext) {
            this.nextNoteTime = Math.max(this.nextNoteTime, this.audioContext.currentTime + 0.01);
        }

        if (!this.isRestoringSettings) {
            this.saveSettings();
        }
    }

    async togglePlay() {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);
            this.audioContext.onstatechange = () => {
                if (!this.audioContext) return;
                if (
                    (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') &&
                    this.isPlaying &&
                    document.visibilityState === 'visible'
                ) {
                    this.audioContext.resume();
                }
            };
        }

        if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
            await this.audioContext.resume();
        }

        if (this.isPlaying) {
            this.stop();
            document.getElementById('playButton').textContent = '▶️ Play';
        } else {
            this.start();
            document.getElementById('playButton').textContent = '⏹️ Stop';
        }
    }

    start() {
        this.isPlaying = true;
        this.currentBeatNumber = 1;
        this.clearVisualTimeouts();
        this.nextNoteTime = this.audioContext.currentTime + 0.05;
        this.updateSchedulingForVisibility();
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        this.currentBeatNumber = 1;

        if (this.schedulerId) {
            clearInterval(this.schedulerId);
            this.schedulerId = null;
        }

        this.scheduleAheadTime = this.defaultScheduleAheadTime;
        this.lookahead = this.defaultLookahead;

        this.clearVisualTimeouts();
        clearTimeout(this.flashTimeout);
        this.flashTimeout = null;

        const beatDisplay = document.getElementById('beatDisplay');
        beatDisplay.classList.remove('flash');
        beatDisplay.textContent = '1';
    }

    scheduler() {
        if (!this.isPlaying) return;

        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            const beatNumber = this.currentBeatNumber;
            const scheduledTime = this.nextNoteTime;
            this.scheduleClick(beatNumber, scheduledTime);
            this.advanceNote();
        }
    }

    scheduleClick(beatNumber, time) {
        this.playClick(beatNumber, time);
        const updateDelay = Math.max((time - this.audioContext.currentTime) * 1000, 0);
        const timeoutId = setTimeout(() => this.updateBeatDisplay(beatNumber), updateDelay);
        this.visualTimeouts.push(timeoutId);
    }

    advanceNote() {
        this.nextNoteTime += 60.0 / this.tempo;
        this.currentBeatNumber = (this.currentBeatNumber % this.beatsPerMeasure) + 1;
    }

    playClick(beatNumber, time) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'triangle';
        const frequency = beatNumber === 1 ? 880 : 440;
        oscillator.frequency.setValueAtTime(frequency, time);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain || this.audioContext.destination);

        gainNode.gain.cancelScheduledValues(time);
        gainNode.gain.setValueAtTime(0, time);
        const peakLevel = beatNumber === 1 ? 1 : 0.7;
        gainNode.gain.linearRampToValueAtTime(peakLevel, time + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        gainNode.gain.setValueAtTime(0, time + 0.12);

        oscillator.start(time);
        oscillator.stop(time + 0.12);
    }

    updateBeatDisplay(beatNumber) {
        const beatDisplay = document.getElementById('beatDisplay');
        beatDisplay.textContent = beatNumber;

        if (beatNumber === 1) {
            beatDisplay.classList.add('flash');
            clearTimeout(this.flashTimeout);
            this.flashTimeout = setTimeout(() => {
                beatDisplay.classList.remove('flash');
            }, 100);
        } else {
            beatDisplay.classList.remove('flash');
        }
    }

    clearVisualTimeouts() {
        this.visualTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.visualTimeouts = [];
    }

    tapTempo() {
        const now = Date.now();
        const beatDisplay = document.getElementById('beatDisplay');

        beatDisplay.classList.add('flash');
        setTimeout(() => beatDisplay.classList.remove('flash'), 100);

        this.tapTimes.push(now);

        if (this.tapTimes.length > 1) {
            const intervals = this.tapTimes.slice(1).map((t, i) => t - this.tapTimes[i]);
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            const bpm = Math.round(60000 / avgInterval);

            if (bpm >= 20 && bpm <= 300) {
                this.updateTempo(bpm);
            }
        }

        if (this.tapTimes.length > 8) {
            this.tapTimes.shift();
        }

        clearTimeout(this.tapTimeoutId);
        this.tapTimeoutId = setTimeout(() => {
            this.tapTimes = [];
        }, 5000);
    }

    attachTempoButton(button, step) {
        if (!button) {
            return;
        }

        button.addEventListener('click', (event) => {
            if (this.suppressTempoClick) {
                event.preventDefault();
                this.suppressTempoClick = false;
                return;
            }
            this.updateTempo(this.tempo + step);
        });

        button.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }

            if (event.pointerType === 'touch') {
                event.preventDefault();
            }
            this.clearTempoHold();
            this.suppressTempoClick = false;
            this.isTempoHolding = false;
            button.setPointerCapture?.(event.pointerId);

            this.tempoHoldTimeoutId = setTimeout(() => {
                this.isTempoHolding = true;
                this.suppressTempoClick = true;
                this.updateTempo(this.tempo + step);
                this.tempoHoldIntervalId = setInterval(() => {
                    this.updateTempo(this.tempo + step);
                }, 80);
            }, 500);
        });

        const stopHold = (event) => {
            if (button.hasPointerCapture?.(event.pointerId)) {
                button.releasePointerCapture(event.pointerId);
            }

            const wasHolding = this.isTempoHolding;
            this.clearTempoHold();
            this.isTempoHolding = false;

            if (!wasHolding || event.type !== 'pointerup') {
                this.suppressTempoClick = false;
            }
        };

        ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
            button.addEventListener(type, stopHold);
        });
    }

    clearTempoHold() {
        if (this.tempoHoldTimeoutId) {
            clearTimeout(this.tempoHoldTimeoutId);
            this.tempoHoldTimeoutId = null;
        }

        if (this.tempoHoldIntervalId) {
            clearInterval(this.tempoHoldIntervalId);
            this.tempoHoldIntervalId = null;
        }

        this.isTempoHolding = false;
    }

    updateVolume(value) {
        const parsedValue = Math.min(Math.max(parseInt(value, 10), 0), 100);
        this.volume = parsedValue / 100;
        document.getElementById('volumeControl').value = parsedValue;
        if (this.volumeValueEl) {
            this.volumeValueEl.textContent = `${parsedValue}%`;
        }

        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.01);
        }

        if (!this.isRestoringSettings) {
            this.saveSettings();
        }
    }

    handleBeatTouch(event) {
        if (event.touches && event.touches.length > 1) {
            return;
        }

        const now = Date.now();
        this.lastBeatTouchTime = now;
        event.preventDefault();
        this.tapTempo();
    }
}

const metronome = new Metronome();
