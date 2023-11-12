<template>
  <div id="main" :style="style">
    <loading :active.sync="loading" :is-full-page="true"></loading>

    <div>
      <h2>
        {{ title&&(title+" - ") }}<span v-for="item in badge" :key="item">{{ item }}</span>
  <span v-if="!badge">Curl And JQ!</span>
      </h2>
    </div>
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
      <button style="font-size: 1.5em" @click="handleIt">Curl And JQ</button>
      <button style="font-size: 1em" @click="copyJson">Copy Json</button>
    </div>
    <div v-html="contentHtml" id="content"></div>
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
    <textarea style="" v-model="source" cols="80" rows="20" v-show="showText" id="source">
    </textarea>
    <div v-show="showText">
      <div v-html="debugHtml"></div>
      <hr/>
      <div v-html="fetchOptionHtml" v-show="showText"></div>
    </div>
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
import jq from "jq-web";
import queryString from "query-string";
import forceArray from "force-array";
import {vsprintf,sprintf} from 'sprintf-js';
import {parseFetchAndJq, formatBadges} from "./Controller";
import tableify from "tableify";
// import * as setQuery from "set-query-string";
import setLocationHash from "set-location-hash";
import linkify from "html-linkify";
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/css/index.css";

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
".[0].data.pairs[0]|{content:.}"
}`;
    return {
      showText: false,
      loading: false,
      badge: "",
      title: "",
      content: {},
      contentHtml: "",
      fetchOptionHtml: "",
      debugHtml:"",
      isRefreshing:false,
      source,
      style: "",
    };
  },
  async created() {
    window.addEventListener('unload', this.onunload);
    this.curlAndJq();
  },
  methods: {
    onunload() {
      this.isRefreshing = true;
    },
    async handleIt() {
      const parsed = location.hash.substring(1);
      if (parsed.source != btoa(this.source)) {
        setLocationHash(btoa(this.source));
      }
      this.curlAndJq();
    },
    async copyJson() {
        let contentJson =JSON.stringify(this.content); 
        contentJson = await jq.promised.raw(contentJson,".");
      this.$copyText(contentJson);alert('Copied');
      window.open(location.href.split('#')[0]+'#'+btoa(contentJson),"_blank");
    },
    async curlAndJq() {
      clearTimeout(this.timeout);
      this.loading = true;
      try {
        var {result, fetches, fetchOptions, originFetchOption} = await parseFetchAndJq(this.source,{jq});
        var styles = [].concat.apply([],fetchOptions.map(({styles = []})=>styles));
        this.style = styles;
/*
          .map((s) =>
            s.content
              ? `<style>${s.content}</stye>`
              : `<link rel="stylesheet" href="${s.link}">`
          )
          .join("");
*/
        this.badge = formatBadges(result.badge,{vsprintf,sprintf,forceArray});
        this.title = result.title;
        this.content = result.content||result;
        this.contentHtml = linkify(tableify(this.content), {
          escape: false,
          attributes:{target: "_blank"}
        });
        this.fetchOptionHtml = linkify(tableify(originFetchOption), {
          escape: false,
        });
        this.debugHtml = tableify((result||{}).debug);
        this.originFetchOption=originFetchOption;
        console.log({result,fetches,originFetchOption,fetchOptions});
        document.title = [this.title || oldTitle, this.badge.join(" | ")]
          .filter((e) => e)
          .join(" - ");
        return result;
      } catch (e) {
        console.trace(e);
        if (e.fetchOption) this.originFetchOption = e.fetchOption;
        if (!this.isRefreshing)alert(e.stack||e);
      } finally {
        var refresh=(this.originFetchOption||{}).refresh;
        if (refresh) {
          this.timeout = setTimeout(()=>this.curlAndJq(),1000*refresh);
        }
        this.loading = false;
      }
    },
  },
};

</script>
