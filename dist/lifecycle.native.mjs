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
/*! lifecycle.native.mjs v0.1.0 */
class e extends Event{constructor(e,t){super(e),this.newState=t.newState,this.oldState=t.oldState}}const t="loading",s="active",i="passive",h="hidden",a="frozen",n="discarded",r="terminated",c=["load","pageshow","resume","focus","blur","pagehide","visibilitychange","freeze"],o=e=>e.reduce((e,t,s)=>(e[t]=s,e),{}),d=e=>(e.preventDefault(),e.returnValue="Are you sure?"),u=[[s,i,h,a],[a,h,i,s],[s,i,h,r],[n,t,s],[n,t,i],[n,t,h]].map(o),l=(e,t)=>{for(let s,i=0;s=u[i];++i){const i=s[e],h=s[t];if(i>=0&&h>=0&&h>i)return Object.keys(s).slice(i,h+1)}return[]},g=()=>document.visibilityState===h?h:document.hasFocus()?s:i;class f extends EventTarget{constructor(){super();const e=document.wasDiscarded?n:t;this.e="complete"!==document.readyState?t:g(),this.t=e===this.e?[this.e]:l(e,this.e),this.s=[],this.i=this.i.bind(this),c.forEach(e=>addEventListener(e,this.i,!0))}get state(){return this.e}get stateHistory(){return[...this.t]}addPendingState(e){this.s.indexOf(e)<0&&(0===this.s.length&&addEventListener("beforeunload",d),this.s.push(e))}removePendingState(e){const t=this.s.indexOf(e);t>-1&&(this.s.splice(t,1),0===this.s.length&&removeEventListener("beforeunload",d))}h(t){if(t!==this.e){const s=this.e,i=l(s,t);for(let t=0;t<i.length-1;++t){const s=i[t],h=i[t+1];this.e=h,this.t.push(h),this.dispatchEvent(new e("statechange",{oldState:s,newState:h}))}}}i(e){switch(e.type){case"pageshow":case"resume":this.h(g());break;case"focus":this.h(s);break;case"blur":this.e===s&&this.h(g());break;case"pagehide":this.h(e.persisted?a:r);break;case"visibilitychange":this.e!==a&&this.e!==r&&this.h(g());break;case"freeze":this.h(a)}}}var v=new f;export default v;
//# sourceMappingURL=lifecycle.native.mjs.map
