/*
 * @Author: whyour
 * @Github: https://github.com/whyour
 * @Date: 2020-11-20 10:42:06
 * @LastEditors: whyour
 * @LastEditTime: 2020-12-02 14:41:28

  hostname = lkyl.dianpusoft.cn

  quanx:
  [task_local]
  0 9 * * * https://raw.githubusercontent.com/whyour/hundun/master/quanx/ddxw.js, tag=京东小窝, img-url=https://raw.githubusercontent.com/58xinian/icon/master/ddxw.png enabled=true
  [rewrite_local]
  ^https\:\/\/lkyl\.dianpusoft\.cn\/api\/user\-info\/login url script-request-body https://raw.githubusercontent.com/whyour/hundun/master/quanx/ddxw.cookie.js

  loon:
  [Script]
  http-request ^https\:\/\/lkyl\.dianpusoft\.cn\/api\/user\-info\/login script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/ddxw.cookie.js, requires-body=true, timeout=10, tag=京东小窝cookie
  cron "0 9 * * *" script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/ddxw.js, tag=京东小窝

  surge:
  [Script]
  京东小窝 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/ddxw.js,
  京东小窝cookie = type=http-request,pattern=^https\:\/\/lkyl\.dianpusoft\.cn\/api\/user\-info\/login,requires-body=1,max-size=0,script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/ddxw.cookie.js
 *
 *
 **/
const $ = new Env("东东小窝");

const jdCookieNode = $.isNode() ? require("./jdCookie.js") : "";
const JD_API_HOST = "https://lkyl.dianpusoft.cn/api/";
$.testTaskId = "1329472966483550209"; // 测试邀请任务
$.userNames = [
  $.getdata("jd_ddxw_name1") || "",
  $.getdata("jd_ddxw_name2") || "",
];
$.tokens = [
  $.getdata("jd_ddxw_token1") || "",
  $.getdata("jd_ddxw_token2") || "",
];
$.woBLottery = $.getdata("jd_wob_lottery")
  ? $.getdata("jd_wob_lottery") === "true"
  : false;
$.showLog = $.getdata("xw_showLog")
  ? $.getdata("xw_showLog") === "true"
  : false;
$.result = [];
$.cookieArr = [];
$.allTask = [];
$.drawCenterInfo = {};

!(async () => {
  if (!getCookies()) return;
  for (let i = 0; i < $.cookieArr.length; i++) {
    const cookie = $.cookieArr[i];
    if (cookie) {
      const userName = decodeURIComponent(
        cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1]
      );
      console.log(`\n开始【京东账号${i + 1}】${userName}`);
      const isOk = await checkToken($.tokens[i]);
      if (!isOk) {
        $.tokens[i] = await getToken($.userNames[i], i, cookie);
      }
      const startHomeInfo = await getHomeInfo($.tokens[i]);
      if (!startHomeInfo) return;
      await getDrawCenter($.tokens[i]);
      await drawTask($.tokens[i]);
      await getAllTask($.tokens[i]);
      if(!getValid()) return;
      await signIn($.tokens[i]);
      await browseTasks($.tokens[i]);
      await gameTask($.tokens[i]);
      const inviteId = await getInviteId($.tokens[i]);
      await submitInviteId(inviteId, $.userNames[i]);
      // 没人只能助力一次，全凭天意，每天0点清库
      await createAssistUser($.tokens[i]);
      const endHomeInfo = await getHomeInfo($.tokens[i]);
      $.result.push(
        `任务前窝币：${startHomeInfo.woB}`,
        `任务后窝币：${endHomeInfo.woB}`,
        `获得窝币：${endHomeInfo.woB - startHomeInfo.woB}`
      );
      // await followShops($.tokens[i]);
      // await followChannels($.tokens[i]);
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

function getValid() {
  if ($.allTask.length > 0) {
    return true;
  }
  $.msg($.name, '任务已结束，没有可执行任务!');
  return false
}

function submitInviteId(inviteId, userName) {
  return new Promise((resolve) => {
    $.get({ url: `https://api.ninesix.cc/api/code/${inviteId}/${userName}` }, (err, resp, _data) => {
      try {
        const { data = {} } = JSON.parse(_data);
        $.log(`\n${data.value}\n${$.showLog ? _data : ''}`);
        if (data.value) {
          $.result.push('邀请码提交成功！')
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}

function getToken(name, i, cookie) {
  return new Promise(async (resolve) => {
    if (!name) {
      name = await getUserName(cookie, i);
    }
    $.post(
      postTaskUrl("user-info/login", { body: { client: 2, userName: name } }),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${head.msg}\n${$.showLog ? data : ''}`);
          $.tokens[i] = head.token;
          $.setdata(head.token, `jd_ddxw_token${i + 1}`);
          resolve(head.token);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function checkToken(token) {
  return new Promise((resolve) => {
    if (!token) {
      resolve(false);
      return;
    }
    $.get(
      taskUrl("ssjj-wo-home-info/queryByUserId/2", {}, token),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${head.msg}\n${$.showLog ? data : ''}`);
          resolve(head.code === 200);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

// @fork from https://github.com/yangtingxiao
function getUserName(cookie, i) {
  return new Promise((resolve) => {
    let url = {
      url: `https://jdhome.m.jd.com/saas/framework/encrypt/pin?appId=6d28460967bda11b78e077b66751d2b0`,
      headers: {
        Origin: `https://jdhome.m.jd.com`,
        Cookie: cookie,
        Connection: `keep-alive`,
        Accept: `application/json`,
        Referer: `https://jdhome.m.jd.com/dist/taro/index.html/`,
        Host: `jdhome.m.jd.com`,
        "Accept-Encoding": `gzip, deflate, br`,
        "Accept-Language": `zh-cn`,
      },
    };
    $.post(url, async (err, resp, _data) => {
      try {
        const { data } = JSON.parse(_data);
        $.log(`\n${data.msg}\n${$.showLog ? _data : ''}`);
        $.userNames[i] = data;
        $.setdata(data, `jd_ddxw_name${i + 1}`);
        resolve(data);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getHomeInfo(token) {
  return new Promise((resolve) => {
    $.get(
      taskUrl("ssjj-wo-home-info/queryByUserId/2", {}, token),
      (err, resp, data) => {
        try {
          const { body } = JSON.parse(data);
          if (!body || !body.woB) {
            $.msg($.name, '请先开通东东小窝！')
            resolve(false);
          }
          resolve(body);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function getAllTask(token) {
  return new Promise((resolve) => {
    $.get(
      taskUrl("ssjj-task-info/queryAllTaskInfo/2", {}, token),
      (err, resp, data) => {
        try {
          const { body } = JSON.parse(data);
          $.allTask = body;
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

async function drawTask(token) {
  const { freeDrawNum, paidDrawNum, freeDrawCount } = $.drawCenterInfo;
  const freeCount = Math.min(freeDrawNum, freeDrawCount);
  for (let i = 0; i < freeCount; i++) {
    await draw(token, i);
  }
  if ($.woBLottery) {
    for (let j = 0; j < paidDrawNum; j++) {
      await draw(token, freeDrawNum + j - 1);
    }
  }
}

function draw(token, i) {
  return new Promise((resolve) => {
    $.get(
      taskUrl(`ssjj-draw-record/draw/${$.drawCenterInfo.id}`, {}, token),
      (err, resp, data) => {
        try {
          const { head = {}, body = {} } = JSON.parse(data);
          $.log(`\n第${i + 1}次抽奖：${head.msg}\n${$.showLog ? data : ''}`);
          $.result.push(
            `第${i + 1}次抽奖：${body.name ? body.name : head.msg}`
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

function getDrawCenter(token) {
  return new Promise((resolve) => {
    $.get(
      taskUrl("ssjj-draw-center/queryDraw", {}, token),
      (err, resp, data) => {
        try {
          const { body = {} } = JSON.parse(data);
          $.drawCenterInfo = {
            ...body.center,
            freeDrawCount: body.freeDrawCount,
          };
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

async function gameTask(token) {
  const _game = $.allTask.find((x) => x.ssjjTaskInfo.type === 3);
  const count = _game.ssjjTaskInfo.awardOfDayNum - _game.doneNum;
  for (let i = 0; i < count; i++) {
    await game(token, _game);
    await $.wait(5000);
  }
}

function game(token, _game) {
  return new Promise((resolve) => {
    $.get(
      taskUrl(`ssjj-task-record/game/1/${_game.ssjjTaskInfo.id}`, {}, token),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${_game.ssjjTaskInfo.name}：${head.msg}\n${$.showLog ? data : ''}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function signIn(token) {
  const clock = $.allTask.find((x) => x.ssjjTaskInfo.type === 2);
  return new Promise((resolve) => {
    $.get(
      taskUrl(`ssjj-task-record/clock/${clock.ssjjTaskInfo.id}`, {}, token),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${clock.ssjjTaskInfo.name}：${head.msg}\n${$.showLog ? data : ''}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function createAssistUser(token) {
  const invite = $.allTask.find((x) => x.ssjjTaskInfo.type === 1);
  return new Promise((resolve) => {
    $.get({ url: 'https://api.ninesix.cc/api/code' }, (err, resp, _data) => {
      try {
        const { data = {} } = JSON.parse(_data);
        $.log(`\n${data.value}\n${$.showLog ? _data : ''}`);
        $.get(
          taskUrl(
            `ssjj-task-record/createAssistUser/${data.value}/${invite.ssjjTaskInfo.id}`,
            {},
            token
          ),
          (err, resp, data) => {
            try {
              const { head = {} } = JSON.parse(data);
              $.log(`\n${head.msg}\n${$.showLog ? data : ''}`);
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
    })
  });
}

function getInviteId(token) {
  const clock = $.allTask.find((x) => x.ssjjTaskInfo.type === 2);
  return new Promise((resolve) => {
    $.get(
      taskUrl(`ssjj-task-record/createInviteUser`, {}, token),
      async (err, resp, data) => {
        try {
          const { body = {}, head = {} } = JSON.parse(data);
          $.log(`\n${head.msg}\n${$.showLog ? data : ''}`);
          $.log(`\n你的shareID：${body.id}`);
          resolve(body.id);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function followShops(token) {
  const browseShop = $.allTask.find((x) => x.ssjjTaskInfo.type === 5);
  return new Promise((resolve) => {
    $.get(
      taskUrl(
        `ssjj-task-record/followShops/${browseShop.ssjjTaskInfo.id}`,
        {},
        token
      ),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${head.msg}\n${$.showLog ? data : ''}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function followChannels(token) {
  const browseChannel = $.allTask.find((x) => x.ssjjTaskInfo.type === 7);
  return new Promise((resolve) => {
    $.get(
      taskUrl(
        `ssjj-task-record/followChannels/${browseChannel.ssjjTaskInfo.id}`,
        {},
        token
      ),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${head.msg}\n${$.showLog ? data : ''}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function addCommodityToCart() {
  const browseChannel = $.allTask.find((x) => x.ssjjTaskInfo.type === 7);
  return new Promise((resolve) => {
    $.get(
      taskUrl(
        `ssjj-task-record/followChannels/${browseChannel.ssjjTaskInfo.id}`,
        {},
        token
      ),
      (err, resp, data) => {
        try {
          const { head } = JSON.parse(data);
          $.log(`\n${head.msg}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function browseTasks(token) {
  return new Promise(async (resolve) => {
    const browseShop = $.allTask.find((x) => x.ssjjTaskInfo.type === 5);
    const browseChannel = $.allTask.find((x) => x.ssjjTaskInfo.type === 7);
    const browseCommodity = $.allTask.find((x) => x.ssjjTaskInfo.type === 10);
    const browseMeeting = $.allTask.find((x) => x.ssjjTaskInfo.type === 11);
    const times = Math.max(
      browseShop ? browseShop.ssjjTaskInfo.awardOfDayNum : 0,
      browseChannel ? browseChannel.ssjjTaskInfo.awardOfDayNum : 0,
      browseCommodity ? browseCommodity.ssjjTaskInfo.awardOfDayNum : 0,
      browseMeeting ? browseMeeting.ssjjTaskInfo.awardOfDayNum : 0
    );
    const status = [true, true, true, true];
    for (let i = 0; i < times; i++) {
      if (status[0] && browseShop) {
        status[0] = await browseShopFun(token);
        await getAllTask(token);
        await $.wait(300);
      }
      if (status[1] && browseChannel) {
        status[1] = await browseChannelFun(token);
        await getAllTask(token);
        await $.wait(300);
      }
      if (status[2] && browseCommodity) {
        status[2] = await browseCommodityFun(token);
        await getAllTask(token);
        await $.wait(300);
      }
      if (status[3] && browseMeeting) {
        status[3] = await browseMeetingFun(token);
        await getAllTask(token);
        await $.wait(300);
      }
    }
    resolve();
  });
}

function browseShopFun(token) {
  const browseShop = $.allTask.find((x) => x.ssjjTaskInfo.type === 5);
  return new Promise((resolve) => {
    if (browseShop.doneNum === browseShop.ssjjTaskInfo.awardOfDayNum) {
      resolve();
    }
    $.get(
      taskUrl(
        `ssjj-task-record/browseShops/${browseShop.ssjjTaskInfo.id}/${browseShop.browseId}`,
        {},
        token
      ),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${browseShop.ssjjTaskInfo.name}：${head.msg}\n${$.showLog ? data : ''}`);
          resolve(head.code === 200);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function browseChannelFun(token) {
  const browseChannel = $.allTask.find((x) => x.ssjjTaskInfo.type === 7);
  return new Promise((resolve) => {
    if (browseChannel.doneNum === browseChannel.ssjjTaskInfo.awardOfDayNum) {
      resolve();
    }
    $.get(
      taskUrl(
        `ssjj-task-record/browseChannels/${browseChannel.ssjjTaskInfo.id}/${browseChannel.browseId}`,
        {},
        token
      ),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${browseChannel.ssjjTaskInfo.name}：${head.msg}\n${$.showLog ? data : ''}`);
          resolve(head.code === 200);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function browseCommodityFun(token) {
  const browseCommodity = $.allTask.find((x) => x.ssjjTaskInfo.type === 10);
  return new Promise((resolve) => {
    if (
      browseCommodity.doneNum === browseCommodity.ssjjTaskInfo.awardOfDayNum
    ) {
      resolve();
    }
    $.get(
      taskUrl(
        `ssjj-task-record/browseCommodities/${browseCommodity.ssjjTaskInfo.id}/${browseCommodity.browseId}`,
        {},
        token
      ),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${browseCommodity.ssjjTaskInfo.name}：${head.msg}\n${$.showLog ? data : ''}`);
          resolve(head.code === 200);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function browseMeetingFun(token) {
  const browseMeeting = $.allTask.find((x) => x.ssjjTaskInfo.type === 11);
  return new Promise((resolve) => {
    if (browseMeeting.doneNum === browseMeeting.ssjjTaskInfo.awardOfDayNum) {
      resolve();
    }
    $.get(
      taskUrl(
        `ssjj-task-record/browseMeetings/${browseMeeting.ssjjTaskInfo.id}/${browseMeeting.browseId}`,
        {},
        token
      ),
      (err, resp, data) => {
        try {
          const { head = {} } = JSON.parse(data);
          $.log(`\n${browseMeeting.ssjjTaskInfo.name}：${head.msg}\n${$.showLog ? data : ''}`);
          resolve(head.code === 200);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      }
    );
  });
}

function showMsg() {
  return new Promise((resolve) => {
    $.result.push(
      "关注频道，关注店铺，加购商品任务\n只能执行一次，建议手动执行"
    );
    $.msg($.name, "", `\n${$.result.join("\n")}`);
    resolve();
  });
}

function taskUrl(function_path, body = {}, token) {
  return {
    url: `${JD_API_HOST}${function_path}?body=${encodeURIComponent(
      JSON.stringify(body)
    )}`,
    headers: {
      "Accept-Encoding": "gzip, deflate, br",
      Accept: "*/*",
      Connection: "keep-alive",
      Referer:
        "https://lkyl.dianpusoft.cn/client/?lkEPin=34168c9ed9f3d3d65b38e7734a7f8b78&token=AAFftRX6ADBv728uQAKep9PzCLyChE14LHgMghEYE2fPjt0eGG3F3ZfDTOVG12w_KELogxhaNe8",
      "Content-Type": "application/json",
      Host: "lkyl.dianpusoft.cn",
      "User-Agent":
        "jdapp;iPhone;9.2.2;14.2;93c009c471d3d33feeef2f4f3ae808c64cdd42b2;network/wifi;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;model/iPhone13,2;hasOCPay/0;appBuild/167422;supportBestPay/0;jdSupportDarkMode/0;addressid/2352393936;pv/28.77;apprpd/MyJD_MyActivity;ref/MyJdGameToolController;psq/7;ads/;psn/93c009c471d3d33feeef2f4f3ae808c64cdd42b2|147;jdv/0|androidapp|t_335139774|appshare|CopyURL|1605671136013|1605671137;adk/;app_device/IOS;pap/JA2015_311210|9.2.2|IOS 14.2;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
      "Accept-Language": "zh-cn",
      token,
    },
  };
}

function postTaskUrl(function_path, body = {}, token) {
  const url = {
    url: `${JD_API_HOST}user-info/login`,
    body: JSON.stringify(body),
    headers: {
      "Accept-Encoding": "gzip, deflate, br",
      Accept: "*/*",
      Connection: "keep-alive",
      Referer:
        "https://lkyl.dianpusoft.cn/client/?lkEPin=34168c9ed9f3d3d65b38e7734a7f8b78&token=AAFftRX6ADBv728uQAKep9PzCLyChE14LHgMghEYE2fPjt0eGG3F3ZfDTOVG12w_KELogxhaNe8",
      "Content-Type": "application/json",
      Host: "lkyl.dianpusoft.cn",
      "User-Agent":
        "jdapp;iPhone;9.2.2;14.2;93c009c471d3d33feeef2f4f3ae808c64cdd42b2;network/wifi;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;model/iPhone13,2;hasOCPay/0;appBuild/167422;supportBestPay/0;jdSupportDarkMode/0;addressid/2352393936;pv/28.77;apprpd/MyJD_MyActivity;ref/MyJdGameToolController;psq/7;ads/;psn/93c009c471d3d33feeef2f4f3ae808c64cdd42b2|147;jdv/0|androidapp|t_335139774|appshare|CopyURL|1605671136013|1605671137;adk/;app_device/IOS;pap/JA2015_311210|9.2.2|IOS 14.2;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
      "Accept-Language": "zh-cn",
    },
  };
  if (token) {
    url.headers.token = token;
  }
  return url;
}

function isJsonString(str) {
  try {
    if (typeof JSON.parse(str) == "object") {
      return true;
    }
  } catch (e) {}
  return false;
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
