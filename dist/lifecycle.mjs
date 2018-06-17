/*!
 Copyright 2018 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
/*! lifecycle.mjs v0.1.0 */
let t;try{new EventTarget,t=!0}catch(e){t=!1}class e{constructor(){this.t={}}addEventListener(t,e,s=!1){this.e(t).push(e)}removeEventListener(t,e,s=!1){const i=this.e(t),r=i.indexOf(e);r>-1&&i.splice(r,1)}dispatchEvent(t){return t.target=this,Object.freeze(t),this.e(t.type).forEach(e=>e(t)),!0}e(t){return this.t[t]=this.t[t]||[]}}var s=t?EventTarget:e;class i{constructor(t){this.type=t}}var r=t?Event:i;class n extends r{constructor(t,e){super(t),this.newState=e.newState,this.oldState=e.oldState}}const h="loading",a="active",c="passive",o="hidden",d="frozen",u="discarded",v="terminated",l=["load","pageshow","resume","focus","blur","pagehide","visibilitychange","freeze"],g=t=>t.reduce((t,e,s)=>(t[e]=s,t),{}),b=t=>(t.preventDefault(),t.returnValue="Are you sure?"),f=[[a,c,o,d],[d,o,c,a],[a,c,o,v],[u,h,a],[u,h,c],[u,h,o]].map(g),m=(t,e)=>{for(let s,i=0;s=f[i];++i){const i=s[t],r=s[e];if(i>=0&&r>=0&&r>i)return Object.keys(s).slice(i,r+1)}return[]},p=()=>document.visibilityState===o?o:document.hasFocus()?a:c;class E extends s{constructor(){super();const t=document.wasDiscarded?u:h;this.s="complete"!==document.readyState?h:p(),this.i=t===this.s?[this.s]:m(t,this.s),this.r=[],this.n=this.n.bind(this),l.forEach(t=>addEventListener(t,this.n,!0))}get state(){return this.s}get stateHistory(){return[...this.i]}addPendingState(t){this.r.indexOf(t)<0&&(0===this.r.length&&addEventListener("beforeunload",b),this.r.push(t))}removePendingState(t){const e=this.r.indexOf(t);e>-1&&(this.r.splice(e,1),0===this.r.length&&removeEventListener("beforeunload",b))}h(t){if(t!==this.s){const e=this.s,s=m(e,t);for(let t=0;t<s.length-1;++t){const e=s[t],i=s[t+1];this.s=i,this.i.push(i),this.dispatchEvent(new n("statechange",{oldState:e,newState:i}))}}}n(t){switch(t.type){case"pageshow":case"resume":this.h(p());break;case"focus":this.h(a);break;case"blur":this.s===a&&this.h(p());break;case"pagehide":this.h(t.persisted?d:v);break;case"visibilitychange":this.s!==d&&this.s!==v&&this.h(p());break;case"freeze":this.h(d)}}}var w=new E;export default w;
//# sourceMappingURL=lifecycle.mjs.map
