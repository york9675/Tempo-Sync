import { themeEntries } from './themeCatalog.js';

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
        this.ioPanelHideTimeouts = new Map();
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
        this.presetIoToggle = document.getElementById('presetIoToggle');
        this.presetIoPanel = document.getElementById('presetIoPanel');
        this.presetDropZone = document.getElementById('presetDropZone');
        this.presetExportButton = document.getElementById('presetExportButton');
        this.presetImportButton = document.getElementById('presetImportButton');
        this.presetImportInput = document.getElementById('presetImportInput');
        this.isPresetFormVisible = false;
        this.presetFormHideTimeoutId = null;
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
        this.themeButton = document.getElementById('themeButton');
        this.themePanel = document.getElementById('themePanel');
        this.themePanelBackdrop = this.themePanel?.querySelector('[data-theme-close]') || null;
        this.themeCloseButton = document.getElementById('themeCloseButton');
        this.themeListElement = document.getElementById('themeList');
        this.customThemeSection = document.getElementById('customThemeSection');
        this.themeIoToggle = document.getElementById('themeIoToggle');
        this.themeIoPanel = document.getElementById('themeIoPanel');
        this.themeDropZone = document.getElementById('themeDropZone');
        this.customThemeForm = document.getElementById('customThemeForm');
        this.customThemeColorInput = document.getElementById('customThemeColor');
        this.customThemeHexInput = document.getElementById('customThemeHex');
        this.customThemeResetButton = document.getElementById('customThemeReset');
        this.customThemeError = document.getElementById('customThemeError');
        this.customThemeBadge = document.getElementById('customThemeBadge');
        this.customThemeAdvancedToggle = document.getElementById('customThemeAdvancedToggle');
        this.customThemeAdvancedFields = document.getElementById('customThemeAdvancedFields');
        this.themeExportButton = document.getElementById('themeExportButton');
        this.themeImportButton = document.getElementById('themeImportButton');
        this.themeImportInput = document.getElementById('themeImportInput');
        this.boundThemeKeyHandler = (event) => {
            if (event.key === 'Escape' && this.isThemePanelOpen()) {
                this.closeThemePanel();
            }
        };
        this.defaultCustomAccent = '#3b82f6';
        this.customThemeVariableMap = {
            accent: '--custom-primary-color',
            primaryHover: '--custom-primary-hover-color',
            background: '--custom-bg-color',
            container: '--custom-container-bg-color',
            text: '--custom-text-color',
            textSecondary: '--custom-text-secondary-color',
            border: '--custom-border-color',
            flash: '--custom-flash-color',
        };
        this.customThemeFieldConfig = [
            {
                key: 'primaryHover',
                label: 'Accent hover',
                colorInputId: 'customThemePrimaryHover',
                textInputId: 'customThemePrimaryHoverHex',
                cssVar: this.customThemeVariableMap.primaryHover,
            },
            {
                key: 'background',
                label: 'Background',
                colorInputId: 'customThemeBackground',
                textInputId: 'customThemeBackgroundHex',
                cssVar: this.customThemeVariableMap.background,
            },
            {
                key: 'container',
                label: 'Surface',
                colorInputId: 'customThemeContainer',
                textInputId: 'customThemeContainerHex',
                cssVar: this.customThemeVariableMap.container,
            },
            {
                key: 'text',
                label: 'Primary text',
                colorInputId: 'customThemeText',
                textInputId: 'customThemeTextHex',
                cssVar: this.customThemeVariableMap.text,
            },
            {
                key: 'textSecondary',
                label: 'Secondary text',
                colorInputId: 'customThemeTextSecondary',
                textInputId: 'customThemeTextSecondaryHex',
                cssVar: this.customThemeVariableMap.textSecondary,
            },
            {
                key: 'border',
                label: 'Border',
                colorInputId: 'customThemeBorder',
                textInputId: 'customThemeBorderHex',
                cssVar: this.customThemeVariableMap.border,
            },
            {
                key: 'flash',
                label: 'Downbeat flash',
                colorInputId: 'customThemeFlash',
                textInputId: 'customThemeFlashHex',
                cssVar: this.customThemeVariableMap.flash,
            },
        ];
        this.customThemeAdvancedInputs = {};
        this.customTheme = {
            accent: this.defaultCustomAccent,
            overrides: {},
        };
    this.themeCatalog = this.createThemeCatalog(themeEntries);

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
        this.setupThemePanel();
        this.setupCustomThemeControls();
        this.setupThemeIoControls();
        this.setupPresetControls();
        this.setupImportDragAndDrop();
        this.setPresetIoPanelVisibility(false, { silent: true });
        this.setThemeIoPanelVisibility(false, { silent: true });
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

    createThemeCatalog(entries = []) {
        if (!Array.isArray(entries) || entries.length === 0) {
            console.warn('Tempo Sync: theme entries are missing. The theme catalog will be empty.');
            return [];
        }

        return entries.map((entry, index) => ({ ...entry, order: entry.order ?? index }));
    }

    setupThemePanel() {
        if (!this.themeButton || !this.themePanel) {
            return;
        }

        this.themeButton.addEventListener('click', () => this.openThemePanel());
        this.themeCloseButton?.addEventListener('click', () => this.closeThemePanel());
        this.themePanelBackdrop?.addEventListener('click', () => this.closeThemePanel());

        this.themeListElement?.addEventListener('click', (event) => {
            const target = event.target.closest('[data-theme-id]');
            if (!target) {
                return;
            }

            const themeId = target.getAttribute('data-theme-id');
            if (!themeId) {
                return;
            }

            this.applyTheme(themeId);
            if (!this.isRestoringSettings) {
                this.saveSettings();
            }
        });

        this.renderThemeList();
    }

    isThemePanelOpen() {
        return this.themePanel?.classList.contains('is-open') ?? false;
    }

    openThemePanel() {
        if (!this.themePanel) {
            return;
        }

        if (this.themePanel.classList.contains('is-open')) {
            return;
        }

        this.renderThemeList();
        this.themePanel.classList.remove('is-closing');
        this.themePanel.classList.add('is-open');
        this.themePanel.setAttribute('aria-hidden', 'false');
        this.themeButton?.setAttribute('aria-expanded', 'true');
        document.addEventListener('keydown', this.boundThemeKeyHandler);

        queueMicrotask(() => {
            const activeButton = this.themeListElement?.querySelector('.theme-item--active');
            if (activeButton) {
                activeButton.focus?.();
            } else {
                this.themeListElement?.querySelector('[data-theme-id]')?.focus?.();
            }
        });
    }

    closeThemePanel() {
        if (!this.themePanel || (!this.isThemePanelOpen() && !this.themePanel.classList.contains('is-closing'))) {
            return;
        }

        if (this.themePanel.classList.contains('is-closing')) {
            return;
        }

        this.themePanel.classList.add('is-closing');
        this.themePanel.setAttribute('aria-hidden', 'true');
        this.themeButton?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('keydown', this.boundThemeKeyHandler);

        let fallbackTimeoutId = null;

        const finalizeClose = () => {
            if (fallbackTimeoutId !== null) {
                window.clearTimeout(fallbackTimeoutId);
            }
            this.themePanel.classList.remove('is-closing');
            this.themePanel.classList.remove('is-open');
            this.themePanel.removeEventListener('transitionend', onTransitionEnd);
            this.themeButton?.focus?.();
        };

        const onTransitionEnd = (event) => {
            if (event.target !== this.themePanel) {
                return;
            }

            finalizeClose();
        };

        this.themePanel.addEventListener('transitionend', onTransitionEnd);

        fallbackTimeoutId = window.setTimeout(() => {
            finalizeClose();
        }, 320);

        requestAnimationFrame(() => {
            this.themePanel.classList.remove('is-open');
        });
    }

    renderThemeList() {
        if (!this.themeListElement) {
            return;
        }

        const sections = this.buildThemeSections();
        const activeTheme = this.currentTheme;

        const markup = sections
            .map((section) => {
                const headingMarkup = section.title
                    ? `
                        <header class="theme-section__heading">
                            <div class="theme-section__title">${this.escapeHtml(section.title)}</div>
                            ${section.description ? `<p class="theme-section__description">${this.escapeHtml(section.description)}</p>` : ''}
                        </header>
                    `
                    : '';

                const itemsMarkup = section.items
                    .map((theme) => this.renderThemeItem(theme, activeTheme))
                    .join('');

                return `
                    <section class="theme-section" role="group" aria-label="${this.escapeHtml(section.accessibleTitle || section.title || 'Themes')}">
                        ${headingMarkup}
                        <div class="theme-grid" role="list">
                            ${itemsMarkup}
                        </div>
                    </section>
                `;
            })
            .join('');

        this.themeListElement.innerHTML = markup;

        queueMicrotask(() => {
            if (!this.isThemePanelOpen()) {
                return;
            }
            const activeButton = this.themeListElement?.querySelector('.theme-item--active');
            activeButton?.focus?.();
        });
    }

    setupCustomThemeControls() {
        if (!this.customThemeForm) {
            return;
        }

        this.customThemeForm.addEventListener('submit', (event) => this.handleCustomThemeSubmit(event));

        this.customThemeColorInput?.addEventListener('input', (event) => {
            const value = typeof event.target.value === 'string' ? event.target.value.toLowerCase() : '';
            const normalized = this.normalizeHexColor(value) || value;
            if (this.customThemeHexInput) {
                this.customThemeHexInput.value = normalized;
            }
            this.clearCustomThemeError();
            this.previewAdvancedPaletteForAccent(normalized);
        });

        this.customThemeHexInput?.addEventListener('input', () => {
            this.clearCustomThemeError();
            const candidate = this.customThemeHexInput?.value;
            if (typeof candidate === 'string') {
                this.previewAdvancedPaletteForAccent(candidate);
            }
        });

        this.customThemeHexInput?.addEventListener('blur', () => this.commitCustomHexInput());
        this.customThemeHexInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleCustomThemeSubmit(event);
            }
        });

        this.customThemeResetButton?.addEventListener('click', (event) => {
            event.preventDefault();
            this.resetCustomTheme();
        });

        if (this.customThemeAdvancedToggle) {
            this.customThemeAdvancedToggle.addEventListener('click', () => {
                const expanded = this.customThemeAdvancedToggle.getAttribute('aria-expanded') === 'true';
                this.setAdvancedFieldsVisibility(!expanded);
            });
        }

        this.customThemeAdvancedInputs = this.customThemeFieldConfig.reduce((accumulator, field) => {
            const colorInput = document.getElementById(field.colorInputId);
            const textInput = document.getElementById(field.textInputId);
            const resetButton = document.querySelector(`.custom-theme-field-reset[data-field-key="${field.key}"]`);

            if (colorInput) {
                colorInput.dataset.themeFieldKey = field.key;
                colorInput.addEventListener('input', (event) => this.handleAdvancedColorInput(field.key, event));
            }

            if (textInput) {
                textInput.dataset.themeFieldKey = field.key;
                textInput.addEventListener('input', () => {
                    this.clearCustomThemeError();
                    this.updateAdvancedResetButtonState(field.key);
                });
                textInput.addEventListener('blur', () => this.commitAdvancedHexInput(field.key));
                textInput.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        this.handleCustomThemeSubmit(event);
                    }
                });
            }

            if (resetButton) {
                resetButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.resetAdvancedField(field.key);
                });
            }

            accumulator[field.key] = {
                colorInput,
                textInput,
                cssVar: field.cssVar,
                label: field.label,
                resetButton,
            };
            return accumulator;
        }, {});

        this.syncCustomThemeInputs(this.customTheme);
        this.clearCustomThemeError();
        this.setAdvancedFieldsVisibility(false);
        this.updateCustomThemeSectionState();
    }

    setupThemeIoControls() {
        if (this.themeIoToggle && this.themeIoPanel) {
            const togglePanel = () => {
                const isExpanded = this.themeIoToggle.getAttribute('aria-expanded') === 'true';
                this.setThemeIoPanelVisibility(!isExpanded, { focusPanel: !isExpanded });
            };

            this.themeIoToggle.addEventListener('click', togglePanel);
            this.themeIoToggle.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    togglePanel();
                } else if (event.key === 'ArrowDown' && !this.themeIoPanel.hidden) {
                    event.preventDefault();
                    queueMicrotask(() => this.focusFirstInteractiveElement(this.themeIoPanel));
                }
            });

            this.themeIoPanel.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.setThemeIoPanelVisibility(false);
                }
            });
        }

        this.themeExportButton?.addEventListener('click', () => this.handleThemeExport());
        this.themeImportButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.requestThemeImport();
        });
        this.themeImportInput?.addEventListener('change', (event) => this.handleThemeFileSelection(event));

        if (this.themeDropZone) {
            this.themeDropZone.addEventListener('click', (event) => {
                if (event.target?.closest('.io-dropzone__browse')) {
                    return;
                }
                this.requestThemeImport();
            });
            this.themeDropZone.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                    event.preventDefault();
                    this.requestThemeImport();
                }
            });
        }
    }

    focusCustomThemeInput() {
        if (this.customThemeHexInput) {
            this.customThemeHexInput.focus();
            this.customThemeHexInput.select?.();
            return;
        }
        this.customThemeColorInput?.focus?.();
    }

    setAdvancedFieldsVisibility(show) {
        if (!this.customThemeAdvancedFields || !this.customThemeAdvancedToggle) {
            return;
        }

        const fields = this.customThemeAdvancedFields;
        const toggle = this.customThemeAdvancedToggle;

        const clearTransitionState = () => {
            fields.classList.remove('is-transitioning');
        };

        fields.setAttribute('aria-hidden', (!show).toString());

        const handleCloseEnd = (event) => {
            if (event?.target !== fields) {
                return;
            }
            fields.hidden = true;
            clearTransitionState();
            fields.removeEventListener('transitionend', handleCloseEnd);
        };

        const handleOpenEnd = (event) => {
            if (event?.target !== fields) {
                return;
            }
            clearTransitionState();
            fields.removeEventListener('transitionend', handleOpenEnd);
        };

        if (show) {
            const accent = this.getCurrentAccentDraft();
            fields.hidden = false;
            fields.classList.add('is-transitioning');
            fields.classList.remove('is-open');
            // Force reflow so the transition plays when adding the class.
            void fields.offsetHeight;
            fields.classList.add('is-open');
            fields.addEventListener('transitionend', handleOpenEnd);
            window.setTimeout(() => handleOpenEnd({ target: fields }), 320);
            this.previewAdvancedPaletteForAccent(accent);
        } else {
            if (!fields.hidden) {
                fields.classList.add('is-transitioning');
                fields.classList.remove('is-open');
                fields.addEventListener('transitionend', handleCloseEnd);
                window.setTimeout(() => handleCloseEnd({ target: fields }), 320);
            } else {
                fields.classList.remove('is-open');
            }
        }

        toggle.setAttribute('aria-expanded', show.toString());
        toggle.classList.toggle('is-open', show);
        this.customThemeSection?.classList.toggle('custom-theme--advanced-open', show);
    }

    updateCustomThemeSectionState() {
        if (!this.customThemeSection) {
            return;
        }

        const isActive = this.currentTheme === 'custom';
        this.customThemeSection.classList.toggle('is-active', isActive);
        if (this.customThemeBadge) {
            this.customThemeBadge.hidden = !isActive;
        }
    }

    syncCustomThemeInputs(theme = this.customTheme) {
        const accent = this.normalizeHexColor(theme?.accent) || this.defaultCustomAccent;

        if (this.customThemeColorInput) {
            this.customThemeColorInput.value = accent;
        }

        if (this.customThemeHexInput) {
            this.customThemeHexInput.value = accent;
            this.customThemeHexInput.placeholder = accent;
        }

        this.syncAdvancedCustomThemeInputs(theme?.overrides || {}, accent);
    }

    syncAdvancedCustomThemeInputs(overrides = {}, accent = this.customTheme?.accent || this.defaultCustomAccent) {
        const palette = this.buildCustomThemePalette({ accent, overrides: {} });
        Object.entries(this.customThemeAdvancedInputs || {}).forEach(([key, entry]) => {
            if (!entry) {
                return;
            }

            const override = overrides[key] || '';
            const fallback = palette[key] || accent;

            if (entry.colorInput) {
                entry.colorInput.value = override || fallback;
            }

            if (entry.textInput) {
                entry.textInput.value = override;
                entry.textInput.placeholder = fallback;
            }

            this.updateAdvancedResetButtonState(key);
        });
    }

    updateAdvancedResetButtonState(key) {
        const entry = this.customThemeAdvancedInputs?.[key];
        if (!entry?.resetButton) {
            return;
        }

        const hasOverride = Boolean(entry.textInput?.value?.trim());
        entry.resetButton.disabled = !hasOverride;
        entry.resetButton.classList.toggle('is-active', hasOverride);
    }

    previewAdvancedPaletteForAccent(accentCandidate) {
        if (!this.customThemeAdvancedInputs) {
            return;
        }

        const accent = this.normalizeHexColor(accentCandidate) || this.getCurrentAccentDraft();
        const palette = this.buildCustomThemePalette({ accent, overrides: {} });

        Object.entries(this.customThemeAdvancedInputs).forEach(([key, entry]) => {
            if (!entry) {
                return;
            }

            const hasOverride = Boolean(entry.textInput?.value?.trim());
            const fallback = palette[key] || accent;

            if (!hasOverride && entry.colorInput) {
                entry.colorInput.value = fallback;
            }

            if (entry.textInput) {
                entry.textInput.placeholder = fallback;
            }

            this.updateAdvancedResetButtonState(key);
        });
    }

    getCurrentAccentDraft() {
        const hexValue = this.customThemeHexInput?.value?.trim();
        const colorValue = this.customThemeColorInput?.value;
        return (
            this.normalizeHexColor(hexValue) ||
            this.normalizeHexColor(colorValue) ||
            this.customTheme?.accent ||
            this.defaultCustomAccent
        );
    }

    resetAdvancedField(key) {
        const entry = this.customThemeAdvancedInputs?.[key];
        if (!entry) {
            return;
        }

        const accent = this.getCurrentAccentDraft();
        const palette = this.buildCustomThemePalette({ accent, overrides: {} });
        const fallback = palette[key] || accent;

        if (entry.textInput) {
            entry.textInput.value = '';
            entry.textInput.placeholder = fallback;
        }

        if (entry.colorInput) {
            entry.colorInput.value = fallback;
        }

        this.updateAdvancedResetButtonState(key);
        this.clearCustomThemeError();
    }

    showCustomThemeError(message) {
        if (!this.customThemeError) {
            return;
        }
        this.customThemeError.hidden = false;
        this.customThemeError.textContent = message;
    }

    clearCustomThemeError() {
        if (!this.customThemeError) {
            return;
        }
        this.customThemeError.hidden = true;
        this.customThemeError.textContent = '';
    }

    handleCustomThemeSubmit(event) {
        event.preventDefault();
        const rawAccent = this.customThemeHexInput?.value?.trim() || this.customThemeColorInput?.value || '';
        const accent = this.normalizeHexColor(rawAccent);
        if (!accent) {
            this.showCustomThemeError('Please enter a valid hex color like #1f2937.');
            return;
        }

        const overridesResult = this.collectCustomThemeOverrides();
        if (!overridesResult.success) {
            this.showCustomThemeError(overridesResult.error || 'Please review your advanced colors.');
            return;
        }

        this.clearCustomThemeError();
        this.updateCustomThemeConfig({ accent, overrides: overridesResult.overrides });
        this.applyTheme('custom');
        if (!this.isRestoringSettings) {
            this.saveSettings();
        }
    }

    commitCustomHexInput() {
        if (!this.customThemeHexInput) {
            return;
        }
        const normalized = this.normalizeHexColor(this.customThemeHexInput.value);
        if (normalized) {
            this.customThemeHexInput.value = normalized;
            if (this.customThemeColorInput) {
                this.customThemeColorInput.value = normalized;
            }
            this.previewAdvancedPaletteForAccent(normalized);
        } else {
            this.previewAdvancedPaletteForAccent(this.getCurrentAccentDraft());
        }
    }

    handleAdvancedColorInput(key, event) {
        const entry = this.customThemeAdvancedInputs?.[key];
        if (!entry || !entry.textInput) {
            return;
        }

        const value = typeof event.target.value === 'string' ? event.target.value.toLowerCase() : '';
        const normalized = this.normalizeHexColor(value) || value;
        entry.textInput.value = normalized;
        this.clearCustomThemeError();
        this.updateAdvancedResetButtonState(key);
    }

    commitAdvancedHexInput(key) {
        const entry = this.customThemeAdvancedInputs?.[key];
        if (!entry || !entry.textInput) {
            return;
        }

        const trimmed = entry.textInput.value?.trim();
        if (!trimmed) {
            return;
        }

        const normalized = this.normalizeHexColor(trimmed);
        if (!normalized) {
            this.showCustomThemeError(`Please enter a valid hex color for ${entry.label}.`);
            return;
        }

        entry.textInput.value = normalized;
        if (entry.colorInput) {
            entry.colorInput.value = normalized;
        }
        this.updateAdvancedResetButtonState(key);
    }

    collectCustomThemeOverrides() {
        const overrides = {};
        for (const field of this.customThemeFieldConfig) {
            const entry = this.customThemeAdvancedInputs?.[field.key];
            if (!entry || !entry.textInput) {
                continue;
            }

            const value = entry.textInput.value?.trim();
            if (!value) {
                continue;
            }

            const normalized = this.normalizeHexColor(value);
            if (!normalized) {
                return {
                    success: false,
                    error: `Please enter a valid hex color for ${entry.label}.`,
                };
            }

            overrides[field.key] = normalized;
            if (entry.colorInput) {
                entry.colorInput.value = normalized;
            }
        }

        return { success: true, overrides };
    }

    resetCustomTheme() {
        this.clearCustomThemeError();
        const shouldReapply = this.currentTheme === 'custom';
        this.updateCustomThemeConfig({ accent: this.defaultCustomAccent, overrides: {} });

        if (shouldReapply) {
            this.applyTheme('custom');
        } else {
            this.clearCustomThemeProperties();
        }

        this.syncAdvancedCustomThemeInputs({}, this.defaultCustomAccent);

        if (!this.isRestoringSettings) {
            this.saveSettings();
        }
    }

    async handleThemeExport() {
        const payload = this.buildCustomThemeExportPayload();
        const filename = `tempo-sync-theme-${this.formatDateForFilename()}.json`;
        const accent = payload?.theme?.accent || this.customTheme?.accent || this.defaultCustomAccent;
        const confirm = await this.showAlert(
            'Export Custom Theme',
            `Export your custom theme (accent ${accent}) to “${filename}”? Import this file on any device to reuse the palette.`,
            [
                { text: 'Cancel', style: 'default' },
                { text: 'Export', style: 'primary', primary: true },
            ],
        );

        if (confirm !== 'Export') {
            return;
        }

        this.downloadJson(payload, filename);

        await this.showAlert(
            'Theme Exported',
            `Your custom theme is saved as “${filename}”. Keep this file to sync the look across browsers or share it with friends.`,
            [
                { text: 'Nice', style: 'primary', primary: true },
            ],
        );
    }

    buildCustomThemeExportPayload() {
        const theme = this.normalizeCustomTheme(this.customTheme);
        return {
            type: 'tempo-sync.custom-theme',
            version: 1,
            exportedAt: new Date().toISOString(),
            theme,
        };
    }

    requestThemeImport() {
        if (!this.themeImportInput) {
            return;
        }

        this.themeImportInput.value = '';
        this.themeImportInput.click();
    }

    async handleThemeFileSelection(event) {
        const input = event?.currentTarget instanceof HTMLInputElement
            ? event.currentTarget
            : event?.target instanceof HTMLInputElement
                ? event.target
                : null;

        if (!input) {
            return;
        }

        const files = Array.from(input.files || []);
        if (!files.length) {
            return;
        }

        for (const file of files) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await this.importCustomThemeFromFile(file);
            } catch (error) {
                // Any surface-level errors are handled within import method.
            }
        }

        input.value = '';
    }

    async importCustomThemeFromFile(file) {
        let text;
        try {
            text = await file.text();
        } catch (error) {
            this.showAlert('Import Theme Failed', 'Unable to read the selected file.', [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            this.showAlert('Import Theme Failed', 'The selected file is not valid JSON.', [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        await this.importCustomThemeFromData(data, { fileName: file?.name ?? null });
    }

    async importCustomThemeFromData(data, { fileName = null } = {}) {
        const payloadKind = this.identifyImportPayloadKind(data);
        if (payloadKind !== 'customTheme') {
            const message = this.formatImportMismatchMessage('customTheme', payloadKind, fileName);
            await this.showAlert('Import Theme Failed', message, [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        const themePayload = this.extractThemePayload(data);
        if (!themePayload || typeof themePayload !== 'object') {
            await this.showAlert('Import Theme Failed', 'No theme information was found in the selected file.', [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        const normalized = this.normalizeCustomTheme(themePayload);
        const accentPreview = normalized?.accent || this.defaultCustomAccent;
        const fileLabel = typeof fileName === 'string' && fileName.trim().length ? `“${fileName.trim()}”` : 'this theme file';

        const confirmation = await this.showAlert(
            'Apply Imported Theme',
            `${fileLabel} will replace your current custom palette${this.currentTheme === 'custom' ? ' and override the active custom theme' : ''}. Accent preview: ${accentPreview}. Continue?`,
            [
                { text: 'Cancel', style: 'default' },
                { text: 'Apply', style: 'primary', primary: true },
            ],
        );

        if (confirmation !== 'Apply') {
            return;
        }

        this.updateCustomThemeConfig(normalized, { applyImmediately: true });
        this.applyTheme('custom');
        if (!this.isRestoringSettings) {
            this.saveSettings();
        }

        await this.showAlert('Theme Imported', 'Your custom theme has been applied successfully.', [
            { text: 'Great', style: 'primary', primary: true },
        ]);
    }

    updateCustomThemeConfig({ accent = this.customTheme?.accent, overrides = this.customTheme?.overrides } = {}, { applyImmediately = false } = {}) {
        const normalizedAccent = this.normalizeHexColor(accent) || this.defaultCustomAccent;
        const normalizedOverrides = this.normalizeCustomOverrides(overrides);
        this.customTheme = {
            accent: normalizedAccent,
            overrides: normalizedOverrides,
        };

        this.syncCustomThemeInputs(this.customTheme);

        if (applyImmediately) {
            this.applyCustomThemeProperties();
        }
        this.updateCustomThemeSectionState();
    }

    normalizeHexColor(value) {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim().toLowerCase();
        if (!trimmed) {
            return null;
        }
        const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
        if (hex.length === 3 && /^[0-9a-f]{3}$/i.test(hex)) {
            return `#${hex.split('').map((char) => char + char).join('')}`.toLowerCase();
        }
        if (hex.length === 6 && /^[0-9a-f]{6}$/i.test(hex)) {
            return `#${hex}`.toLowerCase();
        }
        return null;
    }

    normalizeCustomTheme(theme) {
        const accent = this.normalizeHexColor(theme?.accent) || this.defaultCustomAccent;
        const overrides = this.normalizeCustomOverrides(theme?.overrides || {});
        return { accent, overrides };
    }

    normalizeCustomOverrides(overrides) {
        if (!overrides || typeof overrides !== 'object') {
            return {};
        }

        const result = {};
        this.customThemeFieldConfig.forEach((field) => {
            const normalized = this.normalizeHexColor(overrides[field.key]);
            if (normalized) {
                result[field.key] = normalized;
            }
        });
        return result;
    }

    buildCustomThemePalette(theme = this.customTheme) {
        const accent = this.normalizeHexColor(theme?.accent) || this.defaultCustomAccent;
        const overrides = this.normalizeCustomOverrides(theme?.overrides || {});

        const palette = {
            accent,
            primaryHover: overrides.primaryHover || this.mixColors(accent, '#ffffff', 0.25),
            background: overrides.background || this.mixColors('#f9fafb', accent, 0.12),
            container: overrides.container || this.mixColors('#ffffff', accent, 0.08),
            text: overrides.text || this.mixColors('#111827', accent, 0.18),
            textSecondary: overrides.textSecondary || this.mixColors('#475569', accent, 0.24),
            border: overrides.border || this.mixColors('#dbeafe', accent, 0.2),
            flash: overrides.flash || this.mixColors(accent, '#ffffff', 0.35),
        };

        return palette;
    }

    mixColors(colorA, colorB, weight = 0.5) {
        const normalizedA = this.normalizeHexColor(colorA) || '#000000';
        const normalizedB = this.normalizeHexColor(colorB) || '#ffffff';
        const rgbA = this.hexToRgb(normalizedA);
        const rgbB = this.hexToRgb(normalizedB);
        const w = this.clamp(weight, 0, 1);

        const r = Math.round(rgbA.r * (1 - w) + rgbB.r * w);
        const g = Math.round(rgbA.g * (1 - w) + rgbB.g * w);
        const b = Math.round(rgbA.b * (1 - w) + rgbB.b * w);

        return this.rgbToHex(r, g, b);
    }

    hexToRgb(hex) {
        const normalized = this.normalizeHexColor(hex) || '#000000';
        const value = normalized.slice(1, 7);
        const bigint = parseInt(value, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
    }

    rgbToHex(r, g, b) {
        const toHex = (component) => {
            const clamped = Math.max(0, Math.min(255, component));
            return clamped.toString(16).padStart(2, '0');
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    clamp(value, min = 0, max = 1) {
        return Math.min(Math.max(value, min), max);
    }

    applyCustomThemeProperties() {
        const palette = this.buildCustomThemePalette();
        Object.entries(this.customThemeVariableMap).forEach(([key, cssVar]) => {
            const value = palette[key];
            if (value) {
                document.documentElement.style.setProperty(cssVar, value);
            } else {
                document.documentElement.style.removeProperty(cssVar);
            }
        });
    }

    clearCustomThemeProperties() {
        Object.values(this.customThemeVariableMap).forEach((cssVar) => {
            document.documentElement.style.removeProperty(cssVar);
        });
    }

    buildThemeSections() {
        const groups = [
            {
                id: 'system',
                title: 'System',
                description: 'Let Tempo Sync follow your operating system preference.',
                accessibleTitle: 'System theme',
            },
            {
                id: 'light',
                title: 'Light themes',
                description: 'Bright palettes that stand out in daylight practice.',
            },
            {
                id: 'dark',
                title: 'Dark themes',
                description: 'Low-light palettes that keep your focus at night.',
            },
        ];

        const grouped = this.themeCatalog.reduce((accumulator, theme) => {
            const key = theme.group;
            if (!accumulator[key]) {
                accumulator[key] = [];
            }
            accumulator[key].push(theme);
            return accumulator;
        }, {});

        return groups
            .map((group) => {
                const items = (grouped[group.id] || []).slice().sort((a, b) => a.order - b.order);
                return items.length ? { ...group, items } : null;
            })
            .filter(Boolean);
    }

    renderThemeItem(theme, activeTheme) {
        const isActive = activeTheme === theme.id;
        const isSystem = theme.id === 'system';
        const swatchValues = Array.isArray(theme.swatches) ? theme.swatches : [];
        const hasSwatches = swatchValues.length > 0;
        const swatchesMarkup = swatchValues
            .map((swatch) => `<span class="theme-item__swatch" style="--swatch-color: ${this.escapeHtml(swatch)};"></span>`)
            .join('');
        const classes = ['theme-item'];
        if (isActive) {
            classes.push('theme-item--active');
        }
        if (isSystem) {
            classes.push('theme-item--system');
        }

        return `
            <button type="button" class="${classes.join(' ')}" data-theme-id="${this.escapeHtml(theme.id)}" role="listitem" aria-pressed="${isActive ? 'true' : 'false'}">
                ${hasSwatches
                    ? `<div class="theme-item__swatches" aria-hidden="true">${swatchesMarkup}</div>`
                    : ''}
                <div class="theme-item__info">
                    <span class="theme-item__name">${this.escapeHtml(theme.label)}</span>
                    ${theme.description ? `<span class="theme-item__description">${this.escapeHtml(theme.description)}</span>` : ''}
                </div>
                <span class="theme-item__state" aria-hidden="true">
                    <i class="fa-solid fa-check" aria-hidden="true"></i>
                    <span class="theme-item__state-text">Active</span>
                </span>
            </button>
        `;
    }

    setupPresetControls() {
        if (!this.presetPanel || !this.presetButton) {
            return;
        }

        this.presetButton.addEventListener('click', () => this.openPresetPanel());
        this.presetCloseButton?.addEventListener('click', () => this.closePresetPanel());
        this.presetPanelBackdrop?.addEventListener('click', () => this.closePresetPanel());

        if (this.presetIoToggle && this.presetIoPanel) {
            const togglePanel = () => {
                const isExpanded = this.presetIoToggle.getAttribute('aria-expanded') === 'true';
                this.setPresetIoPanelVisibility(!isExpanded, { focusPanel: !isExpanded });
            };

            this.presetIoToggle.addEventListener('click', togglePanel);
            this.presetIoToggle.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    togglePanel();
                } else if (event.key === 'ArrowDown' && !this.presetIoPanel.hidden) {
                    event.preventDefault();
                    queueMicrotask(() => this.focusFirstInteractiveElement(this.presetIoPanel));
                }
            });

            this.presetIoPanel.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.setPresetIoPanelVisibility(false);
                }
            });
        }

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

        this.presetExportButton?.addEventListener('click', () => this.handlePresetExport());
        this.presetImportButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.requestPresetImport();
        });
        this.presetImportInput?.addEventListener('change', (event) => this.handlePresetFileSelection(event));

        if (this.presetDropZone) {
            this.presetDropZone.addEventListener('click', (event) => {
                if (event.target?.closest('.io-dropzone__browse')) {
                    return;
                }
                this.requestPresetImport();
            });
            this.presetDropZone.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                    event.preventDefault();
                    this.requestPresetImport();
                }
            });
        }

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

    setupImportDragAndDrop() {
        this.setupDropZone(this.presetDropZone, {
            onFileDrop: (file) => this.importPresetsFromFile(file),
        });

        this.setupDropZone(this.themeDropZone, {
            onFileDrop: (file) => this.importCustomThemeFromFile(file),
        });
    }

    setupDropZone(element, { onFileDrop } = {}) {
        if (!element || typeof onFileDrop !== 'function') {
            return;
        }

        let dragCounter = 0;

        const highlight = (shouldHighlight) => {
            if (shouldHighlight) {
                element.classList.add('is-dragover');
            } else {
                element.classList.remove('is-dragover');
            }
        };

        const handleDragEnter = (event) => {
            if (!this.isFileDrag(event)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            dragCounter += 1;
            highlight(true);
        };

        const handleDragOver = (event) => {
            if (!this.isFileDrag(event)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'copy';
        };

        const handleDragLeave = (event) => {
            if (!this.isFileDrag(event)) {
                return;
            }

            event.stopPropagation();
            dragCounter = Math.max(dragCounter - 1, 0);
            if (dragCounter === 0) {
                highlight(false);
            }
        };

        const handleDrop = (event) => {
            if (!this.isFileDrag(event)) {
                highlight(false);
                dragCounter = 0;
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            dragCounter = 0;
            highlight(false);

            const file = this.extractFirstFileFromDataTransfer(event.dataTransfer);
            if (!file) {
                return;
            }

            onFileDrop(file);
        };

        element.addEventListener('dragenter', handleDragEnter);
        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('drop', handleDrop);
    }

    setPresetIoPanelVisibility(shouldShow, { focusPanel = false, silent = false } = {}) {
        this.setIoPanelVisibility({
            panel: this.presetIoPanel,
            toggle: this.presetIoToggle,
            shouldShow,
            focusPanel,
            silent,
        });
    }

    setThemeIoPanelVisibility(shouldShow, { focusPanel = false, silent = false } = {}) {
        this.setIoPanelVisibility({
            panel: this.themeIoPanel,
            toggle: this.themeIoToggle,
            shouldShow,
            focusPanel,
            silent,
        });
    }

    setIoPanelVisibility({ panel, toggle, shouldShow, focusPanel = false, silent = false } = {}) {
        if (!panel || !toggle) {
            return;
        }

        const existingTimeout = this.ioPanelHideTimeouts.get(panel);
        if (existingTimeout) {
            window.clearTimeout(existingTimeout);
            this.ioPanelHideTimeouts.delete(panel);
        }

        if (shouldShow) {
            panel.hidden = false;
            panel.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => {
                panel.classList.add('is-open');
            });
            toggle.setAttribute('aria-expanded', 'true');
            toggle.classList.add('is-expanded');

            if (focusPanel) {
                queueMicrotask(() => this.focusFirstInteractiveElement(panel));
            }
            return;
        }

        panel.setAttribute('aria-hidden', 'true');
        panel.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('is-expanded');
        panel.querySelectorAll('.is-dragover').forEach((element) => element.classList.remove('is-dragover'));

        const timeoutId = window.setTimeout(() => {
            panel.hidden = true;
            this.ioPanelHideTimeouts.delete(panel);
        }, 200);

        this.ioPanelHideTimeouts.set(panel, timeoutId);

        if (!silent) {
            queueMicrotask(() => toggle.focus?.());
        }
    }

    focusFirstInteractiveElement(container) {
        if (!container) {
            return;
        }

        const selectors = [
            '[data-focus-first]',
            'button:not([disabled])',
            'input:not([disabled]):not([type="hidden"])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            'a[href]'
        ];

        const focusTarget = container.querySelector(selectors.join(', '));
        focusTarget?.focus?.();
    }

    isFileDrag(event) {
        const types = event?.dataTransfer?.types;
        if (!types) {
            return false;
        }
        return Array.from(types).includes('Files');
    }

    extractFirstFileFromDataTransfer(dataTransfer) {
        if (!dataTransfer) {
            return null;
        }

        if (dataTransfer.files && dataTransfer.files.length > 0) {
            return dataTransfer.files[0];
        }

        if (dataTransfer.items && dataTransfer.items.length > 0) {
            const fileItem = Array.from(dataTransfer.items).find((item) => item.kind === 'file');
            if (fileItem && typeof fileItem.getAsFile === 'function') {
                return fileItem.getAsFile();
            }
        }

        return null;
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

    if (this.presetFormHideTimeoutId !== null) {
        window.clearTimeout(this.presetFormHideTimeoutId);
        this.presetFormHideTimeoutId = null;
    }

    this.presetForm.hidden = false;
    this.presetForm.setAttribute('aria-hidden', 'false');
    this.presetForm.classList.add('preset-form--animating');
    requestAnimationFrame(() => {
        this.presetForm.classList.add('preset-form--visible');
        requestAnimationFrame(() => {
            this.presetForm.classList.remove('preset-form--animating');
        });
    });

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

    if (this.presetFormHideTimeoutId !== null) {
        window.clearTimeout(this.presetFormHideTimeoutId);
        this.presetFormHideTimeoutId = null;
    }

    this.presetForm.classList.remove('preset-form--animating');
    const currentHeight = this.presetForm.scrollHeight;
    if (Number.isFinite(currentHeight) && currentHeight > 0) {
        this.presetForm.style.maxHeight = `${currentHeight}px`;
        // Force reflow so browsers register the starting height before collapse.
        // eslint-disable-next-line no-unused-expressions
        this.presetForm.offsetHeight;
    }
    this.presetForm.classList.remove('preset-form--visible');
    requestAnimationFrame(() => {
        this.presetForm.style.maxHeight = '';
    });
    this.presetForm.setAttribute('aria-hidden', 'true');
    this.isPresetFormVisible = false;
    this.presetAddCustomToggle?.setAttribute('aria-expanded', 'false');
    this.presetAddCustomToggle?.classList.remove('is-active');

    this.presetFormHideTimeoutId = window.setTimeout(() => {
        this.presetForm.hidden = true;
        this.presetForm.classList.remove('preset-form--animating');
        this.presetFormHideTimeoutId = null;
    }, 360);
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
        this.closePresetPanel();
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
            yesterday: [],
            week: [],
            earlier: [],
        };

        sorted.forEach((preset) => {
            const basis = this.getPresetGroupingTimestamp(preset);
            const dayDiff = this.getCalendarDayDifference(basis, now);
            if (dayDiff <= 0) {
                groups.today.push(preset);
                return;
            }
            if (dayDiff === 1) {
                groups.yesterday.push(preset);
                return;
            }
            if (dayDiff <= 6) {
                groups.week.push(preset);
                return;
            }
            groups.earlier.push(preset);
        });

        const sections = [];
        if (groups.today.length) {
            sections.push({ title: 'Today', items: groups.today });
        }
        if (groups.yesterday.length) {
            sections.push({ title: 'Yesterday', items: groups.yesterday });
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

    async handlePresetExport() {
        if (!this.presets.length) {
            await this.showAlert('Export Presets', 'Save at least one preset before exporting.', [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        const payload = this.buildPresetExportPayload();
        const filename = `tempo-sync-presets-${this.formatDateForFilename()}.json`;
        const presetCount = payload.presetCount || this.presets.length;
        const confirm = await this.showAlert(
            'Export Presets',
            `Export ${presetCount} ${presetCount === 1 ? 'preset' : 'presets'} to “${filename}”? You can import this file later to restore or share your setup.`,
            [
                { text: 'Cancel', style: 'default' },
                { text: 'Export', style: 'primary', primary: true },
            ],
        );

        if (confirm !== 'Export') {
            return;
        }

        this.downloadJson(payload, filename);

        await this.showAlert(
            'Export Started',
            `We generated ${presetCount} ${presetCount === 1 ? 'preset' : 'presets'} in “${filename}”. Check your downloads folder and keep it safe for backups or sharing.`,
            [
                { text: 'Got it', style: 'primary', primary: true },
            ],
        );
    }

    buildPresetExportPayload() {
        return {
            type: 'tempo-sync.presets',
            version: 1,
            exportedAt: new Date().toISOString(),
            presetCount: this.presets.length,
            presets: this.presets.map(({ title, tempo, volume, beatsPerMeasure, beatUnit, createdAt, updatedAt, sortOrder }) => ({
                title,
                tempo,
                volume,
                beatsPerMeasure,
                beatUnit,
                createdAt,
                updatedAt,
                sortOrder,
            })),
        };
    }

    downloadJson(payload, filename) {
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }

    requestPresetImport() {
        if (!this.presetImportInput) {
            return;
        }

        this.presetImportInput.value = '';
        this.presetImportInput.click();
    }

    async handlePresetFileSelection(event) {
        const input = event?.currentTarget instanceof HTMLInputElement
            ? event.currentTarget
            : event?.target instanceof HTMLInputElement
                ? event.target
                : null;

        if (!input) {
            return;
        }

        const files = Array.from(input.files || []);
        if (!files.length) {
            return;
        }

        for (const file of files) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await this.importPresetsFromFile(file);
            } catch (error) {
                // Alerts shown inside import methods; swallow to keep processing.
            }
        }

        input.value = '';
    }

    async importPresetsFromFile(file) {
        let text;
        try {
            text = await file.text();
        } catch (error) {
            this.showAlert('Import Presets Failed', 'Unable to read the selected file.', [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            this.showAlert('Import Presets Failed', 'The selected file is not valid JSON.', [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        await this.importPresetsFromData(data, { fileName: file?.name ?? null });
    }

    identifyImportPayloadKind(payload) {
        if (Array.isArray(payload)) {
            return this.extractPresetArray(payload) ? 'presets' : 'unknown';
        }

        if (!payload || typeof payload !== 'object') {
            return 'unknown';
        }

        const signature = typeof payload.type === 'string'
            ? payload.type
            : typeof payload.kind === 'string'
                ? payload.kind
                : null;

        if (signature === 'tempo-sync.custom-theme') {
            return 'customTheme';
        }

        if (signature === 'tempo-sync.presets') {
            return 'presets';
        }

        if (this.extractThemePayload(payload)) {
            return 'customTheme';
        }

        if (this.extractPresetArray(payload)) {
            return 'presets';
        }

        return 'unknown';
    }

    getNestedValue(object, path) {
        if (!object || typeof object !== 'object') {
            return undefined;
        }

        return path.reduce((value, key) => {
            if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key)) {
                return value[key];
            }
            return undefined;
        }, object);
    }

    looksLikePreset(candidate) {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }

        const numericFields = ['tempo', 'beatsPerMeasure', 'beatUnit', 'volume'];
        return numericFields.some((field) => Object.prototype.hasOwnProperty.call(candidate, field));
    }

    extractPresetArray(payload) {
        const ensurePresetArray = (value) => {
            if (!Array.isArray(value)) {
                return null;
            }
            const filtered = value.filter((item) => this.looksLikePreset(item));
            return filtered.length ? filtered : null;
        };

        if (Array.isArray(payload)) {
            return ensurePresetArray(payload);
        }

        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const arrayCandidates = [
            payload.presets,
            this.getNestedValue(payload, ['data', 'presets']),
            this.getNestedValue(payload, ['payload', 'presets']),
            payload.collection,
            this.getNestedValue(payload, ['data', 'collection']),
            this.getNestedValue(payload, ['presets', 'items']),
            this.getNestedValue(payload, ['data', 'presets', 'items']),
        ];

        for (const candidate of arrayCandidates) {
            const result = ensurePresetArray(candidate);
            if (result) {
                return result;
            }
        }

        const singularCandidates = [
            payload.preset,
            this.getNestedValue(payload, ['data', 'preset']),
            this.getNestedValue(payload, ['payload', 'preset']),
        ];

        for (const candidate of singularCandidates) {
            if (this.looksLikePreset(candidate)) {
                return [candidate];
            }
        }

        return null;
    }

    extractThemePayload(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return null;
        }

        const isThemeShape = (candidate) => {
            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
                return false;
            }

            return (
                typeof candidate.accent === 'string'
                || typeof candidate.primaryHover === 'string'
                || typeof candidate.background === 'string'
                || typeof candidate.container === 'string'
                || typeof candidate.text === 'string'
                || typeof candidate.textSecondary === 'string'
                || typeof candidate.border === 'string'
                || typeof candidate.flash === 'string'
                || (candidate.overrides && typeof candidate.overrides === 'object')
            );
        };

        const directCandidates = [
            payload.theme,
            payload.customTheme,
            this.getNestedValue(payload, ['data', 'theme']),
            this.getNestedValue(payload, ['data', 'customTheme']),
            this.getNestedValue(payload, ['payload', 'theme']),
            this.getNestedValue(payload, ['payload', 'customTheme']),
            this.getNestedValue(payload, ['theme', 'data']),
        ];

        for (const candidate of directCandidates) {
            if (isThemeShape(candidate)) {
                return candidate;
            }
        }

        if (isThemeShape(payload)) {
            return payload;
        }

        return null;
    }

    formatImportMismatchMessage(expectedKind, actualKind, fileName = null) {
        const safeName = typeof fileName === 'string' && fileName.trim().length ? `“${fileName.trim()}”` : 'This file';

        if (expectedKind === 'presets' && actualKind === 'customTheme') {
            return `${safeName} looks like a Tempo Sync custom theme export. To import it, open Themes → Import & Export and use the custom theme importer.`;
        }

        if (expectedKind === 'customTheme' && actualKind === 'presets') {
            return `${safeName} looks like a Tempo Sync preset export. To add these presets, open Presets → Import & Export instead.`;
        }

        const readableKind = expectedKind === 'presets' ? 'preset' : 'custom theme';
        return `${safeName} does not look like a Tempo Sync ${readableKind} export.`;
    }

    async importPresetsFromData(data, { fileName = null } = {}) {
        const payloadKind = this.identifyImportPayloadKind(data);
        if (payloadKind !== 'presets') {
            const message = this.formatImportMismatchMessage('presets', payloadKind, fileName);
            await this.showAlert('Import Presets Failed', message, [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        const presetsPayload = this.extractPresetArray(data);
        
        if (!presetsPayload || !presetsPayload.length) {
            await this.showAlert('Import Presets Failed', 'No presets were found in the selected file.', [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        const normalized = presetsPayload
            .map((preset, index) => this.normalizePreset(preset, index))
            .filter(Boolean);

        if (!normalized.length) {
            await this.showAlert('Import Presets Failed', 'We could not parse any presets from this file.', [
                { text: 'OK', style: 'primary', primary: true },
            ]);
            return;
        }

        let mode = 'replace';
        if (this.presets.length) {
            const choice = await this.showAlert(
                'Import Presets',
                `Found ${normalized.length} ${normalized.length === 1 ? 'preset' : 'presets'}. Merge with or replace your current list?`,
                [
                    { text: 'Cancel', style: 'default' },
                    { text: 'Replace', style: 'danger' },
                    { text: 'Merge', style: 'primary', primary: true },
                ],
            );

            if (choice === 'Cancel') {
                return;
            }

            mode = choice === 'Replace' ? 'replace' : 'merge';
        }

        const prepared = this.prepareImportedPresets(normalized, { resetOrder: mode === 'replace' });

        if (mode === 'replace') {
            this.presets = prepared;
        } else {
            const existingTitles = new Set(this.presets.map((preset) => preset.title.trim().toLowerCase()));
            const merged = [...this.presets];

            prepared.forEach((preset) => {
                const uniqueTitle = this.generateUniquePresetTitle(preset.title, existingTitles);
                preset.title = uniqueTitle;
                existingTitles.add(uniqueTitle.trim().toLowerCase());
                merged.push(preset);
            });

            this.presets = merged;
        }

        this.saveSettings();
        this.refreshPresetUI();

        await this.showAlert('Import Complete', `${prepared.length} ${prepared.length === 1 ? 'preset has' : 'presets have'} been imported.`, [
            { text: 'Nice', style: 'primary', primary: true },
        ]);
    }

    prepareImportedPresets(presets, { resetOrder = false } = {}) {
        const now = Date.now();
        const baseOrder = resetOrder ? 1 : this.getNextPresetSortOrder();

        return presets.map((preset, index) => {
            const createdAt = Number.isFinite(Number(preset.createdAt)) ? Number(preset.createdAt) : now + index;
            const updatedAt = Number.isFinite(Number(preset.updatedAt)) ? Number(preset.updatedAt) : createdAt;

            return {
                ...preset,
                id: this.generatePresetId(),
                createdAt,
                updatedAt,
                sortOrder: (resetOrder ? 1 : baseOrder) + index,
            };
        });
    }

    generateUniquePresetTitle(baseTitle, existingTitles = new Set()) {
        const trimmed = typeof baseTitle === 'string' && baseTitle.trim() ? baseTitle.trim() : 'Preset';
        let candidate = trimmed;
        let suffix = 2;

        while (existingTitles.has(candidate.toLowerCase())) {
            candidate = `${trimmed} (${suffix})`;
            suffix += 1;
        }

        return candidate;
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
        this.closePresetPanel();
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

    getPresetGroupingTimestamp(preset) {
        if (!preset || typeof preset !== 'object') {
            return Date.now();
        }

        const createdAt = Number.isFinite(Number(preset.createdAt)) ? Number(preset.createdAt) : null;
        const updatedAt = Number.isFinite(Number(preset.updatedAt)) ? Number(preset.updatedAt) : null;

        if (createdAt === null && updatedAt === null) {
            return Date.now();
        }

        if (createdAt === null) {
            return updatedAt;
        }

        if (updatedAt === null) {
            return createdAt;
        }

        return Math.min(createdAt, updatedAt);
    }

    getCalendarDayDifference(earlierTimestamp, laterTimestamp = Date.now()) {
        const earlierMs = Number(earlierTimestamp);
        const laterMs = Number(laterTimestamp);

        if (!Number.isFinite(earlierMs) || !Number.isFinite(laterMs)) {
            return 0;
        }

        const earlierDate = new Date(earlierMs);
        const laterDate = new Date(laterMs);
        const earlierUTC = Date.UTC(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate());
        const laterUTC = Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate());
        const millisecondsPerDay = 24 * 60 * 60 * 1000;

        return Math.round((laterUTC - earlierUTC) / millisecondsPerDay);
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diffMs = now - timestamp;

        if (!Number.isFinite(diffMs) || diffMs < 0) {
            return 'just now';
        }

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
        const dayDiff = this.getCalendarDayDifference(timestamp, now);

        if (dayDiff === 0) {
            if (hours === 1) {
                return '1 hour ago';
            }
            return `${hours} hours ago`;
        }

        if (dayDiff === 1) {
            return 'yesterday';
        }
        if (dayDiff < 7) {
            return `${dayDiff} days ago`;
        }

        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
    }

    formatDateForFilename(date = new Date()) {
        const pad = (value) => String(value).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}${month}${day}-${hours}${minutes}`;
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
        const requestedTheme = theme;

        const knownThemes = [
            'system',
            'custom',
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
            this.clearCustomThemeProperties();
        } else if (normalized === 'custom') {
            this.unbindSystemThemeListener();
            document.documentElement.setAttribute('data-theme', 'custom');
            this.applyCustomThemeProperties();
        } else {
            this.unbindSystemThemeListener();
            document.documentElement.setAttribute('data-theme', normalized);
            this.clearCustomThemeProperties();
        }

        this.renderThemeList();
        this.updateCustomThemeSectionState();

        if (normalized === 'custom') {
            queueMicrotask(() => this.focusCustomThemeInput());
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
            const hasModifier = e.altKey || e.ctrlKey || e.metaKey;
            if (isEditableField || hasModifier) {
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

            if (settings.customTheme && typeof settings.customTheme === 'object') {
                this.customTheme = this.normalizeCustomTheme(settings.customTheme);
            } else {
                this.customTheme = { accent: this.defaultCustomAccent };
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
            this.syncCustomThemeInputs(this.customTheme);
            this.updateCustomThemeSectionState();
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
                customTheme: this.customTheme,
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

window.metronome = new Metronome();
