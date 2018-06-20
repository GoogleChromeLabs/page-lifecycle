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

import Lifecycle from '../src/Lifecycle.mjs';
import NativeEventTargetOrEventTargetShim from '../src/shims/EventTarget.mjs';
import NativeEventOrEventShim from '../src/shims/Event.mjs';

const SUPPORTS_FREEZE_EVENT = 'onfreeze' in document;
const SUPPORTS_PAGE_TRANSITION_EVENTS = 'onpageshow' in self;
const SUPPORTS_PAGE_VISIBILITY = 'visibilityState' in document;

const sandbox = sinon.createSandbox();

/**
 * Dispatches an event, with optional props that should be added to the
 * event object. This method also only fires the event if the browser running
 * this could would actually fire it. This helps ensure the tests more
 * accurately reflect different scenarios the library could be run in.
 * @param {string} type The type of event to dispatch.
 * @param {Object=} props Additioal property/values to set on the event.
 */
const fireEvent = (type, props = {}) => {
  let event;

  // Don't fire events if the browser doesn't support them.
  switch (type) {
    case 'visibilitychange':
      if (!SUPPORTS_PAGE_VISIBILITY) return;
      break;
    case 'pageshow':
    case 'pagehide':
      if (!SUPPORTS_PAGE_TRANSITION_EVENTS) return;
      break;
    case 'freeze':
    case 'resume':
      if (!SUPPORTS_FREEZE_EVENT) return;
      break;
  }

  // Tries to create the event using a constructor, if that doesn't work,
  // falls back to `document.createEvent()`.
  try {
    event = new Event(type);
  } catch(err) {
    event = document.createEvent('Event');
    event.initEvent(type, false, false);
  }

  Object.keys(props).forEach((prop) => {
    Object.defineProperty(event, prop, {value: props[prop]});
  });

  self.dispatchEvent(event);
};

/**
 * A wrapper around `sinon.stub()` for properties that supports non-existent
 * own properties (sinon doesn't).
 */
const stubProperty = (obj, prop, value) => {
  if (!obj.hasOwnProperty(prop)) {
    return {
      value: (value) => {
        Object.defineProperty(obj, prop, {value, configurable: true});
      }
    };
  } else {
    return sandbox.stub(obj, prop);
  }
}

/**
 * A wrapper around `sinon.stub()` for methods that automatically unstubs
 * an restubs a method if it's already been stubbed.
 */
const stubMethod = (obj, method) => {
  if (obj[method].isSinonProxy) {
    obj[method].restore();
  }
  return sandbox.stub(obj, method);
};

/**
 * Stubs the properties and methods needed for Lifecycle to detect the
 * correct state (either at instantiation time or after an event). Note that
 * the frozen, terminated, and discarded states cannot be stubbed since
 * they require an event to fire to be observable.
 * @param {string}
 */
const stubState = (state) => {
  switch (state) {
    case 'loading':
      stubProperty(document, 'readyState').value('loading');
      break;
    case 'active':
      stubProperty(document, 'readyState').value('complete');
      stubProperty(document, 'visibilityState').value('visible');
      stubMethod(document, 'hasFocus').returns(true);
      break;
    case 'passive':
      stubProperty(document, 'readyState').value('complete');
      stubProperty(document, 'visibilityState').value('visible');
      stubMethod(document, 'hasFocus').returns(false);
      break;
    case 'hidden':
      stubProperty(document, 'readyState').value('complete');
      stubProperty(document, 'visibilityState').value('hidden');
      stubMethod(document, 'hasFocus').returns(false);
      break;
  }
}

/**
 * Stubs the properties and methods needed for Lifecycle to detect the
 * correct state (either at instantiation time or after an event). Note that
 * the frozen, terminated, and discarded states cannot be stubbed since
 * they require an event to fire to be observable.
 * @param {string} oldState
 * @param {string} newState
 * @param {{bfcache: (string)}=} param3
 *   - bfcache: true if the state change involves entering or leaving the
 *.    page navigation cache (bfcache).
 */
const simulateStateChange = (oldState, newState, {bfcache} = {}) => {
  stubState(newState);

  if (oldState === 'loading') {
    fireEvent('load'); // Needed for IE9-10
    fireEvent('pageshow');
  }

  switch (newState) {
    case 'active':
      if (oldState === 'frozen') {
        fireEvent('resume');
        fireEvent('pageshow', {persisted: true});
      }
      fireEvent('focus');
      break;
    case 'passive':
      if (oldState === 'active') {
        fireEvent('blur');
      }
      if (oldState === 'hidden') {
        fireEvent('visibilitychange');
      }
      if (oldState === 'frozen') {
        fireEvent('resume');
        fireEvent('pageshow', {persisted: true});
      }
      break;
    case 'hidden':
      if (oldState === 'passive') {
        fireEvent('visibilitychange');
      }
      if (oldState === 'frozen') {
        fireEvent('resume');
        if (bfcache) {
          fireEvent('pageshow', {persisted: true});
        }
      }
      break;
    case 'frozen':
      if (bfcache) {
        fireEvent('pagehide', {persisted: true});
      }
      fireEvent('freeze');
      break;
    case 'terminated':
      fireEvent('pagehide');
      fireEvent('unload'); // Needed for IE9-10
      break;
  }
}

describe('Lifecycle', () => {
  beforeEach(() => {
    sandbox.restore();
    stubState('loading');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe(`constructor`, () => {
    it(`extends EventTarget`, () => {
      const lifecycle = new Lifecycle();
      assert(lifecycle instanceof NativeEventTargetOrEventTargetShim);
    });

    it(`adds capturing event listeners for all built-in lifecycle events`,
        () => {
      const spy = sandbox.spy(self, 'addEventListener');

      new Lifecycle();

      assert.equal(spy.callCount, 7);
      assert(spy.calledWith('focus', sinon.match.func, true));
      assert(spy.calledWith('blur', sinon.match.func, true));
      assert(spy.calledWith('visibilitychange', sinon.match.func, true));
      assert(spy.calledWith('freeze', sinon.match.func, true));
      assert(spy.calledWith('resume', sinon.match.func, true));
      assert(spy.calledWith(SUPPORTS_PAGE_TRANSITION_EVENTS ?
          'pageshow' : 'load', sinon.match.func, true));
      assert(spy.calledWith(SUPPORTS_PAGE_TRANSITION_EVENTS ?
          'pagehide' : 'unload', sinon.match.func, true));
    });
  });

  describe(`get state`, () => {
    it(`returns 'loading' when the document's readyState is not complete`,
        () => {
      const lifecycle = new Lifecycle();

      assert.equal(lifecycle.state, 'loading');
    });

    it(`returns 'active' when the document is loaded, visible, and has ` +
        `input focus`, () => {
      const lifecycle = new Lifecycle();

      simulateStateChange('loading', 'active');

      assert.equal(lifecycle.state, 'active');
    });

    it(`returns 'passive' when the document is loaded, visible, and does ` +
        `not have input focus`, () => {
      const lifecycle = new Lifecycle();

      simulateStateChange('loading', 'passive');

      assert.equal(lifecycle.state, 'passive');
    });

    it(`returns 'hidden' when the document is loaded but hidden`, () => {
      const lifecycle = new Lifecycle();

      simulateStateChange('loading', 'hidden');

      assert.equal(lifecycle.state, 'hidden');
    });

    it(`returns 'frozen' after the freeze event is fired`, () => {
      if (SUPPORTS_FREEZE_EVENT) {
        const lifecycle = new Lifecycle();

        simulateStateChange('loading', 'hidden');
        simulateStateChange('hidden', 'frozen');

        assert.equal(lifecycle.state, 'frozen');
      }
    });

    it(`returns 'frozen' if the page is entering the page navigation cache`,
        () => {
      if (SUPPORTS_PAGE_TRANSITION_EVENTS) {
        const lifecycle = new Lifecycle();

        simulateStateChange('loading', 'hidden');
        simulateStateChange('hidden', 'frozen', {bfcache: true});

        assert.equal(lifecycle.state, 'frozen');
      }
    });

    it(`returns 'terminated' if the page is being unloaded`, () => {
      const lifecycle = new Lifecycle();

      simulateStateChange('loading', 'hidden');
      simulateStateChange('hidden', 'terminated');

      assert.equal(lifecycle.state, 'terminated');
    });
  });

  describe(`get pageWasDiscarded`, () => {
    it(`returns the value of document.wasDiscarded`, () => {
      const lifecycle = new Lifecycle();
      assert.equal(lifecycle.pageWasDiscarded, false);

      stubProperty(document, 'wasDiscarded').value(true);
      assert.equal(lifecycle.pageWasDiscarded, true);
    });
  });

  describe(`addEventListener`, () => {
    it(`adds a listener for statechange events`, () => {
      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      simulateStateChange('loading', 'active');

      assert.equal(listener.callCount, 1);
      assert(listener.getCall(0).calledWith(sinon.match({
        type: 'statechange',
        oldState: 'loading',
        newState: 'active',
        target: lifecycle,
      })));
      assert(listener.getCall(0).args[0] instanceof NativeEventOrEventShim);

      simulateStateChange('active', 'passive');

      assert.equal(listener.callCount, 2);
      assert(listener.getCall(1).calledWith(sinon.match({
        type: 'statechange',
        oldState: 'active',
        newState: 'passive',
        target: lifecycle,
      })));
      assert(listener.getCall(0).args[0] instanceof NativeEventOrEventShim);
    });

    ['active', 'passive', 'hidden'].forEach((state) => {
      it(`tracks valid state changes from loading to ${state}`, () => {
        const lifecycle = new Lifecycle();
        const listener = sinon.spy();
        lifecycle.addEventListener('statechange', listener);

        simulateStateChange('loading', 'active');

        assert(listener.calledOnce);
        assert(listener.firstCall.calledWith(sinon.match({
          oldState: 'loading',
          newState: 'active',
        })));
      });
    });

    it(`tracks valid state change events from active to terminated`, () => {
      stubState('active');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      simulateStateChange('active', 'passive');

      assert(listener.calledOnce);
      assert(listener.firstCall.calledWith(sinon.match({
        oldState: 'active',
        newState: 'passive',
      })));
      listener.resetHistory();

      simulateStateChange('passive', 'hidden');
      simulateStateChange('hidden', 'terminated');

      assert(listener.calledTwice);
      assert(listener.firstCall.calledWith(sinon.match({
        oldState: 'passive',
        newState: 'hidden',
      })));
      assert(listener.secondCall.calledWith(sinon.match({
        oldState: 'hidden',
        newState: 'terminated',
      })));
    });

    it(`tracks valid state change events from active to frozen, and back`,
        () => {
      stubState('active');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      simulateStateChange('active', 'passive');

      assert(listener.calledOnce);
      assert(listener.firstCall.calledWith(sinon.match({
        oldState: 'active',
        newState: 'passive',
      })));
      listener.resetHistory();

      if (SUPPORTS_PAGE_VISIBILITY) {
        simulateStateChange('passive', 'hidden');

        assert(listener.calledOnce);
        assert(listener.firstCall.calledWith(sinon.match({
          oldState: 'passive',
          newState: 'hidden',
        })));
        listener.resetHistory();

        if (SUPPORTS_FREEZE_EVENT) {
          simulateStateChange('hidden', 'frozen');
          simulateStateChange('frozen', 'hidden');

          assert(listener.calledTwice);
          assert(listener.firstCall.calledWith(sinon.match({
            oldState: 'hidden',
            newState: 'frozen',
          })));
          assert(listener.secondCall.calledWith(sinon.match({
            oldState: 'frozen',
            newState: 'hidden',
          })));
          listener.resetHistory();
        }

        simulateStateChange('hidden', 'passive');

        assert(listener.calledOnce);
        assert(listener.firstCall.calledWith(sinon.match({
          oldState: 'hidden',
          newState: 'passive',
        })));
        listener.resetHistory();
      }

      simulateStateChange('passive', 'active');

      assert(listener.calledOnce);
      assert(listener.firstCall.calledWith(sinon.match({
        oldState: 'passive',
        newState: 'active',
      })));
    });

    it(`tracks valid state change events from active to frozen (in page cache)`,
        () => {
      stubState('active');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      simulateStateChange('active', 'passive');

      assert(listener.calledOnce);
      assert(listener.firstCall.calledWith(sinon.match({
        oldState: 'active',
        newState: 'passive',
      })));
      listener.resetHistory();

      if (SUPPORTS_PAGE_VISIBILITY) {
        simulateStateChange('passive', 'hidden');

        assert(listener.calledOnce);
        assert(listener.firstCall.calledWith(sinon.match({
          oldState: 'passive',
          newState: 'hidden',
        })));
        listener.resetHistory();

        if (SUPPORTS_PAGE_TRANSITION_EVENTS) {
          simulateStateChange('hidden', 'frozen', {bfcache: true});

          assert(listener.calledOnce);
          assert(listener.firstCall.calledWith(sinon.match({
            oldState: 'hidden',
            newState: 'frozen',
          })));
        }
      }
    });

    ['active', 'passive', 'hidden'].forEach((state) => {
      it(`tracks valid state change events from frozen (in page cache) ` +
          `to ${state}`, () => {
        stubState('hidden');
        const lifecycle = new Lifecycle();
        simulateStateChange('hidden', 'frozen', {bfcache: true});

        if (SUPPORTS_PAGE_TRANSITION_EVENTS) {
          const listener = sinon.spy();
          lifecycle.addEventListener('statechange', listener);

          simulateStateChange('frozen', state, {bfcache: true});

          assert(listener.calledOnce);
          assert(listener.firstCall.calledWith(sinon.match({
            oldState: 'frozen',
            newState: state,
          })));
        }
      });
    });

    // In Safari 12 (and below) you can switch tabs without getting a
    // blur event. We need to ensure the passive state is still observed in
    // this case.
    it(`handles invalid changes from active to hidden, and back`, () => {
      stubState('active');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      if (SUPPORTS_PAGE_VISIBILITY) {
        // Change the page's visibilityState to hidden without first firing a
        // blur event.
        stubMethod(document, 'hasFocus').returns(false);
        stubProperty(document, 'visibilityState').value('hidden');
        fireEvent('visibilitychange');

        assert.equal(listener.callCount, 2);
        assert(listener.firstCall.calledWith(sinon.match({
          oldState: 'active',
          newState: 'passive',
        })));
        assert(listener.secondCall.calledWith(sinon.match({
          oldState: 'passive',
          newState: 'hidden',
        })));

        listener.resetHistory();

        // Change the page's visibilityState back to visible and set document
        // focus without first firing a focus event.
        stubMethod(document, 'hasFocus').returns(true);
        stubProperty(document, 'visibilityState').value('visible');
        fireEvent('visibilitychange');

        assert.equal(listener.callCount, 2);
        assert(listener.getCall(0).calledWith(sinon.match({
          oldState: 'hidden',
          newState: 'passive',
        })));
        assert(listener.getCall(1).calledWith(sinon.match({
          oldState: 'passive',
          newState: 'active',
        })));

        listener.resetHistory();
      }
    });

    // In most browsers, navigating via an in-page link will not trigger a
    // blur event (at least not right away). We need to ensure the passive
    // state is still observed in this case.
    // Chrome 67: pagehide > visibilitychange
    // Firefox 60: pagehide > visibilitychange > blur
    it(`handles invalid changes from active to frozen (page cache), and back`,
        () => {
      stubState('active');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      if (SUPPORTS_PAGE_VISIBILITY && SUPPORTS_PAGE_TRANSITION_EVENTS) {
        // Navigate away but put the page into the bfcache.
        stubMethod(document, 'hasFocus').returns(false);
        fireEvent('pagehide', {persisted: true});

        assert.equal(listener.callCount, 3);
        assert(listener.getCall(0).calledWith(sinon.match({
          oldState: 'active',
          newState: 'passive',
        })));
        assert(listener.getCall(1).calledWith(sinon.match({
          oldState: 'passive',
          newState: 'hidden',
        })));
        assert(listener.getCall(2).calledWith(sinon.match({
          oldState: 'hidden',
          newState: 'frozen',
        })));

        listener.resetHistory();

        // Navigate back, moving the page from frozen directly to active.
        document.hasFocus.restore();
        stubMethod(document, 'hasFocus').returns(true);
        stubProperty(document, 'visibilityState').value('visible');
        fireEvent('pageshow');

        assert.equal(listener.callCount, 1);
        assert(listener.getCall(0).calledWith(sinon.match({
          oldState: 'frozen',
          newState: 'active',
        })));

        listener.resetHistory();
      }
    });

    // All browsers (at this moment) fire the pagehide event before the
    // visibilitychange event if the user is unloading an active tab.
    // We need to ensure the state change happen in the right order.
    // (Note: this behavior is current per-spec, but we're proposing an update
    // https://github.com/w3c/page-visibility/issues/39)
    it(`handles invalid changes from active to terminated`, () => {
      stubState('active');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      fireEvent('pagehide');
      stubProperty(document, 'visibilityState').value('hidden');
      fireEvent('visibilitychange');
      fireEvent('unload');

      assert.equal(listener.callCount, 3);
      assert(listener.getCall(0).calledWith(sinon.match({
        oldState: 'active',
        newState: 'passive',
      })));
      assert(listener.getCall(1).calledWith(sinon.match({
        oldState: 'passive',
        newState: 'hidden',
      })));
      assert(listener.getCall(2).calledWith(sinon.match({
        oldState: 'hidden',
        newState: 'terminated',
      })));
    });
  });

  describe(`removeEventListener`, () => {
    it(`remove added event listeners`, () => {
      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      simulateStateChange('loading', 'active');

      assert.equal(listener.callCount, 1);
      assert(listener.getCall(0).calledWith(sinon.match({
        type: 'statechange',
        oldState: 'loading',
        newState: 'active',
        target: lifecycle,
      })));

      // Remove the listener, then trigger a change to the 'passive' state.
      lifecycle.removeEventListener('statechange', listener);

      simulateStateChange('active', 'passive');

      // Should not have been called again.
      assert.equal(listener.callCount, 1);
    });
  });

  describe(`addUnsavedChanges`, () => {
    it(`adds a beforeunload listener to warn about unsaved changes if one ` +
        `isn't already added`, () => {
      const lifecycle = new Lifecycle();

      const stub = sandbox.stub(self, 'addEventListener');
      const id1 = {};
      lifecycle.addUnsavedChanges(id1);

      assert(stub.calledOnce);

      const id2 = {};
      lifecycle.addUnsavedChanges(id2);

      // It shouldn't have been called again.
      assert(stub.calledOnce);

      const id3 = {};
      lifecycle.addUnsavedChanges(id3);

      // It still shouldn't have been called again.
      assert(stub.calledOnce);
    });
  });

  describe(`removeUnsavedChanges`, () => {
    it(`removes a beforeunload listener to warn about unsaved changes if ` +
        `no unsaved changes remain`, () => {
      const lifecycle = new Lifecycle();

      const addEventListenerStub = sandbox.stub(self, 'addEventListener');
      const removeEventListenerStub = sandbox.stub(self, 'removeEventListener');

      const id1 = {};
      const id2 = {};
      const id3 = {};
      lifecycle.addUnsavedChanges(id1);
      lifecycle.addUnsavedChanges(id2);
      lifecycle.addUnsavedChanges(id3);

      assert(addEventListenerStub.calledOnce);
      assert(removeEventListenerStub.notCalled);

      lifecycle.removeUnsavedChanges(id1);
      lifecycle.removeUnsavedChanges(id2);

      assert(addEventListenerStub.calledOnce);
      assert(removeEventListenerStub.notCalled);

      lifecycle.removeUnsavedChanges(id3);

      assert(addEventListenerStub.calledOnce);
      assert(removeEventListenerStub.calledOnce);
    });
  });
});
