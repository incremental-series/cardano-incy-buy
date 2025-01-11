/**
 * document.getElementById(elementId);
 * @throws Error if element with id not found.
 */
export function getElementById(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id ${elementId} doesn't exist.`);
    }
    return element;
}
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
export function formatNumber(number) {
    const strs = number.toString().split('.', 2);
    const a = strs[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (strs.length > 1)
        return `${a}.${strs[1]}`;
    return a;
}
/**
 * Allows hex input with whitespace characters.
 */
export function onBeforeInputHexOnly(event) {
    if (event.data && !/^[a-f\d\s]+$/i.test(event.data)) {
        event.preventDefault();
    }
}
export function onChangeIsValid(eventTarget, fnIsValid, invalidInputToken) {
    if (eventTarget.value && !fnIsValid(eventTarget.value)) {
        eventTarget.classList.add(invalidInputToken);
    }
    else {
        eventTarget.classList.remove(invalidInputToken);
    }
}
export function setValueNotifyChange(element, value) {
    element.value = value ?? '';
    element.dispatchEvent(new Event('change'));
}
export function clearValueNotifyChange(element) {
    setValueNotifyChange(element);
}
export function notifyChangeFor(elements, instances) {
    elements.forEach((element) => {
        try {
            if (instances.some(value => element instanceof value)) {
                element.dispatchEvent(new Event('change'));
            }
        }
        catch (error) {
            console.error(error);
        }
    });
}
//# sourceMappingURL=utils.js.map