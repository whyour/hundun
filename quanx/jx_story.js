/*
 * @Author: whyour
 * @Github: https://github.com/whyour
 * @Date: 2020-11-29 13:14:19
 * @LastEditors: whyour
 * @LastEditTime: 2020-12-02 17:58:36
 * 拷贝定时任务删除 *\/4 中的 \
  quanx:
  [task_local]
  10 *\/4 * * * https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_story.js, tag=京喜金牌厂长, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jdgc.png, enabled=true

  Loon:
  [Script]
  cron "10 *\/4 * * *" script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_story.js,tag=京喜金牌厂长

  Surge:
  京喜金牌厂长 = type=cron,cronexp="10 *\/4 * * *",wake-system=1,timeout=20,script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_story.js
*
**/

const $ = new Env('京喜金牌厂长');
const JD_API_HOST = 'https://m.jingxi.com/';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
$.autoCharge = $.getdata('jx_autoCharge') ? $.getdata('jx_autoCharge') === 'true' : false;
$.showLog = $.getdata('jx_showLog') ? $.getdata('jx_showLog') === 'true' : false;
$.notifyTime = $.getdata('jxcz_notifyTime');
$.result = [];
$.cookieArr = [];
$.currentCookie = '';
$.allTask = [];
$.info = {};

!(async () => {
  if (!getCookies()) return;
  for (let i = 0; i < $.cookieArr.length; i++) {
    $.currentCookie = $.cookieArr[i];
    if ($.currentCookie) {
      const userName = decodeURIComponent(
        $.currentCookie.match(/pt_pin=(.+?);/) && $.currentCookie.match(/pt_pin=(.+?);/)[1],
      );
      $.log(`\n开始【京东账号${i + 1}】${userName}`);
      const beginInfo = await getUserInfo();
      await $.wait(500);
      // await getAwardDetails();
      await $.wait(500);
      await signIn();
      await $.wait(500);
      await getTaskList();
      await $.wait(500);
      await browserTask();
      await $.wait(500);
      await getFriends();
      // await getReadyCard();
      // await clickManage();
      await $.wait(500);
      const endInfo = await getUserInfo();
      $.result.push(
        `任务前钞票：${beginInfo.currentMoneyNum} 任务后钞票：${endInfo.currentMoneyNum}`,
        `获得钞票：${endInfo.currentMoneyNum - beginInfo.currentMoneyNum}`,
        `任务前银行钞票：${beginInfo.financialBanknote} 任务后银行钞票：${endInfo.financialBanknote}`,
        `获得钞票：${endInfo.financialBanknote - beginInfo.financialBanknote}`,
        `当前等级 ${endInfo.userLevel}, 升级还需投入 ${
          endInfo.needLevelInvestedMoneyNum - endInfo.curLevelAlreadyInvestedMoneyNum
        }`,
      );
      await submitInviteId(userName);
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
    $.cookieArr = [$.getdata('CookieJD') || '', $.getdata('CookieJD2') || ''];
  }
  if (!$.cookieArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {
      'open-url': 'https://bean.m.jd.com/',
    });
    return false;
  }
  return true;
}

function getUserInfo() {
  return new Promise(resolve => {
    $.get(taskUrl('userinfo/GetUserInfo'), async (err, resp, _data) => {
      try {
        const { ret, data = {}, msg } = JSON.parse(_data);
        $.log(`\n获取用户信息：${msg}\n${$.showLog ? _data : ''}`);
        $.info = data;
        resolve(data);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function clickManage() {
  return new Promise(resolve => {
    $.get(taskUrl('userinfo/IncreaseUserMoney'), async (err, resp, _data) => {
      try {
        const { ret, data: { moneyNum = 0 } = {}, msg } = JSON.parse(_data);
        $.log(`\n点击厂长：${msg}，获得钞票 ${moneyNum}\n${$.showLog ? _data : ''}`);
        if (ret === 0) {
          await $.wait(500);
          await clickManage();
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function submitInviteId(userName) {
  return new Promise(resolve => {
    if (!$.info || !$.info.shareId) {
      resolve();
      return;
    }
    $.log('你的互助码: ' + $.info.shareId);
    $.get(
      {
        url: `https://api.ninesix.cc/api/jx-story/${$.info.shareId}/${userName}`,
      },
      (err, resp, _data) => {
        try {
          const { data = {} } = JSON.parse(_data);
          $.log(`\n邀请码提交：${data.value}\n${$.showLog ? _data : ''}`);
          if (data.value) {
            $.result.push('邀请码提交成功！');
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
    $.get({ url: 'https://api.ninesix.cc/api/jx-story' }, (err, resp, _data) => {
      try {
        const { data = {} } = JSON.parse(_data);
        $.log(`\n${data.value}\n${$.showLog ? _data : ''}`);
        $.get(taskUrl('userinfo/AssistFriend', `shareId=${escape(data.value)}`), (err, resp, data) => {
          try {
            const { msg, data: { rewardMoney = 0 } = {} } = JSON.parse(data);
            $.log(`\n助力：${msg} 获得钞票 ${rewardMoney}\n${$.showLog ? data : ''}`);
          } catch (e) {
            $.logErr(e, resp);
          } finally {
            resolve();
          }
        });
      } catch (e) {
        $.logErr(e, resp);
      }
    });
  });
}

function getAwardDetails() {
  return new Promise(async resolve => {
    $.get(taskUrl('userinfo/AwardDetails'), async (err, resp, data) => {
      try {
        const { ret, data: { drawBingoList = [] } = {}, msg } = JSON.parse(data);
        $.log(`\n获取奖励列表 ${msg}，总共${drawBingoList.length}个奖励！`);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getFriends() {
  return new Promise(async resolve => {
    $.get(taskUrl('userinfo/GetFriendList'), async (err, resp, data) => {
      try {
        const { msg, data: { hireListToday = [] } = {} } = JSON.parse(data);
        $.log(`\n获取助力好友：${msg}\n${!$.showLog ? data : ''}`);
        for (let i = 0; i < hireListToday.length; i++) {
          const { awardMoneyStatus, awardHongbaoStatus, rewardHongbaoMax } = hireListToday[i];
          if (!awardMoneyStatus) {
            await awardMoney(i + 1);
          }
          if (!awardHongbaoStatus && rewardHongbaoMax > 0) {
            await awardHongbao(i + 1);
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function awardMoney(id) {
  return new Promise(resolve => {
    $.get(taskUrl('userinfo/HireAward', `type=1&position=${id}`), async (err, resp, data) => {
      try {
        const { msg, data: { rewardMoney = 0 } = {} } = JSON.parse(data);
        $.log(`\n获取助力钞票：${msg}，获得钞票 ${rewardMoney}\n${$.showLog ? data : ''}`);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function awardHongbao(id) {
  return new Promise(resolve => {
    $.get(taskUrl('userinfo/HireAward', `type=2&position=${id}`), async (err, resp, data) => {
      try {
        const { msg, data: { rewardHongbao = 0 } = {} } = JSON.parse(data);
        $.log(`\n获取助力红包：${msg}，获得红包 ${rewardHongbao}\n${$.showLog ? data : ''}`);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getReadyCard() {
  return new Promise(async resolve => {
    $.get(taskUrl('userinfo/ReadyCard'), async (err, resp, data) => {
      try {
        const { ret, data: { cardInfo = [] } = {}, msg } = JSON.parse(data);
        $.log(`\n获取翻倍列表 ${msg}，总共${cardInfo.length}个卡片！${cardInfo.length ? '随机选择一个卡片' : ''}`);
        if (cardInfo.length > 0) {
          await selectCard(cardInfo);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function selectCard(cardInfo) {
  return new Promise(async resolve => {
    const random = Math.floor(Math.random() * 3);
    const cardList = [...cardInfo].map((x, i) => {
      return {
        cardId: x.cardId,
        cardPosition: i + 1,
        cardStatus: i === random ? 1 : 0,
      };
    });
    $.get(
      taskUrl('userinfo/SelectCard', `cardInfo=${encodeURIComponent(JSON.stringify({ cardInfo: cardList }))}`),
      async (err, resp, data) => {
        try {
          const { ret, msg } = JSON.parse(data);
          $.log(`\n选择翻倍卡片 ${msg}`);
          await $.wait(10300);
          await finishCard(cardInfo[random]);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function finishCard({ cardId }) {
  return new Promise(async resolve => {
    $.get(taskUrl('userinfo/FinishCard', `cardid=${cardId}`), async (err, resp, data) => {
      try {
        const { ret, data: { cardInfo = [], earnRatio } = {}, msg } = JSON.parse(data);
        $.log(`\n翻倍 ${msg}，获得倍数 ${earnRatio || 0}`);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getTaskList() {
  return new Promise(async resolve => {
    $.get(taskListUrl('GetUserTaskStatusList'), async (err, resp, data) => {
      try {
        const { ret, data: { userTaskStatusList = [] } = {}, msg } = JSON.parse(data);
        $.allTask = userTaskStatusList.filter(x => x.awardStatus !== 1);
        $.log(`\n获取任务列表 ${msg}，总共${$.allTask.length}个任务！`);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function browserTask() {
  return new Promise(async resolve => {
    const times = Math.max(...[...$.allTask].map(x => x.configTargetTimes));
    for (let i = 0; i < $.allTask.length; i++) {
      const task = $.allTask[i];
      $.log(`\n开始第${i + 1}个任务：${task.taskName}`);
      const status = [true, true];
      for (let i = 0; i < times; i++) {
        await $.wait(500);
        if (status[0]) {
          status[0] = await doTask(task);
        }
        await $.wait(500);
        if (status[1]) {
          status[1] = await awardTask(task);
        }
        if (!status[0] && !status[1]) {
          break;
        }
      }
      $.log(`\n结束第${i + 1}个任务：${task.taskName}\n`);
    }
    resolve();
  });
}

function awardTask({ taskId, taskName }) {
  return new Promise(resolve => {
    $.get(taskListUrl('Award', `taskId=${taskId}`), (err, resp, data) => {
      try {
        const { msg, ret, data: { prizeInfo = '' } = {} } = JSON.parse(data);
        $.log(
          `\n${taskName}[领奖励]：${
            msg.indexOf('活动太火爆了') !== -1 ? '任务进行中或者未到任务时间' : msg
          }：获得钞票 ${prizeInfo.slice(0, -2)}\n${$.showLog ? data : ''}`,
        );
        resolve(ret === 0);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function doTask({ taskId, completedTimes, configTargetTimes, taskName }) {
  return new Promise(async resolve => {
    if (parseInt(completedTimes) >= parseInt(configTargetTimes)) {
      resolve(false);
      $.log(`\n${taskName}[做任务]： mission success`);
      return;
    }
    $.get(taskListUrl('DoTask', `taskId=${taskId}`), (err, resp, data) => {
      try {
        const { msg, ret } = JSON.parse(data);
        $.log(
          `\n${taskName}[做任务]： ${msg.indexOf('活动太火爆了') !== -1 ? '任务进行中或者未到任务时间' : msg}\n${
            $.showLog ? data : ''
          }`,
        );
        resolve(ret === 0);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function signIn() {
  return new Promise(resolve => {
    $.get(taskUrl('userinfo/SignIn', `date=${$.time('yyyyMMdd')}`), async (err, resp, data) => {
      try {
        const { msg, data: { rewardMoneyToday } = {} } = JSON.parse(data);
        $.log(`\n签到：${msg} 获得钞票 ${rewardMoneyToday || 0}\n${$.showLog ? data : ''}`);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function showMsg() {
  return new Promise(resolve => {
    if ($.notifyTime) {
      const notifyTimes = $.notifyTime.split(',').map(x => x.split(':'));
      const now = $.time('HH:mm').split(':');
      $.log(`\n${JSON.stringify(notifyTimes)}`);
      $.log(`\n${JSON.stringify(now)}`);
      if (notifyTimes.some(x => x[0] === now[0] && (!x[1] || x[1] === now[1]))) {
        $.msg($.name, '', `\n${$.result.join('\n')}`);
      }
    } else {
      $.msg($.name, '', `\n${$.result.join('\n')}`);
    }
    resolve();
  });
}

function taskUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}jxstory/${function_path}?bizcode=jxstory&sceneval=2&g_login_type=1&&_time=${Date.now()}&_=${Date.now()}&${body}`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://st.jingxi.com/pingou/jx_factory_story/index.html`,
      'Accept-Encoding': `gzip, deflate, br`,
      Host: `m.jingxi.com`,
      'User-Agent': `jdpingou;iPhone;3.15.2;14.2.1;ea00763447803eb0f32045dcba629c248ea53bb3;network/wifi;model/iPhone13,2;appBuild/100365;ADID/00000000-0000-0000-0000-000000000000;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;hasOCPay/0;supportBestPay/0;session/${
        Math.random * 98 + 1
      };pap/JA2015_311210;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`,
      'Accept-Language': `zh-cn`,
    },
  };
}

function taskListUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}newtasksys/newtasksys_front/${function_path}?${body}&source=jxstory&bizCode=jxstory&sceneval=2&g_login_type=1&_time=${Date.now()}&_=${Date.now()}`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://st.jingxi.com/pingou/jx_factory_story/index.html`,
      'Accept-Encoding': `gzip, deflate, br`,
      Host: `m.jingxi.com`,
      'User-Agent': `jdpingou;iPhone;3.15.2;14.2.1;ea00763447803eb0f32045dcba629c248ea53bb3;network/wifi;model/iPhone13,2;appBuild/100365;ADID/00000000-0000-0000-0000-000000000000;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;hasOCPay/0;supportBestPay/0;session/${
        Math.random * 98 + 1
      };pap/JA2015_311210;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`,
      'Accept-Language': `zh-cn`,
    },
  };
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
