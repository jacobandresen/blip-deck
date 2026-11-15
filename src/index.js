// The <blip-deck> element. Importing this module defines it; the built dist/blip-deck.js does the same for a <script>.
import { BlipDeck, LABELS } from './deck.js';
import { gate, cross, TUNING } from './gate.js';

export { BlipDeck, LABELS, gate, cross, TUNING };
if (!customElements.get('blip-deck')) customElements.define('blip-deck', BlipDeck);
