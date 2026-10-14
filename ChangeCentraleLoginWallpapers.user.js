// ==UserScript==
// @name         KU Leuven IDP Superheroes Slideshow
// @namespace    PhilippeLC-KUL-IDP
// @version      1.7
// @description  Random superhero slideshow with crossfade, overlay, caching and fallback wallpapers
// @match        https://idp.kuleuven.be/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @downloadURL  https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/ChangeCentraleLoginWallpapers.user.js
// @updateURL    https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/ChangeCentraleLoginWallpapers.user.js
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // Configuratie
    // ============================================================

    const GITHUB_API_URL =
        "https://api.github.com/repos/PhilippeLC/KUL-IDP-Superheroes/contents";

    /*
     * Iedere wallpaper blijft 15 seconden zichtbaar.
     */
    const SLIDESHOW_INTERVAL = 15000;

    /*
     * Crossfade van 1,5 seconde.
     */
    const FADE_DURATION = 1500;

    /*
     * Donkere overlay:
     *
     * 0.08 = zeer subtiel
     * 0.12 = aanbevolen
     * 0.18 = duidelijk donkerder
     */
    const OVERLAY_OPACITY = 0.12;

    const BACKGROUND_SELECTOR = "#background";

    // ============================================================
    // Cacheconfiguratie
    // ============================================================

    /*
     * De volledige wallpaperlijst wordt lokaal opgeslagen.
     *
     * Wanneer de GitHub API tijdelijk een 403 of 429 geeft,
     * kan de browser de laatst succesvolle lijst blijven gebruiken.
     */
    const WALLPAPER_CACHE_KEY =
        "kul-idp-superheroes-wallpaper-cache-v1";

    /*
     * Na zeven dagen wordt een waarschuwing in de console getoond.
     *
     * De oudere cache blijft wel bruikbaar als fallback. Hierdoor
     * blijft de slideshow werken wanneer GitHub tijdelijk niet
     * bereikbaar is of de anonieme API-limiet bereikt is.
     */
    const WALLPAPER_CACHE_MAX_AGE =
        7 * 24 * 60 * 60 * 1000;

    // ============================================================
    // Vaste backupwallpapers
    // ============================================================

    /*
     * Deze vijf wallpapers worden uitsluitend gebruikt wanneer:
     *
     * 1. de GitHub API niet beschikbaar is; en
     * 2. op deze browser nog geen volledige lijst gecachet werd.
     *
     * IronMan01 is op verzoek vervangen door Deadpool01.
     */
    const FALLBACK_WALLPAPERS = [
        {
            name: "Batman01.jpg",
            hero: "batman",
            url:
                "https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/Batman01.jpg"
        },
        {
            name: "Deadpool01.jpg",
            hero: "deadpool",
            url:
                "https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/Deadpool01.jpg"
        },
        {
            name: "Joker01.jpg",
            hero: "joker",
            url:
                "https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/Joker01.jpg"
        },
        {
            name: "Wolverine01.jpg",
            hero: "wolverine",
            url:
                "https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/Wolverine01.jpg"
        },
        {
            name: "WonderWoman01.jpg",
            hero: "wonderwoman",
            url:
                "https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/WonderWoman01.jpg"
        }
    ];

    // ============================================================
    // Status
    // ============================================================

    let wallpapers = [];
    let orderedWallpapers = [];
    let currentWallpaperIndex = 0;

    let background = null;
    let layers = [];
    let activeLayerIndex = -1;

    let currentHero = null;
    let slideshowTimer = null;
    let loadingWallpaper = false;

    /*
     * Voorkomt dat meerdere bronnen de slideshow tegelijk starten.
     */
    let slideshowStarted = false;

    // ============================================================
    // Held uit de bestandsnaam halen
    //
    // Batman01.jpg       -> batman
    // Deadpool01.jpg     -> deadpool
    // WonderWoman02.jpg  -> wonderwoman
    // ============================================================

    function getHeroName(fileName) {
        return fileName
            .replace(/\.(jpe?g|png|webp)$/i, "")
            .replace(/[\s_-]*\d+$/i, "")
            .trim()
            .toLowerCase();
    }

    // ============================================================
    // Volledige wallpaperlijst lokaal bewaren
    // ============================================================

    function saveWallpapersToCache(wallpaperList) {
        try {
            const cacheData = {
                savedAt: Date.now(),
                wallpapers: wallpaperList
            };

            localStorage.setItem(
                WALLPAPER_CACHE_KEY,
                JSON.stringify(cacheData)
            );

            console.info(
                "[KU IDP Wallpapers] Volledige lijst met " +
                `${wallpaperList.length} wallpapers lokaal gecachet.`
            );
        }
        catch (error) {
            console.warn(
                "[KU IDP Wallpapers] Wallpaperlijst kon niet " +
                "lokaal worden gecachet:",
                error
            );
        }
    }

    // ============================================================
    // Volledige wallpaperlijst uit lokale cache lezen
    // ============================================================

    function loadWallpapersFromCache() {
        try {
            const cachedValue =
                localStorage.getItem(WALLPAPER_CACHE_KEY);

            if (!cachedValue) {
                return null;
            }

            const cacheData =
                JSON.parse(cachedValue);

            if (
                !cacheData ||
                !Array.isArray(cacheData.wallpapers) ||
                cacheData.wallpapers.length === 0
            ) {
                return null;
            }

            const cacheAge =
                Date.now() - Number(cacheData.savedAt || 0);

            const cacheAgeInDays =
                Math.floor(
                    cacheAge / (24 * 60 * 60 * 1000)
                );

            if (cacheAge > WALLPAPER_CACHE_MAX_AGE) {
                console.warn(
                    "[KU IDP Wallpapers] De lokale cache is " +
                    `${cacheAgeInDays} dagen oud. ` +
                    "De lijst wordt toch als fallback gebruikt."
                );
            }
            else {
                console.info(
                    "[KU IDP Wallpapers] Geldige lokale cache gevonden."
                );
            }

            return cacheData.wallpapers;
        }
        catch (error) {
            console.warn(
                "[KU IDP Wallpapers] De lokale cache kon niet " +
                "worden gelezen:",
                error
            );

            return null;
        }
    }

    // ============================================================
    // Slideshow starten met een beschikbare lijst
    // ============================================================

    function startWithWallpaperList(
        selectedWallpapers,
        sourceDescription
    ) {
        if (slideshowStarted) {
            console.warn(
                "[KU IDP Wallpapers] De slideshow werd al gestart. " +
                "Een tweede startpoging wordt genegeerd."
            );

            return;
        }

        if (
            !Array.isArray(selectedWallpapers) ||
            selectedWallpapers.length === 0
        ) {
            console.error(
                "[KU IDP Wallpapers] De geselecteerde bron bevat " +
                "geen bruikbare wallpapers."
            );

            return;
        }

        wallpapers = selectedWallpapers;
        slideshowStarted = true;

        console.info(
            `[KU IDP Wallpapers] Bron: ${sourceDescription}. ` +
            `${wallpapers.length} wallpapers beschikbaar.`
        );

        createHeroAwareOrder();

        /*
         * De eerste wallpaper onmiddellijk laden.
         *
         * Er wordt dus niet eerst 15 seconden gewacht.
         */
        showNextWallpaper();
    }

    // ============================================================
    // Cache of vaste backupselectie activeren
    // ============================================================

    function activateFallback(reason) {
        const cachedWallpapers =
            loadWallpapersFromCache();

        if (
            Array.isArray(cachedWallpapers) &&
            cachedWallpapers.length > 0
        ) {
            console.warn(
                `[KU IDP Wallpapers] ${reason} ` +
                "Overschakeling naar de lokaal gecachte " +
                "volledige wallpaperlijst."
            );

            startWithWallpaperList(
                cachedWallpapers,
                "lokale cache"
            );

            return;
        }

        console.warn(
            `[KU IDP Wallpapers] ${reason} ` +
            "Geen lokale cache beschikbaar. " +
            "Overschakeling naar de vaste backupselectie van " +
            `${FALLBACK_WALLPAPERS.length} wallpapers.`
        );

        console.info(
            "[KU IDP Wallpapers] Backupselectie:",
            FALLBACK_WALLPAPERS.map(
                wallpaper => wallpaper.name
            )
        );

        startWithWallpaperList(
            FALLBACK_WALLPAPERS,
            "vaste backupselectie"
        );
    }

    // ============================================================
    // GitHub API-responseheaders uitlezen
    // ============================================================

    function getResponseHeader(
        responseHeaders,
        headerName
    ) {
        if (!responseHeaders) {
            return null;
        }

        const escapedHeaderName =
            headerName.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

        const headerPattern =
            new RegExp(
                `^${escapedHeaderName}:\\s*(.+)$`,
                "im"
            );

        const match =
            responseHeaders.match(headerPattern);

        return match
            ? match[1].trim()
            : null;
    }

    // ============================================================
    // GitHub-repository uitlezen
    // ============================================================

    function loadWallpapersFromGitHub() {
        console.info(
            "[KU IDP Wallpapers] Actuele lijst wordt opgevraagd " +
            "via de GitHub API."
        );

        GM_xmlhttpRequest({
            method: "GET",
            url: GITHUB_API_URL,

            headers: {
                "Accept": "application/vnd.github+json"
            },

            timeout: 8000,

            onload: function (response) {
                /*
                 * Succesvolle GitHub API-response.
                 */
                if (
                    response.status >= 200 &&
                    response.status < 300
                ) {
                    try {
                        const repositoryItems =
                            JSON.parse(
                                response.responseText
                            );

                        const githubWallpapers =
                            repositoryItems
                                .filter(item =>
                                    item.type === "file" &&
                                    /\.(jpe?g|png|webp)$/i.test(
                                        item.name
                                    )
                                )
                                .map(item => ({
                                    name: item.name,
                                    url: item.download_url,
                                    hero:
                                        getHeroName(item.name)
                                }))
                                .filter(wallpaper =>
                                    wallpaper.url
                                );

                        if (githubWallpapers.length === 0) {
                            activateFallback(
                                "De GitHub API gaf geen " +
                                "wallpapers terug."
                            );

                            return;
                        }

                        /*
                         * De volledige succesvolle lijst lokaal
                         * opslaan voor gebruik bij een latere
                         * 403, 429 of netwerkfout.
                         */
                        saveWallpapersToCache(
                            githubWallpapers
                        );

                        console.info(
                            "[KU IDP Wallpapers] GitHub API " +
                            "beschikbaar. De actuele volledige " +
                            "repositorylijst wordt gebruikt."
                        );

                        startWithWallpaperList(
                            githubWallpapers,
                            "GitHub API"
                        );
                    }
                    catch (error) {
                        console.error(
                            "[KU IDP Wallpapers] De GitHub-respons " +
                            "kon niet worden verwerkt:",
                            error
                        );

                        activateFallback(
                            "De GitHub-respons kon niet worden " +
                            "verwerkt."
                        );
                    }

                    return;
                }

                /*
                 * GitHub kan HTTP 403 of 429 teruggeven als een
                 * API-limiet of tijdelijke beperking bereikt is.
                 */
                if (
                    response.status === 403 ||
                    response.status === 429
                ) {
                    const rateLimitRemaining =
                        getResponseHeader(
                            response.responseHeaders,
                            "x-ratelimit-remaining"
                        );

                    const rateLimitReset =
                        getResponseHeader(
                            response.responseHeaders,
                            "x-ratelimit-reset"
                        );

                    const retryAfter =
                        getResponseHeader(
                            response.responseHeaders,
                            "retry-after"
                        );

                    let resetMessage = "";

                    if (rateLimitReset) {
                        const resetDate =
                            new Date(
                                Number(rateLimitReset) * 1000
                            );

                        if (
                            !Number.isNaN(
                                resetDate.getTime()
                            )
                        ) {
                            resetMessage =
                                " Verwachte API-reset: " +
                                `${resetDate.toLocaleString()}.`;
                        }
                    }

                    let retryMessage = "";

                    if (retryAfter) {
                        retryMessage =
                            ` Retry-After: ${retryAfter} seconden.`;
                    }

                    console.warn(
                        "[KU IDP Wallpapers] GitHub API-limiet " +
                        "of toegangsbeperking gedetecteerd. " +
                        `HTTP ${response.status}. ` +
                        "Resterende API-calls: " +
                        `${rateLimitRemaining ?? "onbekend"}.` +
                        resetMessage +
                        retryMessage
                    );

                    activateFallback(
                        "De GitHub API is tijdelijk niet beschikbaar."
                    );

                    return;
                }

                /*
                 * Andere HTTP-fouten.
                 */
                console.error(
                    "[KU IDP Wallpapers] GitHub API-fout:",
                    response.status,
                    response.statusText
                );

                activateFallback(
                    `De GitHub API gaf HTTP ${response.status}.`
                );
            },

            onerror: function (error) {
                console.error(
                    "[KU IDP Wallpapers] GitHub API-netwerkfout:",
                    error
                );

                activateFallback(
                    "De GitHub API kon niet bereikt worden."
                );
            },

            ontimeout: function () {
                console.error(
                    "[KU IDP Wallpapers] De GitHub API-aanvraag " +
                    "is verlopen."
                );

                activateFallback(
                    "De GitHub API reageerde niet tijdig."
                );
            }
        });
    }

    // ============================================================
    // Willekeurige volgorde zonder dezelfde held na elkaar
    // ============================================================

    function createHeroAwareOrder() {
        const remainingWallpapers = [...wallpapers];
        const newOrder = [];

        /*
         * Bij een nieuwe cyclus rekening houden met de held
         * die als laatste op het scherm stond.
         */
        let previousHero = currentHero;

        while (remainingWallpapers.length > 0) {
            let candidateIndexes =
                remainingWallpapers
                    .map((wallpaper, index) => ({
                        wallpaper,
                        index
                    }))
                    .filter(candidate =>
                        candidate.wallpaper.hero !==
                        previousHero
                    )
                    .map(candidate =>
                        candidate.index
                    );

            /*
             * Als alleen afbeeldingen van dezelfde held
             * overblijven, zijn die noodgedwongen toegestaan.
             */
            if (candidateIndexes.length === 0) {
                candidateIndexes =
                    remainingWallpapers.map(
                        (_, index) => index
                    );
            }

            const randomCandidate =
                Math.floor(
                    Math.random() *
                    candidateIndexes.length
                );

            const selectedIndex =
                candidateIndexes[randomCandidate];

            const selectedWallpaper =
                remainingWallpapers.splice(
                    selectedIndex,
                    1
                )[0];

            newOrder.push(selectedWallpaper);
            previousHero = selectedWallpaper.hero;
        }

        orderedWallpapers = newOrder;
        currentWallpaperIndex = 0;

        console.info(
            "[KU IDP Wallpapers] Nieuwe hero-aware " +
            "volgorde aangemaakt."
        );
    }

    // ============================================================
    // Achtergrondlagen initialiseren
    // ============================================================

    function initializeWallpaperLayers() {
        background =
            document.querySelector(
                BACKGROUND_SELECTOR
            );

        if (!background) {
            console.error(
                "[KU IDP Wallpapers] #background niet gevonden."
            );

            return false;
        }

        /*
         * Alleen eerdere scriptlagen verwijderen.
         *
         * De originele IDP-achtergrond wordt niet verwijderd
         * en blijft als diepste fallback beschikbaar.
         */
        background
            .querySelectorAll(
                ".kul-idp-wallpaper-layer"
            )
            .forEach(element =>
                element.remove()
            );

        background.style.setProperty(
            "position",
            "relative",
            "important"
        );

        background.style.setProperty(
            "overflow",
            "hidden",
            "important"
        );

        layers = [
            createWallpaperLayer(0),
            createWallpaperLayer(1)
        ];

        layers.forEach(layer => {
            background.appendChild(layer);
        });

        activeLayerIndex = -1;

        return true;
    }

    // ============================================================
    // Eén wallpaperlaag maken
    // ============================================================

    function createWallpaperLayer(index) {
        const layer =
            document.createElement("div");

        layer.id =
            `kul-idp-wallpaper-layer-${index}`;

        layer.className =
            "kul-idp-wallpaper-layer";

        Object.assign(layer.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",

            /*
             * Automatische schaling voor standaard,
             * widescreen en ultrawide schermformaten.
             */
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",

            opacity: "0",

            transition:
                `opacity ${FADE_DURATION}ms ease-in-out`,

            pointerEvents: "none",

            /*
             * Beide lagen liggen boven de oorspronkelijke
             * IDP-achtergrond.
             */
            zIndex: "1",

            willChange: "opacity",
            backfaceVisibility: "hidden"
        });

        return layer;
    }

    // ============================================================
    // Achtergrond met donkere overlay samenstellen
    // ============================================================

    function createBackgroundImageValue(
        wallpaperUrl
    ) {
        return `
            linear-gradient(
                rgba(0, 0, 0, ${OVERLAY_OPACITY}),
                rgba(0, 0, 0, ${OVERLAY_OPACITY})
            ),
            url("${wallpaperUrl}")
        `;
    }

    // ============================================================
    // Wallpaper met crossfade toepassen
    // ============================================================

    function applyWallpaper(wallpaper) {
        if (
            !background ||
            layers.length !== 2
        ) {
            loadingWallpaper = false;
            return;
        }

        /*
         * Eerste wallpaper gebruikt laag 0.
         *
         * Daarna wordt telkens afgewisseld tussen
         * laag 0 en laag 1.
         */
        const nextLayerIndex =
            activeLayerIndex === -1
                ? 0
                : 1 - activeLayerIndex;

        const nextLayer =
            layers[nextLayerIndex];

        const currentLayer =
            activeLayerIndex === -1
                ? null
                : layers[activeLayerIndex];

        /*
         * Nieuwe laag onzichtbaar voorbereiden.
         */
        nextLayer.style.transition = "none";
        nextLayer.style.opacity = "0";

        nextLayer.style.backgroundImage =
            createBackgroundImageValue(
                wallpaper.url
            );

        /*
         * Firefox de nieuwe laag eerst laten tekenen.
         */
        void nextLayer.offsetWidth;

        nextLayer.style.transition =
            `opacity ${FADE_DURATION}ms ease-in-out`;

        /*
         * Crossfade in twee animation frames starten.
         */
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                nextLayer.style.opacity = "1";

                if (currentLayer) {
                    currentLayer.style.opacity = "0";
                }
            });
        });

        activeLayerIndex = nextLayerIndex;
        currentHero = wallpaper.hero;
        loadingWallpaper = false;

        /*
         * De oude laag blijft haar afbeelding behouden.
         *
         * Alleen de opacity wordt gewijzigd. Hierdoor kan geen
         * wit scherm ontstaan tussen twee afbeeldingen.
         */
        console.info(
            "[KU IDP Wallpapers] Achtergrond ingesteld:",
            wallpaper.name,
            `| Held: ${wallpaper.hero}`
        );

        scheduleNextWallpaper();
    }

    // ============================================================
    // Volgende wallpaper kiezen en vooraf laden
    // ============================================================

    function showNextWallpaper() {
        if (loadingWallpaper) {
            return;
        }

        if (
            orderedWallpapers.length === 0 ||
            currentWallpaperIndex >=
                orderedWallpapers.length
        ) {
            createHeroAwareOrder();
        }

        const wallpaper =
            orderedWallpapers[
                currentWallpaperIndex
            ];

        currentWallpaperIndex++;
        loadingWallpaper = true;

        /*
         * De volgende afbeelding volledig downloaden voordat
         * de crossfade begint.
         *
         * De huidige afbeelding blijft tijdens het laden
         * volledig zichtbaar.
         */
        const preloadedImage = new Image();

        preloadedImage.onload = function () {
            applyWallpaper(wallpaper);
        };

        preloadedImage.onerror = function () {
            console.error(
                "[KU IDP Wallpapers] Afbeelding kon niet " +
                "worden geladen:",
                wallpaper.name,
                wallpaper.url
            );

            loadingWallpaper = false;

            /*
             * Bij een fout na één seconde een andere
             * afbeelding proberen.
             */
            slideshowTimer =
                window.setTimeout(
                    showNextWallpaper,
                    1000
                );
        };

        preloadedImage.src = wallpaper.url;
    }

    // ============================================================
    // Volgende wissel plannen
    // ============================================================

    function scheduleNextWallpaper() {
        if (slideshowTimer) {
            window.clearTimeout(
                slideshowTimer
            );
        }

        slideshowTimer =
            window.setTimeout(
                showNextWallpaper,
                SLIDESHOW_INTERVAL
            );
    }

    // ============================================================
    // Start
    // ============================================================

    function start() {
        if (!initializeWallpaperLayers()) {
            return;
        }

        /*
         * Eerst de actuele GitHub-lijst proberen.
         *
         * Bij een 403, 429, timeout of andere fout wordt
         * automatisch cache of de vaste backupselectie gebruikt.
         */
        loadWallpapersFromGitHub();
    }

    start();

})();