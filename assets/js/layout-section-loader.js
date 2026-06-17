function loadLayoutSections() {
  const version = Date.now();

  const fetchTextIfNotEmpty = (url) => {
    return fetch(url + '?v=' + version, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) return '';
        return res.text();
      })
      .then((text) => {
        const cleaned = (text || '').trim();
        return cleaned ? text : '';
      })
      .catch(() => '');
  };

  document.querySelectorAll('[data-layout-section]').forEach((el) => {
    const key = (el.dataset.layoutSection || '').trim();
    if (!key) return;

    const base = 'assets/custom/sections/' + key;

    fetchTextIfNotEmpty(base + '.html')
      .then((html) => {
        // Important: if custom section HTML file is missing or empty,
        // keep the original page content and do not load its CSS/JS.
        if (!html) return;

        el.innerHTML = html;

        fetchTextIfNotEmpty(base + '.css').then((cssText) => {
          if (!cssText) return;

          const style = document.createElement('style');
          style.setAttribute('data-layout-section-css', key);
          style.textContent = cssText;
          document.head.appendChild(style);
        });

        fetchTextIfNotEmpty(base + '.js').then((jsText) => {
          if (!jsText) return;

          const script = document.createElement('script');
          script.setAttribute('data-layout-section-js', key);
          script.textContent = jsText;
          document.body.appendChild(script);
        });
      });
  });
}

document.addEventListener('DOMContentLoaded', loadLayoutSections);
