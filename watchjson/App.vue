<template>
  <div id="main">
    <div v-html="style"></div>
    <loading :active.sync="loading" :is-full-page="true"></loading>

    <h1>Curl And JQ!</h1>
    <div>
      <h2>
        <span v-for="item in badge" :key="item">{{ item }}</span>
      </h2>
    </div>
    <div v-html="contentHtml"></div>
    <div
      style="
        width: 20em;
        display: flex;
        align-items: flex-end;
        flex-wrap: wrap;
        justify-content: space-between;
        align-content: space-between;
      "
    >
      <button style="font-size: 2em" @click="handleIt">Curl And JQ</button>
      <div @click="showText = !showText">
        Script <span v-if="showText">^</span><span v-else>V</span>
      </div>
    </div>
    <textarea style="" v-model="source" cols="80" rows="20" v-show="showText">
    </textarea>
    <div v-html="fetchOptionHtml" v-show="showText"></div>
  </div>
</template>
<style scoped>
div#main {
  font-size: 3em;
}

@media (min-width: 1000px) {
  div#main {
    font-size: 1.5em;
  }
}

h2 span:not(:first-child):before {
  content: " | ";
}
</style>
<script type='typescript'>
import * as queryString from "query-string";
import {parseFetchAndJq} from "./Controller";
import * as tableify from "tableify";
// import * as setQuery from "set-query-string";
import * as setLocationHash from "set-location-hash";
import * as linkify from "html-linkify";
import Loading from "vue-loading-overlay";
import * as forceArray from "force-array";
import "vue-loading-overlay/dist/vue-loading.css";

var oldTitle = document.title;
export default {
  components: {
    Loading,
  },
  data() {
    const parsed = queryString.parse(location.search);
    var encodedSource = unescape(parsed.source || location.hash.substring(1));
    var source = "";
    try {
      source = encodedSource && atob(encodedSource);
    } catch (e) {
      alert(e);
      source = null;
    }
    source =
      source ||
      `{
"urls":
[{url:"https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",body:
{"variables":{"pair":"0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc"},"query":"query pairs($pair: String!){pairs(first:5, where:{id:$pair}) {reserve0,reserve1,totalSupply}}"}
}]
,"jq":
".[0].data.pairs[0]|{supply:.totalSupply,base:.reserve1,quote:.reserve0}|with_entries(.value|=tonumber)|0.001677940193653965 as $s|.price=.base/.quote|.mine=(. as $parent|{quote,base}|with_entries(.value|=./$parent.supply*$s)|.share=$s/$parent.supply|.price=(1/$parent.price)|.k=.quote*.base|.future=((.k*600)|sqrt))|.mine|{badge:[(.price|tostring|.[:6]),(.future|tostring|.[:7])],content:.}"
}`;
    return {
      showText: false,
      loading: false,
      badge: "",
      title: "",
      content: {},
      contentHtml: "",
      fetchOptionHtml: "",
      source,
      style: "",
    };
  },
  async created() {
    this.curlAndJq();
  },
  methods: {
    async handleIt() {
      const parsed = location.hash.substring(1);
      if (parsed.source != btoa(this.source)) {
        setLocationHash(btoa(this.source));
      }
      this.curlAndJq();
    },
    async curlAndJq() {
      this.loading = true;
      try {
        var {result, fetches, fetchOptions, originFetchOption} = await parseFetchAndJq(this.source);
        var styles = [].concat.apply([],fetchOptions.map(({styles = []})=>styles));
        this.style = styles
          .map((s) =>
            s.content
              ? `<style>${s.content}</stye>`
              : `<link rel="stylesheet" href="${s.link}">`
          )
          .join("");
        this.badge = forceArray(result.badge);
        this.title = result.title;
        this.content = result.content||result;
        this.contentHtml = tableify(this.content);
        this.fetchOptionHtml = linkify(tableify(originFetchOption), {
          escape: false,
        });
        console.log({result,fetches,originFetchOption});
        document.title = [this.title || oldTitle, this.badge.join(" | ")]
          .filter((e) => e)
          .join(" - ");
        return result;
      } catch (e) {
        alert(e + "");
        console.trace(e);
      } finally {
        this.loading = false;
      }
    },
  },
};

</script>