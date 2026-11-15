/* blip-deck (MIT): github.com/jacobandresen/blip-deck */
(()=>{var v=`/* <blip-deck>'s look, inside its shadow root. Everything is drawn with CSS and one inline SVG: no images or fonts.
   Theme it from outside with these custom properties, or with ::part(panel | station | stick | dpad | buttons | button):
     --blip-deck-tilt      how far the panel leans back (24deg; 0 in landscape)
     --blip-deck-cap       a button's size (sized from the station's width by default)
     --blip-deck-panel     the panel's background
     --blip-deck-ball      the joystick's ball
     --blip-deck-button1, --blip-deck-button2, --blip-deck-p2-button2   button colours */
:host {
  --tilt: var(--blip-deck-tilt, 24deg);
  --red: var(--blip-deck-button1, #d9302a);
  display: block;
  position: relative;
  container-type: inline-size;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
}
:host([layout="landscape"]) { --tilt: 0deg; }

/* ---- The panel: black moulded plastic, lit along its top edge, leaning back ---- */
.panel {
  display: flex;
  min-height: 100%;
  box-sizing: border-box;
  border-radius: 14px 14px 0 0;
  background: var(--blip-deck-panel,
    linear-gradient(180deg, #ffffff30 0 1px, #0008 2px 5px, transparent 14px),
    radial-gradient(120% 90% at 50% 0%, #ffffff12, transparent 60%),
    linear-gradient(180deg, #2c2a31, #151418));
  box-shadow: inset 0 -12px 20px #0007, 0 -10px 24px -10px #000a;
  transform: perspective(160cqi) rotateX(var(--tilt));
  transform-origin: 50% 100%;
  transform-style: preserve-3d;
  position: relative; /* children put inside the deck are placed on the panel */
}
/* A station is a container, so its row (and everything sized off --cap) measures the station, not the deck. */
.station {
  flex: 1 1 0;
  min-width: 0;
  container: station / inline-size;
  transform-style: preserve-3d;
}
.row {
  --cap: var(--blip-deck-cap, clamp(36px, 15cqi, 60px));
  --stick-w: calc(var(--cap) * 1.75);
  --edge: 10px; /* room at the panel's edge */
  --mid: 10px;  /* room toward the other player: wider with two, so each player's controls read as their own */
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  gap: calc(var(--cap) * 0.4);
  padding: calc(var(--cap) * 0.45) var(--mid) calc(var(--cap) * 0.3) var(--edge);
  transform-style: preserve-3d;
}
:host([seats="2"]) .row { --mid: 18px; }
.station[data-who="1"] .row { padding-left: var(--mid); padding-right: var(--edge); }
.station + .station { box-shadow: inset 2px 0 0 -1px #0009, inset 3px 0 0 -1px #ffffff0c; }
.station[aria-disabled] { --red: #3a3b40; filter: saturate(0.4) brightness(0.8); }

/* ---- Joystick: a washer flat on the panel, a chrome shaft and a red ball standing up out of it ---- */
.stick, .dpad { position: relative; flex: none; width: var(--stick-w); aspect-ratio: 1; }
/* the stick's box holds the ball standing above the washer, so nothing overlaps it */
.stick { aspect-ratio: auto; height: calc(var(--cap) * 2.4); }
:host([controls="pad"]) .stick, :host(:not([controls="pad"])) .dpad { display: none; }
.stick { transform-style: preserve-3d; cursor: grab; }
.washer {
  position: absolute;
  left: calc(50% - var(--cap) * 0.6);
  bottom: calc(var(--cap) * 0.12);
  width: calc(var(--cap) * 1.2);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle, #000 0 20%, transparent 23%),
    conic-gradient(from 22.5deg, #8d8372 0 2deg, #26231f 3deg 43deg, #8d8372 44deg 46deg, #26231f 47deg 88deg,
      #8d8372 89deg 91deg, #26231f 92deg 133deg, #8d8372 134deg 136deg, #26231f 137deg 178deg, #8d8372 179deg 181deg,
      #26231f 182deg 223deg, #8d8372 224deg 226deg, #26231f 227deg 268deg, #8d8372 269deg 271deg, #26231f 272deg 313deg,
      #8d8372 314deg 316deg, #26231f 317deg 358deg, #8d8372 359deg);
  box-shadow: 0 0 0 calc(var(--cap) * 0.08) #111, 0 0 0 calc(var(--cap) * 0.1) #ffffff1c, 0 6px 10px #000c,
    inset 0 2px 6px #000;
}
.lever {
  position: absolute;
  left: 50%;
  bottom: calc(var(--cap) * 0.72);
  transform-style: preserve-3d;
  transform: rotateX(calc(-1 * var(--tilt) - 4deg - var(--dy, 0) * 14deg)) rotate(calc(var(--dx, 0) * 18deg));
  transition: transform 55ms ease-out;
}
.shaft {
  position: absolute;
  left: calc(var(--cap) * -0.09);
  bottom: 0;
  width: calc(var(--cap) * 0.18);
  height: calc(var(--cap) * 0.7);
  border-radius: 40% 40% 12% 12% / 18% 18% 6% 6%;
  background: linear-gradient(90deg, #161719, #65696b 12%, #e5e5df 29%, #fffef2 39%, #9da1a0 52%, #393c3e 73%, #171719 88%, #888a86);
}
.ball {
  position: absolute;
  left: calc(var(--cap) * -0.58);
  bottom: calc(var(--cap) * 0.5);
  width: calc(var(--cap) * 1.16);
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--blip-deck-ball,
    radial-gradient(circle at 34% 24%, #fff 0 4%, #ffffffa0 9%, transparent 24%),
    radial-gradient(circle at 46% 40%, #ff6a52, #e0281b 45%, #a0120a 75%, #5e0703));
  box-shadow: 0 8px 14px #0009, inset -4px -6px 10px #30000080;
}

/* ---- D-pad: a moulded black cross in a round recess; a pressed arm glows ---- */
.dpad::before { content: ''; position: absolute; inset: -4%; border-radius: 50%;
  background: radial-gradient(circle at 42% 32%, #34302b, #171513 63%, #080808); box-shadow: inset 0 3px 7px #000d, 0 1px 0 #ffffff20; }
.dpad svg { position: absolute; inset: 6%; overflow: visible; filter: drop-shadow(0 2px 2px #000c); }
.dpad path { fill: url(#plastic); stroke: #ffe7c938; stroke-width: 0.9; }
.dpad stop { stop-color: #55545c; transition: stop-color 60ms; }
.dpad stop + stop { stop-color: #2a292e; }
.dpad stop + stop + stop { stop-color: #18171b; }
.dpad:has([aria-pressed="true"]) stop { stop-color: #8a5a3a; }
.dpad:has([aria-pressed="true"]) stop + stop { stop-color: #5c3a2c; }
.dpad:has([aria-pressed="true"]) stop + stop + stop { stop-color: #3c2620; }
.dpad circle { fill: #0005; stroke: #ffffff12; stroke-width: 0.8; }
.arm { position: absolute; opacity: 0; transition: opacity 50ms; border-radius: 6px;
  background: linear-gradient(var(--to), #f08a3a, #e4342b 45%, transparent); }
.arm.up    { --to: 180deg; inset: 8% 37% 50% 37%; }
.arm.down  { --to: 0deg;   inset: 50% 37% 8% 37%; }
.arm.left  { --to: 90deg;  inset: 37% 50% 37% 8%; }
.arm.right { --to: 270deg; inset: 37% 8% 37% 50%; }
.arm[aria-pressed="true"] { opacity: 0.95; }

/* ---- Buttons: a dome of coloured plastic in a machined bezel, the legend printed above ---- */
.caps {
  display: flex;
  gap: calc(var(--cap) * 0.3);
  padding: calc(var(--cap) * 0.16);
  margin-top: 12px;
  border-radius: calc(var(--cap) * 0.6);
  background: #0000002a;
  box-shadow: inset 0 2px 4px #0008, 0 1px 0 #ffffff12;
}
.cap {
  --c: var(--red);
  position: relative;
  width: var(--cap);
  aspect-ratio: 1;
  border-radius: 50%;
  cursor: pointer;
  background: radial-gradient(circle, #0b0909 0 59%, transparent 61%),
    conic-gradient(from -48deg, #e4c69c, #765a3f 11%, #30251f 24%, #171719 43%, #342920 59%, #947451 76%, #dbc09a 91%, #e4c69c);
  box-shadow: 0 3px 0 #352b24, 0 5px 0 #100e10, 2px 8px 8px #000b, inset 0 1px #fff6e194;
  transition: transform 50ms, box-shadow 50ms;
}
.cap + .cap { --c: var(--blip-deck-button2, #2f76d0); }
.station[data-who="1"] .cap + .cap { --c: var(--blip-deck-p2-button2, #139a7a); }
.station[aria-disabled] .cap { --c: #3a3b40; }
.cap::before {
  content: '';
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 24%, #ffffffd0 0 6%, #ffffff30 16%, transparent 34%),
    radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--c), #fff 30%), var(--c) 46%,
      color-mix(in srgb, var(--c), #000 45%) 80%, color-mix(in srgb, var(--c), #000 70%));
  box-shadow: inset 0 -6px 9px #1008, 0 2px 4px #000a;
  transition: transform 50ms, filter 50ms, box-shadow 50ms;
}
.cap[aria-pressed="true"] { transform: translateY(2px); box-shadow: 0 1px 0 #100e10, 0 2px 4px #000c, inset 0 2px 6px #000d; }
.cap[aria-pressed="true"]::before { transform: scale(0.91); filter: brightness(1.15);
  box-shadow: inset 0 4px 8px #000a, 0 0 calc(var(--cap) * 0.4) color-mix(in srgb, var(--c), transparent 40%); }
.legend {
  position: absolute;
  bottom: calc(100% + var(--cap) * 0.16 + 4px);
  left: 50%;
  transform: translateX(-50%);
  color: #f1e3c0;
  font: 700 10px/1 ui-monospace, Menlo, Consolas, monospace;
  letter-spacing: 0.1em;
  white-space: nowrap;
  text-shadow: 0 1px 0 #000;
  pointer-events: none;
}

/* ---- Narrow stations (two players on a phone): the buttons stack, their legends beside them, cut short if
   a word does not fit (screen readers still hear all of it) ---- */
@container station (max-width: 250px) {
  .row { gap: 0; justify-content: space-between; }
  .caps { flex-direction: column-reverse; margin-top: 0; }
  .legend {
    bottom: 50%; left: auto; right: calc(100% + var(--cap) * 0.16 + 6px); transform: translateY(50%);
    /* the room between the stick and the button: the row less its padding, the stick, the button and its plate
       (1.32 caps), the legend's own 6px off the plate and 6px clear of the stick */
    max-width: calc(100cqi - var(--edge) - var(--mid) - var(--stick-w) - var(--cap) * 1.32 - 12px);
    overflow: hidden; text-overflow: ellipsis;
  }
}
@container station (max-width: 180px) {
  .row { --stick-w: calc(var(--cap) * 1.4); --edge: 6px; }
  .legend { font-size: 8px; letter-spacing: 0.04em; right: calc(100% + var(--cap) * 0.16 + 3px);
    max-width: calc(100cqi - var(--edge) - var(--mid) - var(--stick-w) - var(--cap) * 1.32 - 9px); }
}

/* ---- Landscape: no panel; each station stands in its gutter beside the picture, buttons over the stick ---- */
:host([layout="landscape"]) { container-type: normal; pointer-events: none; }
:host([layout="landscape"]) .panel { background: none; box-shadow: none; transform: none; justify-content: space-between; align-items: flex-end; }
:host([layout="landscape"]) .station { flex: none; container-type: normal; box-shadow: none; }
:host([layout="landscape"]) .row {
  --cap: var(--blip-deck-cap, 50px);
  flex-direction: column-reverse;
  align-items: flex-start;
  padding: 10px max(10px, env(safe-area-inset-left)) max(10px, env(safe-area-inset-bottom));
}
:host([layout="landscape"]) .station[data-who="1"] .row { align-items: flex-end; padding-right: max(10px, env(safe-area-inset-right)); }
:host([layout="landscape"]:not([seats="2"])) .station { flex: 1; }
:host([layout="landscape"]:not([seats="2"])) .row { flex-direction: row; justify-content: space-between; align-items: flex-end; }
:host([layout="landscape"]) :is(.stick, .dpad, .cap) { pointer-events: auto; }
:host([layout="landscape"]) .caps { background: none; box-shadow: none; padding: 0; margin: 14px 0 0; }
`;var $=[["up"],["up","right"],["right"],["down","right"],["down"],["down","left"],["left"],["up","left"]],w={engage:16,release:9,hyst:8,maxR:46};function g(d,t,e={}){let a={...w,...e},s={x:d,y:t},o=-1;return function(n,c){let p=n-s.x,l=c-s.y,r=Math.hypot(p,l);if(r>a.maxR&&(s.x=n-p*a.maxR/r,s.y=c-l*a.maxR/r,p=n-s.x,l=c-s.y),Math.hypot(p,l)<(o<0?a.engage:a.release))o=-1;else{let f=(Math.atan2(p,-l)*180/Math.PI+360)%360,y=Math.abs((f-o*45+540)%360-180);(o<0||y>22.5+a.hyst)&&(o=Math.round(f/45)%8)}return o<0?[]:$[o]}}function b(d,t,e=.32){return[t<-e&&"up",t>e&&"down",d<-e&&"left",d>e&&"right"].filter(Boolean)}var M=["up","right","down","left"],x={player:"Player {n}",stick:"Joystick",pad:"D-pad",button:"Button {n}",up:"Up",down:"Down",left:"Left",right:"Right"},L=12,k=20,E="M38 2H62Q68 2 68 8V29Q68 32 71 32H92Q98 32 98 38V62Q98 68 92 68H71Q68 68 68 71V92Q68 98 62 98H38Q32 98 32 92V71Q32 68 29 68H8Q2 68 2 62V38Q2 32 8 32H29Q32 32 32 29V8Q32 2 38 2Z",h=d=>String(d).replace(/[&<>"']/g,t=>`&#${t.charCodeAt(0)};`),m=d=>d?"p2":"",u=class extends HTMLElement{static observedAttributes=["buttons","seats","solo"];#i=x;#t=new Map;#e=new Map;#a=new Set;tuning={};constructor(){super(),this.attachShadow({mode:"open"}),this.addEventListener("touchstart",this.#c,{passive:!1});for(let t of["touchmove","touchend","touchcancel"])this.addEventListener(t,this.#c);this.addEventListener("pointerdown",this.#d);for(let t of["pointermove","pointerup","pointercancel"])this.addEventListener(t,this.#d);this.addEventListener("contextmenu",t=>t.preventDefault())}connectedCallback(){this.#n()}disconnectedCallback(){this.release()}attributeChangedCallback(){this.isConnected&&this.#n()}get labels(){return this.#i}set labels(t){this.#i={...x,...t},this.isConnected&&this.#n()}press(t,e){e?this.#a.add(t):this.#a.delete(t),this.#o()}release(){this.#t.clear(),this.#s(!0),this.#a.clear(),this.#o()}#h(){try{let t=JSON.parse(this.getAttribute("buttons"));if(Array.isArray(t)&&t.length)return t.slice(0,2).map(String)}catch{}return[""]}#n(){this.release();let t=this.#i,e=(i,n)=>h(i.replace("{n}",n+1)),a=this.#h(),s=this.getAttribute("seats")==="2"?2:1,o=i=>{let n=m(i),c=i===1&&this.hasAttribute("solo"),p=M.map(r=>`<span class="arm ${r}" data-name="${n}${r}" role="button" aria-label="${h(t[r])}"></span>`).join(""),l=a.map((r,f)=>`<span class="cap" part="button" data-name="${n}button${f+1}" role="button"
        aria-label="${r?h(r):e(t.button,f)}">${r&&!c?`<span class="legend" aria-hidden="true">${h(r)}</span>`:""}</span>`).join("");return`<div class="station" part="station" data-who="${i}" role="group" aria-label="${e(t.player,i)}"${c?' aria-disabled="true"':""}><div class="row">
        <div class="stick" part="stick" data-kind="stick" role="group" aria-label="${h(t.stick)}">
          <span class="washer"></span><span class="lever"><span class="shaft"></span><span class="ball"></span></span>
        </div>
        <div class="dpad" part="dpad" data-kind="dpad" role="group" aria-label="${h(t.pad)}">
          <svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="plastic" x2="0" y2="1"><stop offset="0"/><stop offset=".55"/><stop offset="1"/></linearGradient></defs><path d="${E}"/><circle cx="50" cy="50" r="7"/></svg>${p}
        </div>
        <div class="caps" part="buttons">${l}</div>
      </div></div>`};this.shadowRoot.innerHTML=`<style>${v}</style><div class="panel" part="panel">${o(0)}${s===2?o(1):""}<slot></slot></div>`,this.#o()}#c=t=>{if(t.type==="touchstart"){t.preventDefault();for(let a of t.changedTouches)this.#p(a.identifier,a.clientX,a.clientY)}let e=new Set;for(let a of t.touches)e.add(a.identifier),this.#r(a.identifier,a.clientX,a.clientY);for(let a of this.#t.keys())typeof a=="number"&&!e.has(a)&&this.#t.delete(a);this.#s()};#d=t=>{if(t.pointerType==="touch")return;let e="p"+t.pointerId;if(t.type==="pointerdown"){t.preventDefault();try{this.setPointerCapture(t.pointerId)}catch{}this.#p(e,t.clientX,t.clientY)}else t.type==="pointermove"?this.#r(e,t.clientX,t.clientY):this.#t.delete(e);this.#s()};#p(t,e,a){let s=this.#l(e,a,".stick, .dpad, .cap");if(!s)return;let o=s.dataset.kind||"cap",i=Number(s.closest(".station").dataset.who);this.#t.set(t,{kind:o,who:i,el:s,gate:o==="stick"&&g(e,a,this.tuning),names:[]}),this.#r(t,e,a)}#r(t,e,a){let s=this.#t.get(t);if(!s)return;let o=m(s.who);if(s.kind==="stick")s.names=s.gate(e,a).map(i=>o+i);else if(s.kind==="dpad"){let i=s.el.getBoundingClientRect();s.names=b((e-i.left)/(i.width/2)-1,(a-i.top)/(i.height/2)-1).map(n=>o+n)}else{let i=this.#l(e,a,`.station[data-who="${s.who}"] .cap`);s.names=i?[i.dataset.name]:[]}}#l(t,e,a){let s=null,o=1/0;for(let i of this.shadowRoot.querySelectorAll(a)){let n=i.getBoundingClientRect();if(!n.width||i.closest("[aria-disabled]"))continue;let c=Math.hypot(Math.max(n.left-t,0,t-n.right),Math.max(n.top-e,0,e-n.bottom));c<o&&c<=(i.classList.contains("cap")?L:0)&&(s=i,o=c)}return s}#s(t=!1){let e=new Set([...this.#t.values()].flatMap(o=>o.names)),a=performance.now(),s=[];for(let[o,i]of this.#e)e.has(o)||(!t&&a-i<k?setTimeout(()=>this.#s(),k-(a-i)):(this.#e.delete(o),s.push([o,!1])));for(let o of e)this.#e.has(o)||(this.#e.set(o,a),s.push([o,!0]));if(s.length){this.#o();for(let[o,i]of s)this.dispatchEvent(new CustomEvent("blip-input",{detail:{name:o,down:i},bubbles:!0,composed:!0}))}}#o(){let t=e=>this.#e.has(e)||this.#a.has(e);for(let e of this.shadowRoot.querySelectorAll("[data-name]"))e.setAttribute("aria-pressed",t(e.dataset.name));for(let e of this.shadowRoot.querySelectorAll(".station")){let a=m(Number(e.dataset.who)),s=n=>t(a+n)?1:0,o=s("right")-s("left"),i=s("down")-s("up");o&&i&&(o*=Math.SQRT1_2,i*=Math.SQRT1_2),e.style.setProperty("--dx",o),e.style.setProperty("--dy",i)}}};customElements.get("blip-deck")||customElements.define("blip-deck",u);})();
