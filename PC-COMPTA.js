(function () {
    'use strict';
    // -------------------------------
    // UTILITAIRES
    // -------------------------------
    function simulateRealClick(element) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        const events = [
            new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX, clientY, button: 0 }),
            new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX, clientY, button: 0 }),
            new MouseEvent('click', { bubbles: true, cancelable: true, clientX, clientY, button: 0 })
        ];
        events.forEach(event => element.dispatchEvent(event));
    }
    // -------------------------------
    // FERMETURE DES TABS D'ÉDITION
    // -------------------------------
    function closeEditionTabs(callback) {
        const checkInterval = 300;
        const maxAttempts = 20;
        let attempts = 0;
        function tryClose() {
            const allTabs = document.querySelectorAll("li.sp-tab");
            let found = false;
            allTabs.forEach(tab => {
                if (tab.classList.contains('active')) return; // Skip active tab
                const title = tab.querySelector(".s_tab_title_content.tab_1");
                if (title) {
                    const titleText = title.textContent.trim();
                    // Check for exact match or pattern like "CA TSO-25/09-010 - - Saisie des écritures par pièce"
                    if (titleText === "Lancement de l'édition Edition des pièces" ||
                        /^[A-Z]{2} [A-Z]{3}-\d{2}\/\d{2}-\d{3} - - Saisie des écritures par pièce$/.test(titleText)) {
                        const closeBtn = tab.querySelector(".sp-tab-close");
                        if (closeBtn) {
                            closeBtn.click();
                            console.log(`✅ Tab fermée : ${titleText}`);
                        }
                        found = true;
                    }
                }
            });
            if (!found) {
                console.log("✅ Toutes les tabs d'édition sont fermées");
                if (callback) callback();
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log(`⏳ Tentative ${attempts}/${maxAttempts} - attente fermeture...`);
                    setTimeout(tryClose, checkInterval);
                } else {
                    console.log("⚠️ Impossible de fermer toutes les tabs après plusieurs tentatives");
                    if (callback) callback();
                }
            }
        }
        tryClose();
    }
    // -------------------------------
    // EXTRACTION
    // -------------------------------
    function extractSearchInputData() {
        const activeTabs = document.querySelectorAll("[class*='tab active last'], [class*='tab active']");
        let extractedValues = [];
        activeTabs.forEach(tab => {
            const subTitle = tab.querySelector(".s_tab_title_content.sub.tab_1");
            if (subTitle) {
                let value = subTitle.textContent.trim().replace(/ - *$/, "");
                extractedValues.push(value);
            }
        });
        console.log("Extracted values:", extractedValues);
        if (extractedValues.length > 0) {
            return extractedValues[0];
        }
        console.log('⚠️ Falling back to original input');
        const inputElement = document.querySelector('div.s_nav_sedit_top input.s_sedit.s_f.s_nav_sedit_top');
        return inputElement?.value || '';
    }
    // -------------------------------
    // DÉTECTION TYPE DE PIÈCE
    // -------------------------------
    function extractTableDataAndDetermineType() {
        console.log('🔍 Extracting table data...');
        const tbodies = document.querySelectorAll('tbody');
        let dataTbody = null;
        for (const tbody of tbodies) {
            if (tbody.querySelector('tr.msgSuccess')) {
                dataTbody = tbody;
                break;
            }
        }
        if (!dataTbody) {
            console.log('❌ No data tbody found');
            return null;
        }
        const rows = dataTbody.querySelectorAll('tr');
        let pieceType = null;
        console.log(`📊 Found ${rows.length} rows to analyze`);
        rows.forEach((row, index) => {
            if (row.classList.contains('msgSuccess')) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    const cleanText = (cell) => cell.textContent.trim().replace(/ /g, '').replace(',', '.');
                    const compteGeneral = cells[1].textContent.trim();
                    const debitTR = cleanText(cells[4]);
                    const creditTR = cleanText(cells[5]);
                    console.log(`Row ${index}: Compte=${compteGeneral}, Débit=${debitTR}, Crédit=${creditTR}`);
                    if (["514110", "514301", "514121", "511100"].includes(compteGeneral)) {
                        if (debitTR === "0.00") {
                            pieceType = "DEPENSE";
                            console.log("✅ PIECE DE DEPENSE detected");
                        } else if (creditTR === "0.00") {
                            pieceType = "RECETTE";
                            console.log("✅ PIECE DE RECETTE detected");
                        }
                    }
                }
            }
        });
        return pieceType;
    }
    // -------------------------------
    // CLICS SÉCURISÉS
    // -------------------------------
    function clickRecetteLinkSafely() {
        let attempts = 0;
        function tryClick() {
            const link = document.querySelector('a[title="Pièce de recette"]');
            if (link) { link.click(); return; }
            if (++attempts < 10) setTimeout(tryClick, 300);
        }
        tryClick();
    }
    function clickExpenseLinkSafely() {
        let attempts = 0;
        function tryClick() {
            const link = document.querySelector('a[title="Pièce de dépense"]');
            if (link) { link.click(); return; }
            if (++attempts < 10) setTimeout(tryClick, 500);
        }
        tryClick();
    }
    function clickConstatationLinkSafely() {
        let attempts = 0;
        function tryClick() {
            const link = document.querySelector('a[title="Pièce de constatation"]');
            if (link) { link.click(); return; }
            if (++attempts < 10) setTimeout(tryClick, 500);
        }
        tryClick();
    }
    function clickPDFPreviewSafely() {
        let attempts = 0;
        function tryClick() {
            const pdfLink = document.querySelector('a[title="Aperçu en PDF (Ctrl+Alt+u)"]');
            if (pdfLink) { simulateRealClick(pdfLink); return; }
            if (++attempts < 10) setTimeout(tryClick, 500);
        }
        tryClick();
    }
    // -------------------------------
    // CHECK ACTIVE TAB TITLE
    // -------------------------------
    function isActiveTabSaisie() {
        const activeTabs = document.querySelectorAll("li.sp-tab.active, li.sp-tab.active.last");
        if (activeTabs.length === 0) {
            console.log("❌ No active tab found");
            return false;
        }
        // Assuming there's only one active tab, take the first one
        const activeTab = activeTabs[0];
        const title = activeTab.querySelector(".s_tab_title_content.tab_1");
        if (title && title.textContent.trim().endsWith("Saisie des écritures par pièce")) {
            console.log("✅ Active tab is a 'Saisie des écritures par pièce' tab");
            return true;
        } else {
            console.log("❌ Active tab is not a 'Saisie des écritures par pièce' tab");
            return false;
        }
    }
    // -------------------------------
    // SCRIPT PRINCIPAL
    // -------------------------------
    function runMainScript() {
        const searchValue = extractSearchInputData();
        const keyEvent = new KeyboardEvent('keydown', {
            bubbles: true, cancelable: true, ctrlKey: true, shiftKey: true, code: 'Space', key: ' '
        });
        document.dispatchEvent(keyEvent);
        setTimeout(() => {
            const inputs = document.querySelectorAll('.swt-form-content .edit-delta-pad input.s_edit_input[maxlength="30"]');
            inputs.forEach(input => {
                input.focus();
                input.value = searchValue;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
            const keywords = ['VTE', 'ALG', 'OPD', 'STK', 'PAI'];
            if (keywords.some(kw => searchValue.includes(kw))) {
                setTimeout(clickConstatationLinkSafely, 300);
            } else {
                const detectedType = extractTableDataAndDetermineType();
                if (detectedType === "RECETTE") setTimeout(clickRecetteLinkSafely, 300);
                else if (detectedType === "DEPENSE") setTimeout(clickExpenseLinkSafely, 500);
            }
            setTimeout(() => {
                const pieceNumberLabel = document.querySelector('.swt-form-content .s-label[style*="top: 27px; left: 10px"]');
                simulateRealClick(pieceNumberLabel);
                setTimeout(clickPDFPreviewSafely, 500);
            }, 800);
        }, 500);
    }
    // -------------------------------
    // BOUTON ET RACCOURCI
    // -------------------------------
    function addEditionButton() {
        const toolbarUl = document.querySelector('div.sp-fstd-black.s_pa.sp-toolbar-ext ul.sp-toolbar');
        if (!toolbarUl) return;
        const li = document.createElement('li');
        li.className = 's_pr s_di s_fe';
        const btn = document.createElement('button');
        btn.innerText = 'Éditer la pièce';
        Object.assign(btn.style, {
            padding: '0px 15px 0px 15px',
            margin: '0px 15px 0px 0px',
            background: 'transparent',
            color: '#e0e1dd',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '400',
            cursor: 'pointer',
            textAlign: 'center',
            marginTop: '5px',
            fontSize: '15px',
            fontFamily: 'sageUI'
        });
        li.appendChild(btn);
        toolbarUl.appendChild(li);
        btn.addEventListener('click', () => {
            console.log("🔄 Bouton cliqué - fermeture des tabs...");
            closeEditionTabs(() => {
                if (isActiveTabSaisie()) {
                    runMainScript();
                }
            });
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'F7') {
            event.preventDefault();
            console.log("🔄 F7 pressé - fermeture des tabs...");
            closeEditionTabs(() => {
                if (isActiveTabSaisie()) {
                    runMainScript();
                }
            });
        }
    });
    const waitForToolbar = setInterval(() => {
        const toolbarUl = document.querySelector('div.sp-fstd-black.s_pa.sp-toolbar-ext ul.sp-toolbar');
        if (toolbarUl) {
            clearInterval(waitForToolbar);
            addEditionButton();
        }
    }, 450);
    console.log('🎯 Script chargé - attente du toolbar et écoute F7');
})();
