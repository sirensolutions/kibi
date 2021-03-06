import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('conflicts', () => {
    before(() => esArchiver.load('index_patterns/conflicts'));
    after(() => esArchiver.unload('index_patterns/conflicts'));

    it('flags fields with mismatched types as conflicting', () => (
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({ pattern: 'logs-*' })
        .expect(200)
        .then(resp => {
          expect(resp.body).to.eql({
            fields: [
              {
                name: '@timestamp',
                type: 'date',
                esType: 'date', // kibi: added
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              },
              {
                name: 'number_conflict',
                type: 'number',
                esType: 'integer', // kibi: added
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
              },
              {
                name: 'string_conflict',
                type: 'string',
                esType: 'text', // kibi: added
                aggregatable: true,
                searchable: true,
                readFromDocValues: false,
              },
              {
                name: 'success',
                type: 'conflict',
                esType: 'conflict', // kibi: added
                aggregatable: true,
                searchable: true,
                readFromDocValues: false,
                conflictDescriptions: {
                  boolean: [
                    'logs-2017.01.02'
                  ],
                  keyword: [
                    'logs-2017.01.01'
                  ]
                }
              }
            ]
          });
        })
    ));
  });
}
