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
        this.volumeValueInput = document.getElementById('volumeValueInput');
        this.themeSelect = document.getElementById('themeSelect');
        this.currentTheme = 'system';
        this.systemThemeMediaQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-color-scheme: dark)')
            : null;
        this.boundSystemThemeHandler = (event) => {
            if (this.currentTheme === 'system') {
                this.applySystemTheme(event.matches);
            }
        };
        this.systemThemeListenerAttached = false;
        this.lastBeatTouchTime = 0;
        this.tempoHoldTimeoutId = null;
        this.tempoHoldIntervalId = null;
        this.suppressTempoClick = false;
        this.isTempoHolding = false;
        this.pendingAudioEvents = new Set();
        this.mutedWhileStopped = false;
        this.playButton = document.getElementById('playButton');

        if (this.volumeValueInput) {
            this.volumeValueInput.value = Math.round(this.volume * 100).toString();
        }

        this.applyTheme('system');
        this.loadSettings();
        this.setupEventListeners();
        this.setupThemeControls();
        this.setupKeyboardShortcuts();
        this.setupVisibilityHandling();
        this.setPlayButtonState(this.isPlaying);
        this.saveSettings();
    }

    setupEventListeners() {
        if (this.playButton) {
            this.playButton.addEventListener('click', () => this.togglePlay());
        }
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

        if (this.volumeValueInput) {
            this.volumeValueInput.addEventListener('focus', (event) => event.target.select());
            this.volumeValueInput.addEventListener('input', (event) => this.handleVolumeValueInput(event));
            this.volumeValueInput.addEventListener('change', () => this.commitVolumeInput());
            this.volumeValueInput.addEventListener('blur', () => this.commitVolumeInput());
            this.volumeValueInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.commitVolumeInput();
                    this.volumeValueInput.blur();
                }
            });
        }

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

    setupThemeControls() {
        if (!this.themeSelect) {
            return;
        }

        this.themeSelect.addEventListener('change', (event) => {
            const selectedTheme = event.target.value;
            this.applyTheme(selectedTheme);
            if (!this.isRestoringSettings) {
                this.saveSettings();
            }
        });
    }

    applyTheme(theme) {
        const knownThemes = [
            'system',
            'light',
            'ocean',
            'pink',
            'gold',
            'sunrise',
            'aurora',
            'dark',
            'midnight',
            'violet',
            'forest',
            'oled',
            'ember',
        ];
        const normalized = knownThemes.includes(theme) ? theme : 'system';
        this.currentTheme = normalized;

        if (this.themeSelect && this.themeSelect.value !== normalized) {
            this.themeSelect.value = normalized;
        }

        if (normalized === 'system') {
            this.bindSystemThemeListener();
            const prefersDark = this.systemThemeMediaQuery?.matches ?? false;
            this.applySystemTheme(prefersDark);
        } else {
            this.unbindSystemThemeListener();
            document.documentElement.setAttribute('data-theme', normalized);
        }
    }

    applySystemTheme(prefersDark) {
        const theme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }

    bindSystemThemeListener() {
        if (!this.systemThemeMediaQuery || this.systemThemeListenerAttached) {
            return;
        }

        let attached = false;
        if (typeof this.systemThemeMediaQuery.addEventListener === 'function') {
            this.systemThemeMediaQuery.addEventListener('change', this.boundSystemThemeHandler);
            attached = true;
        } else if (typeof this.systemThemeMediaQuery.addListener === 'function') {
            this.systemThemeMediaQuery.addListener(this.boundSystemThemeHandler);
            attached = true;
        }
        this.systemThemeListenerAttached = attached;
    }

    unbindSystemThemeListener() {
        if (!this.systemThemeMediaQuery || !this.systemThemeListenerAttached) {
            return;
        }

        if (typeof this.systemThemeMediaQuery.removeEventListener === 'function') {
            this.systemThemeMediaQuery.removeEventListener('change', this.boundSystemThemeHandler);
        } else if (typeof this.systemThemeMediaQuery.removeListener === 'function') {
            this.systemThemeMediaQuery.removeListener(this.boundSystemThemeHandler);
        }
        this.systemThemeListenerAttached = false;
    }


    setPlayButtonState(isPlaying) {
        if (!this.playButton) {
            return;
        }

        const iconEl = this.playButton.querySelector('i');
        const textEl = this.playButton.querySelector('span');

        if (iconEl) {
            iconEl.classList.remove('fa-play', 'fa-stop');
            iconEl.classList.add(isPlaying ? 'fa-stop' : 'fa-play');
        }

        if (textEl) {
            textEl.textContent = isPlaying ? 'Stop' : 'Play';
        }

        this.playButton.setAttribute('aria-label', isPlaying ? 'Stop the metronome' : 'Start the metronome');
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

            if (typeof settings.theme === 'string') {
                this.applyTheme(settings.theme);
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
            if (this.themeSelect && this.themeSelect.value !== this.currentTheme) {
                this.themeSelect.value = this.currentTheme;
            }
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
                theme: this.currentTheme || 'system',
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
            this.setPlayButtonState(false);
        } else {
            this.start();
            this.setPlayButtonState(true);
        }
    }

    start() {
        this.isPlaying = true;
        this.currentBeatNumber = 1;
        this.clearVisualTimeouts();
        this.restoreMasterGain();
        this.nextNoteTime = this.audioContext.currentTime + 0.05;
        this.updateSchedulingForVisibility();
        this.scheduler();
        this.setPlayButtonState(true);
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

        this.flushPendingAudio();
        this.muteMasterGain();
        this.clearVisualTimeouts();
        clearTimeout(this.flashTimeout);
        this.flashTimeout = null;

        const beatDisplay = document.getElementById('beatDisplay');
        beatDisplay.classList.remove('flash');
        beatDisplay.textContent = '1';
        this.setPlayButtonState(false);
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

        const pendingEvent = {
            oscillator,
            gainNode,
            startTime: time,
            cleanup: null,
        };
        this.pendingAudioEvents.add(pendingEvent);

        const removePending = () => {
            if (this.pendingAudioEvents.has(pendingEvent)) {
                this.pendingAudioEvents.delete(pendingEvent);
            }
            try {
                oscillator.disconnect();
            } catch (error) {
                // ignore
            }
            try {
                gainNode.disconnect();
            } catch (error) {
                // ignore
            }
        };

        pendingEvent.cleanup = removePending;

        if (typeof oscillator.addEventListener === 'function') {
            oscillator.addEventListener('ended', removePending, { once: true });
        } else {
            oscillator.onended = removePending;
        }

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

    flushPendingAudio() {
        if (!this.audioContext) {
            this.pendingAudioEvents.clear();
            return;
        }

        const now = this.audioContext.currentTime;
        const events = Array.from(this.pendingAudioEvents);

        events.forEach((event) => {
            const { gainNode, cleanup } = event;

            try {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(0, now);
            } catch (error) {
                // ignore
            }

            if (typeof cleanup === 'function') {
                cleanup();
            }
        });

        this.pendingAudioEvents.clear();
    }

    muteMasterGain() {
        if (!this.masterGain || !this.audioContext) {
            return;
        }

        const now = this.audioContext.currentTime;
        try {
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setTargetAtTime(0, now, 0.01);
            this.mutedWhileStopped = true;
        } catch (error) {
            // ignore
        }
    }

    restoreMasterGain() {
        if (!this.masterGain || !this.audioContext) {
            return;
        }

        const now = this.audioContext.currentTime;
        try {
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(0, now);
            this.masterGain.gain.setTargetAtTime(this.volume, now + 0.005, 0.02);
            this.mutedWhileStopped = false;
        } catch (error) {
            // ignore
        }
    }

    tapTempo() {
        const now = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
        const beatDisplay = document.getElementById('beatDisplay');

        beatDisplay.classList.add('flash');
        setTimeout(() => beatDisplay.classList.remove('flash'), 100);

        if (this.tapTimes.length && now - this.tapTimes[this.tapTimes.length - 1] > 2500) {
            this.tapTimes = [];
        }

        this.tapTimes.push(now);

        if (this.tapTimes.length > 10) {
            this.tapTimes.shift();
        }

        if (this.tapTimes.length > 1) {
            const intervals = this.tapTimes.slice(1).map((t, i) => t - this.tapTimes[i]);
            const bpm = this.calculateTapBpm(intervals);

            if (bpm !== null) {
                const clamped = Math.min(Math.max(Math.round(bpm), 20), 300);
                this.updateTempo(clamped);
            }
        }

        clearTimeout(this.tapTimeoutId);
        this.tapTimeoutId = setTimeout(() => {
            this.tapTimes = [];
        }, 5000);
    }

    calculateTapBpm(intervals) {
        if (!intervals.length) {
            return null;
        }

        const sorted = [...intervals].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const tolerance = median * 0.25;
        const filtered = intervals.filter((interval) => Math.abs(interval - median) <= tolerance);
        const workingSet = filtered.length >= 2 ? filtered : intervals;
        const avgInterval = workingSet.reduce((sum, interval) => sum + interval, 0) / workingSet.length;

        if (avgInterval <= 0) {
            return null;
        }

        const bpm = 60000 / avgInterval;
        return Number.isFinite(bpm) ? bpm : null;
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
        const numericValue = Number.parseInt(value, 10);
        if (Number.isNaN(numericValue)) {
            const fallback = Math.round(this.volume * 100);
            document.getElementById('volumeControl').value = fallback;
            if (this.volumeValueInput) {
                this.volumeValueInput.value = fallback.toString();
            }
            return;
        }

        const parsedValue = Math.min(Math.max(numericValue, 0), 100);
        this.volume = parsedValue / 100;
        document.getElementById('volumeControl').value = parsedValue;
        if (this.volumeValueInput) {
            this.volumeValueInput.value = parsedValue.toString();
        }

        if (this.masterGain) {
            const now = this.audioContext ? this.audioContext.currentTime : 0;
            const target = !this.isPlaying && this.mutedWhileStopped ? 0 : this.volume;
            try {
                this.masterGain.gain.cancelScheduledValues(now);
                this.masterGain.gain.setTargetAtTime(target, now, 0.01);
            } catch (error) {
                // ignore scheduling errors
            }
        }

        if (!this.isRestoringSettings) {
            this.saveSettings();
        }
    }

    handleVolumeValueInput(event) {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        let sanitized = input.value.replace(/[^0-9]/g, '');
        if (sanitized.length > 3) {
            sanitized = sanitized.slice(0, 3);
        }

        input.value = sanitized;
    }

    commitVolumeInput() {
        if (!this.volumeValueInput) {
            return;
        }

        const rawValue = this.volumeValueInput.value.trim();
        if (rawValue === '') {
            this.volumeValueInput.value = Math.round(this.volume * 100).toString();
            return;
        }

        const parsed = Number.parseInt(rawValue, 10);
        if (Number.isNaN(parsed)) {
            this.volumeValueInput.value = Math.round(this.volume * 100).toString();
            return;
        }

        this.updateVolume(parsed);
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
