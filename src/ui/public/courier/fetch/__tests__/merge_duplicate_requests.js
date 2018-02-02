import { MergeDuplicatesRequestProvider } from '../merge_duplicate_requests';
import { AbstractRequestProvider } from '../request/request.js';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

describe('Merge duplicated requests', function () {

  let mergeDuplicateRequests;
  let AbstractRequest;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    mergeDuplicateRequests =  Private(MergeDuplicatesRequestProvider);
    AbstractRequest =  Private(AbstractRequestProvider);
  }));

  it('it should do nothing if only one request', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    fakeRequest1.resp = 'response';
    const fakeRequests = [ fakeRequest1 ];
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(1);
    expect(requests[0].source._instanceid).to.equal('dataSource');

  });

  it('it should detect duplicated requests and assign _uniq property with resp - Scenario 1', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    fakeRequest2.resp = 'response';
    const fakeRequests = [ fakeRequest1, fakeRequest2 ];
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(2);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(fakeRequest1._uniq.resp).to.equal('response');
    expect(requests[1].source._instanceid).to.equal('dataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with _mergedResp - Scenario 1', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2 ];
    fakeRequest1._mergedResp = 'response';
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(2);
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(fakeRequest2._uniq._mergedResp).to.equal('response');
    expect(requests[0].source._instanceid).to.equal('dataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with resp - Scenario 2', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest3 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2, fakeRequest3 ];
    fakeRequest3.resp = 'response';
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(3);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(fakeRequest1._uniq.resp).to.equal('response');
    expect(fakeRequest2._uniq.resp).to.equal('response');
    expect(requests[2].source._instanceid).to.equal('dataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with _mergedResp - Scenario 2', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest3 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2, fakeRequest3 ];
    fakeRequest3._mergedResp = 'response';
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(3);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(fakeRequest1._uniq._mergedResp).to.equal('response');
    expect(fakeRequest2._uniq._mergedResp).to.equal('response');
    expect(requests[2].source._instanceid).to.equal('dataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with resp - Scenario 3', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest3 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest4 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2, fakeRequest3, fakeRequest4 ];
    fakeRequest3.resp = 'response';
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(4);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[3].CourierFetchRequestStatus).to.equal('duplicate');
    expect(fakeRequest1._uniq.resp).to.equal('response');
    expect(fakeRequest2._uniq.resp).to.equal('response');
    expect(fakeRequest4._uniq.resp).to.equal('response');
    expect(requests[2].source._instanceid).to.equal('dataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with _mergedResp - Scenario 3', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest3 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest4 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2, fakeRequest3, fakeRequest4 ];
    fakeRequest3._mergedResp = 'response';
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(4);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[3].CourierFetchRequestStatus).to.equal('duplicate');
    expect(fakeRequest1._uniq._mergedResp).to.equal('response');
    expect(fakeRequest2._uniq._mergedResp).to.equal('response');
    expect(fakeRequest4._uniq._mergedResp).to.equal('response');
    expect(requests[2].source._instanceid).to.equal('dataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with resp - Scenario 4', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest3 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest4 = new AbstractRequest({
      _instanceid: 'anotherDataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2, fakeRequest3, fakeRequest4 ];
    fakeRequest3.resp = 'response';
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(4);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[3].CourierFetchRequestStatus).not.to.equal('duplicate');
    expect(fakeRequest1._uniq.resp).to.equal('response');
    expect(fakeRequest2._uniq.resp).to.equal('response');
    expect(fakeRequest4._uniq).not.to.be.ok();
    expect(requests[2].source._instanceid).to.equal('dataSource');
    expect(requests[3].source._instanceid).to.equal('anotherDataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with _mergedResp - Scenario 4', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest3 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest4 = new AbstractRequest({
      _instanceid: 'anotherDataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2, fakeRequest3, fakeRequest4 ];
    fakeRequest3._mergedResp = 'response';
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(4);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[3].CourierFetchRequestStatus).not.to.equal('duplicate');
    expect(fakeRequest1._uniq._mergedResp).to.equal('response');
    expect(fakeRequest2._uniq._mergedResp).to.equal('response');
    expect(fakeRequest4._uniq).not.to.be.ok();
    expect(requests[2].source._instanceid).to.equal('dataSource');
    expect(requests[3].source._instanceid).to.equal('anotherDataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with resp - Scenario 5', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest3 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest4 = new AbstractRequest({
      _instanceid: 'anotherDataSource'
    });
    const fakeRequest5 = new AbstractRequest({
      _instanceid: 'anotherDataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2, fakeRequest3, fakeRequest4, fakeRequest5 ];
    fakeRequest3.resp = 'response';
    fakeRequest4.resp = 'anotherResponse';
    const requests = mergeDuplicateRequests(fakeRequests);

    expect(requests.length).to.be(5);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[4].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[2].CourierFetchRequestStatus).not.to.equal('duplicate');
    expect(requests[3].CourierFetchRequestStatus).not.to.equal('duplicate');
    expect(fakeRequest1._uniq.resp).to.equal('response');
    expect(fakeRequest2._uniq.resp).to.equal('response');
    expect(fakeRequest5._uniq.resp).to.equal('anotherResponse');
    expect(fakeRequest3._uniq).not.to.be.ok();
    expect(fakeRequest4._uniq).not.to.be.ok();
    expect(requests[2].source._instanceid).to.equal('dataSource');
    expect(requests[3].source._instanceid).to.equal('anotherDataSource');
  });

  it('it should detect duplicated requests and assign _uniq property with _mergedResp - Scenario 5', function () {
    const fakeRequest1 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest2 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest3 = new AbstractRequest({
      _instanceid: 'dataSource'
    });
    const fakeRequest4 = new AbstractRequest({
      _instanceid: 'anotherDataSource'
    });
    const fakeRequest5 = new AbstractRequest({
      _instanceid: 'anotherDataSource'
    });
    const fakeRequests = [ fakeRequest1, fakeRequest2, fakeRequest3, fakeRequest4, fakeRequest5 ];
    fakeRequest3._mergedResp = 'response';
    fakeRequest4._mergedResp = 'anotherResponse';
    const requests = mergeDuplicateRequests(fakeRequests);


    expect(requests.length).to.be(5);
    expect(requests[0].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[1].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[4].CourierFetchRequestStatus).to.equal('duplicate');
    expect(requests[2].CourierFetchRequestStatus).not.to.equal('duplicate');
    expect(requests[3].CourierFetchRequestStatus).not.to.equal('duplicate');
    expect(fakeRequest1._uniq._mergedResp).to.equal('response');
    expect(fakeRequest2._uniq._mergedResp).to.equal('response');
    expect(fakeRequest5._uniq._mergedResp).to.equal('anotherResponse');
    expect(fakeRequest3._uniq).not.to.be.ok();
    expect(fakeRequest4._uniq).not.to.be.ok();
    expect(requests[2].source._instanceid).to.equal('dataSource');
    expect(requests[3].source._instanceid).to.equal('anotherDataSource');
  });

});
