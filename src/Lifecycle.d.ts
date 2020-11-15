import { PageState } from "./PageState";
import StateChangeEvent from "./StateChangeEvent";

interface StateChangeEventListener {
  (evt: StateChangeEvent): void;
}

interface StateChangeEventListenerObject {
  handleEvent(evt: StateChangeEvent): void;
}

declare type StateChangeEventListenerOrStateChangeEventListenerObject =
  | StateChangeEventListener
  | StateChangeEventListenerObject;

/**
 * Class definition for the exported, singleton lifecycle instance.
 */
export default class Lifecycle extends EventTarget {
  /**
   * Initializes state, state history, and adds event listeners to monitor
   * state changes.
   */
  /**
   * @return {string}
   */
  get state(): PageState;
  /**
   * Returns the value of document.wasDiscarded. This is arguably unnecessary
   * but I think there's value in having the entire API in one place and
   * consistent across browsers.
   * @return {boolean}
   */
  get pageWasDiscarded(): boolean;

  addEventListener(
    type: "statechange",
    listener: (ev: StateChangeEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: "statechange",
    listener: StateChangeEventListenerOrStateChangeEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: "statechange",
    listener: (ev: StateChangeEvent) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: "statechange",
    listener: StateChangeEventListenerOrStateChangeEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;

  /**
   * @param {Symbol|Object} id A unique symbol or object identifying the
   *.    pending state. This ID is required when removing the state later.
   */
  addUnsavedChanges(id: Symbol | Object): void;
  /**
   * @param {Symbol|Object} id A unique symbol or object identifying the
   *.    pending state. This ID is required when removing the state later.
   */
  removeUnsavedChanges(id: Symbol | Object): void;
}
