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

const ACTIVE = 'active';
const PASSIVE = 'passive';
const HIDDEN = 'hidden';
const FROZEN = 'frozen';
// const DISCARDED = 'discarded'; Not used but show to completeness.
const TERMINATED = 'terminated';

// Detect Safari to work around Safari-specific bugs.
const IS_SAFARI = typeof safari === 'object' && safari.pushNotification;

const SUPPORTS_PAGE_TRANSITION_EVENTS = 'onpageshow' in self;

const EVENTS = [
  'focus',
  'blur',
  'visibilitychange',
  'freeze',
  'resume',
  'pageshow',
  // IE9-10 do not support the pagehide event, so we fall back to unload
  // Note: unload *MUST ONLY* be added conditionally, otherwise it will
  // prevent page navigation caching (a.k.a bfcache).
  SUPPORTS_PAGE_TRANSITION_EVENTS ? 'pagehide' : 'unload',
];

/**
 * @param {!Event} evt
 * @return {string}
 */
const onbeforeunload = (evt) => {
  evt.preventDefault();
  return evt.returnValue = 'Are you sure?';
};

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
 * @type {!Array<!Object>}
 */
const LEGAL_STATE_TRANSITIONS = [
  // The normal unload process (bfcache process is addressed above).
  [ACTIVE, PASSIVE, HIDDEN, TERMINATED],

  // An active page transitioning to frozen,
  // or an unloading page going into the bfcache.
  [ACTIVE, PASSIVE, HIDDEN, FROZEN],

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
  // we don't need to include the Symbol polyfills.
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
  if (document.visibilityState === HIDDEN) {
    return HIDDEN;
  }
  if (document.hasFocus()) {
    return ACTIVE;
  }
  return PASSIVE;
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
    EVENTS.forEach((evt) => addEventListener(evt, this._handleEvents, true));

    // Safari does not reliably fire the `pagehide` or `visibilitychange`
    // events when closing a tab, so we have to use `beforeunload` with a
    // timeout to check whether the default action was prevented.
    // NOTE: we only add this to Safari because adding it to Firefox would
    // prevent the page from being eligible for bfcache.
    if (IS_SAFARI) {
      addEventListener('beforeunload', (evt) => {
        this._safariBeforeUnloadTimeout = setTimeout(() => {
          if (!(evt.defaultPrevented || evt.returnValue.length > 0)) {
            this._dispatchChangesIfNeeded(evt, HIDDEN);
          }
        }, 0);
      });
    }
  }

  /**
   * @return {string}
   */
  get state() {
    return this._state;
  }

  /**
   * Returns the value of document.wasDiscarded. This is arguably unnecessary
   * but I think there's value in having the entire API in one place and
   * consistent across browsers.
   * @return {boolean}
   */
  get pageWasDiscarded() {
    return document.wasDiscarded || false;
  }

  /**
   * @param {Symbol|Object} id A unique symbol or object identifying the
   *.    pending state. This ID is required when removing the state later.
   */
  addUnsavedChanges(id) {
    // Don't add duplicate state. Note: ideall this would be a set, but for
    // better browser compatibility we're using an array.
    if (!this._unsavedChanges.indexOf(id) > -1) {
      // If this is the first state being added,
      // also add a beforeunload listener.
      if (this._unsavedChanges.length === 0) {
        addEventListener('beforeunload', onbeforeunload);
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
   * @param {!Event} originalEvent
   * @param {string} newState
   */
  _dispatchChangesIfNeeded(originalEvent, newState) {
    if (newState !== this._state) {
      const oldState = this._state;
      const path = getLegalStateTransitionPath(oldState, newState);

      for (let i = 0; i < path.length - 1; ++i) {
        const oldState = path[i];
        const newState = path[i + 1];

        this._state = newState;
        this.dispatchEvent(new StateChangeEvent('statechange', {
          oldState,
          newState,
          originalEvent,
        }));
      }
    }
  }

  /**
   * @private
   * @param {!Event} evt
   */
  _handleEvents(evt) {
    if (IS_SAFARI) {
      clearTimeout(this._safariBeforeUnloadTimeout);
    }

    switch (evt.type) {
      case 'pageshow':
      case 'resume':
        this._dispatchChangesIfNeeded(evt, getCurrentState());
        break;
      case 'focus':
        this._dispatchChangesIfNeeded(evt, ACTIVE);
        break;
      case 'blur':
        // The `blur` event can fire while the page is being unloaded, so we
        // only need to update the state if the current state is "active".
        if (this._state === ACTIVE) {
          this._dispatchChangesIfNeeded(evt, getCurrentState());
        }
        break;
      case 'pagehide':
      case 'unload':
        this._dispatchChangesIfNeeded(evt, evt.persisted ? FROZEN : TERMINATED);
        break;
      case 'visibilitychange':
        // The document's `visibilityState` will change to hidden  as the page
        // is being unloaded, but in such cases the lifecycle state shouldn't
        // change.
        if (this._state !== FROZEN &&
            this._state !== TERMINATED) {
          this._dispatchChangesIfNeeded(evt, getCurrentState());
        }
        break;
      case 'freeze':
        this._dispatchChangesIfNeeded(evt, FROZEN);
        break;
    }
  }
}
