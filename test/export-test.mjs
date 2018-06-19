import lifecycle from '../src/export.mjs';
import Lifecycle from '../src/Lifecycle.mjs';

describe('export', () => {
  it(`is an instance of Lifecycle`, () => {
    assert(lifecycle instanceof Lifecycle);
  });
});
