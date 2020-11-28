/**
 *
  参考自： https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jd_dreamFactory.js
  多谢贡献： https://github.com/MoPoQAQ
  * 添加随机助力
  * 自动开团助力
  * box设置不自动充能
  * 可设置每天通知时间
  quanx:
  [task_local]
  10 * * * * https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jd_dreamFactory.js, tag=京喜工厂, enabled=true
  
  Loon:
  [Script]
  cron "10 * * * *" script-path=https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jd_dreamFactory.js,tag=京喜工厂
  
  Surge:
  京喜工厂 = type=cron,cronexp="10 * * * *",wake-system=1,timeout=20,script-path=https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jd_dreamFactory.js
*  
**/

const $ = new Env("京喜工厂");
const JD_API_HOST = "https://wq.jd.com/";
const jdCookieNode = $.isNode() ? require("./jdCookie.js") : "";
$.autoCharge = $.getdata("jx_autoCharge")
  ? $.getdata("jd_autoCharge") === "true"
  : false;
$.notifyTime = $.getdata("jx_notifyTime");
$.result = [];
$.cookieArr = [];
$.currentCookie = "";
$.allTask = [];
$.info = {};
$.userTuanInfo = {};

!(async () => {
  if (!getCookies()) return;
  for (let i = 0; i < $.cookieArr.length; i++) {
    $.currentCookie = $.cookieArr[i];
    if ($.currentCookie) {
      const userName = decodeURIComponent(
        $.currentCookie.match(/pt_pin=(.+?);/) &&
          $.currentCookie.match(/pt_pin=(.+?);/)[1]
      );
      $.log(`\n开始【京东账号${i + 1}】${userName}`);
      const beginInfo = await getUserInfo();
      await $.wait(500);
      await getCommodityDetail();
      await $.wait(500);
      await getCurrentElectricity();
      await $.wait(500);
      await getTaskList();
      await $.wait(500);
      await browserTask();
      await $.wait(500);
      await hireAward();
      await $.wait(500);
      await stealFriend();
      await $.wait(500);
      await submitInviteId(userName);
      await $.wait(500);
      await createAssistUser();
      const endInfo = await getUserInfo();
      await $.wait(500);
      $.result.push(
        `名称：${$.info.commodityInfo.name}`,
        `任务前能量：${beginInfo.user.electric} 任务后能量：${endInfo.user.electric}`,
        `获得能量：${
          endInfo.user.electric - beginInfo.user.electric
        } 还需能量：${endInfo.productionInfo.needElectric - beginInfo.productionInfo.investedElectric}`
      );
      await investElectric();
      await getTuanInfo();
      await submitTuanId(userName);
      await joinTuan();
    }
  }
  await showMsg();
})()
  .catch((e) => $.logErr(e))
  .finally(() => $.done());

function getCookies() {
  if ($.isNode()) {
    $.cookieArr = Object.values(jdCookieNode);
  } else {
    $.cookieArr = [$.getdata("CookieJD") || "", $.getdata("CookieJD2") || ""];
  }
  if (!$.cookieArr[0]) {
    $.msg(
      $.name,
      "【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取",
      "https://bean.m.jd.com/",
      { "open-url": "https://bean.m.jd.com/" }
    );
    return false;
  }
  return true;
}

function getUserInfo() {
  return new Promise((resolve) => {
    $.get(taskUrl("userinfo/GetUserInfo"), async (err, resp, data) => {
      try {
        const {
          ret,
          data: { factoryList = [], productionList = [], user = {} } = {},
          msg,
        } = JSON.parse(data);
        //$.log(`\n${msg}\n${data}`);
        $.info = {
          ...$.info,
          factoryInfo: factoryList[0],
          productionInfo: productionList[0],
          user,
        };
        resolve({
          factoryInfo: factoryList[0],
          productionInfo: productionList[0],
          user,
        })
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getCommodityDetail() {
  return new Promise(async (resolve) => {
    $.get(
      taskUrl(
        "diminfo/GetCommodityDetails",
        `commodityId=${$.info.productionInfo.commodityDimId}`
      ),
      (err, resp, data) => {
        try {
          const { ret, data: { commodityList = [] } = {}, msg } = JSON.parse(
            data
          );
          //$.log(`\n${msg}\n${data}`);
          $.info.commodityInfo = commodityList[0];
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function getCurrentElectricity() {
  return new Promise(async (resolve) => {
    $.get(
      taskUrl(
        "generator/QueryCurrentElectricityQuantity",
        `factoryid=${$.info.factoryInfo.factoryId}`
      ),
      async (err, resp, data) => {
        try {
          const {
            ret,
            data: {
              currentElectricityQuantity,
              doubleElectricityFlag,
              maxElectricityQuantity,
            } = {},
            msg,
          } = JSON.parse(data);
          $.log(`\n${msg}\n${data}`);
          if (
            currentElectricityQuantity === maxElectricityQuantity &&
            doubleElectricityFlag
          ) {
            await collectElectricity($.info.factoryInfo.factoryId);
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function collectElectricity(facId, master) {
  return new Promise(async (resolve) => {
    $.get(
      taskUrl(
        "generator/CollectCurrentElectricity",
        `factoryid=${facId}&master=${master ? master : ""}`
      ),
      (err, resp, data) => {
        try {
          const {
            ret,
            data: { CollectElectricity, loginPinCollectElectricity } = {},
            msg,
          } = JSON.parse(data);
          $.log(`\n${msg}\n${data}`);
          $.log(
            `${
              master ? "偷取好友" : "收取"
            } ${CollectElectricity} 电力，获得 ${loginPinCollectElectricity} 电力`
          );
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function getTaskList() {
  return new Promise(async (resolve) => {
    $.get(taskListUrl("GetUserTaskStatusList"), async (err, resp, data) => {
      try {
        const { ret, data: { userTaskStatusList = [] } = {}, msg } = JSON.parse(
          data
        );
        //$.log(`\n获取任务列表`);
        $.allTask = userTaskStatusList.filter(x => x.awardStatus !== 1);
/**
*
        $.log('筛选后的任务列表');
        for (let i = 0; i < $.allTask.length; i++) {
          const task = $.allTask[i];
          $.log(task.taskName);
        }
*
**/
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function browserTask() {
  return new Promise(async (resolve) => {
    const times = Math.max(...[...$.allTask].map((x) => x.configTargetTimes));
    $.log('共计'+$.allTask.length+'个任务待完成。。。。');
    for (let i = 0; i < $.allTask.length; i++) {
      const task = $.allTask[i];
      $.log(`\n开始第${i}个任务：${task.taskName}`);
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
        // await $.wait(500)
        // await getTaskList()
      }
      $.log(`\n结束第${i}个任务：${task.taskName}`);
    }
    resolve();
  });
}

function awardTask({ taskId, taskName }) {
  return new Promise((resolve) => {
    $.get(taskListUrl("Award", `taskId=${taskId}`), (err, resp, data) => {
      try {
        //const { msg, ret } = JSON.parse(data);
        //$.log(`\n${taskName}[领奖励]： ${msg}\n${data}`);
        //resolve(ret === 0);
        data = JSON.parse(data);
            switch (data['data']['awardStatus']) {
              case 1:
                ele += Number(data['data']['prizeInfo'].replace('\\n', ''))
                console.log(`领取${taskName}任务奖励成功，收获：${Number(data['data']['prizeInfo'].replace('\\n', ''))}电力`);
                break
              case 1013:
              case 0:
                console.log(`领取${taskName}任务奖励失败，任务已领奖`);
                break
              default:
                console.log(`领取${taskName}任务奖励失败，${data['msg']}`)
                break
            }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function doTask({ taskId, completedTimes, configTargetTimes, taskName }) {
  return new Promise(async (resolve) => {
    if (parseInt(completedTimes) >= parseInt(configTargetTimes)) {
      resolve(false);
      $.log(`\n${taskName}[做任务]： mission success`);
      return;
    }
    $.get(taskListUrl("DoTask", `taskId=${taskId}`), (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            // console.log(data)
            data = JSON.parse(data);
            if (data.ret === 0) {
              console.log("做任务完成！")
            }
          } else {
            console.log(`京东服务器返回空数据`)
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

function investElectric() {
  return new Promise(async (resolve) => {
    if (!$.autoCharge) {
      $.result.push('未打开自动投入')
      resolve();
      return;
    }
    $.get(
      taskUrl(
        "userinfo/InvestElectric",
        `productionId=${$.info.productionInfo.productionId}`
      ),
      (err, resp, data) => {
        try {
          const { msg, data: { investElectric } = {} } = JSON.parse(data);
          $.log(
            `\n投入电力: ${
              investElectric ? investElectric : ""
            } ${msg}\n${data}`
          );
          $.result.push(`本次投入电力 ${investElectric}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function hireAward() {
  return new Promise(async (resolve) => {
    $.get(
      taskUrl("friend/HireAward", `_time=${new Date().getTime()}`),
      async (err, resp, data) => {
        try {
          const { msg, data: { investElectric } = {} } = JSON.parse(data);
          $.log(`\n${msg}\n收取打工电力${data}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function stealFriend() {
  return new Promise(async (resolve) => {
    $.get(
      taskUrl("friend/QueryFactoryManagerList"),
      async (err, resp, data) => {
        try {
          const { msg, data: { list = [] } = {} } = JSON.parse(data);
          $.log(`\n${msg}\n工厂好友${data}`);
          const canCollectFriends = list.filter((x) => x.collectFlag === 1);
          for (let i = 0; i < canCollectFriends.length; i++) {
            const { encryptPin, key } = canCollectFriends[i];
            const facId = await getFactoryIdByPin(encryptPin);
            if (facId) {
              await collectElectricity(facId, key);
            }
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function getFactoryIdByPin(pin) {
  return new Promise((resolve, reject) => {
    $.get(
      taskUrl("userinfo/GetUserInfoByPin", `pin=${pin}`),
      (err, resp, data) => {
        try {
          const { msg, data: { factoryList = [] } = {} } = JSON.parse(data);
          $.log(`\n${msg}\n${data}`);
          resolve(factoryList[0].factoryId);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function submitInviteId(userName) {
  $.log("你的互助码: " + $.info.user.encryptPin);
  return new Promise((resolve) => {
    $.get(
      {
        url: `https://api.ninesix.cc/jx-factory/${$.info.user.encryptPin}/${userName}`,
      },
      (err, resp, _data) => {
        try {
          const { data = {} } = JSON.parse(_data);
          $.log(`\n${data.value}\n${_data}`);
          if (data.value) {
            $.result.push("邀请码提交成功！");
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function createAssistUser() {
  return new Promise((resolve) => {
    $.get({ url: "https://api.ninesix.cc/jx-factory" }, (err, resp, _data) => {
      try {
        const { data = {} } = JSON.parse(_data);
        $.log(`\n${data.value}\n${_data}`);
        $.get(
          taskUrl("friend/AssistFriend", `sharepin=${escape(data.value)}`),
          async (err, resp, data) => {
            try {
              const { msg } = JSON.parse(data);
              $.log(`\n${msg}\n${data}`);
            } catch (e) {
              $.logErr(e, resp);
            } finally {
              resolve();
            }
          }
        );
      } catch (e) {
        $.logErr(e, resp);
      }
    });
  });
}

function getTuanInfo() {
  return new Promise(async (resolve) => {
    $.get(
      taskUrl("tuan/QueryActiveConfig", `activeId=ilOin38J30PcT9xnWbx9lw%3D%3D&_time=${new Date().getTime()}`),
      async (err, resp, data) => {
        try {
          const { msg, data: { userTuanInfo } = {} } = JSON.parse(data);
          $.log(`\n${msg}\n开团信息${data}`);
          if (!userTuanInfo.tuanId) {
            await createTuan();
          } else {
            $.userTuanInfo = userTuanInfo;
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function submitTuanId(userName) {
  $.log("你的团码: " + $.userTuanInfo.tuanId);
  return new Promise((resolve) => {
    $.get(
      {
        url: `https://api.ninesix.cc/jx-factory-tuan/${$.userTuanInfo.tuanId}/${userName}`,
      },
      (err, resp, _data) => {
        try {
          const { data = {} } = JSON.parse(_data);
          $.log(`\n${data.value}\n${_data}`);
          if (data.value) {
            $.result.push("团码提交成功！");
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function createTuan() {
  return new Promise(async (resolve) => {
    $.get(
      taskUrl("tuan/CreateTuan", `activeId=ilOin38J30PcT9xnWbx9lw%3D%3D&isOpenApp=1&_time=${new Date().getTime()}`),
      async (err, resp, data) => {
        try {
          const { msg, data: { userTuanInfo } = {} } = JSON.parse(data);
          $.log(`\n${msg}\n开团信息${data}`);
          $.userTuanInfo = userTuanInfo;
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function joinTuan() {
  return new Promise(async (resolve) => {
    $.get({ url: "https://api.ninesix.cc/jx-factory-tuan" }, (err, resp, _data) => {
      try {
        const { data = {} } = JSON.parse(_data);
        $.log(`\n${data.value}\n${_data}`);
        $.get(
          taskUrl("tuan/JoinTuan", `activeId=ilOin38J30PcT9xnWbx9lw%3D%3D&tuanId=4N_bc2tVuNS77jvmoN22jg==&_time=${new Date().getTime()}`),
          async (err, resp, data) => {
            try {
              const { msg } = JSON.parse(data);
              $.log(`\n参团：${msg}\n${data}`);
            } catch (e) {
              $.logErr(e, resp);
            } finally {
              resolve();
            }
          }
        );
      } catch (e) {
        $.logErr(e, resp);
      }
    });
  });
}

function showMsg() {
  return new Promise((resolve) => {
    if ($.notifyTime) {
      const notifyTimes = $.notifyTime.split(',').map(x => x.split(':'));
      const now = $.time('HH:mm').split(':');
      $.log(`\n${JSON.stringify(notifyTimes)}`);
      $.log(`\n${JSON.stringify(now)}`);
      if (notifyTimes.some(x => x[0] === now[0] && (!x[1] || x[1] === now[1]))) {
        $.msg($.name, "", `\n${$.result.join("\n")}`);
      }
    } else {
      $.msg($.name, "", `\n${$.result.join("\n")}`);
    }
    resolve();
  });
}

function taskUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}dreamfactory/${function_path}?zone=dream_factory&sceneval=2&g_login_type=1&${body}`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://wqsd.jd.com/pingou/dream_factory/index.html?jxsid=16064615029143314965&exchange=&ptag=139045.1.2&from_source=outer&jump_rd=17088.24.47&deepLink=1`,
      "Accept-Encoding": `gzip, deflate, br`,
      Host: `wq.jd.com`,
      "User-Agent": `jdpingou;iPhone;3.15.2;14.2.1;ea00763447803eb0f32045dcba629c248ea53bb3;network/3g;model/iPhone13,2;appBuild/100365;ADID/00000000-0000-0000-0000-000000000000;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;hasOCPay/0;supportBestPay/0;session/4;pap/JA2015_311210;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`,
      "Accept-Language": `zh-cn`,
    },
  };
}

function taskListUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}newtasksys/newtasksys_front/${function_path}?${body}&source=dreamfactory&bizCode=dream_factory&sceneval=2&g_login_type=1`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://wqsd.jd.com/pingou/dream_factory/index.html?jxsid=16064615029143314965&exchange=&ptag=139045.1.2&from_source=outer&jump_rd=17088.24.47&deepLink=1`,
      "Accept-Encoding": `gzip, deflate, br`,
      Host: `wq.jd.com`,
      "User-Agent": `jdpingou;iPhone;3.15.2;14.2.1;ea00763447803eb0f32045dcba629c248ea53bb3;network/3g;model/iPhone13,2;appBuild/100365;ADID/00000000-0000-0000-0000-000000000000;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;hasOCPay/0;supportBestPay/0;session/4;pap/JA2015_311210;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`,
      "Accept-Language": `zh-cn`,
    },
  };
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
