import expect from 'expect.js';
import sinon from 'sinon'; //TODO MERGE 5.5.2 check if sandbox is needed
import ngMock from 'ng_mock';
import rison from 'rison-node';
import { hashUrl } from '../hash_url';
import {
  HashedItemStoreSingleton,
} from 'ui/state_management/state_storage';

describe('kibi/session/hashUrl', () => {

  const states = [
    { global: true, data: '&:g' },
    { app: true },
    { kibi: true }
  ];
  const encodedStates = states.map(state => encodeURIComponent(rison.encode(state)));

  let hashedItemStoreSpy;

  beforeEach(() => {
    hashedItemStoreSpy = sinon.spy(HashedItemStoreSingleton, 'setItem');
  });

  it('should hash unhashed states', () => {
    const base = '/app/kibana#/dashboard/dash';
    const querystring = `_g=${encodedStates[0]}&_a=${encodedStates[1]}&_k=${encodedStates[2]}`;
    const url = `${base}?${querystring}`;
    const hashed = hashUrl(url);
    expect(hashedItemStoreSpy.calledThrice);
    const hashes = [];
    for (let i = 0; i < 3; i++) {
      const call = hashedItemStoreSpy.getCall(i);
      expect(JSON.parse(call.args[1])).to.eql(states[i]);
      hashes.push(call.args[0]);
    }
    expect(hashed).to.eql(`${base}?_g=${hashes[0]}&_a=${hashes[1]}&_k=${hashes[2]}`);
  });

  it('should not modify hashed states', () => {
    const base = '/app/kibana#/dashboard/dash';
    const querystring = `_g=h@123456&_a=${encodedStates[1]}&_k=${encodedStates[2]}`;
    const url = `${base}?${querystring}`;
    const hashed = hashUrl(url);
    expect(hashedItemStoreSpy.calledTwice);
    const hashes = [];
    for (let i = 0; i < 2; i++) {
      const call = hashedItemStoreSpy.getCall(i);
      expect(call.args[1]).to.eql(JSON.stringify(states[i + 1]));
      hashes.push(call.args[0]);
    }
    expect(hashed).to.eql(`${base}?_g=h@123456&_a=${hashes[0]}&_k=${hashes[1]}`);
  });

  it('should not modify other parameters', () => {
    const base = '/app/kibana#/dashboard/dash';
    const querystring = `_g=h@123456&_a=${encodedStates[1]}&ko=abc`;
    const url = `${base}?${querystring}`;
    const hashed = hashUrl(url);
    expect(hashedItemStoreSpy.calledOnce);
    expect(hashedItemStoreSpy.getCall(0).args[1]).to.eql(JSON.stringify(states[1]));
    expect(hashed).to.eql(`${base}?_g=h@123456&_a=${hashedItemStoreSpy.getCall(0).args[0]}&ko=abc`);
  });

  it('should throw an error if a state parameter cannot be parsed', () => {
    const base = '/app/kibana#/dashboard/dash';
    const querystring = `_g=h@123456&_a=${encodedStates[1]}&_k=moo%3A`;
    const url = `${base}?${querystring}`;
    expect(() => hashUrl(url)).to.throwError('Unable to parse the state from the shared URL.');
  });

  it('should throw an error if a state cannot be stored in the sessionStorage', () => {
    HashedItemStoreSingleton.setItem.restore();
    sinon.stub(HashedItemStoreSingleton, 'setItem').throws(new Error());
    const base = '/app/kibana#/dashboard/dash';
    const querystring = `_g=h@123456&_a=${encodedStates[1]}`;
    const url = `${base}?${querystring}`;
    expect(() => hashUrl(url)).to.throwError();
  });

});
