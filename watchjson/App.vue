<template>
  <div>
    <loading
      :active.sync="loading"
      :is-full-page="true"
    ></loading>

    <h1>Curl And JQ!</h1> 
    <div>
      <h2><span v-for="item in badge" :key='item'>{{ item }}</span></h2>
    </div>
    <div v-html="contentHtml"></div>
    <div style='
    width: 20em;
    display: flex;
    align-items:flex-end;
    flex-wrap: wrap;
    justify-content: space-between;
    align-content:space-between'>
    <button style='font-size:2em' @click="handleIt">Curl And JQ</button>
    <div @click="showText=!showText">Script <span v-if='showText'>^</span><span v-else>V</span>
    </div>
    </div>
    <textarea style='' v-model="source" cols="80" rows="20" v-show="showText"> </textarea>
  </div>
</template>
<style scoped>
h2 span:not(:first-child):before {
    content:" | ";
}
</style>
<script type='typescript'>
import * as queryString from "query-string";
import * as jq from "jq-web";
import * as tableify from "tableify";
import * as setQuery from "set-query-string";
import Loading from "vue-loading-overlay";
import * as forceArray from "force-array";
import "vue-loading-overlay/dist/vue-loading.css";

async function callJq(json, filter) {
  return await jq.promised.json(json, filter);
}
var oldTitle = document.title;
export default {
  components: {
    Loading
  },
  data() {
    const parsed = queryString.parse(location.search);
    var source;
    try {
      source = parsed.source&&atob(parsed.source);
    }catch(e) {
      alert(e)
      source = null;
    }
    source = source ||
      `{
"urls":
[{url:"https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",body:
{"variables":{"pair":"0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc"},"query":"query pairs($pair: String!){pairs(first:5, where:{id:$pair}) {reserve0,reserve1,totalSupply}}"}
}]
,"jq":
".[0].data.pairs[0]|{supply:.totalSupply,base:.reserve1,quote:.reserve0}|with_entries(.value|=tonumber)|0.001677940193653965 as $s|.price=.base/.quote|.mine=(. as $parent|{quote,base}|with_entries(.value|=./$parent.supply*$s)|.share=$s/$parent.supply|.price=(1/$parent.price)|.k=.quote*.base|.future=((.k*600)|sqrt))|.mine|{badge:[(.price|tostring|.[:6]),(.future|tostring|.[:7])],content:.}"
}`;
    return {
      showText:false,
      loading: false,
      badge: "",
      title:"",
      content: {},
      contentHtml: "",
      source,
    };
  },
  async created() {
    this.curlAndJq();
  },
  methods: {
    async handleIt() {
      const parsed = queryString.parse(location.search);
      if (parsed.source != btoa(this.source)) {
        setQuery({ source: btoa(this.source) });
      }
      this.curlAndJq();
    },
    async curlAndJq() {
      this.loading = true;
      try {
        let fetchOption = await callJq({}, this.source);
        const { urls, jq: jqPath } = fetchOption;
        var json = await Promise.all(
          urls.map(async (urlToGo) => {
            if (typeof urlToGo == "string")
              urlToGo = { url: urlToGo, method: "get" };
            urlToGo.url = (urlToGo.url||'').replaceAll(
              "${timestamp}",
              Number(new Date())
            );
            console.log("fetching ", urlToGo.url);
            if (typeof urlToGo.body == "object") {
              urlToGo.method = "post";
              urlToGo.body = JSON.stringify(urlToGo.body);
              urlToGo.headers = Object.assign({}, urlToGo.headers, {
                "Content-Type": "application/json",
              });
            }
            var json = urlToGo.data||(await (await fetch(urlToGo.url, urlToGo)).json());
            return json;
          })
        );
        var result = await callJq(json, jqPath);
        this.badge = forceArray(result.badge);
        this.title = result.title;
        this.content = result.content;
        this.contentHtml = tableify(result.content);
        console.log(result);
        document.title = [this.title||oldTitle, this.badge.join(' | ')].filter(e=>e).join(" - ");
        return result;
      } catch (e) {
        alert(e + "");
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>