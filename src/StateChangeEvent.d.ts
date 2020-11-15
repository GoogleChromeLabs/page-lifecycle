import { PageState } from "./PageState";

/**
 * implements {IStateChangeEvent}
 */
interface StateChangeEvent extends Event {
  newState: PageState;
  oldState: PageState;
  originalEvent: Event;
}

declare var StateChangeEvent: {
  prototype: StateChangeEvent;
};

export default StateChangeEvent;
