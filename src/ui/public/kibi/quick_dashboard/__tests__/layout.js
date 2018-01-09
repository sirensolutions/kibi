import expect from 'expect.js';

import * as visTypes from '../vistypes';
import { panelsLayout } from '../panels_layout';


describe('quick_dashboard layout', function () {
  it('returns empty array on empty input', function () {
    const result = panelsLayout([]);
    expect(result).to.be.empty;
  });

  it('passes simple row layout test', function () {
    const panels = [
      { type: visTypes.PIE, minWidth: 2, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 2, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 2, minHeight: 2 }
    ];

    const expected = [
      { index: 0, x: 0, y: 0, width: 4, height: 2 },
      { index: 1, x: 4, y: 0, width: 4, height: 2 },
      { index: 2, x: 8, y: 0, width: 4, height: 2 }
    ];

    const result = panelsLayout(panels);

    expect(result).to.be.eql(expected);
  });

  it('passes simple 2-rows layout test', function () {
    const panels = [
      { type: visTypes.PIE, minWidth: 5, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 5, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 5, minHeight: 2 }
    ];

    const expected = [
      { index: 0, x: 0, y: 0, width: 6, height: 2 },
      { index: 1, x: 6, y: 0, width: 6, height: 2 },
      { index: 2, x: 0, y: 2, width: 12, height: 2 }
    ];

    const result = panelsLayout(panels);

    expect(result).to.be.eql(expected);
  });

  it('passes max panels per row test', function () {
    const panels = [
      { type: visTypes.PIE, minWidth: 1, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 1, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 1, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 1, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 1, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 1, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 1, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 1, minHeight: 2 }
    ];

    const expected = [
      { index: 0, x: 0, y: 0, width: 4, height: 2 },
      { index: 1, x: 4, y: 0, width: 4, height: 2 },
      { index: 2, x: 8, y: 0, width: 4, height: 2 },
      { index: 3, x: 0, y: 2, width: 4, height: 2 },
      { index: 4, x: 4, y: 2, width: 4, height: 2 },
      { index: 5, x: 8, y: 2, width: 4, height: 2 },
      { index: 6, x: 0, y: 4, width: 6, height: 2 },
      { index: 7, x: 6, y: 4, width: 6, height: 2 }
    ];

    const result = panelsLayout(panels);

    expect(result).to.be.eql(expected);
  });

  it('passes same-height-per-row test', function () {
    const panels = [
      { type: visTypes.PIE, minWidth: 5, minHeight: 1 },
      { type: visTypes.PIE, minWidth: 5, minHeight: 2 },
      { type: visTypes.PIE, minWidth: 5, minHeight: 3 }
    ];

    const expected = [
      { index: 0, x: 0, y: 0, width: 6, height: 2 },
      { index: 1, x: 6, y: 0, width: 6, height: 2 },
      { index: 2, x: 0, y: 2, width: 12, height: 3 }
    ];

    const result = panelsLayout(panels);

    expect(result).to.be.eql(expected);
  });

  it('passes growth test', function () {
    const panels = [
      { type: visTypes.PIE, minWidth: 2, minHeight: 4, grow: 0 }, //row
      { type: visTypes.PIE, minWidth: 6, minHeight: 3, grow: 1 },
      { type: visTypes.PIE, minWidth: 5, minHeight: 2, grow: 0 }, //row
      { type: visTypes.PIE, minWidth: 5, minHeight: 1, grow: 0 },
      { type: visTypes.PIE, minWidth: 5, minHeight: 2, grow: 1 }, //row
      { type: visTypes.PIE, minWidth: 1, minHeight: 2, grow: 2 },
      { type: visTypes.PIE, minWidth: 3, minHeight: 2, grow: 0 },
      { type: visTypes.PIE, minWidth: 1, minHeight: 2, grow: 2 }, //row
      { type: visTypes.PIE, minWidth: 1, minHeight: 2, grow: 3 }
    ];

    const expected = [
      { index: 0, x: 0, y: 0, width: 2, height: 4 },
      { index: 1, x: 2, y: 0, width: 10, height: 4 },
      { index: 2, x: 0, y: 4, width: 6, height: 2 },
      { index: 3, x: 6, y: 4, width: 6, height: 2 },
      { index: 4, x: 0, y: 6, width: 6, height: 2 },
      { index: 5, x: 6, y: 6, width: 3, height: 2 },
      { index: 6, x: 9, y: 6, width: 3, height: 2 },
      { index: 7, x: 0, y: 8, width: 5, height: 2 },
      { index: 8, x: 5, y: 8, width: 7, height: 2 }
    ];

    const result = panelsLayout(panels);

    expect(result).to.be.eql(expected);
  });

  it('passes priority test', function () {
    const panels = [
      { type: visTypes.PIE,    minWidth: 12, minHeight: 1, priority: 2 },
      { type: visTypes.LINE,   minWidth: 12, minHeight: 1, priority: 2 },
      { type: visTypes.PIE,    minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.LINE,   minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.PIE,    minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.TABLE,  minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.LINE,   minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.TABLE,  minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.TABLE,  minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.PIE,    minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.PIE,    minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.TABLE,  minWidth: 12, minHeight: 1, priority: 3 },
      { type: visTypes.TABLE,  minWidth: 12, minHeight: 1, priority: 1 },
      { type: visTypes.PIE,    minWidth: 12, minHeight: 1, priority: 1 }
    ];

    const expected = [
      //{ type: visTypes.PIE,    minWidth: 1, minHeight: 2, priority: 3 },
        { index: 2, x: 0, y: 0, width: 12, height: 1 },
      //{ type: visTypes.LINE,   minWidth: 1, minHeight: 2, priority: 3 },
        { index: 3, x: 0, y: 1, width: 12, height: 1 },
      //{ type: visTypes.TABLE,  minWidth: 1, minHeight: 2, priority: 3 },
        { index: 5, x: 0, y: 2, width: 12, height: 1 },
      //{ type: visTypes.PIE,    minWidth: 1, minHeight: 2, priority: 3 },
        { index: 4, x: 0, y: 3, width: 12, height: 1 },
      //{ type: visTypes.LINE,   minWidth: 1, minHeight: 2, priority: 3 },
        { index: 6, x: 0, y: 4, width: 12, height: 1 },
      //{ type: visTypes.TABLE,  minWidth: 1, minHeight: 2, priority: 3 },
        { index: 7, x: 0, y: 5, width: 12, height: 1 },
      //{ type: visTypes.PIE,    minWidth: 1, minHeight: 2, priority: 3 },
        { index: 9, x: 0, y: 6, width: 12, height: 1 },
      //{ type: visTypes.TABLE,  minWidth: 1, minHeight: 2, priority: 3 },
        { index: 8, x: 0, y: 7, width: 12, height: 1 },
      //{ type: visTypes.PIE,    minWidth: 1, minHeight: 2, priority: 3 },
        { index: 10, x: 0, y: 8, width: 12, height: 1 },
      //{ type: visTypes.TABLE,  minWidth: 1, minHeight: 2, priority: 3 },
        { index: 11, x: 0, y: 9, width: 12, height: 1 },
      //{ type: visTypes.PIE,    minWidth: 1, minHeight: 2, priority: 2 },
        { index: 0, x: 0, y: 10, width: 12, height: 1 },
      //{ type: visTypes.LINE,   minWidth: 1, minHeight: 2, priority: 2 },
        { index: 1, x: 0, y: 11, width: 12, height: 1 },
      //{ type: visTypes.TABLE,  minWidth: 1, minHeight: 2, priority: 1 },
        { index: 12, x: 0, y: 12, width: 12, height: 1 },
      //{ type: visTypes.PIE,    minWidth: 1, minHeight: 2, priority: 1 }
        { index: 13, x: 0, y: 13, width: 12, height: 1 },
    ];

    const result = panelsLayout(panels);

    expect(result).to.be.eql(expected);
  });
});

