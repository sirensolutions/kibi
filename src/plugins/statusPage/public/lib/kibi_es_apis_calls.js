module.exports = [
  '_cluster/stats?human&pretty',
  '_nodes/_all?human&pretty',
  '$KIBI_INDICES_LIST/_stats?human&pretty',
  '$KIBI_INDICES_LIST/_segments?human&pretty&verbose=true',
  '$KIBI_INDICES_LIST/_mapping?human&pretty'
];
