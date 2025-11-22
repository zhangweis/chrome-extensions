<template>
  <div id="main" :style="style">
    <component is="style" v-for="(value, key) in elementStyles" :key="key">
        {{ key }} {{ value }}
    </component>
    <component :is="`style`">
      <template v-for="cssItem in css">

    {{cssItem}}
      </template>
    </component>

    <loading :active.sync="loading" :is-full-page="true"></loading>
    <pre v-if="error" class='error'>{{error}}</pre>
    <div class='headers'>
      <h2>
        {{ title&&(title+" - ") }}<span v-for="item in badge">{{ item }}</span>
  <span v-if="!badge">Curl And JQ!</span>
      </h2>
    </div>
    <div class='actions-top'
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
      <button style="font-size: 1em" @click="copyJson">Copy</button>
      <button style="font-size: 1em" @click="openJson">Open</button>
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
      <a @click="showText = !showText">
        Script <span v-if="showText">^</span><span v-else>V</span>
      </a>
    </div>
    <textarea style="font-size: 0.8em" v-model="source" cols="80" rows="20" v-show="showText" id="source">
    </textarea>
    <div v-show="showText">
      <div v-html="debugHtml"></div>
      <hr/>
      <div v-html="fromsHtml" v-show="showText"></div>
<!--
  <div v-html="fetchOptionHtml" v-show="showText"></div>
-->
    </div>
  </div>
</template>
<style scoped>
div#main {
  font-size: 3em;
}
h2 span:not(:first-child):before {
  content: " | ";
}
</style>
<script type='typescript'>
  import {loadJq} from "./jq.js";
import jqWasm from "./jq.wasm?buffer";
import queryString from "query-string";
import {parseFetchAndJq, formatBadges} from "./Controller";
import forceArray from "force-array";
import tableify from "tableify";
// import * as setQuery from "set-query-string";
import setLocationHash from "set-location-hash";
import linkify from "html-linkify";
import markdownLinkify from "markdown-linkify";
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/css/index.css";
import titleize from 'titleize';
var oldTitle = document.title;
const rxCommonMarkLink = /(\[([^\]]+)])\(([^)]+)\)/g;
function commonMarkLinkToAnchorTag(md) {
   
  var anchor = md;
  if (!md.match(rxCommonMarkLink)) 
    anchor = markdownLinkify(md);
  anchor = anchor.replace( rxCommonMarkLink , '<a href="$3" target="_blank"> $2 </a>' )
    ;
  return anchor;
}
if(typeof String.prototype.replaceAll === "undefined") {
    String.prototype.replaceAll = function(match, replace) {
       return this.replace(new RegExp(match, 'g'), () => replace);
    }
}

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
      fromsHtml:"",
      debugHtml:"",
      isRefreshing:false,
      source,
      css:[],
      error:"",
      style: "",
      elementStyles:{}
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
    async toContentJson() {
        let contentJson =JSON.stringify(this.content); 
        contentJson = await jq.raw(contentJson,".");
        return contentJson;
    },
    async copyJson() {
        let contentJson = await this.toContentJson();
        this.$copyText(contentJson);alert('Copied');
    },
    replaceFrom(jsonString) {
      let json=JSON.parse(jsonString);
      if (json.from) {
        json["_from"]=json.from;
        delete json.from;
        return JSON.stringify(json);
      } else {
        return jsonString;
      }
    },
    async openJson() {
        let contentJson = this.replaceFrom(await this.toContentJson());
        
        window.open(location.href.split('#')[0]+'#'+btoa(contentJson+">>>\n"),"_blank");
    },
    async curlAndJq() {
      clearTimeout(this.timeout);
      const lastOriginFetchOption = this.originFetchOption;
      this.loading = true;
      this.error = "";
      try {
        var {result, fetches, fetchOptions, originFetchOption, context} = await parseFetchAndJq(this.source,{jq:await loadJq(jqWasm)});
        var styles = [].concat.apply([],fetchOptions.map(({_styles = []})=>Array.isArray(_styles)?_styles:[]));
        this.style = styles;
        this.elementStyles = (result.styles||{});
        var css = [].concat.apply([],fetchOptions.map(({css = []})=>css));
        css = css.concat(forceArray(result.css||[]));
        console.log({css})
        this.css = css;
/*
          .map((s) =>
            s.content
              ? `<style>${s.content}</stye>`
              : `<link rel="stylesheet" href="${s.link}">`
          )
          .join("");
*/
        this.badge = await formatBadges(result.badge);
        if (!result.content&&context.normalizedFroms?.length>0) {
          const fileName = (new URL(context.normalizedFroms[0]).pathname.split('/').pop()).split('.')[0];
          const title = titleize(fileName);
          result = {title,content:result};
        }
        this.title = result.title;
        this.content = result.content||result;
        this.fromsHtml = linkify(tableify(context.normalizedFroms), {
          escape: false,
          attributes:{target: "_blank"}
        });
        var html = commonMarkLinkToAnchorTag(tableify(this.content)); 
//        this.contentHtml = linkify(html, {escape: false,attributes:{target: "_blank"}});
        this.contentHtml = html;
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
        else this.originFetchOption = lastOriginFetchOption;
        this.error=(e.stack||e);
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
