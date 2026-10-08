// ==UserScript==
// @name         KU Leuven IDP Superheroes Slideshow
// @namespace    PhilippeLC-KUL-IDP
// @version      1.6
// @description  Random superhero slideshow with crossfade, overlay and hero-aware rotation
// @match        https://idp.kuleuven.be/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @downloadURL  https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/ChangeCentraleLoginWallpapers.js
// @updateURL    https://raw.githubusercontent.com/PhilippeLC/KUL-IDP-Superheroes/main/ChangeCentraleLoginWallpapers.js
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // Configuratie
    // ============================================================

    const GITHUB_API_URL =
        "https://api.github.com/repos/PhilippeLC/KUL-IDP-Superheroes/contents";

    // Iedere wallpaper blijft 15 seconden staan.
    const SLIDESHOW_INTERVAL = 15000;

    // Crossfade van 1,5 seconde.
    const FADE_DURATION = 1500;

    // Donkere overlay.
    // 0.08 = zeer subtiel
    // 0.12 = aanbevolen
    // 0.18 = duidelijk donkerder
    const OVERLAY_OPACITY = 0.12;

    const BACKGROUND_SELECTOR = "#background";

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

    // ============================================================
    // Held uit de bestandsnaam halen
    //
    // Batman01.jpg       -> batman
    // IronMan03.jpg      -> ironman
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
    // GitHub-repository uitlezen
    // ============================================================

    function loadWallpapersFromGitHub() {
        GM_xmlhttpRequest({
            method: "GET",
            url: GITHUB_API_URL,

            headers: {
                "Accept": "application/vnd.github+json"
            },

            onload: function (response) {
                if (
                    response.status < 200 ||
                    response.status >= 300
                ) {
                    console.error(
                        "[KU IDP Wallpapers] GitHub API-fout:",
                        response.status,
                        response.statusText
                    );

                    return;
                }

                try {
                    const repositoryItems =
                        JSON.parse(response.responseText);

                    wallpapers = repositoryItems
                        .filter(item =>
                            item.type === "file" &&
                            /\.(jpe?g|png|webp)$/i.test(item.name)
                        )
                        .map(item => ({
                            name: item.name,
                            url: item.download_url,
                            hero: getHeroName(item.name)
                        }))
                        .filter(wallpaper => wallpaper.url);

                    console.log(
                        `[KU IDP Wallpapers] ${wallpapers.length} wallpapers gevonden.`
                    );

                    if (wallpapers.length === 0) {
                        console.error(
                            "[KU IDP Wallpapers] Geen afbeeldingen gevonden."
                        );

                        return;
                    }

                    createHeroAwareOrder();

                    /*
                     * De eerste willekeurige superhero wordt
                     * onmiddellijk geladen.
                     */
                    showNextWallpaper();
                }
                catch (error) {
                    console.error(
                        "[KU IDP Wallpapers] GitHub-resultaat kon niet worden verwerkt:",
                        error
                    );
                }
            },

            onerror: function (error) {
                console.error(
                    "[KU IDP Wallpapers] GitHub kon niet worden geladen:",
                    error
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
         * Hiermee voorkomen we ook dat de laatste held van de
         * vorige cyclus als eerste terugkomt.
         */
        let previousHero = currentHero;

        while (remainingWallpapers.length > 0) {
            let candidateIndexes = remainingWallpapers
                .map((wallpaper, index) => ({
                    wallpaper,
                    index
                }))
                .filter(candidate =>
                    candidate.wallpaper.hero !== previousHero
                )
                .map(candidate => candidate.index);

            /*
             * Als alleen afbeeldingen van dezelfde held overblijven,
             * moeten deze noodgedwongen toch gebruikt worden.
             */
            if (candidateIndexes.length === 0) {
                candidateIndexes = remainingWallpapers.map(
                    (_, index) => index
                );
            }

            const randomCandidate =
                Math.floor(
                    Math.random() * candidateIndexes.length
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

        console.log(
            "[KU IDP Wallpapers] Nieuwe hero-aware volgorde aangemaakt."
        );
    }

    // ============================================================
    // Achtergrondlagen initialiseren
    // ============================================================

    function initializeWallpaperLayers() {
        background =
            document.querySelector(BACKGROUND_SELECTOR);

        if (!background) {
            console.error(
                "[KU IDP Wallpapers] #background niet gevonden."
            );

            return false;
        }

        /*
         * Alleen door het script aangemaakte lagen verwijderen.
         * De originele IDP-achtergrond wordt niet verwijderd.
         */
        background
            .querySelectorAll(".kul-idp-wallpaper-layer")
            .forEach(element => element.remove());

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
        const layer = document.createElement("div");

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
             * Automatische schaling voor de verschillende
             * schermformaten.
             */
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",

            opacity: "0",

            transition:
                `opacity ${FADE_DURATION}ms ease-in-out`,

            pointerEvents: "none",

            /*
             * Beide lagen komen boven de oorspronkelijke
             * IDP-achtergrond te liggen.
             */
            zIndex: "1",

            willChange: "opacity",
            backfaceVisibility: "hidden"
        });

        return layer;
    }

    // ============================================================
    // Achtergrond inclusief donkere overlay samenstellen
    // ============================================================

    function createBackgroundImageValue(wallpaperUrl) {
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
        if (!background || layers.length !== 2) {
            loadingWallpaper = false;
            return;
        }

        /*
         * Bij de eerste foto gebruiken we laag 0.
         * Daarna wisselen we telkens tussen laag 0 en laag 1.
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
            createBackgroundImageValue(wallpaper.url);

        /*
         * Firefox de nieuwe achtergrond eerst laten tekenen.
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

        /*
         * Vanaf nu is de nieuwe laag de actieve laag.
         */
        activeLayerIndex = nextLayerIndex;
        currentHero = wallpaper.hero;
        loadingWallpaper = false;

        /*
         * Belangrijk:
         *
         * De oude achtergrond wordt NIET op "none" gezet.
         * De oude laag blijft gewoon onzichtbaar bestaan.
         * Hierdoor kan er geen wit scherm ontstaan.
         */
        console.log(
            "[KU IDP Wallpapers] Achtergrond ingesteld:",
            wallpaper.name,
            `| Held: ${wallpaper.hero}`
        );

        /*
         * De volgende wissel wordt pas gepland nadat deze wallpaper
         * correct werd toegepast.
         */
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
            currentWallpaperIndex >= orderedWallpapers.length
        ) {
            createHeroAwareOrder();
        }

        const wallpaper =
            orderedWallpapers[currentWallpaperIndex];

        currentWallpaperIndex++;
        loadingWallpaper = true;

        /*
         * De volgende afbeelding eerst volledig downloaden.
         * De huidige wallpaper blijft tijdens het laden zichtbaar.
         */
        const preloadedImage = new Image();

        preloadedImage.onload = function () {
            applyWallpaper(wallpaper);
        };

        preloadedImage.onerror = function () {
            console.error(
                "[KU IDP Wallpapers] Afbeelding kon niet worden geladen:",
                wallpaper.name,
                wallpaper.url
            );

            loadingWallpaper = false;

            /*
             * Bij een fout na één seconde de volgende afbeelding
             * proberen.
             */
            slideshowTimer = window.setTimeout(
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
            window.clearTimeout(slideshowTimer);
        }

        slideshowTimer = window.setTimeout(
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
         * De GitHub-lijst wordt opgehaald.
         * Meteen daarna wordt een willekeurige superhero geladen.
         */
        loadWallpapersFromGitHub();
    }

    start();

})();
