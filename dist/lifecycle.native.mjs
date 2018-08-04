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
/*! lifecycle.native.mjs v0.1.1 */
class e extends Event{constructor(e,t){super(e),this.newState=t.newState,this.oldState=t.oldState,this.originalEvent=t.originalEvent}}const t="active",s="passive",i="hidden",a="frozen",n="terminated",r="object"==typeof safari&&safari.pushNotification,h="onpageshow"in self,o=["focus","blur","visibilitychange","freeze","resume","pageshow",h?"pagehide":"unload"],c=e=>(e.preventDefault(),e.returnValue="Are you sure?"),d=e=>e.reduce((e,t,s)=>(e[t]=s,e),{}),u=[[t,s,i,n],[t,s,i,a],[i,s,t],[a,i],[a,t],[a,s]].map(d),l=(e,t)=>{for(let s,i=0;s=u[i];++i){const i=s[e],a=s[t];if(i>=0&&a>=0&&a>i)return Object.keys(s).slice(i,a+1)}return[]},f=()=>document.visibilityState===i?i:document.hasFocus()?t:s;class v extends EventTarget{constructor(){super();const e=f();this.e=e,this.t=[],this.s=this.s.bind(this),o.forEach(e=>addEventListener(e,this.s,!0)),r&&addEventListener("beforeunload",e=>{this.i=setTimeout(()=>{e.defaultPrevented||e.returnValue.length>0||this.a(e,i)},0)})}get state(){return this.e}get pageWasDiscarded(){return document.wasDiscarded||!1}addUnsavedChanges(e){!this.t.indexOf(e)>-1&&(0===this.t.length&&addEventListener("beforeunload",c),this.t.push(e))}removeUnsavedChanges(e){const t=this.t.indexOf(e);t>-1&&(this.t.splice(t,1),0===this.t.length&&removeEventListener("beforeunload",c))}a(t,s){if(s!==this.e){const i=this.e,a=l(i,s);for(let s=0;s<a.length-1;++s){const i=a[s],n=a[s+1];this.e=n,this.dispatchEvent(new e("statechange",{oldState:i,newState:n,originalEvent:t}))}}}s(e){switch(r&&clearTimeout(this.i),e.type){case"pageshow":case"resume":this.a(e,f());break;case"focus":this.a(e,t);break;case"blur":this.e===t&&this.a(e,f());break;case"pagehide":case"unload":this.a(e,e.persisted?a:n);break;case"visibilitychange":this.e!==a&&this.e!==n&&this.a(e,f());break;case"freeze":this.a(e,a)}}}var g=new v;export default g;
//# sourceMappingURL=lifecycle.native.mjs.map
