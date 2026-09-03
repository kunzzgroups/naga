(function () {
    const CUSTOM_BASE = 'assets/custom';
    const VERSION_JSON = CUSTOM_BASE + '/version.json?ts=' + Date.now();

    function setImageBySelectors(selectors, url) {
        selectors.forEach(function (selector) {
            document.querySelectorAll(selector).forEach(function (img) {
                if (img && img.tagName && img.tagName.toLowerCase() === 'img') {
                    img.src = url;
                }
            });
        });
    }

    function setFavicon(url) {
        var icons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
        if (!icons.length) {
            var icon = document.createElement('link');
            icon.rel = 'icon';
            document.head.appendChild(icon);
            icons = [icon];
        }
        icons.forEach(function (icon) {
            icon.href = url;
        });
    }

    function applyMainLayout(data) {
        var version = data && data.version ? data.version : '1.0.0';
        var logoUrl = data && data.logo ? data.logo : CUSTOM_BASE + '/images/logo.png?v=' + version;
        var faviconUrl = data && data.favicon ? data.favicon : CUSTOM_BASE + '/images/favicon.png?v=' + version;
        var backgroundUrl = data && data.background ? data.background : CUSTOM_BASE + '/images/background.jpg?v=' + version;

        setImageBySelectors([
            '.top-header img',
            '.top-header .brand img',
            '.brand img',
            '.logo img',
            'img[alt*="logo" i]',
            'img[src*="logo"]'
        ], logoUrl);

        setFavicon(faviconUrl);
        document.body.classList.add('naga-custom-main-layout');
        document.body.style.backgroundImage = 'url("' + backgroundUrl + '")';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center top';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
    }

    function loadVersionAndApply() {
        fetch(VERSION_JSON, { cache: 'no-store' })
            .then(function (res) { return res.ok ? res.json() : {}; })
            .then(applyMainLayout)
            .catch(function () { applyMainLayout({ version: '1.0.0' }); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadVersionAndApply);
    } else {
        loadVersionAndApply();
    }
})();
