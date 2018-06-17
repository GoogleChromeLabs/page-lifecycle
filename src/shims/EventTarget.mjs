/*
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

import {supportsConstructableEventTarget} from './support.mjs';


/**
 * A minimal EventTarget class shim.
 * This is used if the browser doesn't natively support constructable
 * EventTarget objects.
 */
class EventTargetShim {
  /**
   * Creates the event registry.
   */
  constructor() {
    this._registry = {};
  }

  /**
   * @param {string} type
   * @param {EventListener|function(!Event):(boolean|undefined)} listener
   * @param {(boolean|!AddEventListenerOptions)=} opts
   * @return {undefined}
   * @see https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener
   */
  addEventListener(type, listener, opts = false) {
    this._getRegistry(type).push(listener);
  }

  /**
   * @param {string} type
   * @param {EventListener|function(!Event):(boolean|undefined)} listener
   * @param {(boolean|!EventListenerOptions)=} opts
   * @return {undefined}
   * @see https://dom.spec.whatwg.org/#dom-eventtarget-removeeventlistener
   */
  removeEventListener(type, listener, opts = false) {
    const typeRegistry = this._getRegistry(type);
    const handlerIndex = typeRegistry.indexOf(listener);
    if (handlerIndex > -1) {
      typeRegistry.splice(handlerIndex, 1);
    }
  }

  /**
   * @param {!Event|!EventShim} evt
   * @return {boolean}
   * @see https://dom.spec.whatwg.org/#dom-eventtarget-dispatchevent
   */
  dispatchEvent(evt) {
    // Set the target then freeze the event object to prevent modification.
    evt.target = this;
    Object.freeze(evt);

    this._getRegistry(evt.type).forEach((listener) => listener(evt));
    return true;
  }

  /**
   * Returns an array of handlers associated with the passed event type.
   * If no handlers have been registered, an empty array is returned.
   * @private
   * @param {string} type The event type.
   * @return {!Array} An array of handler functions.
   */
  _getRegistry(type) {
    return this._registry[type] = (this._registry[type] || []);
  }
}

export default supportsConstructableEventTarget ? EventTarget : EventTargetShim;
