/* =================================================================
   CHENETHA DESIGN MITRA - Handloom AI Assistant Client Application
   Luxury Indian Handloom Pattern & Motif Synthesis Engine
   ================================================================= */

let currentLang = 'en-US';
let viewMode = 'flat'; // 'flat', 'drape', 'zoom'
let isRecording = false;
let recognition = null;
let hasGenerated = false; // Generate final design only when user clicks "Generate My Design"

let selectedStyle = 'Floral';
let generationSeed = 0;
let currentVariations = [];
let activeVariationIndex = 0;

// Application State for current active design
let currentDesign = {
    title: "Floral Lata & Lotus Handloom Silk Saree",
    sareeStyle: "Floral",
    fabricType: "Silk",
    bodyColor: "#800020",
    borderColor: "#D97706",
    palluColor: "#991B1B",
    zariColor: "#FBBF24",
    motifType: "lotus",
    motifDensity: "Medium",
    borderStyle: "double_zari",
    bodyPattern: "floral_vines",
    palluStyle: "decorative_pallu",
    motifArrangement: "staggered",
    promptUsed: ""
};

// Canvas context
let canvas, ctx;
let currentPage = 'home';

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('sareeCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
    }

    initSpeechRecognition();
    initEventListeners();
    initScreen3Customizations();
    checkBackendHealth();
    syncColorHexTags();

    // Check URL hash on initial load
    const initialHash = (window.location.hash || '').replace('#', '');
    if (['home', 'explore', 'studio', 'about', 'contact'].includes(initialHash)) {
        navigateToPage(initialHash);
    } else {
        navigateToPage('home');
    }

    // Initial welcome state: Render guided preview on canvas, waiting for user to click "Generate My Design"
    renderWelcomeCanvas();
});

// Browser History & Popstate navigation
window.addEventListener('popstate', () => {
    const hash = (window.location.hash || '').replace('#', '');
    if (['home', 'explore', 'studio', 'about', 'contact'].includes(hash)) {
        navigateToPage(hash);
    } else {
        navigateToPage('home');
    }
});

// -----------------------------------------------------------------
// 0. Website Page Router & Navigation Controller
// -----------------------------------------------------------------
function navigateToPage(pageId) {
    const validPages = ['home', 'explore', 'studio', 'about', 'contact'];
    if (!validPages.includes(pageId)) pageId = 'home';
    currentPage = pageId;

    // Toggle Page Views
    validPages.forEach(p => {
        const pageEl = document.getElementById(`page-${p}`);
        if (pageEl) {
            pageEl.classList.toggle('active', p === pageId);
        }
        const navLink = document.getElementById(`navLink-${p}`);
        if (navLink) {
            navLink.classList.toggle('active', p === pageId);
        }
    });

    // Update URL Hash
    const hash = `#${pageId}`;
    if (window.location.hash !== hash) {
        history.pushState(null, '', hash);
    }

    // Smooth Scroll to Top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // When entering Design Studio, ensure canvas renders crisply
    if (pageId === 'studio') {
        setTimeout(() => {
            if (hasGenerated) {
                renderSareeCanvas();
            } else {
                renderWelcomeCanvas();
            }
        }, 50);
    }
}

// Backward compatibility alias
function navigateToScreen(screenId) {
    if (screenId === 'screen-create' || screenId === 'screen-preview') {
        navigateToPage('studio');
    } else {
        navigateToPage('home');
    }
}

function selectStyleAndGoStudio(styleName) {
    const pill = document.querySelector(`.style-pill[data-style="${styleName}"]`) ||
        document.querySelector(`.style-card[data-style="${styleName}"]`);
    selectStyleCard(pill, styleName);
    navigateToPage('studio');
}

function selectSuggestedAndGo(styleName) {
    selectStyleAndGoStudio(styleName);
}

// Mobile Menu Handlers
function toggleMobileMenu() {
    const drawer = document.getElementById('mobileDrawer');
    if (drawer) drawer.classList.toggle('active');
}

function closeMobileMenu() {
    const drawer = document.getElementById('mobileDrawer');
    if (drawer) drawer.classList.remove('active');
}

// Gallery Filter Handler (Page 2)
function filterGallery(category, btnElement) {
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    const cards = document.querySelectorAll('#exploreGalleryGrid .gallery-card');
    cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (category === 'all' || cat === category) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Contact Form Handler (Page 5)
async function handleContactSubmit(event) {
    event.preventDefault();
    const nameEl = document.getElementById('contactName');
    const emailEl = document.getElementById('contactEmail');
    const phoneEl = document.getElementById('contactPhone');
    const clusterEl = document.getElementById('contactCluster');
    const purposeEl = document.getElementById('contactPurpose');
    const messageEl = document.getElementById('contactMessage');
    const submitBtn = document.getElementById('contactSubmitBtn');

    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const cluster = clusterEl ? clusterEl.value : 'General';
    const purpose = purposeEl ? purposeEl.value : 'General';
    const message = messageEl ? messageEl.value.trim() : '';

    if (!name || !email || !message) {
        showToast("⚠️ Please provide your Name, Email, and Message.");
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳</span> Sending Inquiry...';
    }

    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, cluster, purpose, message })
        });
        if (res.ok) {
            showToast("✨ Thank you! Your inquiry has been received by our Handloom Studio.");
        } else {
            saveContactLocally({ name, email, phone, cluster, purpose, message });
            showToast("✨ Message received! Our artisan coordinator will contact you.");
        }
    } catch (e) {
        saveContactLocally({ name, email, phone, cluster, purpose, message });
        showToast("✨ Message received! Our artisan coordinator will contact you.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>📨</span> <span>Submit Inquiry</span> <span>➔</span>';
        }
        const form = document.getElementById('contactForm');
        if (form) form.reset();
    }
}

function saveContactLocally(entry) {
    try {
        const list = JSON.parse(localStorage.getItem('handloom_contacts') || '[]');
        list.push({ ...entry, createdAt: new Date().toISOString() });
        localStorage.setItem('handloom_contacts', JSON.stringify(list));
    } catch (e) { }
}

// -----------------------------------------------------------------
// 1. Style Selection (Before Generation)
// -----------------------------------------------------------------
function selectStyleCard(el, styleName) {
    selectedStyle = styleName;
    document.querySelectorAll('.style-pill').forEach(card => card.classList.remove('active'));
    document.querySelectorAll('.style-card').forEach(card => card.classList.remove('active'));
    if (el) {
        el.classList.add('active');
    } else {
        const pill = document.querySelector(`.style-pill[data-style="${styleName}"]`);
        if (pill) pill.classList.add('active');
    }

    // Set smart defaults in the compact preferences based on the selected style
    if (styleName === 'Floral') {
        currentDesign.motifType = 'lotus';
        currentDesign.bodyPattern = 'floral_vines';
        currentDesign.borderStyle = 'double_zari';
        currentDesign.palluStyle = 'decorative_pallu';
        currentDesign.title = "Floral Lata & Lotus Pure Silk Saree";
    } else if (styleName === 'Peacock') {
        currentDesign.motifType = 'peacock';
        currentDesign.bodyPattern = 'checks';
        currentDesign.borderStyle = 'peacock_border';
        currentDesign.palluStyle = 'grand_medallion';
        currentDesign.title = "Imperial Mayuri Crest & Kattam Silk Saree";
    } else if (styleName === 'Paisley/Mango') {
        currentDesign.motifType = 'mango';
        currentDesign.bodyPattern = 'paisley_lattice';
        currentDesign.borderStyle = 'double_zari';
        currentDesign.palluStyle = 'decorative_pallu';
        currentDesign.title = "Sacred Kalka Brocade Handloom Saree";
    } else if (styleName === 'Temple Border') {
        currentDesign.motifType = 'temple';
        currentDesign.bodyPattern = 'scattered_buttis';
        currentDesign.borderStyle = 'temple';
        currentDesign.palluStyle = 'cascade_temple';
        currentDesign.title = "Nizam Gopuram Spire Silk Saree";
    } else if (styleName === 'Geometric') {
        currentDesign.motifType = 'ikat';
        currentDesign.bodyPattern = 'diagonal_ikat';
        currentDesign.borderStyle = 'ikat_wave';
        currentDesign.palluStyle = 'ikat_block';
        currentDesign.title = "Pochampally Double Ikat Diamond Saree";
    } else if (styleName === 'Traditional Andhra') {
        currentDesign.motifType = 'mango';
        currentDesign.bodyPattern = 'checks';
        currentDesign.borderStyle = 'temple';
        currentDesign.palluStyle = 'traditional_stripes';
        currentDesign.title = "Heritage Mangalagiri Zari Checks Saree";
    }

    currentDesign.sareeStyle = styleName;

    // Update active badge in studio
    const tag = document.getElementById('sareeTagBadge');
    if (tag) tag.textContent = `${styleName} Silk Saree`;

    // Synchronize both Studio Left Inputs and Studio Right Preview controls
    syncAllControlsToUI();

    // If already generated once, update preview in real-time; otherwise maintain welcome guide
    if (hasGenerated) {
        renderSareeCanvas();
    } else {
        renderWelcomeCanvas();
    }

    const msg = currentLang === 'te-IN' ? `డిజైన్ శైలి ఎంచుకోబడింది: ${styleName}` : `Selected Style: ${styleName}`;
    showToast(`✨ ${msg}`);
}

// -----------------------------------------------------------------
// 2. Language Toggle System
// -----------------------------------------------------------------
function switchLanguage(lang) {
    currentLang = lang;
    document.getElementById('langEnBtn').classList.toggle('active', lang === 'en-US');
    document.getElementById('langTeBtn').classList.toggle('active', lang === 'te-IN');

    // Update text content of elements with data-en and data-te
    document.querySelectorAll('[data-en]').forEach(el => {
        if (lang === 'te-IN' && el.getAttribute('data-te')) {
            el.textContent = el.getAttribute('data-te');
        } else if (el.getAttribute('data-en')) {
            el.textContent = el.getAttribute('data-en');
        }
    });

    // Update speech status language message
    const speechStatus = document.getElementById('speechStatus');
    if (speechStatus && !isRecording) {
        speechStatus.innerHTML = lang === 'te-IN'
            ? 'మగ్గం వివరాలు లేదా మైక్రోఫోన్ నొక్కి మాట్లాడండి.'
            : 'Click microphone to activate speech recognition.';
    }

    if (hasGenerated) {
        renderSareeCanvas();
    } else {
        renderWelcomeCanvas();
    }
}

// -----------------------------------------------------------------
// 3. Speech-to-Text Recognition (Telugu & English)
// -----------------------------------------------------------------
function initSpeechRecognition() {
    const micBtn = document.getElementById('micBtn');
    const speechStatus = document.getElementById('speechStatus');
    const promptInput = document.getElementById('promptInput');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        if (speechStatus) {
            speechStatus.innerHTML = '<span style="color:#EF4444">Speech recognition not supported in this browser. Please type your requirement.</span>';
        }
        if (micBtn) micBtn.style.opacity = '0.5';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.lang = currentLang;
                finalTranscript = '';
                try {
                    recognition.start();
                } catch (err) {
                    try { recognition.stop(); } catch (e) { }
                    setTimeout(() => {
                        try { recognition.start(); } catch (e) { }
                    }, 100);
                }
            }
        });
    }

    recognition.onstart = () => {
        isRecording = true;
        finalTranscript = '';
        if (micBtn) micBtn.classList.add('recording');
        if (speechStatus) {
            speechStatus.innerHTML = currentLang === 'te-IN'
                ? '🔴 వింటున్నాము... మాట్లాడండి (తెలుగు). పూర్తికాగానే మైక్ మళ్లీ నొక్కండి...'
                : '🔴 Listening... Speak your requirement now. Click mic again when finished speaking...';
        }
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += (finalTranscript ? ' ' : '') + transcript.trim();
            } else {
                interimTranscript += transcript;
            }
        }
        const fullSpokenText = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        if (promptInput && fullSpokenText) {
            promptInput.value = fullSpokenText;
        }
        // STRICT REQUIREMENT: DO NOT generate any design inside onresult
    };

    recognition.onerror = (event) => {
        isRecording = false;
        if (micBtn) micBtn.classList.remove('recording');
        if (event.error === 'no-speech') {
            if (speechStatus) {
                speechStatus.innerHTML = currentLang === 'te-IN'
                    ? 'మాటలు వినబడలేదు. మైక్రోఫోన్ నొక్కి మళ్లీ మాట్లాడండి లేదా టైప్ చేయండి.'
                    : 'No speech was detected. Click microphone to speak or type above.';
            }
        } else if (event.error !== 'aborted') {
            if (speechStatus) {
                speechStatus.innerHTML = `<span style="color:#EF4444">Voice notice: ${event.error}</span>`;
            }
        }
    };

    recognition.onend = () => {
        isRecording = false;
        if (micBtn) micBtn.classList.remove('recording');

        // STRICT REQUIREMENT: DO NOT generate any design inside onend!
        // Display complete recognized text so user can review or edit before clicking "Generate My Design".
        if (promptInput && promptInput.value.trim().length > 0) {
            if (speechStatus) {
                speechStatus.innerHTML = currentLang === 'te-IN'
                    ? '✅ వాయిస్ టెక్స్ట్‌గా మార్చబడింది. మీ వివరాలను సరిచూసుకుని, క్రింద ఉన్న "నా డిజైన్‌ను రూపొందించండి" బటన్ నొక్కండి.'
                    : '✅ Speech recognized! Review or edit your text above, then click "Generate My Design" below.';
            }
        } else {
            if (speechStatus) {
                speechStatus.innerHTML = currentLang === 'te-IN'
                    ? 'మైక్రోఫోన్ నొక్కి మాట్లాడండి లేదా టైప్ చేయండి.'
                    : 'Click microphone to speak in Telugu or English, or type above.';
            }
        }
    };
}

function useSamplePrompt(promptEn, promptTe) {
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.value = currentLang === 'te-IN' ? promptTe : promptEn;
    }
    showToast(currentLang === 'te-IN' ? 'నమూనా వివరాలు చేర్చబడ్డాయి!' : 'Sample requirement loaded!');
}

function syncColorHexTags() {
    const syncTag = (inputId, tagId) => {
        const input = document.getElementById(inputId);
        const tag = document.getElementById(tagId);
        if (input && tag) tag.textContent = input.value.toUpperCase();
    };
    syncTag('bodyColorPicker', 'bodyHexTag');
    syncTag('borderColorPicker', 'borderHexTag');
    syncTag('palluColorPicker', 'palluHexTag');
    syncTag('zariColorPicker', 'zariHexTag');

    syncTag('s3BodyColorPicker', 's3BodyHexTag');
    syncTag('s3BorderColorPicker', 's3BorderHexTag');
    syncTag('s3PalluColorPicker', 's3PalluHexTag');
    syncTag('s3ZariColorPicker', 's3ZariHexTag');
}

function syncAllControlsToUI() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    };

    // Customization Atelier Controls
    setVal('bodyColorPicker', currentDesign.bodyColor);
    setVal('borderColorPicker', currentDesign.borderColor);
    setVal('palluColorPicker', currentDesign.palluColor);
    setVal('zariColorPicker', currentDesign.zariColor);
    setVal('motifSelect', currentDesign.motifType);
    setVal('borderSelect', currentDesign.borderStyle);
    setVal('bodyPatternSelect', currentDesign.bodyPattern);
    setVal('palluSelect', currentDesign.palluStyle);
    setVal('densitySelect', currentDesign.motifDensity);

    // Live Customization Toolbar Controls
    setVal('s3BodyColorPicker', currentDesign.bodyColor);
    setVal('s3BorderColorPicker', currentDesign.borderColor);
    setVal('s3PalluColorPicker', currentDesign.palluColor);
    setVal('s3ZariColorPicker', currentDesign.zariColor);
    setVal('s3MotifSelect', currentDesign.motifType);
    setVal('s3BorderSelect', currentDesign.borderStyle);
    setVal('s3PalluSelect', currentDesign.palluStyle);
    setVal('s3BodyPatternSelect', currentDesign.bodyPattern);

    // Active Category Pill
    const catBadge = document.getElementById('activeCategoryName');
    if (catBadge && selectedStyle) catBadge.textContent = selectedStyle;

    syncColorHexTags();
}

function applyColorPalette(body, border, pallu, zari, name) {
    currentDesign.bodyColor = body;
    currentDesign.borderColor = border;
    currentDesign.palluColor = pallu;
    currentDesign.zariColor = zari;
    syncAllControlsToUI();
    if (hasGenerated) renderSareeCanvas();
    showToast(`🎨 Applied Palette: ${name}`);
}

function initScreen3Customizations() {
    const bindS3Color = (s3Id, baseId, prop, s3TagId, baseTagId) => {
        const s3El = document.getElementById(s3Id);
        const baseEl = document.getElementById(baseId);
        const s3Tag = document.getElementById(s3TagId);
        const baseTag = document.getElementById(baseTagId);
        if (s3El) {
            s3El.addEventListener('input', (e) => {
                const val = e.target.value;
                currentDesign[prop] = val;
                if (baseEl) baseEl.value = val;
                if (s3Tag) s3Tag.textContent = val.toUpperCase();
                if (baseTag) baseTag.textContent = val.toUpperCase();
                if (hasGenerated) renderSareeCanvas();
            });
        }
    };

    bindS3Color('s3BodyColorPicker', 'bodyColorPicker', 'bodyColor', 's3BodyHexTag', 'bodyHexTag');
    bindS3Color('s3BorderColorPicker', 'borderColorPicker', 'borderColor', 's3BorderHexTag', 'borderHexTag');
    bindS3Color('s3PalluColorPicker', 'palluColorPicker', 'palluColor', 's3PalluHexTag', 'palluHexTag');
    bindS3Color('s3ZariColorPicker', 'zariColorPicker', 'zariColor', 's3ZariHexTag', 'zariHexTag');

    const bindS3Select = (s3Id, baseId, prop) => {
        const s3El = document.getElementById(s3Id);
        const baseEl = document.getElementById(baseId);
        if (s3El) {
            s3El.addEventListener('change', (e) => {
                const val = e.target.value;
                currentDesign[prop] = val;
                if (baseEl) baseEl.value = val;
                if (hasGenerated) renderSareeCanvas();
            });
        }
    };

    bindS3Select('s3BodyPatternSelect', 'bodyPatternSelect', 'bodyPattern');
    bindS3Select('s3BorderSelect', 'borderSelect', 'borderStyle');
    bindS3Select('s3PalluSelect', 'palluSelect', 'palluStyle');
    bindS3Select('s3MotifSelect', 'motifSelect', 'motifType');
}

// -----------------------------------------------------------------
// 4. Event Listeners & Controls Initialization
// -----------------------------------------------------------------
function initEventListeners() {
    // Generate Final Design Button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => triggerAISuggestion(false));
    }

    // Support Enter key in Prompt Textarea for rapid generation
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                triggerAISuggestion(false);
            }
        });
    }

    // Generate Another Design Button (Cycles visible pattern combinations)
    const generateAnotherBtn = document.getElementById('generateAnotherBtn');
    if (generateAnotherBtn) {
        generateAnotherBtn.addEventListener('click', generateAnotherDesign);
    }

    // Customization color pickers (Screen 2 with Screen 3 sync)
    const bindColor = (id, prop, tagId, s3Id, s3TagId) => {
        const el = document.getElementById(id);
        const tag = document.getElementById(tagId);
        const s3El = s3Id ? document.getElementById(s3Id) : null;
        const s3Tag = s3TagId ? document.getElementById(s3TagId) : null;
        if (el) {
            el.addEventListener('input', (e) => {
                const val = e.target.value;
                currentDesign[prop] = val;
                if (tag) tag.textContent = val.toUpperCase();
                if (s3El) s3El.value = val;
                if (s3Tag) s3Tag.textContent = val.toUpperCase();
                if (hasGenerated) renderSareeCanvas();
            });
        }
    };

    bindColor('bodyColorPicker', 'bodyColor', 'bodyHexTag', 's3BodyColorPicker', 's3BodyHexTag');
    bindColor('borderColorPicker', 'borderColor', 'borderHexTag', 's3BorderColorPicker', 's3BorderHexTag');
    bindColor('palluColorPicker', 'palluColor', 'palluHexTag', 's3PalluColorPicker', 's3PalluHexTag');
    bindColor('zariColorPicker', 'zariColor', 'zariHexTag', 's3ZariColorPicker', 's3ZariHexTag');

    // Select dropdowns (Screen 2 with Screen 3 sync)
    const bindSelect = (id, prop, s3Id) => {
        const el = document.getElementById(id);
        const s3El = s3Id ? document.getElementById(s3Id) : null;
        if (el) {
            el.addEventListener('change', (e) => {
                currentDesign[prop] = e.target.value;
                if (s3El) s3El.value = e.target.value;
                if (hasGenerated) renderSareeCanvas();
            });
        }
    };

    bindSelect('bodyPatternSelect', 'bodyPattern', 's3BodyPatternSelect');
    bindSelect('borderSelect', 'borderStyle', 's3BorderSelect');
    bindSelect('palluSelect', 'palluStyle', null);
    bindSelect('motifSelect', 'motifType', 's3MotifSelect');
    bindSelect('densitySelect', 'motifDensity', null);

    const fabricSelect = document.getElementById('fabricSelect');
    if (fabricSelect) {
        fabricSelect.addEventListener('change', (e) => {
            currentDesign.fabricType = e.target.value;
            updateWeaverSpecs();
            if (hasGenerated) renderSareeCanvas();
        });
    }

    // Save & Download buttons
    const saveBtn = document.getElementById('saveDesignBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveDesign);

    const downloadBtn = document.getElementById('downloadPreviewBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadCanvasPNG);

    const printBtn = document.getElementById('printCardBtn');
    if (printBtn) printBtn.addEventListener('click', printSpecCard);

    // Modal collection listeners
    const openCollBtn = document.getElementById('openCollectionBtn');
    if (openCollBtn) openCollBtn.addEventListener('click', openCollectionModal);

    const closeCollBtn = document.getElementById('closeCollectionBtn');
    if (closeCollBtn) {
        closeCollBtn.addEventListener('click', () => {
            const modal = document.getElementById('collectionModal');
            if (modal) modal.classList.remove('active');
        });
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('viewFlatBtn').classList.toggle('active', mode === 'flat');
    document.getElementById('viewDrapeBtn').classList.toggle('active', mode === 'drape');
    document.getElementById('viewZoomBtn').classList.toggle('active', mode === 'zoom');
    if (hasGenerated) {
        renderSareeCanvas();
    } else {
        renderWelcomeCanvas();
    }
}

// -----------------------------------------------------------------
// 5. Backend Health & AI Generation Processing
// -----------------------------------------------------------------
async function checkBackendHealth() {
    try {
        await fetch('/api/health');
    } catch (e) {
        // Standalone client mode operates smoothly with local browser storage
    }
}

async function triggerAISuggestion(isRegenerate = false) {
    hasGenerated = true;
    navigateToPage('studio');

    // Reveal the post-generation customization atelier and live toolbar
    const postGen = document.getElementById('postGenerationCustomization');
    if (postGen) postGen.style.display = 'block';
    const previewBar = document.getElementById('previewCustomizationBar');
    if (previewBar) previewBar.style.display = 'block';

    const promptInput = document.getElementById('promptInput');
    const userText = promptInput ? promptInput.value.trim() : '';
    const generateBtn = document.getElementById('generateBtn');

    // Combine selected style with user voice/text requirement
    const combinedPrompt = userText
        ? `${selectedStyle} style handloom saree. ${userText}`
        : `${selectedStyle} style traditional handloom saree in pure silk`;

    if (isRegenerate) {
        generationSeed++;
    } else {
        generationSeed = 0;
    }

    if (generateBtn) {
        generateBtn.innerHTML = '<span>⏳</span> Synthesizing Handloom Design...';
        generateBtn.disabled = true;
    }

    try {
        const response = await fetch('/api/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: combinedPrompt, style: selectedStyle, language: currentLang, seed: generationSeed })
        });

        if (response.ok) {
            const resData = await response.json();
            if (resData.variations && resData.variations.length > 0) {
                applySingleAIDesign(resData.variations[0], resData.detectedRequirements, combinedPrompt);
            } else if (resData.suggestion) {
                applySingleAIDesign(resData.suggestion, resData.detectedRequirements, combinedPrompt);
            } else {
                fallbackClientAISuggestions(combinedPrompt, generationSeed);
            }
        } else {
            fallbackClientAISuggestions(combinedPrompt, generationSeed);
        }
    } catch (err) {
        fallbackClientAISuggestions(combinedPrompt, generationSeed);
    } finally {
        if (generateBtn) {
            const btnTextEn = "Generate My Design";
            const btnTextTe = "నా డిజైన్‌ను రూపొందించండి";
            generateBtn.innerHTML = `<span>✨</span> <span data-en="${btnTextEn}" data-te="${btnTextTe}">${currentLang === 'te-IN' ? btnTextTe : btnTextEn}</span>`;
            generateBtn.disabled = false;
        }
    }
}

// -----------------------------------------------------------------
// 6. One Design at a Time & "Generate Another Design" Engine
// -----------------------------------------------------------------
function generateAnotherDesign() {
    hasGenerated = true;
    generationSeed++;

    // User's selected preferences to preserve
    const userBodyColor = currentDesign.bodyColor;
    const userBorderColor = currentDesign.borderColor;
    const userPalluColor = currentDesign.palluColor;
    const userZariColor = currentDesign.zariColor;
    const userDensity = currentDesign.motifDensity;

    // Rich distinct pattern presets: Changes actual motif shapes, arrangement, saree body pattern, border, and pallu
    const patternVariations = [
        {
            title: "Floral Vines & Nizam Temple Gopuram",
            bodyPattern: "floral_vines",
            borderStyle: "temple",
            palluStyle: "grand_medallion",
            motifType: selectedStyle === 'Peacock' ? 'peacock' : (selectedStyle === 'Paisley/Mango' ? 'mango' : 'lotus'),
            motifArrangement: "staggered",
            density: userDensity || "Medium",
            specs: { warp: "2/120s Mulberry Silk", weft: "Pure Silk 20/22 Denier", reed: "88 Reed / 94 Picks", cards: "280 Hooks Jacquard Set", duration: "7 - 9 Days" }
        },
        {
            title: "Geometric Kattam Checks & Peacock Procession",
            bodyPattern: "checks",
            borderStyle: "peacock_border",
            palluStyle: "decorative_pallu",
            motifType: selectedStyle === 'Floral' ? 'lotus' : (selectedStyle === 'Paisley/Mango' ? 'mango' : 'peacock'),
            motifArrangement: "grid",
            density: "Dense",
            specs: { warp: "2/120s Mulberry Silk", weft: "Pure Silk 20/22 Denier", reed: "92 Reed / 98 Picks", cards: "320 Hooks Jacquard Set", duration: "8 - 10 Days" }
        },
        {
            title: "Paisley Kalka Jaal Lattice & Double Zari Creeper",
            bodyPattern: "paisley_lattice",
            borderStyle: "double_zari",
            palluStyle: "traditional_stripes",
            motifType: selectedStyle === 'Floral' ? 'lotus' : 'mango',
            motifArrangement: "lattice_nodes",
            density: userDensity || "Medium",
            specs: { warp: "2/120s Mulberry Silk", weft: "Pure Silk 20/22 Denier", reed: "86 Reed / 92 Picks", cards: "260 Hooks Jacquard Set", duration: "6 - 8 Days" }
        },
        {
            title: "Pochampally Ikat Stepped Chevrons & Wave Border",
            bodyPattern: "diagonal_ikat",
            borderStyle: "ikat_wave",
            palluStyle: "ikat_block",
            motifType: selectedStyle === 'Temple Border' ? 'temple' : 'ikat',
            motifArrangement: "diagonal",
            density: "Medium",
            specs: { warp: "2/100s Mercerized Cotton", weft: "80s Combed Cotton", reed: "80 Reed / 88 Picks", cards: "240 Hooks Handloom Loom", duration: "5 - 7 Days" }
        },
        {
            title: "Cascading Temple Spire Tiers & Scattered Buttis",
            bodyPattern: "scattered_buttis",
            borderStyle: "temple",
            palluStyle: "cascade_temple",
            motifType: selectedStyle === 'Peacock' ? 'peacock' : 'temple',
            motifArrangement: "border_trailing",
            density: "Sparse",
            specs: { warp: "2/120s Mulberry Silk", weft: "Pure Silk 20/22 Denier", reed: "84 Reed / 90 Picks", cards: "240 Hooks Jacquard Set", duration: "6 - 8 Days" }
        },
        {
            title: "Rhythmic Zari Pinstripes & Chevron Zig-Zag",
            bodyPattern: "stripes",
            borderStyle: "chevron_pattern",
            palluStyle: "decorative_pallu",
            motifType: selectedStyle === 'Peacock' ? 'peacock' : (selectedStyle === 'Floral' ? 'lotus' : 'mango'),
            motifArrangement: "staggered",
            density: userDensity || "Medium",
            specs: { warp: "2/120s Mulberry Silk", weft: "Pure Silk 20/22 Denier", reed: "90 Reed / 96 Picks", cards: "300 Hooks Jacquard Set", duration: "7 - 9 Days" }
        }
    ];

    const presetIndex = generationSeed % patternVariations.length;
    const nextPreset = patternVariations[presetIndex];

    // Apply the new pattern combination while preserving user colors & preferences
    currentDesign.bodyPattern = nextPreset.bodyPattern;
    currentDesign.borderStyle = nextPreset.borderStyle;
    currentDesign.palluStyle = nextPreset.palluStyle;
    currentDesign.motifType = nextPreset.motifType;
    currentDesign.motifArrangement = nextPreset.motifArrangement;
    currentDesign.motifDensity = nextPreset.density;
    currentDesign.title = `${selectedStyle} Saree - ${nextPreset.title}`;

    // Synchronize both Screen 2 and Screen 3 UI controls
    syncAllControlsToUI();

    // Update AI detected chips & rationale
    const chipBorder = document.getElementById('chipBorder');
    const chipMotif = document.getElementById('chipMotif');
    if (chipBorder) chipBorder.innerHTML = `🏛️ Border: <b>${currentDesign.borderStyle.replace(/_/g, ' ').toUpperCase()}</b>`;
    if (chipMotif) chipMotif.innerHTML = `🪷 Motif: <b>${currentDesign.motifType.toUpperCase()}</b>`;

    const aiSum = document.getElementById('aiSummaryText');
    if (aiSum) {
        aiSum.innerHTML = `<b>Pattern Variation #${presetIndex + 1}:</b> Synthesized <b>${nextPreset.title}</b> with ${currentDesign.motifArrangement} motif distribution and ${currentDesign.borderStyle.replace(/_/g, ' ')} border.`;
    }

    if (nextPreset.specs) {
        setValText('specWarp', nextPreset.specs.warp);
        setValText('specWeft', nextPreset.specs.weft);
        setValText('specReed', nextPreset.specs.reed);
        setValText('specCards', nextPreset.specs.cards);
        setValText('specDuration', nextPreset.specs.duration);
    }

    // Re-render the single large canvas preview
    renderSareeCanvas();

    const toastMsg = currentLang === 'te-IN'
        ? `🎲 కొత్త ప్యాటర్న్: ${nextPreset.title}`
        : `🎲 New Pattern Generated: ${nextPreset.title}`;
    showToast(toastMsg);
}

function applySingleAIDesign(suggestion, detectedReqs, promptText) {
    if (!suggestion) return;

    // Reveal post-generation customization sections
    const postGen = document.getElementById('postGenerationCustomization');
    if (postGen) postGen.style.display = 'block';
    const previewBar = document.getElementById('previewCustomizationBar');
    if (previewBar) previewBar.style.display = 'block';

    currentDesign.title = suggestion.suggestedTitle || `${selectedStyle} Handloom Saree`;
    currentDesign.sareeStyle = suggestion.style ? suggestion.style.nameEn : selectedStyle;
    currentDesign.bodyColor = suggestion.colors ? suggestion.colors.body : currentDesign.bodyColor;
    currentDesign.borderColor = suggestion.colors ? suggestion.colors.border : currentDesign.borderColor;
    currentDesign.palluColor = suggestion.colors ? suggestion.colors.pallu : currentDesign.palluColor;
    currentDesign.zariColor = suggestion.colors ? suggestion.colors.zari : currentDesign.zariColor;
    currentDesign.motifType = suggestion.motif ? suggestion.motif.id : currentDesign.motifType;
    currentDesign.borderStyle = suggestion.borderStyle || currentDesign.borderStyle;
    currentDesign.bodyPattern = suggestion.bodyPattern || currentDesign.bodyPattern;
    currentDesign.palluStyle = suggestion.palluStyle || currentDesign.palluStyle;
    currentDesign.motifArrangement = suggestion.motifArrangement || "staggered";
    currentDesign.motifDensity = suggestion.motifDensity || "Medium";

    // Synchronize both Studio Customization Atelier and Preview toolbar controls
    syncAllControlsToUI();

    // Update AI detected chips
    if (detectedReqs) {
        const chipColor = document.getElementById('chipColor');
        const chipMotif = document.getElementById('chipMotif');
        const chipBorder = document.getElementById('chipBorder');
        const chipStyle = document.getElementById('chipStyle');

        if (chipColor) chipColor.innerHTML = `🎨 Color: <b>${detectedReqs.color}</b>`;
        if (chipMotif) chipMotif.innerHTML = `🪷 Motif: <b>${detectedReqs.motif}</b>`;
        if (chipBorder) chipBorder.innerHTML = `🏛️ Border: <b>${currentDesign.borderStyle.replace(/_/g, ' ').toUpperCase()}</b>`;
        if (chipStyle) chipStyle.innerHTML = `🧵 Style: <b>${detectedReqs.style || selectedStyle}</b>`;
    }

    const aiSum = document.getElementById('aiSummaryText');
    if (aiSum) aiSum.innerHTML = suggestion.aiSummary || `Handloom saree synthesized with authentic ${currentDesign.bodyPattern.replace(/_/g, ' ')} pattern and ${currentDesign.borderStyle.replace(/_/g, ' ')} border.`;

    const recStyle = document.getElementById('recStyleVal');
    if (recStyle) recStyle.textContent = currentDesign.sareeStyle;

    const recMotif = document.getElementById('recMotifVal');
    if (recMotif) recMotif.textContent = currentDesign.motifType.toUpperCase();

    const palName = document.getElementById('paletteNameText');
    if (palName) palName.textContent = suggestion.colors ? (suggestion.colors.paletteName || 'Handloom Palette') : 'Handloom Palette';

    const swBody = document.getElementById('swatchBody');
    if (swBody) swBody.style.backgroundColor = currentDesign.bodyColor;
    const swBorder = document.getElementById('swatchBorder');
    if (swBorder) swBorder.style.backgroundColor = currentDesign.borderColor;
    const swPallu = document.getElementById('swatchPallu');
    if (swPallu) swPallu.style.backgroundColor = currentDesign.palluColor;

    const recBorder = document.getElementById('recBorderVal');
    if (recBorder) recBorder.textContent = currentDesign.borderStyle.replace(/_/g, ' ').toUpperCase();

    // Weaver Specs Update
    if (suggestion.weaverSpecs) {
        setValText('specWarp', suggestion.weaverSpecs.warpYarn);
        setValText('specWeft', suggestion.weaverSpecs.weftYarn);
        setValText('specReed', suggestion.weaverSpecs.reedPicks);
        setValText('specCards', suggestion.weaverSpecs.jacquardCards);
        setValText('specDuration', suggestion.weaverSpecs.estimatedWeavingTime);
    }

    // Render single large saree preview
    renderSareeCanvas();
    showToast("✨ Handloom Design Synthesized Successfully!");
}

function setValText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function fallbackClientAISuggestions(promptText, seed = 0) {
    const lower = (promptText || '').toLowerCase().trim();

    const COLOR_DEFS = [
        [["red", "crimson", "kempu", "ఎరుపు", "కెంపు", "రూబీ"], "#800020", "Crimson Red"],
        [["blue", "navy", "indigo", "నీలం", "బ్లూ"], "#1D4ED8", "Royal Blue"],
        [["teal", "cyan", "పింఛం", "నెమలి పింఛం"], "#0F766E", "Peacock Teal"],
        [["green", "emerald", "పచ్చ", "ఆకుపచ్చ"], "#047857", "Emerald Green"],
        [["yellow", "pitambaram", "పసుపు", "పీతాంబరం"], "#EAB308", "Pitambaram Yellow"],
        [["gold", "golden", "బంగారు", "బంగారం"], "#D97706", "Rich Gold"],
        [["pink", "rose", "magenta", "గులాబీ"], "#DB2777", "Rose Pink"],
        [["purple", "violet", "వంగపువ్వు", "ఊదా"], "#6B21A8", "Royal Purple"],
        [["orange", "terracotta", "నారింజ"], "#C2410C", "Terracotta Orange"],
        [["black", "dark", "నలుపు"], "#18181B", "Charcoal Black"],
        [["white", "cream", "ivory", "తెలుపు"], "#FAF7F2", "Ivory White"],
        [["silver", "gray", "వెండి"], "#94A3B8", "Metallic Silver"]
    ];

    let matchedColors = [];
    COLOR_DEFS.forEach(([kws, hex, name]) => {
        kws.forEach(kw => {
            if (lower.includes(kw) && !matchedColors.some(c => c.name === name)) {
                matchedColors.push({ hex, name });
            }
        });
    });

    let bodyColor = "#800020";
    let borderColor = "#D97706";
    let palluColor = "#991B1B";
    let zariColor = "#FBBF24";
    let paletteLabel = "Handloom Crimson & Gold";

    if (matchedColors.length >= 2) {
        bodyColor = matchedColors[0].hex;
        borderColor = matchedColors[1].hex;
        palluColor = borderColor;
        paletteLabel = `${matchedColors[0].name} & ${matchedColors[1].name}`;
    } else if (matchedColors.length === 1) {
        bodyColor = matchedColors[0].hex;
        borderColor = "#D97706";
        palluColor = "#991B1B";
        paletteLabel = `${matchedColors[0].name} with Gold Zari`;
    } else {
        // Authentic defaults matched to selected style
        if (selectedStyle === 'Peacock') {
            bodyColor = "#0F766E";
            borderColor = "#800020";
            palluColor = "#800020";
            paletteLabel = "Peacock Teal & Crimson Red";
        } else if (selectedStyle === 'Temple Border') {
            bodyColor = "#047857";
            borderColor = "#800020";
            palluColor = "#800020";
            paletteLabel = "Emerald Green & Temple Crimson";
        } else if (selectedStyle === 'Geometric') {
            bodyColor = "#EAB308";
            borderColor = "#6B21A8";
            palluColor = "#6B21A8";
            paletteLabel = "Pitambaram Gold & Royal Purple";
        } else if (selectedStyle === 'Paisley/Mango') {
            bodyColor = "#D97706";
            borderColor = "#5C0B1B";
            palluColor = "#5C0B1B";
            paletteLabel = "Mustard Gold & Deep Maroon";
        } else {
            bodyColor = "#800020";
            borderColor = "#D97706";
            palluColor = "#991B1B";
            paletteLabel = "Bridal Crimson & Royal Gold";
        }
    }

    if (lower.includes('silver') || lower.includes('వెండి')) zariColor = "#E2E8F0";

    // Motif Detection: user prompt keywords take precedence, then fallback to selectedStyle
    let motifId = "lotus";
    if (lower.includes('peacock') || lower.includes('mayuri') || lower.includes('నెమలి')) {
        motifId = "peacock";
    } else if (lower.includes('mango') || lower.includes('paisley') || lower.includes('kalka') || lower.includes('మామిడి') || lower.includes('కల్కా')) {
        motifId = "mango";
    } else if (lower.includes('floral') || lower.includes('flower') || lower.includes('lotus') || lower.includes('పూలు') || lower.includes('తామర')) {
        motifId = "lotus";
    } else if (lower.includes('temple') || lower.includes('gopuram') || lower.includes('గోపురం') || lower.includes('గుడి')) {
        motifId = "temple";
    } else if (lower.includes('elephant') || lower.includes('gaja') || lower.includes('ఏనుగు')) {
        motifId = "elephant";
    } else if (lower.includes('ikat') || lower.includes('diamond') || lower.includes('geometric') || lower.includes('ఇకత్')) {
        motifId = "ikat";
    } else if (lower.includes('swan') || lower.includes('hamsa') || lower.includes('హంస')) {
        motifId = "swan";
    } else {
        if (selectedStyle === 'Peacock') motifId = "peacock";
        else if (selectedStyle === 'Paisley/Mango') motifId = "mango";
        else if (selectedStyle === 'Temple Border') motifId = "temple";
        else if (selectedStyle === 'Geometric') motifId = "ikat";
        else if (selectedStyle === 'Traditional Andhra') motifId = "mango";
        else motifId = "lotus";
    }

    // Border Detection: user prompt keywords take precedence, then fallback to selectedStyle
    let borderStyle = "double_zari";
    if (lower.includes('temple') || lower.includes('gopuram') || lower.includes('గోపురం') || lower.includes('గుడి')) {
        borderStyle = "temple";
    } else if (lower.includes('peacock border') || lower.includes('నెమలి బోర్డర్') || (lower.includes('peacock') && lower.includes('border'))) {
        borderStyle = "peacock_border";
    } else if (lower.includes('ikat') || lower.includes('wave') || lower.includes('ఇకత్')) {
        borderStyle = "ikat_wave";
    } else if (lower.includes('chevron') || lower.includes('zig') || lower.includes('జిగ్')) {
        borderStyle = "chevron_pattern";
    } else if (lower.includes('stripe') || lower.includes('గీతలు')) {
        borderStyle = "zari_stripes";
    } else if (lower.includes('zari') || lower.includes('జరీ')) {
        borderStyle = "double_zari";
    } else {
        if (selectedStyle === 'Temple Border' || selectedStyle === 'Traditional Andhra') borderStyle = "temple";
        else if (selectedStyle === 'Peacock') borderStyle = "peacock_border";
        else if (selectedStyle === 'Geometric') borderStyle = "ikat_wave";
        else borderStyle = "double_zari";
    }

    // Body Pattern Detection: user prompt keywords take precedence, then fallback to selectedStyle
    let bodyPattern = "floral_vines";
    if (lower.includes('check') || lower.includes('kattam') || lower.includes('గడులు')) {
        bodyPattern = "checks";
    } else if (lower.includes('lattice') || lower.includes('jaal') || lower.includes('వల')) {
        bodyPattern = "lattice";
    } else if (lower.includes('paisley lattice') || lower.includes('మామిడి జాల్')) {
        bodyPattern = "paisley_lattice";
    } else if (lower.includes('diagonal') || lower.includes('క్రాస్')) {
        bodyPattern = "diagonal_ikat";
    } else if (lower.includes('stripe') || lower.includes('గీతలు')) {
        bodyPattern = "stripes";
    } else if (lower.includes('butti') || lower.includes('బుటాలు')) {
        bodyPattern = "scattered_buttis";
    } else if (lower.includes('solid') || lower.includes('plain') || lower.includes('సాదా')) {
        bodyPattern = "solid";
    } else if (lower.includes('floral') || lower.includes('vine') || lower.includes('తీగలు')) {
        bodyPattern = "floral_vines";
    } else {
        if (selectedStyle === 'Peacock' || selectedStyle === 'Traditional Andhra') bodyPattern = "checks";
        else if (selectedStyle === 'Paisley/Mango') bodyPattern = "paisley_lattice";
        else if (selectedStyle === 'Geometric') bodyPattern = "diagonal_ikat";
        else if (selectedStyle === 'Temple Border') bodyPattern = "scattered_buttis";
        else bodyPattern = "floral_vines";
    }

    // Pallu Style Detection: user prompt keywords take precedence, then fallback to selectedStyle
    let palluStyle = "grand_medallion";
    if (lower.includes('floral pallu') || lower.includes('పూల కొంగు')) {
        palluStyle = "decorative_pallu";
    } else if (lower.includes('temple pallu') || lower.includes('cascade') || lower.includes('గోపురాలు') || lower.includes('గోపురాల కొంగు')) {
        palluStyle = "cascade_temple";
    } else if (lower.includes('traditional pallu') || lower.includes('పట్టీల కొంగు')) {
        palluStyle = "traditional_stripes";
    } else if (lower.includes('ikat pallu') || lower.includes('ఇకత్ కొంగు')) {
        palluStyle = "ikat_block";
    } else if (lower.includes('medallion') || lower.includes('chakra') || lower.includes('చక్రం')) {
        palluStyle = "grand_medallion";
    } else {
        if (selectedStyle === 'Floral') palluStyle = "decorative_pallu";
        else if (selectedStyle === 'Temple Border') palluStyle = "cascade_temple";
        else if (selectedStyle === 'Traditional Andhra') palluStyle = "traditional_stripes";
        else if (selectedStyle === 'Geometric') palluStyle = "ikat_block";
        else palluStyle = "grand_medallion";
    }

    const suggestion = {
        suggestedTitle: `${selectedStyle} Handloom Saree`,
        style: { nameEn: selectedStyle, nameTe: selectedStyle },
        colors: { body: bodyColor, border: borderColor, pallu: palluColor, zari: zariColor, paletteName: paletteLabel },
        motif: { id: motifId, en: motifId.toUpperCase(), te: motifId },
        bodyPattern: bodyPattern,
        borderStyle: borderStyle,
        palluStyle: palluStyle,
        motifArrangement: "staggered",
        motifDensity: "Medium",
        aiSummary: `Synthesized <b>${selectedStyle}</b> handloom design directly from description: <b>${motifId.toUpperCase()}</b> motifs, <b>${bodyPattern.replace(/_/g, ' ')}</b> body and <b>${borderStyle.replace(/_/g, ' ')}</b> border with ${paletteLabel}.`,
        weaverSpecs: {
            warpYarn: "2/120s Mulberry Silk",
            weftYarn: "Pure Silk 20/22 Denier",
            reedPicks: "88 Reed / 94 Picks",
            jacquardCards: "280 Hooks Jacquard Set",
            estimatedWeavingTime: "7 - 9 Days"
        }
    };

    const detectedReqs = {
        color: paletteLabel,
        motif: motifId.toUpperCase(),
        border: borderStyle.replace(/_/g, ' ').toUpperCase(),
        style: selectedStyle
    };

    applySingleAIDesign(suggestion, detectedReqs, promptText);
}

function updateWeaverSpecs() {
    const fabSelect = document.getElementById('fabricSelect');
    const fab = fabSelect ? fabSelect.value : 'Silk';
    if (fab === 'Cotton') {
        setValText('specWarp', "2/100s Mercerized Cotton");
        setValText('specWeft', "80s Combed Cotton");
    } else {
        setValText('specWarp', "2/120s Mulberry Silk");
        setValText('specWeft', "Pure Silk 20/22 Denier");
    }
}

// -----------------------------------------------------------------
// 7. Welcome Screen Before Generation
// -----------------------------------------------------------------
function renderWelcomeCanvas() {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Warm loom background
    ctx.fillStyle = "#1E0A0F";
    ctx.fillRect(0, 0, w, h);

    // Draw baseline saree weave in background
    drawFlatSareeView(w, h, 0.45);

    // Elegant Indian Handloom Invitation Centerpiece
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    // Center Gold-trimmed Maroon Plaque
    ctx.fillStyle = "rgba(72, 10, 21, 0.94)";
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2.5;

    const boxW = 600;
    const boxH = 150;
    ctx.beginPath();
    ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    // Plaque Filigree Corner Dots
    ctx.fillStyle = "#D4AF37";
    const pad = 8;
    ctx.beginPath();
    ctx.arc(cx - boxW / 2 + pad, cy - boxH / 2 + pad, 3, 0, Math.PI * 2);
    ctx.arc(cx + boxW / 2 - pad, cy - boxH / 2 + pad, 3, 0, Math.PI * 2);
    ctx.arc(cx - boxW / 2 + pad, cy + boxH / 2 - pad, 3, 0, Math.PI * 2);
    ctx.arc(cx + boxW / 2 - pad, cy + boxH / 2 - pad, 3, 0, Math.PI * 2);
    ctx.fill();

    // Header Text
    ctx.textAlign = "center";
    ctx.fillStyle = "#FBF4DE";
    ctx.font = "700 18px Cinzel Decorative, Outfit, serif";
    const welcomeTitle = currentLang === 'te-IN'
        ? `✨ చేనేత స్టూడియో: ${selectedStyle} శైలి`
        : `✨ Handloom Studio: ${selectedStyle} Saree`;
    ctx.fillText(welcomeTitle, cx, cy - 24);

    // Subtitle Action Guide
    ctx.fillStyle = "#D4AF37";
    ctx.font = "600 14px Outfit, sans-serif";
    const welcomeSub = currentLang === 'te-IN'
        ? "🎙️ వాయిస్ లేదా టెక్స్ట్ ద్వారా చెప్పండి, వెంటనే డిజైన్ రూపొందుతుంది"
        : "🎙️ Speak in Telugu/English or type, then click 'Generate My Design'";
    ctx.fillText(welcomeSub, cx, cy + 8);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "12px Outfit, sans-serif";
    const subNote = currentLang === 'te-IN'
        ? "🎨 రూపొందించిన తర్వాత రంగులు, మోటిఫ్‌లు, బోర్డర్లు & పల్లూ మార్చుకోవచ్చు"
        : "🎨 Full customization for colors, motifs, borders & pallu unlocks after generation";
    ctx.fillText(subNote, cx, cy + 36);

    ctx.restore();

    const tagBadge = document.getElementById('sareeTagBadge');
    if (tagBadge) tagBadge.textContent = `${selectedStyle} (Ready to Generate)`;
}

// -----------------------------------------------------------------
// 8. Dynamic Saree Visualization Engine (Canvas Rendering)
// -----------------------------------------------------------------
function renderSareeCanvas() {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const tagBadge = document.getElementById('sareeTagBadge');
    if (tagBadge) tagBadge.textContent = `${currentDesign.title} (${currentDesign.fabricType})`;

    if (viewMode === 'flat') {
        drawFlatSareeView(w, h, 1.0);
    } else if (viewMode === 'drape') {
        drawDrapedSareeView(w, h);
    } else if (viewMode === 'zoom') {
        drawZoomMotifView(w, h);
    }
}

// Draw Flat Saree View (Pallu + Body + Borders + Repeat Motifs + Body Patterns)
function drawFlatSareeView(w, h, opacity = 1.0) {
    ctx.save();
    ctx.globalAlpha = opacity;

    const borderHeight = 60;
    const palluWidth = 230;

    // 1. Draw Body Base Fabric
    ctx.fillStyle = currentDesign.bodyColor;
    ctx.fillRect(palluWidth, borderHeight, w - palluWidth, h - (borderHeight * 2));

    // 2. Draw Body Patterns (Leafy Vines, Checks, Jaal Lattice, Ikat, etc.)
    drawBodyPattern(ctx, palluWidth, borderHeight, w - palluWidth, h - (borderHeight * 2), currentDesign.bodyPattern, currentDesign.zariColor);

    // Fabric Weave Micro Texture overlay
    drawWeaveTexture(palluWidth, borderHeight, w - palluWidth, h - (borderHeight * 2));

    // 3. Draw Pallu Section (Left End)
    drawPalluSection(ctx, 0, 0, palluWidth, h, currentDesign.palluStyle, currentDesign.palluColor, currentDesign.zariColor, currentDesign.motifType);

    // 4. Top & Bottom Borders
    ctx.fillStyle = currentDesign.borderColor;
    ctx.fillRect(palluWidth, 0, w - palluWidth, borderHeight);
    ctx.fillRect(palluWidth, h - borderHeight, w - palluWidth, borderHeight);

    // Draw Architectural Border Patterns
    drawBorderPattern(ctx, palluWidth, 0, w - palluWidth, borderHeight, currentDesign.borderStyle, true);
    drawBorderPattern(ctx, palluWidth, h - borderHeight, w - palluWidth, borderHeight, currentDesign.borderStyle, false);

    // 5. Draw Body Repeating Motifs
    drawBodyMotifs(ctx, palluWidth, borderHeight, w - palluWidth, h - (borderHeight * 2), currentDesign.motifType, currentDesign.motifDensity, currentDesign.motifArrangement, currentDesign.zariColor);

    // Border Divider Zari Frame
    ctx.strokeStyle = currentDesign.zariColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(palluWidth, borderHeight, w - palluWidth, h - borderHeight * 2);

    ctx.restore();
}

// -----------------------------------------------------------------
// 9. Authentic Handloom Motif Graphics Engine
// -----------------------------------------------------------------
function drawMotifSymbol(ctx, x, y, size, type, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'peacock') {
        // Authentic Mayuri Peacock Silhouette with Crest, S-Neck & Layered Plumes
        const s = size / 24;

        // Crest (3 Kalagi plumes with golden pearls)
        ctx.beginPath();
        ctx.moveTo(x - 2 * s, y - 8 * s);
        ctx.lineTo(x - 5 * s, y - 13 * s);
        ctx.moveTo(x, y - 9 * s);
        ctx.lineTo(x - 1 * s, y - 14 * s);
        ctx.moveTo(x + 2 * s, y - 8 * s);
        ctx.lineTo(x + 3 * s, y - 13 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x - 5 * s, y - 14 * s, 1.2 * s, 0, Math.PI * 2);
        ctx.arc(x - 1 * s, y - 15 * s, 1.2 * s, 0, Math.PI * 2);
        ctx.arc(x + 3 * s, y - 14 * s, 1.2 * s, 0, Math.PI * 2);
        ctx.fill();

        // Graceful S-Curved Neck and Head
        ctx.beginPath();
        ctx.arc(x - 1 * s, y - 6 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();

        // Beak pointing left
        ctx.beginPath();
        ctx.moveTo(x - 4 * s, y - 6 * s);
        ctx.lineTo(x - 8 * s, y - 5 * s);
        ctx.lineTo(x - 4 * s, y - 4 * s);
        ctx.closePath();
        ctx.fill();

        // Curved Breast and Body
        ctx.beginPath();
        ctx.moveTo(x - 1 * s, y - 3 * s);
        ctx.bezierCurveTo(x - 6 * s, y + 2 * s, x - 4 * s, y + 8 * s, x, y + 9 * s);
        ctx.bezierCurveTo(x + 5 * s, y + 9 * s, x + 7 * s, y + 4 * s, x + 3 * s, y - 1 * s);
        ctx.closePath();
        ctx.fill();

        // Wing details
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.arc(x + 1 * s, y + 4 * s, 3.5 * s, -0.4, Math.PI * 0.9);
        ctx.stroke();
        ctx.strokeStyle = color;

        // Fanned Tail Feathers (3 Layered Plumes with Eyelets)
        ctx.beginPath();
        ctx.moveTo(x + 3 * s, y + 6 * s);
        ctx.bezierCurveTo(x + 10 * s, y + 5 * s, x + 15 * s, y - 2 * s, x + 12 * s, y - 8 * s);
        ctx.bezierCurveTo(x + 7 * s, y - 4 * s, x + 4 * s, y + 2 * s, x + 3 * s, y + 6 * s);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 3 * s, y + 7 * s);
        ctx.bezierCurveTo(x + 12 * s, y + 9 * s, x + 18 * s, y + 2 * s, x + 16 * s, y - 4 * s);
        ctx.bezierCurveTo(x + 11 * s, y - 1 * s, x + 6 * s, y + 4 * s, x + 3 * s, y + 7 * s);
        ctx.fill();

        // Feather Eyes (Teardrop with inner center)
        ctx.beginPath();
        ctx.arc(x + 12 * s, y - 7 * s, 1.8 * s, 0, Math.PI * 2);
        ctx.arc(x + 16 * s, y - 3 * s, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();

        // Standing Perch Branch
        ctx.beginPath();
        ctx.moveTo(x - 6 * s, y + 10 * s);
        ctx.quadraticCurveTo(x, y + 8 * s, x + 8 * s, y + 11 * s);
        ctx.stroke();

    } else if (type === 'mango') {
        // Classic Indian Kalka / Ambi Paisley Motif
        const s = size / 24;

        ctx.beginPath();
        // Curled Hook Apex
        ctx.moveTo(x + 2 * s, y - 11 * s);
        ctx.bezierCurveTo(x + 10 * s, y - 9 * s, x + 12 * s, y - 2 * s, x + 9 * s, y + 4 * s);
        // Plump Teardrop Body
        ctx.bezierCurveTo(x + 6 * s, y + 10 * s, x - 5 * s, y + 11 * s, x - 8 * s, y + 5 * s);
        ctx.bezierCurveTo(x - 11 * s, y - 1 * s, x - 6 * s, y - 7 * s, x - 1 * s, y - 10 * s);
        // Inward curl
        ctx.bezierCurveTo(x + 3 * s, y - 12 * s, x + 5 * s, y - 7 * s, x + 2 * s, y - 5 * s);
        ctx.bezierCurveTo(x, y - 4 * s, x - 1 * s, y - 6 * s, x + 1 * s, y - 7 * s);
        ctx.fill();

        // Inner Paisley Spiral Whorl
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(x - 1 * s, y + 2 * s, 3.5 * s, 0, Math.PI * 1.5);
        ctx.stroke();

        // Calyx Double Leaf at Base
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x - 3 * s, y + 11 * s, 3.5 * s, 1.5 * s, -Math.PI / 4, 0, Math.PI * 2);
        ctx.ellipse(x + 3 * s, y + 11 * s, 3.5 * s, 1.5 * s, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'lotus') {
        // Blooming Indian Kamala (7-Petal Lotus)
        const s = size / 24;

        // Central pointed petal
        ctx.beginPath();
        ctx.moveTo(x, y - 12 * s);
        ctx.quadraticCurveTo(x + 4 * s, y - 5 * s, x, y + 6 * s);
        ctx.quadraticCurveTo(x - 4 * s, y - 5 * s, x, y - 12 * s);
        ctx.fill();

        // Inner Left Petal
        ctx.beginPath();
        ctx.moveTo(x, y + 5 * s);
        ctx.quadraticCurveTo(x - 7 * s, y - 2 * s, x - 6 * s, y - 9 * s);
        ctx.quadraticCurveTo(x - 2 * s, y - 4 * s, x, y + 5 * s);
        ctx.fill();

        // Inner Right Petal
        ctx.beginPath();
        ctx.moveTo(x, y + 5 * s);
        ctx.quadraticCurveTo(x + 7 * s, y - 2 * s, x + 6 * s, y - 9 * s);
        ctx.quadraticCurveTo(x + 2 * s, y - 4 * s, x, y + 5 * s);
        ctx.fill();

        // Outer Sweeping Left Petal
        ctx.beginPath();
        ctx.moveTo(x, y + 6 * s);
        ctx.quadraticCurveTo(x - 12 * s, y + 3 * s, x - 11 * s, y - 4 * s);
        ctx.quadraticCurveTo(x - 5 * s, y + 1 * s, x, y + 6 * s);
        ctx.fill();

        // Outer Sweeping Right Petal
        ctx.beginPath();
        ctx.moveTo(x, y + 6 * s);
        ctx.quadraticCurveTo(x + 12 * s, y + 3 * s, x + 11 * s, y - 4 * s);
        ctx.quadraticCurveTo(x + 5 * s, y + 1 * s, x, y + 6 * s);
        ctx.fill();

        // Lotus Base Pedestal / Sepals
        ctx.beginPath();
        ctx.arc(x, y + 8 * s, 6 * s, 0, Math.PI);
        ctx.fill();

    } else if (type === 'temple') {
        // Multi-tiered Stepped Temple Gopuram Tower
        const s = size / 24;

        // Kalasam Finial Pinnacle
        ctx.beginPath();
        ctx.arc(x, y - 13 * s, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 1 * s, y - 11 * s, 2 * s, 2 * s);

        // Top Spire Tier
        ctx.beginPath();
        ctx.moveTo(x, y - 10 * s);
        ctx.lineTo(x + 4 * s, y - 4 * s);
        ctx.lineTo(x - 4 * s, y - 4 * s);
        ctx.closePath();
        ctx.fill();

        // Cornice 1
        ctx.fillRect(x - 6 * s, y - 4 * s, 12 * s, 2 * s);

        // Middle Tier with Carved Pillars
        ctx.fillRect(x - 7 * s, y - 2 * s, 14 * s, 4 * s);
        // Cornice 2
        ctx.fillRect(x - 9 * s, y + 2 * s, 18 * s, 2 * s);

        // Bottom Adhisthana Plinth Base
        ctx.fillRect(x - 10 * s, y + 4 * s, 20 * s, 5 * s);
        // Central Arch Niche
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.arc(x, y + 5 * s, 2.5 * s, Math.PI, 0);
        ctx.lineTo(x + 2.5 * s, y + 9 * s);
        ctx.lineTo(x - 2.5 * s, y + 9 * s);
        ctx.closePath();
        ctx.fill();

    } else if (type === 'ikat') {
        // Pochampally Stepped Diamond with Cross Star
        const s = size / 24;

        // Stepped outer diamond contour
        ctx.beginPath();
        ctx.moveTo(x, y - 12 * s);
        ctx.lineTo(x + 3 * s, y - 9 * s);
        ctx.lineTo(x + 6 * s, y - 9 * s);
        ctx.lineTo(x + 9 * s, y - 6 * s);
        ctx.lineTo(x + 9 * s, y - 3 * s);
        ctx.lineTo(x + 12 * s, y);
        ctx.lineTo(x + 9 * s, y + 3 * s);
        ctx.lineTo(x + 9 * s, y + 6 * s);
        ctx.lineTo(x + 6 * s, y + 9 * s);
        ctx.lineTo(x + 3 * s, y + 9 * s);
        ctx.lineTo(x, y + 12 * s);
        ctx.lineTo(x - 3 * s, y + 9 * s);
        ctx.lineTo(x - 6 * s, y + 9 * s);
        ctx.lineTo(x - 9 * s, y + 6 * s);
        ctx.lineTo(x - 9 * s, y + 3 * s);
        ctx.lineTo(x - 12 * s, y);
        ctx.lineTo(x - 9 * s, y - 3 * s);
        ctx.lineTo(x - 9 * s, y - 6 * s);
        ctx.lineTo(x - 6 * s, y - 9 * s);
        ctx.lineTo(x - 3 * s, y - 9 * s);
        ctx.closePath();
        ctx.fill();

        // Inner Diamond cut
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.moveTo(x, y - 6 * s);
        ctx.lineTo(x + 6 * s, y);
        ctx.lineTo(x, y + 6 * s);
        ctx.lineTo(x - 6 * s, y);
        ctx.closePath();
        ctx.fill();

        // Central Star Cross
        ctx.fillStyle = color;
        ctx.fillRect(x - 1 * s, y - 4 * s, 2 * s, 8 * s);
        ctx.fillRect(x - 4 * s, y - 1 * s, 8 * s, 2 * s);

    } else if (type === 'elephant') {
        // Regal Temple Elephant (Gaja) with Trunk Upward & Saddle Cloth
        const s = size / 24;

        // Head and Raised Trunk
        ctx.beginPath();
        ctx.arc(x - 4 * s, y - 3 * s, 5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Trunk curving up
        ctx.beginPath();
        ctx.moveTo(x - 8 * s, y - 1 * s);
        ctx.bezierCurveTo(x - 13 * s, y - 2 * s, x - 13 * s, y - 9 * s, x - 8 * s, y - 9 * s);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.ellipse(x + 2 * s, y + 1 * s, 8 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillRect(x - 6 * s, y + 4 * s, 3 * s, 7 * s);
        ctx.fillRect(x - 2 * s, y + 4 * s, 3 * s, 7 * s);
        ctx.fillRect(x + 3 * s, y + 4 * s, 3 * s, 7 * s);
        ctx.fillRect(x + 7 * s, y + 4 * s, 3 * s, 7 * s);

        // Saddle Cloth (Jhool) with Fringes
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(x - 1 * s, y - 3 * s, 6 * s, 6 * s);

    } else {
        // Swan / Hamsa
        const s = size / 24;
        ctx.beginPath();
        ctx.arc(x - 2 * s, y - 5 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x - 5 * s, y - 5 * s);
        ctx.lineTo(x - 9 * s, y - 4 * s);
        ctx.lineTo(x - 5 * s, y - 3 * s);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(x + 2 * s, y + 2 * s, 6 * s, 4 * s, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // Feather flourishes
        ctx.beginPath();
        ctx.moveTo(x + 6 * s, y);
        ctx.quadraticCurveTo(x + 11 * s, y - 4 * s, x + 10 * s, y - 8 * s);
        ctx.stroke();
    }

    ctx.restore();
}

// -----------------------------------------------------------------
// 10. Authentic Body Pattern Weave Layouts
// -----------------------------------------------------------------
function drawBodyPattern(ctx, x, y, width, height, pattern, zariColor) {
    ctx.save();
    ctx.strokeStyle = zariColor;
    ctx.fillStyle = zariColor;
    ctx.lineWidth = 1.4;

    if (pattern === 'floral_vines') {
        // Continuous Serpentine Vines with Pointed Leaves & 5-Petal Blossoms
        ctx.globalAlpha = 0.45;
        const waveH = 46;

        for (let py = y + 26; py < y + height - 20; py += waveH) {
            ctx.beginPath();
            ctx.moveTo(x, py);
            for (let px = x; px < x + width; px += 56) {
                ctx.bezierCurveTo(px + 18, py - 18, px + 38, py + 18, px + 56, py);
            }
            ctx.stroke();

            // Branching Pointed Leaves on Crests & Troughs
            for (let px = x + 16; px < x + width; px += 56) {
                // Top Leaf
                ctx.beginPath();
                ctx.moveTo(px, py - 10);
                ctx.quadraticCurveTo(px + 6, py - 16, px + 10, py - 12);
                ctx.quadraticCurveTo(px + 4, py - 7, px, py - 10);
                ctx.fill();

                // Bottom Leaf
                ctx.beginPath();
                ctx.moveTo(px + 28, py + 10);
                ctx.quadraticCurveTo(px + 34, py + 16, px + 38, py + 12);
                ctx.quadraticCurveTo(px + 32, py + 7, px + 28, py + 10);
                ctx.fill();

                // Miniature 5-petal flower blossom on the crest
                const fx = px + 12;
                const fy = py - 6;
                ctx.beginPath();
                ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

    } else if (pattern === 'checks') {
        // Traditional Kattam (Checks with Miniature Zari Star Buttis)
        ctx.globalAlpha = 0.35;
        const step = 32;

        // Double pinstripes for authentic handloom check look
        for (let px = x; px < x + width; px += step) {
            ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px + 2, y); ctx.lineTo(px + 2, y + height); ctx.stroke();
        }
        for (let py = y; py < y + height; py += step) {
            ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + width, py); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, py + 2); ctx.lineTo(x + width, py + 2); ctx.stroke();
        }

        // Star Butti inside every alternate check square
        ctx.globalAlpha = 0.6;
        let row = 0;
        for (let py = y + step / 2; py < y + height; py += step) {
            const colOffset = (row % 2 === 0) ? 0 : step;
            for (let px = x + step / 2 + colOffset; px < x + width; px += step * 2) {
                ctx.fillRect(px - 1.5, py - 4, 3, 8);
                ctx.fillRect(px - 4, py - 1.5, 8, 3);
            }
            row++;
        }

    } else if (pattern === 'lattice' || pattern === 'paisley_lattice') {
        // Diagonal Diamond Jaal Lattice with Ornate Florets
        ctx.globalAlpha = 0.35;
        const size = 38;

        for (let px = x - 200; px < x + width + 200; px += size) {
            ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + 200, y + height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px, y + height); ctx.lineTo(px + 200, y); ctx.stroke();
        }

        // Rosette clasp at each crossing node
        ctx.globalAlpha = 0.55;
        for (let px = x + 19; px < x + width; px += size) {
            for (let py = y + 19; py < y + height; py += size) {
                if (pattern === 'paisley_lattice') {
                    drawMotifSymbol(ctx, px, py, 11, 'mango', zariColor);
                } else {
                    ctx.beginPath();
                    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

    } else if (pattern === 'diagonal_ikat') {
        // Stepped Pochampally Diagonal Ikat Waves
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([7, 3, 2, 3]);
        for (let px = x - 200; px < x + width + 200; px += 26) {
            ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + 160, y + height); ctx.stroke();
        }
        ctx.setLineDash([]);

    } else if (pattern === 'stripes') {
        // Rhythm Zari Pinstripes with Fine Beads
        ctx.globalAlpha = 0.45;
        for (let px = x + 16; px < x + width; px += 24) {
            ctx.fillRect(px, y, 3, height);
            ctx.fillRect(px + 5, y, 1, height);
        }

    } else if (pattern === 'scattered_buttis') {
        // Staggered Butti Field (Rosettes & Buds)
        ctx.globalAlpha = 0.5;
        let r = 0;
        for (let py = y + 25; py < y + height - 15; py += 38) {
            const off = (r % 2 === 0) ? 0 : 25;
            for (let px = x + 25 + off; px < x + width - 15; px += 50) {
                drawMotifSymbol(ctx, px, py, 12, 'lotus', zariColor);
            }
            r++;
        }
    }

    ctx.restore();
}

// -----------------------------------------------------------------
// 11. Authentic Border Architecture Patterns
// -----------------------------------------------------------------
function drawBorderPattern(ctx, x, y, width, height, style, isTop) {
    ctx.save();
    ctx.fillStyle = currentDesign.zariColor;
    ctx.strokeStyle = currentDesign.zariColor;

    const startY = isTop ? y + height : y;
    const dir = isTop ? -1 : 1;

    if (style === 'temple') {
        // Nizam Gopuram Stepped Spikes with Pearl (Mottu) Band
        const spikeW = 20;
        const spikeH = 22;

        for (let px = x + 6; px < x + width - 12; px += spikeW + 4) {
            // Outer Spire
            ctx.beginPath();
            ctx.moveTo(px, startY);
            ctx.lineTo(px + spikeW / 2, startY + (dir * spikeH));
            ctx.lineTo(px + spikeW, startY);
            ctx.closePath();
            ctx.fill();

            // Inner Stepped Accent Spire
            ctx.fillStyle = currentDesign.borderColor;
            ctx.beginPath();
            ctx.moveTo(px + 4, startY);
            ctx.lineTo(px + spikeW / 2, startY + (dir * (spikeH - 7)));
            ctx.lineTo(px + spikeW - 4, startY);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = currentDesign.zariColor;
        }

        // Running Pearl (Mottu) Line at Border Edge
        const pearlY = isTop ? y + 8 : y + height - 8;
        for (let px = x + 8; px < x + width; px += 8) {
            ctx.beginPath();
            ctx.arc(px, pearlY, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Solid Border Rim Bar
        ctx.fillRect(x, isTop ? y + 14 : y + height - 16, width, 3);

    } else if (style === 'peacock_border') {
        // Row of Regal Repeating Peacocks between Zari Bars
        ctx.fillRect(x, isTop ? y + 4 : y + height - 8, width, 3);
        ctx.fillRect(x, isTop ? y + height - 7 : y + 4, width, 3);

        const midY = y + height / 2;
        for (let px = x + 20; px < x + width - 20; px += 36) {
            drawMotifSymbol(ctx, px, midY, 15, 'peacock', currentDesign.zariColor);
        }

    } else if (style === 'double_zari') {
        // Double Zari Bars enclosing an Undulating Floral Vine
        ctx.fillRect(x, y + 4, width, 4);
        ctx.fillRect(x, y + height - 8, width, 4);

        // Continuous undulating vine with leaves
        const midY = y + height / 2;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, midY);
        for (let px = x; px < x + width; px += 24) {
            ctx.quadraticCurveTo(px + 6, midY - 6, px + 12, midY);
            ctx.quadraticCurveTo(px + 18, midY + 6, px + 24, midY);
        }
        ctx.stroke();

        // Florets in crests
        for (let px = x + 6; px < x + width; px += 24) {
            ctx.beginPath();
            ctx.arc(px, midY - 6, 2, 0, Math.PI * 2);
            ctx.arc(px + 12, midY + 6, 2, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (style === 'ikat_wave') {
        // Interlocking Dual Wave Ikat Bands
        ctx.lineWidth = 2.5;
        const midY = y + height / 2;
        ctx.beginPath();
        for (let px = x; px < x + width; px += 20) {
            ctx.quadraticCurveTo(px + 10, midY - 10, px + 20, midY);
        }
        ctx.stroke();

        for (let px = x + 10; px < x + width; px += 20) {
            ctx.beginPath();
            ctx.arc(px, midY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (style === 'chevron_pattern') {
        // Double Chevron Zig-Zag with Diamond Florets
        ctx.lineWidth = 2;
        const midY = y + height / 2;
        ctx.beginPath();
        for (let px = x; px < x + width; px += 16) {
            ctx.moveTo(px, midY - 9);
            ctx.lineTo(px + 8, midY + 9);
            ctx.lineTo(px + 16, midY - 9);
        }
        ctx.stroke();

    } else {
        // Kaddi Ribbed Pin Stripes & Coins
        for (let px = x + 10; px < x + width; px += 16) {
            ctx.fillRect(px, y + 4, 3, height - 8);
        }
    }

    ctx.restore();
}

// -----------------------------------------------------------------
// 12. Detailed Pallu (Grand End Piece) Architecture
// -----------------------------------------------------------------
function drawPalluSection(ctx, x, y, width, height, palluStyle, palluColor, zariColor, motifType) {
    ctx.save();

    // Pallu Base Color Block
    ctx.fillStyle = palluColor;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = zariColor;
    ctx.strokeStyle = zariColor;

    if (palluStyle === 'grand_medallion') {
        // Grand Central Chakra / Mandala Medallion with Radiating Lotus Petals
        ctx.fillRect(x + 10, 0, 4, height);
        ctx.fillRect(x + width - 14, 0, 4, height);

        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Outer Ray Ring
        ctx.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
            const angle = (i * Math.PI) / 8;
            const r1 = 44;
            const r2 = 60;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle) * r1, centerY + Math.sin(angle) * r1);
            ctx.lineTo(centerX + Math.cos(angle) * r2, centerY + Math.sin(angle) * r2);
            ctx.stroke();
        }

        // Circular Medallion Rings
        ctx.beginPath();
        ctx.arc(centerX, centerY, 46, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palluColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Central Rosette Star
        ctx.fillStyle = zariColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();

        // 4 Corner Paisley Kalkas filling the Pallu
        drawMotifSymbol(ctx, x + 40, y + 60, 32, 'mango', zariColor);
        drawMotifSymbol(ctx, x + width - 40, y + 60, 32, 'mango', zariColor);
        drawMotifSymbol(ctx, x + 40, height - 60, 32, 'mango', zariColor);
        drawMotifSymbol(ctx, x + width - 40, height - 60, 32, 'mango', zariColor);

    } else if (palluStyle === 'decorative_pallu') {
        // 3-Tier Multi-Paneled Decorative Floral & Peacock Pallu
        ctx.fillRect(x + 12, 0, 4, height);
        ctx.fillRect(x + width - 16, 0, 4, height);

        // Divider bands
        const p1 = height * 0.28;
        const p2 = height * 0.72;
        ctx.fillRect(x + 16, p1, width - 32, 4);
        ctx.fillRect(x + 16, p2, width - 32, 4);

        // Tier 1: Procession of Small Motifs
        for (let px = x + 40; px < x + width - 30; px += 45) {
            drawMotifSymbol(ctx, px, p1 / 2, 22, motifType, zariColor);
        }

        // Tier 2: Large Central Grand Motif
        drawMotifSymbol(ctx, x + width / 2, (p1 + p2) / 2, 54, motifType, zariColor);

        // Tier 3: Procession of Small Motifs
        for (let px = x + 40; px < x + width - 30; px += 45) {
            drawMotifSymbol(ctx, px, p2 + (height - p2) / 2, 22, motifType, zariColor);
        }

    } else if (palluStyle === 'cascade_temple') {
        // Graduating Tiers of Gopuram Spikes Facing the Saree Body
        for (let py = 35; py < height - 30; py += 68) {
            for (let px = x + 35; px < x + width - 25; px += 45) {
                drawMotifSymbol(ctx, px, py, 32, 'temple', zariColor);
            }
        }
        ctx.fillRect(x, height / 2, width, 6);

    } else if (palluStyle === 'ikat_block') {
        // Color-Blocked Geometric Ikat Diamonds
        const blockH = height / 3;
        ctx.fillStyle = zariColor;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y + blockH, width, blockH);
        ctx.globalAlpha = 1.0;

        drawMotifSymbol(ctx, x + width / 2, y + blockH / 2, 44, 'ikat', zariColor);
        drawMotifSymbol(ctx, x + width / 2, y + blockH * 1.5, 48, motifType, zariColor);
        drawMotifSymbol(ctx, x + width / 2, y + blockH * 2.5, 44, 'ikat', zariColor);

    } else {
        // Traditional Zari Stripes & Fringes (Kaddi Pallu)
        ctx.globalAlpha = 0.9;
        for (let px = 16; px < width - 16; px += 18) {
            const wW = (px % 36 === 0) ? 8 : 2;
            ctx.fillRect(px, 0, wW, height);
        }
        ctx.globalAlpha = 1.0;

        drawMotifSymbol(ctx, 50, height / 2 - 80, 42, motifType, zariColor);
        drawMotifSymbol(ctx, 50, height / 2 + 80, 42, motifType, zariColor);
        drawMotifSymbol(ctx, width - 60, height / 2, 52, motifType, zariColor);
    }

    // End Fringes / Tassels (Kuchu) at the outer edge
    ctx.fillStyle = zariColor;
    for (let py = 6; py < height; py += 10) {
        ctx.beginPath();
        ctx.arc(x + 4, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// -----------------------------------------------------------------
// 13. Repeating Body Motifs Engine
// -----------------------------------------------------------------
function drawBodyMotifs(ctx, x, y, width, height, type, density, arrangement, zariColor) {
    const densityMap = { "Sparse": 85, "Medium": 58, "Dense": 40 };
    const step = densityMap[density] || 58;

    let row = 0;

    if (arrangement === 'grid') {
        for (let py = y + 35; py < y + height - 20; py += step) {
            for (let px = x + 40; px < x + width - 30; px += step) {
                drawMotifSymbol(ctx, px, py, 20, type, zariColor);
            }
        }
    } else if (arrangement === 'diagonal') {
        for (let py = y + 35; py < y + height - 20; py += step) {
            const offset = (py * 0.7) % step;
            for (let px = x + 40 + offset; px < x + width - 30; px += step) {
                drawMotifSymbol(ctx, px, py, 20, type, zariColor);
            }
        }
    } else if (arrangement === 'border_trailing') {
        for (let px = x + 40; px < x + width - 30; px += step) {
            drawMotifSymbol(ctx, px, y + 25, 20, type, zariColor);
            drawMotifSymbol(ctx, px + 20, y + 60, 16, type, zariColor);
            drawMotifSymbol(ctx, px, y + height - 25, 20, type, zariColor);
            drawMotifSymbol(ctx, px + 20, y + height - 60, 16, type, zariColor);
        }
    } else {
        // Staggered Half-Drop Repeat (Classic Handloom Standard)
        for (let py = y + 35; py < y + height - 20; py += step) {
            const offset = (row % 2 === 0) ? 0 : step / 2;
            for (let px = x + 45 + offset; px < x + width - 30; px += step) {
                drawMotifSymbol(ctx, px, py, 20, type, zariColor);
            }
            row++;
        }
    }
}

// Fabric Weave Grid Texture
function drawWeaveTexture(x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let i = x; i < x + w; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, y);
        ctx.lineTo(i, y + h);
        ctx.stroke();
    }
    ctx.restore();
}

// Draw Saree Drape Simulation Mode
function drawDrapedSareeView(w, h) {
    ctx.fillStyle = "#160509";
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;

    for (let i = -5; i <= 5; i++) {
        const px = centerX + i * 44;
        ctx.fillStyle = (i % 2 === 0) ? currentDesign.bodyColor : currentDesign.palluColor;

        ctx.beginPath();
        ctx.moveTo(px, 30);
        ctx.bezierCurveTo(px - 18, h / 2, px + 30, h - 50, px + (i * 12), h - 10);
        ctx.lineTo(px + 40 + (i * 12), h - 10);
        ctx.bezierCurveTo(px + 40, h / 2, px + 18, 30, px + 40, 30);
        ctx.closePath();
        ctx.fill();

        // Gold Zari Hem Border
        ctx.fillStyle = currentDesign.zariColor;
        ctx.fillRect(px + (i * 12), h - 28, 40, 10);

        // Pleat Motif
        drawMotifSymbol(ctx, px + 20, h / 2 + (i * 10), 18, currentDesign.motifType, currentDesign.zariColor);
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(20, 20, 280, 44);
    ctx.fillStyle = "#D4AF37";
    ctx.font = "600 13px Outfit, sans-serif";
    ctx.fillText("👗 Saree Pleat & Drape Simulation View", 32, 46);
}

// Draw Zoom Close-Up Motif & Yarn View Mode
function drawZoomMotifView(w, h) {
    ctx.fillStyle = currentDesign.bodyColor;
    ctx.fillRect(0, 0, w, h);

    // Magnified warp/weft cross weave threads
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 14) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 14) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // High magnification motif
    drawMotifSymbol(ctx, w / 2, h / 2, 160, currentDesign.motifType, currentDesign.zariColor);

    // Zoom Overlay Badge
    ctx.fillStyle = "rgba(72, 10, 21, 0.85)";
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 1.5;
    ctx.fillRect(20, 20, 360, 56);
    ctx.strokeRect(20, 20, 360, 56);

    ctx.fillStyle = "#D4AF37";
    ctx.font = "700 14px Cinzel Decorative, Outfit, serif";
    ctx.fillText(`🔍 Yarn Zoom: ${currentDesign.motifType.toUpperCase()} Motif`, 32, 42);
    ctx.fillStyle = "#FAF7F2";
    ctx.font = "12px Outfit, sans-serif";
    ctx.fillText(`Pattern: ${currentDesign.bodyPattern} | Border: ${currentDesign.borderStyle}`, 32, 60);
}

// -----------------------------------------------------------------
// 14. Save & Download & Spec Sheet Export Functions
// -----------------------------------------------------------------
async function saveDesign() {
    currentDesign.title = `${currentDesign.sareeStyle} ${currentDesign.motifType.toUpperCase()} Design`;

    try {
        const response = await fetch('/api/designs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDesign)
        });

        const resData = await response.json();
        showToast(`✅ ${resData.message || 'Design Saved Successfully!'}`);
    } catch (e) {
        let localSaved = JSON.parse(localStorage.getItem('handloom_saved_designs') || '[]');
        localSaved.unshift({ ...currentDesign, id: Date.now(), createdAt: new Date().toLocaleString() });
        localStorage.setItem('handloom_saved_designs', JSON.stringify(localSaved));
        showToast("✅ Saved to Browser Storage!");
    }
}

function downloadCanvasPNG() {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Handloom_Saree_${currentDesign.motifType}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast("📥 Fabric preview downloaded!");
}

function printSpecCard() {
    const printWin = window.open('', '_blank');
    const getTxt = id => {
        const el = document.getElementById(id);
        return el ? el.textContent : '';
    };

    printWin.document.write(`
        <html>
        <head>
            <title>Weaver Specification Card - ${currentDesign.title}</title>
            <style>
                body { font-family: 'Outfit', sans-serif; padding: 24px; color: #2C160F; background: #FFF; }
                h1 { color: #6B1124; border-bottom: 2px solid #C59B27; padding-bottom: 8px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                td, th { border: 1px solid #E5D5C5; padding: 8px 12px; text-align: left; font-size: 13px; }
                th { background-color: #FAF6EE; color: #6B1124; }
                .swatch { display: inline-block; width: 16px; height: 16px; border-radius: 4px; vertical-align: middle; margin-right: 6px; border: 1px solid #CCC; }
            </style>
        </head>
        <body>
            <h1>Chenetha Design Mitra - Weaver Specification Card</h1>
            <p><strong>Design Title:</strong> ${currentDesign.title}</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <table>
                <tr><th>Specification Item</th><th>Details</th></tr>
                <tr><td>Fabric Base</td><td>${currentDesign.fabricType}</td></tr>
                <tr><td>Body Pattern</td><td>${currentDesign.bodyPattern}</td></tr>
                <tr><td>Body Color Hex</td><td><span class="swatch" style="background:${currentDesign.bodyColor}"></span> ${currentDesign.bodyColor}</td></tr>
                <tr><td>Border Color Hex</td><td><span class="swatch" style="background:${currentDesign.borderColor}"></span> ${currentDesign.borderColor}</td></tr>
                <tr><td>Pallu Color Hex</td><td><span class="swatch" style="background:${currentDesign.palluColor}"></span> ${currentDesign.palluColor}</td></tr>
                <tr><td>Zari Tone</td><td><span class="swatch" style="background:${currentDesign.zariColor}"></span> ${currentDesign.zariColor}</td></tr>
                <tr><td>Motif Type</td><td>${currentDesign.motifType.toUpperCase()}</td></tr>
                <tr><td>Border Architecture</td><td>${currentDesign.borderStyle}</td></tr>
                <tr><td>Pallu Style</td><td>${currentDesign.palluStyle}</td></tr>
                <tr><td>Warp Yarn Spec</td><td>${getTxt('specWarp')}</td></tr>
                <tr><td>Weft Yarn Spec</td><td>${getTxt('specWeft')}</td></tr>
                <tr><td>Reed / Picks</td><td>${getTxt('specReed')}</td></tr>
                <tr><td>Jacquard Punch Cards</td><td>${getTxt('specCards')}</td></tr>
            </table>
            <br/><br/>
            <button onclick="window.print()">Print Card</button>
        </body>
        </html>
    `);
    printWin.document.close();
}

async function openCollectionModal() {
    const modal = document.getElementById('collectionModal');
    const container = document.getElementById('savedDesignsContainer');
    if (modal) modal.classList.add('active');

    if (container) container.innerHTML = '<div style="color:var(--text-secondary)">Loading saved designs...</div>';

    let designs = [];
    try {
        const res = await fetch('/api/designs');
        if (res.ok) {
            const data = await res.json();
            designs = data.designs || [];
        }
    } catch (e) {
        designs = JSON.parse(localStorage.getItem('handloom_saved_designs') || '[]');
    }

    if (!container) return;

    if (designs.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); grid-column:1/-1;">No saved designs found. Create and save your first design!</div>';
        return;
    }

    container.innerHTML = designs.map(d => `
        <div class="saved-card" onclick='loadSavedDesign(${JSON.stringify(d).replace(/'/g, "&apos;")})'>
            <div class="saved-card-title">${d.title || d.sareeStyle}</div>
            <div class="saved-card-meta">${d.createdAt || ''} | ${d.motifType || ''}</div>
            <div class="saved-swatches">
                <span class="saved-swatch" style="background:${d.bodyColor}"></span>
                <span class="saved-swatch" style="background:${d.borderColor}"></span>
                <span class="saved-swatch" style="background:${d.palluColor}"></span>
                <span class="saved-swatch" style="background:${d.zariColor}"></span>
            </div>
        </div>
    `).join('');
}

function loadSavedDesign(design) {
    currentDesign = { ...currentDesign, ...design };
    hasGenerated = true;

    syncAllControlsToUI();

    const modal = document.getElementById('collectionModal');
    if (modal) modal.classList.remove('active');

    navigateToPage('studio');
    renderSareeCanvas();
    showToast(`Loaded saved design: ${currentDesign.title}`);
}

// Toast Notification Helper
function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨</span> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}
