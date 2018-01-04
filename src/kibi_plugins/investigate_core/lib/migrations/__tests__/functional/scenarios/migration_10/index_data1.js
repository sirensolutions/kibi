/* eslint max-len:0 */

/**
 * Defines the following objects:
 *
 * - a kibi wordcloud visualization
 * - a tagcloud visualization
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'Articles-Tagcloud'
    }
  },
  {
    "description" : "",
    "kibanaSavedObjectMeta" : {
      "searchSourceJSON" : "{\"index\":\"article\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
    },
    "title" : "Articles Tagcloud",
    "uiStateJSON" : "{}",
    "version" : 1,
    "visState" : "{\"title\":\"Articles Wordcloud\",\"type\":\"tagcloud\",\"params\":{\"scale\":\"linear\",\"orientation\":\"single\",\"minFontSize\":18,\"maxFontSize\":72},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"snippet\",\"exclude\":\"has|its|up|all|i|first|from|one|which|we|more|than|last|after|can|based|like|next|about|some|you|said|been|so|it's|year|just|week|web|had|what|when|your|now|over|time|how|two|1|t|us|most|my|could|would|other|his|use|may|many|other|get|were|only|well|who|here|make|while|also|s|being|off|few|he|way|do|back|around|them|made\",\"size\":50,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}"
  },
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'Articles-Wordcloud'
    }
  },
  {
    "description" : "",
    "kibanaSavedObjectMeta" : {
      "searchSourceJSON" : "{\"filter\":[]}"
    },
    "savedSearchId" : "Articles",
    "title" : "Articles Wordcloud",
    "uiStateJSON" : "{\"a\": 1}",
    "version" : 1,
    "visState" : "{\"aggs\":[{\"id\":\"1\",\"params\":{},\"schema\":\"metric\",\"type\":\"count\"},{\"id\":\"2\",\"params\":{\"exclude\":{\"pattern\":\"has|its|up|all|i|first|from|one|which|we|more|than|last|after|can|based|like|next|about|some|you|said|been|so|it's|year|just|week|web|had|what|when|your|now|over|time|how|two|1|t|us|most|my|could|would|other|his|use|may|many|other|get|were|only|well|who|here|make|while|also|s|being|off|few|he|way|do|back|around|them|made\"},\"field\":\"snippet\",\"order\":\"desc\",\"orderBy\":\"1\",\"size\":50},\"schema\":\"bucket\",\"type\":\"terms\"}],\"listeners\":{},\"params\":{\"perPage\":10,\"showMetricsAtAllLevels\":false,\"showPartialRows\":false},\"title\":\"Articles Wordcloud\",\"type\":\"kibi_wordcloud\"}"
  }
];
