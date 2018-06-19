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

describe('Lifecycle', () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.restore();
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
      assert(spy.calledWith('pageshow', sinon.match.func, true));
      assert(spy.calledWith('pagehide', sinon.match.func, true));
      assert(spy.calledWith('focus', sinon.match.func, true));
      assert(spy.calledWith('blur', sinon.match.func, true));
      assert(spy.calledWith('visibilitychange', sinon.match.func, true));
      assert(spy.calledWith('freeze', sinon.match.func, true));
      assert(spy.calledWith('resume', sinon.match.func, true));
    });
  });

  describe(`get state`, () => {
    it(`returns 'loading' when the document's readyState is not complete`,
        () => {
      sandbox.stub(document, 'readyState').value('loading');

      const lifecycle1 = new Lifecycle();
      assert.equal(lifecycle1.state, 'loading');

      sandbox.stub(document, 'readyState').value('interactive');

      const lifecycle2 = new Lifecycle();
      assert.equal(lifecycle2.state, 'loading');

      sandbox.stub(document, 'readyState').value('complete');

      const lifecycle3 = new Lifecycle();
      dispatchEvent(new Event('pageshow'));
      assert.notEqual(lifecycle3.state, 'loading');
    });

    it(`returns 'active' when the document is loaded, visible, and has ` +
        `input focus`, () => {
      sandbox.stub(document, 'readyState').value('complete');
      sandbox.stub(document, 'visibilityState').value('visible');
      sandbox.stub(document, 'hasFocus').returns(true);

      const lifecycle = new Lifecycle();
      dispatchEvent(new Event('pageshow'));

      assert.equal(lifecycle.state, 'active');
    });

    it(`returns 'passive' when the document is loaded, visible, and does ` +
        `not have input focus`, () => {
      sandbox.stub(document, 'readyState').value('complete');
      sandbox.stub(document, 'visibilityState').value('visible');
      sandbox.stub(document, 'hasFocus').returns(false);

      const lifecycle = new Lifecycle();
      dispatchEvent(new Event('pageshow'));

      assert.equal(lifecycle.state, 'passive');
    });

    it(`returns 'hidden' when the document is loaded but hidden`, () => {
      sandbox.stub(document, 'readyState').value('complete');
      sandbox.stub(document, 'visibilityState').value('hidden');

      const lifecycle = new Lifecycle();
      dispatchEvent(new Event('pageshow'));

      assert.equal(lifecycle.state, 'hidden');
    });

    it(`returns 'frozen' after the freeze event is fired`, () => {
      const lifecycle = new Lifecycle();
      dispatchEvent(new Event('freeze'));

      assert.equal(lifecycle.state, 'frozen');
    });

    it(`returns 'frozen' if the page is entering the page navigation cache`,
        () => {
      const lifecycle = new Lifecycle();

      const pagehideEvent = new Event('pagehide');
      pagehideEvent.persisted = true;
      dispatchEvent(pagehideEvent);

      assert.equal(lifecycle.state, 'frozen');
    });

    it(`returns 'terminated' if the page is being unloaded`, () => {
      const lifecycle = new Lifecycle();

      const pagehideEvent = new Event('pagehide');
      pagehideEvent.false = true;
      dispatchEvent(pagehideEvent);

      assert.equal(lifecycle.state, 'terminated');
    });
  });

  describe(`get pageWasDiscarded`, () => {
    it(`returns the value of document.wasDiscarded`, () => {
      const lifecycle = new Lifecycle();
      assert.equal(lifecycle.pageWasDiscarded, undefined);

      document.wasDiscarded = true;
      assert.equal(lifecycle.pageWasDiscarded, true);
    });
  });

  describe(`addEventListener`, () => {
    it(`adds a listener for statechange events`, () => {
      sandbox.stub(document, 'readyState').value('loading');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      // Trigger a change to the 'active' state.
      sandbox.stub(document, 'readyState').value('complete');
      sandbox.stub(document, 'visibilityState').value('visible');
      sandbox.stub(document, 'hasFocus').returns(true);
      dispatchEvent(new Event('pageshow'));

      assert.equal(listener.callCount, 1);
      assert(listener.getCall(0).calledWith(sinon.match({
        type: 'statechange',
        oldState: 'loading',
        newState: 'active',
        target: lifecycle,
      })));
      assert(listener.getCall(0).args[0] instanceof NativeEventOrEventShim);

      // Trigger a change to the 'passive' state.
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(false);
      dispatchEvent(new Event('blur'));

      assert.equal(listener.callCount, 2);
      assert(listener.getCall(1).calledWith(sinon.match({
        type: 'statechange',
        oldState: 'active',
        newState: 'passive',
        target: lifecycle,
      })));
      assert(listener.getCall(0).args[0] instanceof NativeEventOrEventShim);
    });

    it(`tracks state, and statechange events for all valid transition paths`,
        () => {
      sandbox.stub(document, 'readyState').value('loading');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      // Trigger a change to the 'active' state.
      sandbox.stub(document, 'readyState').value('complete');
      sandbox.stub(document, 'visibilityState').value('visible');
      sandbox.stub(document, 'hasFocus').returns(true);
      dispatchEvent(new Event('pageshow'));

      assert.equal(listener.callCount, 1);
      assert(listener.getCall(0).calledWith(sinon.match({
        oldState: 'loading',
        newState: 'active',
      })));

      // Trigger a change to the 'passive' state.
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(false);
      dispatchEvent(new Event('blur'));

      assert.equal(listener.callCount, 2);
      assert(listener.getCall(1).calledWith(sinon.match({
        oldState: 'active',
        newState: 'passive',
      })));

      // Trigger a change to the 'hidden' state.
      sandbox.stub(document, 'visibilityState').value('hidden');
      dispatchEvent(new Event('visibilitychange'));

      assert.equal(listener.callCount, 3);
      assert(listener.getCall(2).calledWith(sinon.match({
        oldState: 'passive',
        newState: 'hidden',
      })));

      // Trigger a change to the 'frozen' state.
      dispatchEvent(new Event('freeze'));

      assert.equal(listener.callCount, 4);
      assert(listener.getCall(3).calledWith(sinon.match({
        oldState: 'hidden',
        newState: 'frozen',
      })));

      // Trigger a change back to the 'hidden' state.
      dispatchEvent(new Event('resume'));

      assert.equal(listener.callCount, 5);
      assert(listener.getCall(4).calledWith(sinon.match({
        oldState: 'frozen',
        newState: 'hidden',
      })));

      // Trigger a change back to the 'passive' state.
      sandbox.stub(document, 'visibilityState').value('visible');
      dispatchEvent(new Event('visibilitychange'));

      assert.equal(listener.callCount, 6);
      assert(listener.getCall(5).calledWith(sinon.match({
        oldState: 'hidden',
        newState: 'passive',
      })));

      // Trigger a change back to the 'active' state.
      dispatchEvent(new Event('focus'));

      assert.equal(listener.callCount, 7);
      assert(listener.getCall(6).calledWith(sinon.match({
        oldState: 'passive',
        newState: 'active',
      })));

      // Trigger a change back to the 'passive' state.
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(false);
      dispatchEvent(new Event('blur'));

      assert.equal(listener.callCount, 8);
      assert(listener.getCall(7).calledWith(sinon.match({
        oldState: 'active',
        newState: 'passive',
      })));

      // Trigger a change to the 'hidden' state.
      sandbox.stub(document, 'visibilityState').value('hidden');
      dispatchEvent(new Event('visibilitychange'));

      assert.equal(listener.callCount, 9);
      assert(listener.getCall(8).calledWith(sinon.match({
        oldState: 'passive',
        newState: 'hidden',
      })));

      // Trigger a change to the 'frozen' (bfcache) state.
      const pagehideEvent = new Event('pagehide');
      pagehideEvent.persisted = true;
      dispatchEvent(pagehideEvent);

      assert.equal(listener.callCount, 10);
      assert(listener.getCall(9).calledWith(sinon.match({
        oldState: 'hidden',
        newState: 'frozen',
      })));

      // Trigger a change to the 'active' state (out of the bfcache).
      sandbox.stub(document, 'readyState').value('complete');
      sandbox.stub(document, 'visibilityState').value('visible');
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(true);
      const pageshowEvent = new Event('pageshow');
      pageshowEvent.persisted = true;
      dispatchEvent(pageshowEvent);

      assert.equal(listener.callCount, 11);
      assert(listener.getCall(10).calledWith(sinon.match({
        oldState: 'frozen',
        newState: 'active',
      })));

      // Trigger a change back to the 'passive' state.
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(false);
      dispatchEvent(new Event('blur'));

      assert.equal(listener.callCount, 12);
      assert(listener.getCall(11).calledWith(sinon.match({
        oldState: 'active',
        newState: 'passive',
      })));

      // Trigger a change to the 'hidden' state.
      sandbox.stub(document, 'visibilityState').value('hidden');
      dispatchEvent(new Event('visibilitychange'));

      assert.equal(listener.callCount, 13);
      assert(listener.getCall(12).calledWith(sinon.match({
        oldState: 'passive',
        newState: 'hidden',
      })));

      // Trigger a change to the 'terminated' state.
      dispatchEvent(new Event('pagehide'));

      assert.equal(listener.callCount, 14);
      assert(listener.getCall(13).calledWith(sinon.match({
        oldState: 'hidden',
        newState: 'terminated',
      })));
    });

    it(`fires intermediary events when invalid transitions are detected`,
        () => {
      // Make sure to instantiate in the 'active' state
      sandbox.stub(document, 'readyState').value('complete');
      sandbox.stub(document, 'visibilityState').value('visible');
      sandbox.stub(document, 'hasFocus').returns(true);

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      // Change the page's visibilityState to hidden without first firing a
      // blur event.
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(false);
      sandbox.stub(document, 'visibilityState').value('hidden');
      dispatchEvent(new Event('visibilitychange'));

      assert.equal(listener.callCount, 2);
      assert(listener.getCall(0).calledWith(sinon.match({
        oldState: 'active',
        newState: 'passive',
      })));
      assert(listener.getCall(1).calledWith(sinon.match({
        oldState: 'passive',
        newState: 'hidden',
      })));

      // Change the page's visibilityState back to visible and set document
      // focus without first firing a focus event.
      listener.resetHistory();
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(true);
      sandbox.stub(document, 'visibilityState').value('visible');
      dispatchEvent(new Event('visibilitychange'));

      assert.equal(listener.callCount, 2);
      assert(listener.getCall(0).calledWith(sinon.match({
        oldState: 'hidden',
        newState: 'passive',
      })));
      assert(listener.getCall(1).calledWith(sinon.match({
        oldState: 'passive',
        newState: 'active',
      })));

      // Navigate away but put the page into the bfcache.
      listener.resetHistory();
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(false);
      const pagehideEvent = new Event('pagehide');
      pagehideEvent.persisted = true;
      dispatchEvent(pagehideEvent);

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

      // Navigate back, moving the page from frozen directly to active.
      listener.resetHistory();
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(true);
      sandbox.stub(document, 'visibilityState').value('visible');
      dispatchEvent(new Event('pageshow'));

      assert.equal(listener.callCount, 1);
      assert(listener.getCall(0).calledWith(sinon.match({
        oldState: 'frozen',
        newState: 'active',
      })));

      // Unload the active page and fire the visibilitychange event after
      // the pagehide event. (Note: this is new behavior that's pending
      // spec updates, so no browsers currently implement the "right" way.)
      listener.resetHistory();
      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(false);
      dispatchEvent(new Event('pagehide'));
      sandbox.stub(document, 'visibilityState').value('visible');
      dispatchEvent(new Event('visibilitychange'));

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
      sandbox.stub(document, 'readyState').value('loading');

      const lifecycle = new Lifecycle();
      const listener = sinon.spy();
      lifecycle.addEventListener('statechange', listener);

      // Trigger a change to the 'active' state.
      sandbox.stub(document, 'readyState').value('complete');
      sandbox.stub(document, 'visibilityState').value('visible');
      sandbox.stub(document, 'hasFocus').returns(true);
      dispatchEvent(new Event('pageshow'));

      assert.equal(listener.callCount, 1);
      assert(listener.getCall(0).calledWith(sinon.match({
        type: 'statechange',
        oldState: 'loading',
        newState: 'active',
        target: lifecycle,
      })));

      // Remove the listener, then trigger a change to the 'passive' state.
      lifecycle.removeEventListener('statechange', listener);

      document.hasFocus.restore();
      sandbox.stub(document, 'hasFocus').returns(false);
      dispatchEvent(new Event('blur'));

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
