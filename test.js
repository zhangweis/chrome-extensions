const jq = require('./watchjson/jq.asm.bundle1.js');
jq.onInitialized.addListener(()=>{
    for (var i =0;i<14098;i++) {
        console.log(jq.json({ok:i},'.'));
    }
    console.log('ok')
})
