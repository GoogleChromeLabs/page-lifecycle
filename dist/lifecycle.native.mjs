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
class e extends Event{constructor(e,s){super(e),this.newState=s.newState,this.oldState=s.oldState,this.originalEvent=s.originalEvent}}const s="active",t="passive",i="hidden",a="frozen",n="terminated",h="onpageshow"in self,r=["focus","blur","visibilitychange","freeze","resume","pageshow",h?"pagehide":"unload"],o=e=>(e.preventDefault(),e.returnValue="Are you sure?"),c=e=>e.reduce((e,s,t)=>(e[s]=t,e),{}),d=[[s,t,i,n],[s,t,i,a],[i,t,s],[a,i],[a,s],[a,t]].map(c),u=(e,s)=>{for(let t,i=0;t=d[i];++i){const i=t[e],a=t[s];if(i>=0&&a>=0&&a>i)return Object.keys(t).slice(i,a+1)}return[]},l=()=>document.visibilityState===i?i:document.hasFocus()?s:t;class f extends EventTarget{constructor(){super();const e=l();this.e=e,this.s=[],this.t=this.t.bind(this),r.forEach(e=>self.addEventListener(e,this.t,!0))}get state(){return this.e}get pageWasDiscarded(){return document.wasDiscarded||!1}addUnsavedChanges(e){!this.s.indexOf(e)>-1&&(0===this.s.length&&self.addEventListener("beforeunload",o),this.s.push(e))}removeUnsavedChanges(e){const s=this.s.indexOf(e);s>-1&&(this.s.splice(s,1),0===this.s.length&&removeEventListener("beforeunload",o))}i(s,t){if(t!==this.e){const i=this.e,a=u(i,t);for(let t=0;t<a.length-1;++t){const i=a[t],n=a[t+1];this.e=n,this.dispatchEvent(new e("statechange",{oldState:i,newState:n,originalEvent:s}))}}}t(e){switch(e.type){case"pageshow":case"resume":this.i(e,l());break;case"focus":this.i(e,s);break;case"blur":this.e===s&&this.i(e,l());break;case"pagehide":case"unload":this.i(e,e.persisted?a:n);break;case"visibilitychange":this.e!==a&&this.e!==n&&this.i(e,l());break;case"freeze":this.i(e,a)}}}var g=new f;export default g;
//# sourceMappingURL=lifecycle.native.mjs.map
