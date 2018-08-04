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
/*! lifecycle.mjs v0.1.1 */
let e;try{new EventTarget,e=!0}catch(t){e=!1}class t{constructor(){this.e={}}addEventListener(e,t,s=!1){this.t(e).push(t)}removeEventListener(e,t,s=!1){const i=this.t(e),a=i.indexOf(t);a>-1&&i.splice(a,1)}dispatchEvent(e){return e.target=this,Object.freeze(e),this.t(e.type).forEach(t=>t(e)),!0}t(e){return this.e[e]=this.e[e]||[]}}var s=e?EventTarget:t;class i{constructor(e){this.type=e}}var a=e?Event:i;class n extends a{constructor(e,t){super(e),this.newState=t.newState,this.oldState=t.oldState,this.originalEvent=t.originalEvent}}const r="active",h="passive",c="hidden",o="frozen",d="terminated",u="object"==typeof safari&&safari.pushNotification,v="onpageshow"in self,l=["focus","blur","visibilitychange","freeze","resume","pageshow",v?"pagehide":"unload"],g=e=>(e.preventDefault(),e.returnValue="Are you sure?"),f=e=>e.reduce((e,t,s)=>(e[t]=s,e),{}),b=[[r,h,c,d],[r,h,c,o],[c,h,r],[o,c],[o,r],[o,h]].map(f),p=(e,t)=>{for(let s,i=0;s=b[i];++i){const i=s[e],a=s[t];if(i>=0&&a>=0&&a>i)return Object.keys(s).slice(i,a+1)}return[]},E=()=>document.visibilityState===c?c:document.hasFocus()?r:h;class m extends s{constructor(){super();const e=E();this.s=e,this.i=[],this.a=this.a.bind(this),l.forEach(e=>addEventListener(e,this.a,!0)),u&&addEventListener("beforeunload",e=>{this.n=setTimeout(()=>{e.defaultPrevented||e.returnValue.length>0||this.r(e,c)},0)})}get state(){return this.s}get pageWasDiscarded(){return document.wasDiscarded||!1}addUnsavedChanges(e){!this.i.indexOf(e)>-1&&(0===this.i.length&&addEventListener("beforeunload",g),this.i.push(e))}removeUnsavedChanges(e){const t=this.i.indexOf(e);t>-1&&(this.i.splice(t,1),0===this.i.length&&removeEventListener("beforeunload",g))}r(e,t){if(t!==this.s){const s=this.s,i=p(s,t);for(let t=0;t<i.length-1;++t){const s=i[t],a=i[t+1];this.s=a,this.dispatchEvent(new n("statechange",{oldState:s,newState:a,originalEvent:e}))}}}a(e){switch(u&&clearTimeout(this.n),e.type){case"pageshow":case"resume":this.r(e,E());break;case"focus":this.r(e,r);break;case"blur":this.s===r&&this.r(e,E());break;case"pagehide":case"unload":this.r(e,e.persisted?o:d);break;case"visibilitychange":this.s!==o&&this.s!==d&&this.r(e,E());break;case"freeze":this.r(e,o)}}}var w=new m;export default w;
//# sourceMappingURL=lifecycle.mjs.map
