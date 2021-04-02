/*
 * @Author: whyour
 * @Github: https://github.com/whyour
 * @Date: 2020-12-06 11:11:11
 * @LastEditors: whyour
 * @LastEditTime: 2021-03-13 18:33:10
 * 打开京喜农场，添加下面的重写，手动完成任意任务，提示获取cookie成功，然后退出跑任务脚本

  hostname = wq.jd.com

  quanx:
  [task_local]
  0 9,12,18 * * * https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_nc.js, tag=京喜农场, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jxnc.png, enabled=true
  [rewrite_local]
  ^https\:\/\/wq\.jd\.com\/cubeactive\/farm\/dotask url script-request-header https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_tokens.js

  loon:
  [Script]
  http-request ^https\:\/\/wq\.jd\.com\/cubeactive\/farm\/dotask script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_tokens.js, requires-body=false, timeout=10, tag=京喜农场cookie
  cron "0 9,12,18 * * *" script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_nc.js, tag=京喜农场

  surge:
  [Script]
  京喜农场 = type=cron,cronexp=0 9,12,18 * * *,timeout=60,script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_nc.js,
  京喜农场cookie = type=http-request,pattern=^https\:\/\/wq\.jd\.com\/cubeactive\/farm\/dotask,requires-body=0,max-size=0,script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_tokens.js
 *
 **/

const $ = new Env('京喜农场');
const JD_API_HOST = 'https://wq.jd.com/';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
$.tokens = JSON.parse($.getdata('jx_tokens') || '[]');
$.showLog = $.getdata('nc_showLog') ? $.getdata('nc_showLog') === 'true' : false;
$.openUrl = `openjd://virtual?params=${encodeURIComponent(
  '{ "category": "jump", "des": "m", "url": "https://wqsh.jd.com/sns/201912/12/jxnc/detail.html?ptag=7155.9.32&smp=b47f4790d7b2a024e75279f55f6249b9&active=jdnc_1_chelizi1205_2"}',
)}`;
$.result = [];
$.cookieArr = [];
$.currentCookie = '';
$.currentToken = {};
$.allTask = [];
$.info = {};
$.answer = 0;
$.helpTask = null;
$.drip = 0;

!(async () => {
  if (!getCookies()) return;
  for (let i = 0; i < $.cookieArr.length; i++) {
    $.currentCookie = $.cookieArr[i];
    $.currentToken = $.tokens[i] || {};
    $.drip = 0;
    if ($.currentCookie) {
      const userName = decodeURIComponent(
        $.currentCookie.match(/pt_pin=(.+?);/) && $.currentCookie.match(/pt_pin=(.+?);/)[1],
      );
      $.log(`\n开始【京东账号${i + 1}】${userName}`);
      $.result.push(`【京东账号${i + 1}】${userName}`);
      const startInfo = await getTaskList();
      if (!startInfo) break;
      await $.wait(500);
      const isOk = await browserTask();
      if (!isOk) break;
      await $.wait(500);
      await answerTask();
      await $.wait(500);
      const endInfo = await getTaskList();
      getMessage(endInfo, startInfo);
      await submitInviteId(userName);
      await $.wait(500);
      await createAssistUser();
    }
  }
  await showMsg();
})()
  .catch(e => $.logErr(e))
  .finally(() => $.done());

function getCookies() {
  if ($.isNode()) {
    $.cookieArr = Object.values(jdCookieNode);
  } else {
    const CookiesJd = JSON.parse($.getdata("CookiesJD") || "[]").filter(x => !!x).map(x => x.cookie);
    $.cookieArr = [$.getdata("CookieJD") || "", $.getdata("CookieJD2") || "", ...CookiesJd].filter(x=>!!x);
  }
  if (!$.cookieArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {
      'open-url': 'https://bean.m.jd.com/',
    });
    return false;
  }
  return true;
}

function getMessage(endInfo) {
  const need = endInfo.target - endInfo.score;
  const get = $.drip;
  $.result.push(
    `【水果名称】${endInfo.prizename}`,
    `【水滴】获得水滴${get} 还需水滴${need}`
  );
  if (get > 0) {
    const max = parseInt(need / get);
    const min = parseInt(need / (get + $.helpTask.limit * $.helpTask.eachtimeget));
    $.result.push(`【预测】还需 ${min} ~ ${max} 天`);
  }
}

function getTaskList() {
  return new Promise(async resolve => {
    $.get(taskUrl('query', `type=1`), async (err, resp, data) => {
      try {
        const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
        const { detail, msg, task = [], retmsg, ...other } = JSON.parse(res);
        $.helpTask = task.filter(x => x.tasktype === 2)[0] || { eachtimeget: 0, limit: 0 };
        $.allTask = task.filter(x => x.tasktype !== 3 && x.tasktype !== 2 && parseInt(x.left) > 0);
        $.info = other;
        $.log(`\n获取任务列表 ${retmsg} 总共${$.allTask.length}个任务！`);
        if (!$.info.active) {
          $.msg($.name, '请先去京喜农场选择种子！', '选择app专属种子时，请参考脚本头部说明获取token，点击通知跳转', { 'open-url': $.openUrl });
          resolve(false);
        }
        resolve(other);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(true);
      }
    });
  });
}

function  browserTask() {
  return new Promise(async resolve => {
    const tasks = $.allTask.filter(x => x.tasklevel !== 6);
    const times = Math.max(...[...tasks].map(x => x.limit));
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      $.log(`\n开始第${i + 1}个任务：${task.taskname}`);
      const status = [0];
      for (let i = 0; i < times; i++) {
        const random = Math.random() * 3;
        await $.wait(random * 1000);
        if (status[0] === 0) {
          status[0] = await doTask(task);
        }
        if (status[0] !== 0) {
          break;
        }
      }
      if (status[0] === 1032) {
        $.msg($.name, '请参考脚本头部说明获取token', '或者改中非app专属种子，点击通知跳转', { 'open-url': $.openUrl });
        resolve(false);
        return;
      }
      $.log(`\n结束第${i + 1}个任务：${task.taskname}\n`);
    }
    resolve(true);
  });
}

function answerTask() {
  const _answerTask = $.allTask.filter(x => x.tasklevel === 6);
  if (!_answerTask || !_answerTask[0]) return;
  const { tasklevel, left, taskname, eachtimeget } = _answerTask[0];
  return new Promise(async resolve => {
    if (parseInt(left) <= 0) {
      resolve(false);
      $.log(`\n${taskname}[做任务]： 任务已完成，跳过`);
      return;
    }
    $.get(
      taskUrl(
        'dotask',
        `active=${$.info.active}&answer=${$.info.indexday}:${['A', 'B', 'C', 'D'][$.answer]}:0&joinnum=${
          $.info.joinnum
        }&tasklevel=${tasklevel}&_stk=active%2Canswer%2Cch%2Cfarm_jstoken%2Cjoinnum%2Cphoneid%2Ctasklevel%2Ctimestamp`,
      ),
      async (err, resp, data) => {
        try {
          const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
          let { ret, retmsg, right } = JSON.parse(res);
          retmsg = retmsg !== '' ? retmsg : 'success';
          $.log(
            `\n${taskname}[做任务]：${retmsg.indexOf('活动太火爆了') !== -1 ? '任务进行中或者未到任务时间' : retmsg}${
              $.showLog ? '\n' + res : ''
            }`,
          );
          if (ret === 0 && right === 1) {
            $.drip += eachtimeget;
          }
          if (((ret !== 0 && ret !== 1029) || retmsg === 'ans err') && $.answer < 4) {
            $.answer++;
            await $.wait(1000);
            await answerTask();
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function doTask({ tasklevel, left, taskname, eachtimeget }) {
  return new Promise(async resolve => {
    if (parseInt(left) <= 0) {
      resolve(false);
      $.log(`\n${taskname}[做任务]： 任务已完成，跳过`);
      return;
    }
    $.get(
      taskUrl(
        'dotask',
        `active=${$.info.active}&answer=${$.info.indexday}:D:0&joinnum=${$.info.joinnum}&tasklevel=${tasklevel}&_stk=active%2Canswer%2Cch%2Cfarm_jstoken%2Cjoinnum%2Cphoneid%2Ctasklevel%2Ctimestamp`,
      ),
      (err, resp, data) => {
        try {
          const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
          let { ret, retmsg } = JSON.parse(res);
          retmsg = retmsg !== '' ? retmsg : 'success';
          $.log(
            `\n${taskname}[做任务]：${retmsg.indexOf('活动太火爆了') !== -1 ? '任务进行中或者未到任务时间' : retmsg}${
              $.showLog ? '\n' + res : ''
            }`,
          );
          if (ret === 0) {
            $.drip += eachtimeget;
          }
          resolve(ret);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function submitInviteId(userName) {
  return new Promise(resolve => {
    if (!$.info || !$.info.smp) {
      resolve();
      return;
    }
    $.log(`\n你的互助码: ${$.info.smp}`);
    $.log(`你的活动id: ${$.info.active}`);
    $.post(
      {
        url: `https://api.ninesix.cc/api/jx-nc/${$.info.smp}/${encodeURIComponent(userName)}?active=${$.info.active}&joinnum=${$.info.joinnum}`,
      },
      (err, resp, _data) => {
        try {
          const { code, data = {} } = JSON.parse(_data);
          $.log(`\n邀请码提交：${code}\n${$.showLog ? _data : ''}`);
          if (data.value) {
            $.result.push('【邀请码】提交成功！');
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function createAssistUser() {
  return new Promise(resolve => {
    $.get({ url: `https://api.ninesix.cc/api/jx-nc?active=${$.info.active}` }, async (err, resp, _data) => {
      try {
        const { code, data: { value, extra = {} } = {} } = JSON.parse(_data);
        $.log(`\n获取随机助力码${code}\n${$.showLog ? _data : ''}`);
        if (!value) {
          $.result.push('获取助力码失败，请稍后再次手动执行脚本！');
          resolve();
          return;
        }
        $.get(
          taskUrl('help', `active=${extra.active}&joinnum=${extra.joinnum}&smp=${value}`),
          async (err, resp, data) => {
            try {
              const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
              const { ret, retmsg = '' } = JSON.parse(res);
              $.log(`\n助力：${retmsg} \n${$.showLog ? res : ''}`);
              if (ret === 0) {
                await createAssistUser();
              }
            } catch (e) {
              $.logErr(e, resp);
            } finally {
              resolve();
            }
          },
        );
      } catch (e) {
        $.logErr(e, resp);
        resolve();
      }
    });
  });
}

function showMsg() {
  return new Promise(resolve => {
    $.msg($.name, '', `\n${$.result.join('\n')}`);
    resolve();
  });
}

function taskUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}cubeactive/farm/${function_path}?${body}&farm_jstoken=${
      $.currentToken['farm_jstoken']
    }&phoneid=${$.currentToken['phoneid']}&timestamp=${
      $.currentToken['timestamp']
    }&sceneval=2&g_login_type=1&callback=whyour&_=${Date.now()}&g_ty=ls`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://st.jingxi.com/pingou/dream_factory/index.html`,
      'Accept-Encoding': `gzip, deflate, br`,
      Host: `wq.jd.com`,
      'Accept-Language': `zh-cn`,
      'User-Agent': 'jdpingou;iPhone;'
    },
  };
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
