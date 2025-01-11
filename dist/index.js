import { App } from "./app/app.js";
function initialize() {
    const app = new App('js-main-content', 'js-wallet-selection');
    // Not needed, but could be useful for some.
    // if (window.app === undefined) window.app = app;
    app.initialize();
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initialize();
    });
}
else {
    initialize();
}
//# sourceMappingURL=index.js.map