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

import EventTarget from './shims/EventTarget.mjs';
import StateChangeEvent from './StateChangeEvent.mjs';

const LOADING = 'loading';
const ACTIVE = 'active';
const PASSIVE = 'passive';
const HIDDEN = 'hidden';
const FROZEN = 'frozen';
const DISCARDED = 'discarded';
const TERMINATED = 'terminated';

const EVENTS = [
  'pageshow',
  'resume',
  'focus',
  'blur',
  'pagehide',
  'visibilitychange',
  'freeze',
];

/**
 * Converts an array of states into an object where the state is the key
 * and the value is the index.
 * @param {!Array<string>} arr
 * @return {!Object}
 */
const toIndexedObject = (arr) => arr.reduce((acc, val, idx) => {
  acc[val] = idx;
  return acc;
}, {});

/**
 * @param {!Event} evt
 * @return {string}
 */
const onbeforeunload = (evt) => {
  evt.preventDefault();
  return evt.returnValue = 'Are you sure?';
};

/**
 * @type {!Array<!Object>}
 */
const LEGAL_STATE_TRANSITIONS = [
  // The normal unload process (bfcache process is addressed above).
  [ACTIVE, PASSIVE, HIDDEN, TERMINATED],

  // An active page transitioning to frozen,
  // or an unloading page going into the bfcache.
  [ACTIVE, PASSIVE, HIDDEN, FROZEN],

  // A loading page can go to either active, passive, or hidden
  [LOADING, ACTIVE],
  [LOADING, PASSIVE],
  [LOADING, HIDDEN],

  // A hidden page transitioning back to active.
  [HIDDEN, PASSIVE, ACTIVE],

  // A frozen page being resumed
  [FROZEN, HIDDEN],

  // A frozen (bfcached) page navigated back to
  // Note: [FROZEN, HIDDEN] can happen here, but it's already covered above.
  [FROZEN, ACTIVE],
  [FROZEN, PASSIVE],
].map(toIndexedObject);

/**
 * Accepts a current state and a future state and returns an array of legal
 * state transition paths. This is needed to normalize behavior across browsers
 * since some browsers do not fire events in certain cases and thus skip
 * states.
 * @param {string} oldState
 * @param {string} newState
 * @return {!Array<string>}
 */
const getLegalStateTransitionPath = (oldState, newState) => {
  // We're intentionally not using for...of here so when we transpile to ES5
  // to don't need to include the Symbol polyfills.
  for (let order, i = 0; order = LEGAL_STATE_TRANSITIONS[i]; ++i) {
    const oldIndex = order[oldState];
    const newIndex = order[newState];

    if (oldIndex >= 0 &&
        newIndex >= 0 &&
        newIndex > oldIndex) {
      // Differences greater than one should be reported
      // because it means a state was skipped.
      return Object.keys(order).slice(oldIndex, newIndex + 1);
    }
  }
  return [];
  // TODO(philipwalton): it shouldn't be possible to get here, but
  // consider some kind of warning or call to action if it happens.
  // console.warn(`Invalid state change detected: ${oldState} > ${newState}`);
};


/**
 * Returns the current state based on the document's visibility and
 * in input focus states. Note this method is only used to determine
 * active vs passive vs hidden states, as other states require listening
 * for events.
 * @return {string}
 */
const getCurrentState = () => {
  if (document.readyState !== 'complete') {
    return LOADING;
  } else if (document.visibilityState === HIDDEN) {
    return HIDDEN;
  } else {
    if (document.hasFocus()) {
      return ACTIVE;
    } else {
      return PASSIVE;
    }
  }
};

/**
 * Class definition for the exported, singleton lifecycle instance.
 */
export default class Lifecycle extends EventTarget {
  /**
   * Initializes state, state history, and adds event listeners to monitor
   * state changes.
   */
  constructor() {
    super();

    const state = getCurrentState();

    this._state = state;
    this._unsavedChanges = [];

    // Bind the callback and add event listeners.
    this._handleEvents = this._handleEvents.bind(this);

    // Add capturing events on window so they run immediately.
    EVENTS.forEach(
        (evt) => self.addEventListener(evt, this._handleEvents, true));
  }

  /**
   * @return {string}
   */
  get state() {
    return this._state;
  }

  /**
   * Returns the value of document.wasDiscarded. This is arguably unnecessary
   * but I think there's value in having the entire API in one place.
   * @return {string}
   */
  get pageWasDiscarded() {
    return document.wasDiscarded;
  }

  /**
   * @param {Symbol|Object} id A unique symbol or object identifying the
   *.    pending state. This ID is required when removing the state later.
   */
  addUnsavedChanges(id) {
    // Don't add duplicate state. Note: ideall this would be a set, but for
    // better browser compatibility we're using an array.
    if (!this._unsavedChanges.includes(id)) {
      // If this is the first state being added,
      // also add a beforeunload listener.
      if (this._unsavedChanges.length === 0) {
        self.addEventListener('beforeunload', onbeforeunload);
      }
      this._unsavedChanges.push(id);
    }
  }

  /**
   * @param {Symbol|Object} id A unique symbol or object identifying the
   *.    pending state. This ID is required when removing the state later.
   */
  removeUnsavedChanges(id) {
    const idIndex = this._unsavedChanges.indexOf(id);

    if (idIndex > -1) {
      this._unsavedChanges.splice(idIndex, 1);

      // If there's no more pending state, remove the event listener.
      if (this._unsavedChanges.length === 0) {
        removeEventListener('beforeunload', onbeforeunload);
      }
    }
  }

  /**
   * @private
   * @param {string} newState
   */
  _dispatchChangesIfNeeded(newState) {
    if (newState !== this._state) {
      const oldState = this._state;
      const path = getLegalStateTransitionPath(oldState, newState);

      for (let i = 0; i < path.length - 1; ++i) {
        const oldState = path[i];
        const newState = path[i + 1];

        this._state = newState;
        this.dispatchEvent(
            new StateChangeEvent('statechange', {oldState, newState}));
      }
    }
  }

  /**
   * @private
   * @param {!Event} evt
   */
  _handleEvents(evt) {
    switch (evt.type) {
      case 'pageshow':
      case 'resume':
        this._dispatchChangesIfNeeded(getCurrentState());
        break;
      case 'focus':
        this._dispatchChangesIfNeeded(ACTIVE);
        break;
      case 'blur':
        // The `blur` event can fire while the page is being unloaded, so we
        // only need to update the state if the current state is "active".
        if (this._state === ACTIVE) {
          this._dispatchChangesIfNeeded(getCurrentState());
        }
        break;
      case 'pagehide':
        this._dispatchChangesIfNeeded(evt.persisted ? FROZEN : TERMINATED);
        break;
      case 'visibilitychange':
        // The document's `visibilityState` will change to hidden  as the page
        // is being unloaded, but in such cases the lifecycle state shouldn't
        // change.
        if (this._state !== FROZEN &&
            this._state !== TERMINATED) {
          this._dispatchChangesIfNeeded(getCurrentState());
        }
        break;
      case 'freeze':
        this._dispatchChangesIfNeeded(FROZEN);
        break;
    }
  }
}
