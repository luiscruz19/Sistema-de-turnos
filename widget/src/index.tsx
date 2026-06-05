import { render } from 'preact';
import { App } from './App';
import styles from './styles.css?inline';

(function () {
    const scriptTag = document.currentScript as HTMLScriptElement | null;

    if (!scriptTag) {
        console.error('[TurnosWidget] No se encontro el script tag.');
        return;
    }

    const apiKey = scriptTag.getAttribute('data-api-key');
    if (!apiKey) {
        console.error('[TurnosWidget] Falta el atributo data-api-key en el script tag.');
        return;
    }

    const scriptUrl = new URL(scriptTag.src);
    const defaultBaseUrl = `${scriptUrl.origin}/turnos`;
    const apiBaseUrl = scriptTag.getAttribute('data-api-url') || defaultBaseUrl;

    // Create container
    const container = document.createElement('div');
    container.id = 'turnos-widget-root';
    document.body.appendChild(container);

    // Shadow DOM for style isolation
    const shadow = container.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    shadow.appendChild(styleEl);

    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    render(<App apiKey={apiKey} apiBaseUrl={apiBaseUrl} />, mountPoint);
})();
