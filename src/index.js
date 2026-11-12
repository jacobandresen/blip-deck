// The bundle's globals, for pages without modules: window.BlipController, window.BlipDeck, and <blip-deck>.
import { BlipController } from './controller.js';
import { BlipDeckElement, bindStick, lean } from './deck.js';

export { BlipController, BlipDeckElement, bindStick, lean };
export const BlipDeck = { bindStick, lean };
Object.assign(window, { BlipController, BlipDeck });
customElements.define('blip-deck', BlipDeckElement);
