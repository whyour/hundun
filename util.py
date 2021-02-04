#!/usr/bin/env python3
# _*_ coding:utf-8 _*_

import sys
import os
cur_path = os.path.abspath(os.path.dirname(__file__))
root_path = os.path.split(cur_path)[0]
sys.path.append(root_path)
import requests
import json
import traceback
import time
import hmac
import hashlib
import base64
import urllib.parse
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

# 通知服务
BARK = ''                                                                 # bark服务,自行搜索; secrets可填;
SCKEY = ''                                                                # Server酱的SCKEY; secrets可填
TG_BOT_TOKEN = ''                                                         # tg机器人的TG_BOT_TOKEN; secrets可填
TG_USER_ID = ''                                                           # tg机器人的TG_USER_ID; secrets可填
TG_PROXY_IP = ''                                                          # tg机器人的TG_PROXY_IP; secrets可填
TG_PROXY_PORT = ''                                                        # tg机器人的TG_PROXY_PORT; secrets可填
DD_BOT_ACCESS_TOKEN = ''                                                  # 钉钉机器人的DD_BOT_ACCESS_TOKEN; secrets可填
DD_BOT_SECRET = ''                                                        # 钉钉机器人的DD_BOT_SECRET; secrets可填
QQ_SKEY = ''                                                              # qq机器人的QQ_SKEY; secrets可填
QQ_MODE = ''                                                              # qq机器人的QQ_MODE; secrets可填

notify_mode = []

# GitHub action运行需要填写对应的secrets
if "BARK" in os.environ and os.environ["BARK"]:
    BARK = os.environ["BARK"]
if "SCKEY" in os.environ and os.environ["SCKEY"]:
    SCKEY = os.environ["SCKEY"]
if "TG_BOT_TOKEN" in os.environ and os.environ["TG_BOT_TOKEN"] and "TG_USER_ID" in os.environ and os.environ["TG_USER_ID"]:
    TG_BOT_TOKEN = os.environ["TG_BOT_TOKEN"]
    TG_USER_ID = os.environ["TG_USER_ID"]
if "DD_BOT_ACCESS_TOKEN" in os.environ and os.environ["DD_BOT_ACCESS_TOKEN"] and "DD_BOT_SECRET" in os.environ and os.environ["DD_BOT_SECRET"]:
    DD_BOT_ACCESS_TOKEN = os.environ["DD_BOT_ACCESS_TOKEN"]
    DD_BOT_SECRET = os.environ["DD_BOT_SECRET"]
if "QQ_SKEY" in os.environ and os.environ["QQ_SKEY"] and "QQ_MODE" in os.environ and os.environ["QQ_MODE"]:
    QQ_SKEY = os.environ["QQ_SKEY"]
    QQ_MODE = os.environ["QQ_MODE"]

if BARK:
    notify_mode.append('bark')
    print("BARK 推送打开")
if SCKEY:
    notify_mode.append('sc_key')
    print("Server酱 推送打开")
if TG_BOT_TOKEN and TG_USER_ID:
    notify_mode.append('telegram_bot')
    print("Telegram 推送打开")
if DD_BOT_ACCESS_TOKEN and DD_BOT_SECRET:
    notify_mode.append('dingding_bot')
    print("钉钉机器人 推送打开")
if QQ_SKEY and QQ_MODE:
    notify_mode.append('coolpush_bot')
    print("QQ机器人 推送打开")

def bark(title, content):
    print("\n")
    if not BARK:
        print("bark服务的bark_token未设置!!\n取消推送")
        return
    print("bark服务启动")
    response = requests.get(
        f"""https://api.day.app/{BARK}/{title}/{content}""").json()
    if response['code'] == 200:
        print('推送成功！')
    else:
        print('推送失败！')

def serverJ(title, content):
    print("\n")
    if not SCKEY:
        print("server酱服务的SCKEY未设置!!\n取消推送")
        return
    print("serverJ服务启动")
    data = {
        "text": title,
        "desp": content.replace("\n", "\n\n")
    }
    response = requests.post(f"https://sc.ftqq.com/{SCKEY}.send", data=data).json()
    if response['errno'] == 0:
        print('推送成功！')
    else:
        print('推送失败！')

def telegram_bot(title, content):
    print("\n")
    bot_token = TG_BOT_TOKEN
    user_id = TG_USER_ID
    if not bot_token or not user_id:
        print("tg服务的bot_token或者user_id未设置!!\n取消推送")
        return
    print("tg服务启动")
    url=f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage"
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    payload = {'chat_id': str(TG_USER_ID), 'text': f'{title}\n\n{content}', 'disable_web_page_preview': 'true'}
    proxies = None
    if TG_PROXY_IP and TG_PROXY_PORT:
        proxyStr = "http://{}:{}".format(TG_PROXY_IP, TG_PROXY_PORT)
        proxies = {"http": proxyStr, "https": proxyStr}
    response = requests.post(url=url, headers=headers, params=payload, proxies=proxies).json()
    if response['ok']:
        print('推送成功！')
    else:
        print('推送失败！')

def dingding_bot(title, content):
    timestamp = str(round(time.time() * 1000))  # 时间戳
    secret_enc = DD_BOT_SECRET.encode('utf-8')
    string_to_sign = '{}\n{}'.format(timestamp, DD_BOT_SECRET)
    string_to_sign_enc = string_to_sign.encode('utf-8')
    hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))  # 签名
    print('开始使用 钉钉机器人 推送消息...', end='')
    url = f'https://oapi.dingtalk.com/robot/send?access_token={DD_BOT_ACCESS_TOKEN}&timestamp={timestamp}&sign={sign}'
    headers = {'Content-Type': 'application/json;charset=utf-8'}
    data = {
        'msgtype': 'text',
        'text': {'content': f'{title}\n\n{content}'}
    }
    response = requests.post(url=url, data=json.dumps(data), headers=headers, timeout=15).json()
    if not response['errcode']:
        print('推送成功！')
    else:
        print('推送失败！')

def coolpush_bot(title, content):
    print("\n")
    if not QQ_SKEY or not QQ_MODE:
        print("qq服务的QQ_SKEY或者QQ_MODE未设置!!\n取消推送")
        return
    print("qq服务启动")
    url=f"https://qmsg.zendee.cn/{QQ_MODE}/{QQ_SKEY}"
    payload = {'msg': f"{title}\n\n{content}".encode('utf-8')}
    response = requests.post(url=url, params=payload).json()
    if response['code'] == 0:
        print('推送成功！')
    else:
        print('推送失败！')

def send(title, content):
    """
    使用 bark, telegram bot, dingding bot, serverJ 发送手机推送
    :param title:
    :param content:
    :return:
    """
    for i in notify_mode:
        if i == 'bark':
            if BARK:
                bark(title=title, content=content)
            else:
                print('未启用 bark')
            continue
        if i == 'sc_key':
            if SCKEY:
                serverJ(title=title, content=content)
            else:
                print('未启用 Server酱')
            continue
        elif i == 'dingding_bot':
            if DD_BOT_ACCESS_TOKEN and DD_BOT_SECRET:
                dingding_bot(title=title, content=content)
            else:
                print('未启用 钉钉机器人')
            continue
        elif i == 'telegram_bot':
            if TG_BOT_TOKEN and TG_USER_ID:
                telegram_bot(title=title, content=content)
            else:
                print('未启用 telegram机器人')
            continue
        elif i == 'coolpush_bot':
            if QQ_SKEY and QQ_MODE:
                coolpush_bot(title=title, content=content)
            else:
                print('未启用 QQ机器人')
            continue
        else:
            print('此类推送方式不存在')

def requests_session(
    retries=3,
    backoff_factor=0.3,
    status_forcelist=(500, 502, 504),
    session=None,
):
    session = session or requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        method_whitelist=frozenset(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'])  # urllib3 默认对除 GET 以外的方法，不设置自动重试功能，所以要主动添加白名单
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)

    return session

def main():
    send('title', 'content')


if __name__ == '__main__':
    main()
