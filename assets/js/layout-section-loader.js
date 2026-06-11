function loadLayoutSections() {
  const version = Date.now();

  document.querySelectorAll('[data-layout-section]').forEach((el) => {
    const key = el.dataset.layoutSection;
    const base = 'assets/custom/sections/' + key;

    fetch(base + '.html?v=' + version)
      .then(res => {
        if (!res.ok) throw new Error(key + ' not found');
        return res.text();
      })
      .then(html => {
        el.innerHTML = html;

        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = base + '.css?v=' + version;
        document.head.appendChild(css);

        const js = document.createElement('script');
        js.src = base + '.js?v=' + version;
        document.body.appendChild(js);
      })
      .catch(err => console.warn(err.message));
  });
}

document.addEventListener('DOMContentLoaded', loadLayoutSections);