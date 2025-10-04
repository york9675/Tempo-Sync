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
        this.volumeSlider = document.getElementById('volumeControl');
        this.themeSelect = document.getElementById('themeSelect');
        this.beatDisplayElement = document.getElementById('beatDisplay');
        this.presetButton = document.getElementById('presetButton');
        this.presetPanel = document.getElementById('presetPanel');
        this.presetPanelBackdrop = this.presetPanel?.querySelector('[data-preset-close]') || null;
        this.presetCloseButton = document.getElementById('presetCloseButton');
        this.presetListElement = document.getElementById('presetList');
        this.presetEmptyState = document.getElementById('presetEmptyState');
        this.presetHistorySection = document.getElementById('presetHistory');
        this.presetHistoryCard = document.getElementById('presetHistoryCard');
        this.presetSortSelect = document.getElementById('presetSortSelect');
        this.presetForm = document.getElementById('presetForm');
        this.presetAddCustomToggle = document.getElementById('presetAddCustomToggle');
        this.presetUseCurrentCheckbox = document.getElementById('presetUseCurrentCheckbox');
        this.presetTitleInput = document.getElementById('presetTitleInput');
        this.presetTempoInput = document.getElementById('presetTempoInput');
        this.presetVolumeInput = document.getElementById('presetVolumeInput');
        this.presetBeatsInput = document.getElementById('presetBeatsInput');
        this.presetBeatUnitInput = document.getElementById('presetBeatUnitInput');
        this.presetGroupToggle = document.getElementById('presetGroupToggle');
        this.presetGroupByTimeCheckbox = document.getElementById('presetGroupByTime');
        this.isPresetFormVisible = false;
        this.presets = [];
        this.presetViewMode = 'time';
        this.presetGroupByTime = true;
        this.lastPlayed = null;
        this.activePresetId = null;
        this.lastAppliedPresetTitle = null;
        this.isApplyingPreset = false;
        this.presetFormMode = 'create';
        this.boundPresetKeyHandler = (event) => {
            if (event.key === 'Escape' && this.isPresetPanelOpen()) {
                this.closePresetPanel();
            }
        };
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
        this.customAlert = document.getElementById('customAlert');
        this.customAlertTitle = document.getElementById('customAlertTitle');
        this.customAlertMessage = document.getElementById('customAlertMessage');
        this.customAlertActions = document.getElementById('customAlertActions');
        this.customAlertResolve = null;
        this.customAlertBackdrop = this.customAlert?.querySelector('[data-alert-close]') || null;
        this.customAlertBackdropHandler = null;

        if (this.volumeValueInput) {
            this.volumeValueInput.value = Math.round(this.volume * 100).toString();
        }

        if (this.volumeSlider) {
            this.volumeSlider.value = Math.round(this.volume * 100).toString();
        }

        this.applyTheme('system');
        this.loadSettings();
        this.setupEventListeners();
        this.setupThemeControls();
        this.setupPresetControls();
        this.showPresetForm(
            {
                title: '',
                tempo: this.tempo,
                volume: Math.round(this.volume * 100),
                beatsPerMeasure: this.beatsPerMeasure,
                beatUnit: this.beatUnit,
            },
            { resetForm: true, focusTitle: false }
        );
        this.hidePresetForm({ silent: true });
        this.setupKeyboardShortcuts();
        this.setupVisibilityHandling();
        this.setPlayButtonState(this.isPlaying);
        this.saveSettings();
        this.refreshPresetUI();
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

        const volumeControl = this.volumeSlider || document.getElementById('volumeControl');
        if (volumeControl) {
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
        }

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
            this.clearActivePresetReference();
            if (!this.isRestoringSettings) {
                this.saveSettings();
            }
        });
        document.getElementById('beatUnit').addEventListener('change', (e) => {
            this.beatUnit = parseInt(e.target.value, 10) || this.beatUnit;
            this.clearActivePresetReference();
            if (!this.isRestoringSettings) {
                this.saveSettings();
            }
        });

        const beatDisplay = this.beatDisplayElement || document.getElementById('beatDisplay');
        if (beatDisplay) {
            beatDisplay.addEventListener('click', () => this.tapTempo());
            beatDisplay.addEventListener(
                'touchend',
                (event) => this.handleBeatTouch(event),
                { passive: false }
            );
        }
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

    setupPresetControls() {
        if (!this.presetPanel || !this.presetButton) {
            return;
        }

        this.presetButton.addEventListener('click', () => this.openPresetPanel());
        this.presetCloseButton?.addEventListener('click', () => this.closePresetPanel());
        this.presetPanelBackdrop?.addEventListener('click', () => this.closePresetPanel());

        this.presetAddCustomToggle?.addEventListener('click', () => {
            if (this.isPresetFormVisible) {
                this.hidePresetForm();
                return;
            }

            this.showPresetForm(
                {
                    title: '',
                    tempo: this.tempo,
                    volume: Math.round(this.volume * 100),
                    beatsPerMeasure: this.beatsPerMeasure,
                    beatUnit: this.beatUnit,
                },
                { resetForm: true, focusTitle: true }
            );
        });

        this.presetUseCurrentCheckbox?.addEventListener('change', (event) => {
            const isChecked = event.target.checked;
            if (isChecked) {
                this.populatePresetFormWithCurrent();
            }
            this.setPresetFormFieldsDisabled(isChecked);
        });

        if (this.presetForm) {
            this.presetForm.addEventListener('submit', (event) => this.handlePresetFormSubmit(event));
        }

        if (this.presetSortSelect) {
            this.presetSortSelect.value = this.presetViewMode;
            this.updatePresetSortUI();
            this.presetSortSelect.addEventListener('change', (event) => {
                const value = event.target.value;
                const allowedModes = ['time', 'custom'];
                this.presetViewMode = allowedModes.includes(value) ? value : 'time';
                this.updatePresetSortUI();
                this.saveSettings();
                this.renderPresetList();
            });
        }

        if (this.presetGroupByTimeCheckbox) {
            this.presetGroupByTimeCheckbox.checked = this.presetGroupByTime;
            this.presetGroupByTimeCheckbox.addEventListener('change', (event) => {
                this.presetGroupByTime = event.target.checked;
                this.saveSettings();
                this.renderPresetList();
            });
        }

        this.presetListElement?.addEventListener('click', (event) => this.handlePresetListClick(event));

        this.presetHistoryCard?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-last-played-action]');
            if (!actionButton) {
                return;
            }

            const action = actionButton.getAttribute('data-last-played-action');
            if (action === 'apply') {
                this.applyLastPlayedSnapshot();
            }
        });
    }

    isPresetPanelOpen() {
        return this.presetPanel?.classList.contains('is-open') ?? false;
    }

    openPresetPanel() {
        if (!this.presetPanel) {
            return;
        }

    this.hidePresetForm({ resetForm: true, silent: true });
    this.refreshPresetUI();
        this.presetPanel.classList.remove('is-closing');
        this.presetPanel.classList.add('is-open');
        this.presetPanel.setAttribute('aria-hidden', 'false');
        this.presetButton?.setAttribute('aria-expanded', 'true');
        document.addEventListener('keydown', this.boundPresetKeyHandler);
        (this.presetAddCustomToggle || this.presetCloseButton)?.focus?.();
    }

    closePresetPanel() {
        if (!this.presetPanel || (!this.isPresetPanelOpen() && !this.presetPanel.classList.contains('is-closing'))) {
            return;
        }

        if (this.presetPanel.classList.contains('is-closing')) {
            return;
        }

        this.presetPanel.classList.add('is-closing');
        this.presetPanel.setAttribute('aria-hidden', 'true');
        this.presetButton?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('keydown', this.boundPresetKeyHandler);
        this.hidePresetForm({ resetForm: true, silent: true });

        let fallbackTimeoutId = null;

        const finalizeClose = () => {
            if (fallbackTimeoutId !== null) {
                window.clearTimeout(fallbackTimeoutId);
            }
            this.presetPanel.classList.remove('is-closing');
            this.presetPanel.classList.remove('is-open');
            this.presetPanel.removeEventListener('transitionend', onTransitionEnd);
            this.presetButton?.focus?.();
        };

        const onTransitionEnd = (event) => {
            if (event.target !== this.presetPanel) {
                return;
            }

            finalizeClose();
        };

        this.presetPanel.addEventListener('transitionend', onTransitionEnd);

        fallbackTimeoutId = window.setTimeout(() => {
            finalizeClose();
        }, 320);

        requestAnimationFrame(() => {
            this.presetPanel.classList.remove('is-open');
        });
    }

    showPresetForm(defaults = {}, { resetForm = false, focusTitle = true } = {}) {
        if (!this.presetForm) {
            return;
        }

        this.presetFormMode = 'create';

        if (resetForm && this.presetUseCurrentCheckbox) {
            this.presetUseCurrentCheckbox.checked = false;
        }

        this.setPresetFormFieldsDisabled(this.presetUseCurrentCheckbox?.checked ?? false);

        if (this.presetTitleInput) {
            if (Object.prototype.hasOwnProperty.call(defaults, 'title')) {
                this.presetTitleInput.value = defaults.title ?? '';
            } else if (resetForm) {
                this.presetTitleInput.value = '';
            }
        }

        if (this.presetTempoInput) {
            const tempoValue = Object.prototype.hasOwnProperty.call(defaults, 'tempo')
                ? defaults.tempo
                : resetForm
                    ? this.tempo
                    : this.presetTempoInput.value || this.tempo;
            this.presetTempoInput.value = tempoValue;
        }

        if (this.presetVolumeInput) {
            const volumeValue = Object.prototype.hasOwnProperty.call(defaults, 'volume')
                ? defaults.volume
                : resetForm
                    ? Math.round(this.volume * 100)
                    : this.presetVolumeInput.value || Math.round(this.volume * 100);
            this.presetVolumeInput.value = volumeValue;
        }

        if (this.presetBeatsInput) {
            const beatsValue = Object.prototype.hasOwnProperty.call(defaults, 'beatsPerMeasure')
                ? defaults.beatsPerMeasure
                : resetForm
                    ? this.beatsPerMeasure
                    : this.presetBeatsInput.value || this.beatsPerMeasure;
            this.presetBeatsInput.value = beatsValue.toString();
        }

        if (this.presetBeatUnitInput) {
            const beatUnitValue = Object.prototype.hasOwnProperty.call(defaults, 'beatUnit')
                ? defaults.beatUnit
                : resetForm
                    ? this.beatUnit
                    : this.presetBeatUnitInput.value || this.beatUnit;
            this.presetBeatUnitInput.value = beatUnitValue.toString();
        }

    this.presetForm.hidden = false;
    this.presetForm.classList.add('preset-form--visible');
    this.presetForm.setAttribute('aria-hidden', 'false');
    this.isPresetFormVisible = true;
    this.presetAddCustomToggle?.setAttribute('aria-expanded', 'true');
    this.presetAddCustomToggle?.classList.add('is-active');

        if (focusTitle) {
            queueMicrotask(() => {
                this.presetTitleInput?.focus?.();
            });
        }
    }

    hidePresetForm({ resetForm = false, silent = false } = {}) {
        if (!this.presetForm) {
            return;
        }

        if (resetForm) {
            this.presetTitleInput && (this.presetTitleInput.value = '');
            this.presetTempoInput && (this.presetTempoInput.value = this.tempo.toString());
            this.presetVolumeInput && (this.presetVolumeInput.value = Math.round(this.volume * 100).toString());
            this.presetBeatsInput && (this.presetBeatsInput.value = this.beatsPerMeasure.toString());
            this.presetBeatUnitInput && (this.presetBeatUnitInput.value = this.beatUnit.toString());
        }

    this.presetForm.hidden = true;
    this.presetForm.classList.remove('preset-form--visible');
    this.presetForm.setAttribute('aria-hidden', 'true');
    this.isPresetFormVisible = false;
    this.presetAddCustomToggle?.setAttribute('aria-expanded', 'false');
    this.presetAddCustomToggle?.classList.remove('is-active');
        if (this.presetUseCurrentCheckbox) {
            this.presetUseCurrentCheckbox.checked = false;
        }
        this.setPresetFormFieldsDisabled(false);

        if (!silent) {
            this.presetAddCustomToggle?.focus?.();
        }
    }

    populatePresetFormWithCurrent() {
        if (!this.presetForm) {
            return;
        }

        if (this.presetTempoInput) {
            this.presetTempoInput.value = this.tempo;
        }

        if (this.presetVolumeInput) {
            this.presetVolumeInput.value = Math.round(this.volume * 100);
        }

        if (this.presetBeatsInput) {
            this.presetBeatsInput.value = this.beatsPerMeasure.toString();
        }

        if (this.presetBeatUnitInput) {
            this.presetBeatUnitInput.value = this.beatUnit.toString();
        }
    }

    setPresetFormFieldsDisabled(disabled) {
        const fields = [
            this.presetTempoInput,
            this.presetVolumeInput,
            this.presetBeatsInput,
            this.presetBeatUnitInput,
        ];

        fields.forEach((field) => {
            if (field) {
                field.disabled = disabled;
            }
        });
    }

    updatePresetSortUI() {
        const isTimeMode = this.presetViewMode === 'time';
        if (this.presetGroupToggle) {
            this.presetGroupToggle.hidden = !isTimeMode;
            this.presetGroupToggle.setAttribute('aria-hidden', (!isTimeMode).toString());
        }

        if (isTimeMode && this.presetGroupByTimeCheckbox) {
            this.presetGroupByTimeCheckbox.checked = this.presetGroupByTime;
            this.presetGroupByTimeCheckbox.disabled = false;
        } else if (this.presetGroupByTimeCheckbox) {
            this.presetGroupByTimeCheckbox.disabled = true;
        }
    }

    handlePresetFormSubmit(event) {
        event.preventDefault();
        if (!this.presetTitleInput || !this.presetTempoInput || !this.presetVolumeInput || !this.presetBeatsInput || !this.presetBeatUnitInput) {
            return;
        }

        const title = this.presetTitleInput.value.trim();
        const tempo = Number.parseInt(this.presetTempoInput.value, 10);
        const volume = Number.parseInt(this.presetVolumeInput.value, 10);
        const beatsPerMeasure = Number.parseInt(this.presetBeatsInput.value, 10);
        const beatUnit = Number.parseInt(this.presetBeatUnitInput.value, 10);

        if (!title) {
            this.presetTitleInput.focus();
            return;
        }

        const preset = this.createPreset({ title, tempo, volume, beatsPerMeasure, beatUnit });
        this.presets.push(preset);
        this.saveSettings();
        this.renderPresetList();
        this.hidePresetForm({ resetForm: true });
    }

    handlePresetListClick(event) {
        const actionButton = event.target.closest('[data-preset-action]');
        if (!actionButton) {
            return;
        }

        const action = actionButton.getAttribute('data-preset-action');
        const presetId = actionButton.getAttribute('data-preset-id');
        if (!action || !presetId) {
            return;
        }

        if (action === 'apply') {
            this.applyPreset(presetId);
        } else if (action === 'delete') {
            this.deletePresetById(presetId);
        } else if (action === 'move-up') {
            this.movePreset(presetId, -1);
        } else if (action === 'move-down') {
            this.movePreset(presetId, 1);
        }
    }

    refreshPresetUI() {
        if (this.presetSortSelect) {
            this.presetSortSelect.value = this.presetViewMode;
        }

        this.updatePresetSortUI();
        this.renderLastPlayed();
        this.renderPresetList();
    }

    renderLastPlayed() {
        if (!this.presetHistorySection || !this.presetHistoryCard) {
            return;
        }

        const title = 'Last Played';
        this.presetHistorySection.hidden = false;
        this.presetHistorySection.setAttribute('aria-hidden', 'false');

        if (!this.lastPlayed) {
            this.presetHistoryCard.classList.add('preset-card--empty');
            this.presetHistoryCard.innerHTML = `
                <div class="preset-card__header">
                    <div class="preset-card__info">
                        <div class="preset-card__title">${this.escapeHtml(title)}</div>
                        <div class="preset-card__meta preset-card__meta--single">
                            <span>No recent session yet. Start the metronome to capture your last settings.</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const { tempo, beatsPerMeasure, beatUnit, volume, playedAt, presetTitle } = this.lastPlayed;
        const metaParts = [
            `${tempo} BPM`,
            `${beatsPerMeasure}/${beatUnit}`,
            `${volume}%`,
        ];
        if (presetTitle) {
            metaParts.push(`Preset: ${presetTitle}`);
        }
        const meta = metaParts.join(' · ');
        const timeAgo = this.formatRelativeTime(playedAt);

        this.presetHistoryCard.classList.remove('preset-card--empty');
        this.presetHistoryCard.innerHTML = `
            <div class="preset-card__header">
                <div class="preset-card__info">
                    <div class="preset-card__title">${this.escapeHtml(title)}</div>
                    <div class="preset-card__meta">
                        <span>${this.escapeHtml(meta)}</span>
                        <span>Played ${this.escapeHtml(timeAgo)}</span>
                    </div>
                </div>
                <button type="button" class="preset-card__play" data-last-played-action="apply" title="Load last session" aria-label="Load last session">
                    <i class="fa-solid fa-play" aria-hidden="true"></i>
                </button>
            </div>
        `;
    }

    applyLastPlayedSnapshot() {
        if (!this.lastPlayed) {
            return;
        }

        const snapshot = this.lastPlayed;
        this.isApplyingPreset = true;
        this.updateTempo(snapshot.tempo);
        this.updateVolume(snapshot.volume);
        this.beatsPerMeasure = snapshot.beatsPerMeasure;
        const beatsSelect = document.getElementById('beatsPerMeasure');
        if (beatsSelect) {
            beatsSelect.value = snapshot.beatsPerMeasure.toString();
        }
        this.beatUnit = snapshot.beatUnit;
        const beatUnitSelect = document.getElementById('beatUnit');
        if (beatUnitSelect) {
            beatUnitSelect.value = snapshot.beatUnit.toString();
        }
        this.isApplyingPreset = false;

        this.activePresetId = null;
        this.lastAppliedPresetTitle = snapshot.presetTitle || null;
        this.currentBeatNumber = 1;
        this.saveSettings();
        this.refreshPresetUI();
    }

    renderPresetList() {
        if (!this.presetListElement || !this.presetEmptyState) {
            return;
        }

        if (!this.presets.length) {
            this.presetListElement.innerHTML = '';
            this.presetEmptyState.hidden = false;
            return;
        }

        this.presetEmptyState.hidden = true;
        const sections = this.buildPresetSections();
        const listMarkup = sections
            .map((section) => {
                const itemsMarkup = section.items
                    .map((preset) => this.renderPresetItem(preset))
                    .join('');
                if (!section.title) {
                    return itemsMarkup;
                }
                return `
                    <section class="preset-section">
                        <header class="preset-section__title">${this.escapeHtml(section.title)}</header>
                        ${itemsMarkup}
                    </section>
                `;
            })
            .join('');

        this.presetListElement.innerHTML = listMarkup;
    }

    buildPresetSections() {
        const now = Date.now();
        if (this.presetViewMode === 'custom') {
            const sorted = [...this.presets].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
            return [{ title: null, items: sorted }];
        }

        const sorted = [...this.presets].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

        if (!this.presetGroupByTime) {
            return [{ title: null, items: sorted }];
        }

        const groups = {
            today: [],
            week: [],
            earlier: [],
        };

        sorted.forEach((preset) => {
            const basis = preset.updatedAt || preset.createdAt;
            const diff = now - basis;
            const oneDay = 24 * 60 * 60 * 1000;
            if (diff <= oneDay) {
                groups.today.push(preset);
            } else if (diff <= oneDay * 7) {
                groups.week.push(preset);
            } else {
                groups.earlier.push(preset);
            }
        });

        const sections = [];
        if (groups.today.length) {
            sections.push({ title: 'Today', items: groups.today });
        }
        if (groups.week.length) {
            sections.push({ title: 'This week', items: groups.week });
        }
        if (groups.earlier.length) {
            sections.push({ title: 'Earlier', items: groups.earlier });
        }
        return sections.length ? sections : [{ title: null, items: sorted }];
    }

    renderPresetItem(preset) {
        const metaParts = [
            `${preset.tempo} BPM`,
            `${preset.beatsPerMeasure}/${preset.beatUnit}`,
            `${preset.volume}% volume`,
        ];
        const createdText = this.formatRelativeTime(preset.createdAt);
        const orderControls = this.presetViewMode === 'custom'
            ? `
                <div class="preset-item__order-controls">
                    <button type="button" class="preset-item__order-button" data-preset-action="move-up" data-preset-id="${preset.id}" title="Move up" aria-label="Move preset up">
                        <i class="fa-solid fa-chevron-up" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="preset-item__order-button" data-preset-action="move-down" data-preset-id="${preset.id}" title="Move down" aria-label="Move preset down">
                        <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
                    </button>
                </div>
            `
            : '';

        return `
            <article class="preset-item" role="listitem">
                <div class="preset-item__header">
                    <div class="preset-item__title">${this.escapeHtml(preset.title)}</div>
                    ${orderControls}
                </div>
                <div class="preset-item__meta">
                    <span>${metaParts.map((part) => this.escapeHtml(part)).join(' · ')}</span>
                    <span>Created ${this.escapeHtml(createdText)}</span>
                </div>
                <div class="preset-item__actions">
                    <button type="button" class="preset-item__button preset-item__button--primary" data-preset-action="apply" data-preset-id="${preset.id}">Apply</button>
                    <button type="button" class="preset-item__button preset-item__button--danger" data-preset-action="delete" data-preset-id="${preset.id}">Delete</button>
                </div>
            </article>
        `;
    }

    createPreset({ title, tempo, volume, beatsPerMeasure, beatUnit }) {
        const clampedTempo = Math.min(Math.max(Math.round(tempo), 20), 300);
        const clampedVolume = Math.min(Math.max(Math.round(volume), 0), 100);
        const clampedBeats = Math.min(Math.max(Math.round(beatsPerMeasure), 1), 16);
        const allowedUnits = [1, 2, 4, 8];
        const normalizedBeatUnit = allowedUnits.includes(beatUnit) ? beatUnit : 4;
        const timestamp = Date.now();
        return {
            id: this.generatePresetId(),
            title: title.trim(),
            tempo: clampedTempo,
            volume: clampedVolume,
            beatsPerMeasure: clampedBeats,
            beatUnit: normalizedBeatUnit,
            createdAt: timestamp,
            updatedAt: timestamp,
            sortOrder: this.getNextPresetSortOrder(),
        };
    }

    normalizePreset(preset, index = 0) {
        if (!preset || typeof preset !== 'object') {
            return null;
        }

        const allowedUnits = [1, 2, 4, 8];
        const safeId = typeof preset.id === 'string' && preset.id ? preset.id : `preset-${index}-${Date.now()}`;
        const safeTitle = typeof preset.title === 'string' && preset.title.trim() ? preset.title.trim() : `Preset ${index + 1}`;
        const tempo = Math.min(Math.max(Math.round(Number(preset.tempo) || 120), 20), 300);
        const volume = Math.min(Math.max(Math.round(Number(preset.volume) || 80), 0), 100);
        const beatsPerMeasure = Math.min(Math.max(Math.round(Number(preset.beatsPerMeasure) || 4), 1), 16);
        const beatUnit = allowedUnits.includes(Number(preset.beatUnit)) ? Number(preset.beatUnit) : 4;
        const createdAt = Number.isFinite(Number(preset.createdAt)) ? Number(preset.createdAt) : Date.now();
        const updatedAt = Number.isFinite(Number(preset.updatedAt)) ? Number(preset.updatedAt) : createdAt;
        const sortOrder = Number.isFinite(Number(preset.sortOrder)) ? Number(preset.sortOrder) : index + 1;

        return {
            id: safeId,
            title: safeTitle,
            tempo,
            volume,
            beatsPerMeasure,
            beatUnit,
            createdAt,
            updatedAt,
            sortOrder,
        };
    }

    normalizeLastPlayed(snapshot) {
        const tempo = Math.min(Math.max(Math.round(Number(snapshot.tempo) || this.tempo), 20), 300);
        const volume = Math.min(Math.max(Math.round(Number(snapshot.volume) || Math.round(this.volume * 100)), 0), 100);
        const beatsPerMeasure = Math.min(Math.max(Math.round(Number(snapshot.beatsPerMeasure) || this.beatsPerMeasure), 1), 16);
        const beatUnit = [1, 2, 4, 8].includes(Number(snapshot.beatUnit)) ? Number(snapshot.beatUnit) : this.beatUnit;
        const playedAt = Number.isFinite(Number(snapshot.playedAt)) ? Number(snapshot.playedAt) : Date.now();
        const presetTitle = typeof snapshot.presetTitle === 'string' && snapshot.presetTitle.trim() ? snapshot.presetTitle.trim() : null;
        return { tempo, volume, beatsPerMeasure, beatUnit, playedAt, presetTitle };
    }

    getNextPresetSortOrder() {
        if (!this.presets.length) {
            return 1;
        }
        return Math.max(...this.presets.map((preset) => Number(preset.sortOrder) || 0)) + 1;
    }

    movePreset(presetId, direction) {
        if (this.presetViewMode !== 'custom') {
            return;
        }

        const index = this.presets.findIndex((preset) => preset.id === presetId);
        if (index === -1) {
            return;
        }

        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= this.presets.length) {
            return;
        }

        const currentOrder = this.presets[index].sortOrder;
        this.presets[index].sortOrder = this.presets[targetIndex].sortOrder;
        this.presets[targetIndex].sortOrder = currentOrder;
        this.presets[index].updatedAt = Date.now();
        this.presets[targetIndex].updatedAt = Date.now();
        this.saveSettings();
        this.renderPresetList();
    }

    async deletePresetById(presetId) {
        const preset = this.presets.find((item) => item.id === presetId);
        if (!preset) {
            return;
        }

        const confirmed = await this.showAlert(
            'Delete Preset',
            `Delete "${preset.title}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'default' },
                { text: 'Delete', style: 'danger', primary: true }
            ]
        );

        if (confirmed !== 'Delete') {
            return;
        }

        this.presets = this.presets.filter((item) => item.id !== presetId);
        if (this.activePresetId === presetId) {
            this.clearActivePresetReference();
        }
        this.saveSettings();
        this.refreshPresetUI();
    }

    applyPreset(presetId) {
        const preset = this.presets.find((item) => item.id === presetId);
        if (!preset) {
            return;
        }

        this.isApplyingPreset = true;
        this.updateTempo(preset.tempo);
        this.updateVolume(preset.volume);
        this.beatsPerMeasure = preset.beatsPerMeasure;
        const beatsSelect = document.getElementById('beatsPerMeasure');
        if (beatsSelect) {
            beatsSelect.value = preset.beatsPerMeasure.toString();
        }
        this.beatUnit = preset.beatUnit;
        const beatUnitSelect = document.getElementById('beatUnit');
        if (beatUnitSelect) {
            beatUnitSelect.value = preset.beatUnit.toString();
        }
        this.isApplyingPreset = false;

        this.activePresetId = preset.id;
        this.lastAppliedPresetTitle = preset.title;
        this.currentBeatNumber = 1;
        preset.updatedAt = Date.now();
        this.saveSettings();
        this.refreshPresetUI();
    }

    generatePresetId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `preset-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    }

    escapeHtml(value) {
        const stringValue = String(value ?? '');
        return stringValue
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diffMs = now - timestamp;
        const minutes = Math.floor(diffMs / (60 * 1000));
        if (minutes < 1) {
            return 'just now';
        }
        if (minutes === 1) {
            return '1 minute ago';
        }
        if (minutes < 60) {
            return `${minutes} minutes ago`;
        }
        const hours = Math.floor(minutes / 60);
        if (hours === 1) {
            return '1 hour ago';
        }
        if (hours < 24) {
            return `${hours} hours ago`;
        }
        const days = Math.floor(hours / 24);
        if (days === 1) {
            return 'yesterday';
        }
        if (days < 7) {
            return `${days} days ago`;
        }
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
    }

    snapshotCurrentSettings() {
        return {
            tempo: this.tempo,
            volume: Math.round(this.volume * 100),
            beatsPerMeasure: this.beatsPerMeasure,
            beatUnit: this.beatUnit,
        };
    }

    recordLastPlayed(sourceTitle = null) {
        this.lastPlayed = {
            ...this.snapshotCurrentSettings(),
            playedAt: Date.now(),
            presetTitle: sourceTitle || this.lastAppliedPresetTitle || null,
        };
        this.saveSettings();
        this.renderLastPlayed();
    }

    clearActivePresetReference() {
        if (this.isApplyingPreset || this.isRestoringSettings) {
            return;
        }
        this.activePresetId = null;
        this.lastAppliedPresetTitle = null;
    }

    showAlert(title, message, buttons = [{ text: 'OK', style: 'primary', primary: true }]) {
        return new Promise((resolve) => {
            if (!this.customAlert || !this.customAlertTitle || !this.customAlertMessage || !this.customAlertActions) {
                resolve(buttons.find(btn => btn.primary)?.text || buttons[0]?.text || 'OK');
                return;
            }

            this.customAlertResolve = resolve;
            this.customAlertTitle.textContent = title;
            this.customAlertMessage.textContent = message;
            this.customAlertActions.innerHTML = '';

            buttons.forEach((button) => {
                const btn = document.createElement('button');
                btn.className = 'custom-alert__button';
                btn.textContent = button.text;

                if (button.style === 'primary') {
                    btn.classList.add('custom-alert__button--primary');
                } else if (button.style === 'danger') {
                    btn.classList.add('custom-alert__button--danger');
                }

                btn.addEventListener('click', () => {
                    this.closeAlert(button.text);
                });

                this.customAlertActions.appendChild(btn);
            });

            if (this.customAlertBackdrop) {
                this.customAlertBackdropHandler = () => {
                    this.closeAlert(buttons.find((btn) => !btn.primary)?.text || buttons[0]?.text || 'Cancel');
                };
                this.customAlertBackdrop.addEventListener('click', this.customAlertBackdropHandler, { once: true });
            }

            this.customAlert.classList.add('is-open');
        });
    }

    closeAlert(result) {
        if (!this.customAlert) {
            return;
        }

        this.customAlert.classList.remove('is-open');
        if (this.customAlertBackdrop && this.customAlertBackdropHandler) {
            this.customAlertBackdrop.removeEventListener('click', this.customAlertBackdropHandler);
            this.customAlertBackdropHandler = null;
        }

        if (this.customAlertResolve) {
            this.customAlertResolve(result);
            this.customAlertResolve = null;
        }
    }

    applyTheme(theme) {
        const themeAliases = {
            novel: 'lilac',
        };
        const requestedTheme = themeAliases[theme] || theme;

        const knownThemes = [
            'system',
            'light',
            'ocean',
            'pink',
            'gold',
            'sunrise',
            'aurora',
            'lilac',
            'meadow',
            'dark',
            'midnight',
            'violet',
            'forest',
            'oled',
            'ember',
            'nebula',
            'nocturne',
        ];
        const normalized = knownThemes.includes(requestedTheme) ? requestedTheme : 'system';
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
            const target = e.target;
            const tagName = typeof target?.tagName === 'string' ? target.tagName.toLowerCase() : '';
            const isEditableField = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable === true;
            if (isEditableField && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            } else if (e.code === 'ArrowUp' || e.code === 'KeyI') {
                this.updateTempo(this.tempo + 1);
            } else if (e.code === 'ArrowDown' || e.code === 'KeyD') {
                this.updateTempo(this.tempo - 1);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                this.updateVolume(this.volume * 100 + 2);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                this.updateVolume(this.volume * 100 - 2);
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

            if (Array.isArray(settings.presets)) {
                this.presets = settings.presets
                    .map((preset, index) => this.normalizePreset(preset, index))
                    .filter(Boolean);
            }

            if (typeof settings.presetViewMode === 'string') {
                if (settings.presetViewMode === 'group') {
                    this.presetViewMode = 'time';
                    this.presetGroupByTime = true;
                } else {
                    const allowedModes = ['time', 'custom'];
                    if (allowedModes.includes(settings.presetViewMode)) {
                        this.presetViewMode = settings.presetViewMode;
                    }
                }
            }

            if (typeof settings.presetGroupByTime === 'boolean') {
                this.presetGroupByTime = settings.presetGroupByTime;
            } else {
                this.presetGroupByTime = true;
            }

            if (settings.lastPlayed && typeof settings.lastPlayed === 'object') {
                this.lastPlayed = this.normalizeLastPlayed(settings.lastPlayed);
            }
        } catch (error) {
            console.warn('Unable to load Tempo Sync settings:', error);
        } finally {
            this.isRestoringSettings = false;
            if (this.themeSelect && this.themeSelect.value !== this.currentTheme) {
                this.themeSelect.value = this.currentTheme;
            }
            this.refreshPresetUI();
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
                presets: this.presets,
                presetViewMode: this.presetViewMode,
                presetGroupByTime: this.presetGroupByTime,
                lastPlayed: this.lastPlayed,
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

        this.clearActivePresetReference();

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
        this.recordLastPlayed();
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

        const beatDisplay = this.beatDisplayElement || document.getElementById('beatDisplay');
        if (beatDisplay) {
            beatDisplay.classList.remove('flash');
        }
        if (beatDisplay) {
            beatDisplay.textContent = '1';
        }
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
        const peakLevel = beatNumber === 1 ? 1.2 : 0.85;
        gainNode.gain.linearRampToValueAtTime(peakLevel, time + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        gainNode.gain.setValueAtTime(0, time + 0.12);

        oscillator.start(time);
        oscillator.stop(time + 0.12);
    }

    updateBeatDisplay(beatNumber) {
        const beatDisplay = this.beatDisplayElement || document.getElementById('beatDisplay');

        if (!beatDisplay) {
            return;
        }

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
        const beatDisplay = this.beatDisplayElement || document.getElementById('beatDisplay');

        if (beatDisplay) {
            beatDisplay.classList.add('flash');
            setTimeout(() => beatDisplay.classList.remove('flash'), 100);
        }

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
        this.clearActivePresetReference();
        if (this.volumeSlider) {
            this.volumeSlider.value = parsedValue;
        } else {
            const slider = document.getElementById('volumeControl');
            if (slider) {
                slider.value = parsedValue;
            }
        }
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
