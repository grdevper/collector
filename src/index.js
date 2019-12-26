import TogCollector_p from './TogCollector_p';
import EventEmitter from "./eventEmitter";
import {collectPage} from "./colltectPage";
import {rwlc, rwsc, isMobile, debounce, rwConsole} from './tool';

class TogCollector extends TogCollector_p{
  constructor(option = {}) {
    super(option);
    if (window) {
      this._collectEvents();
      this._rwWindowEvents();
      this._collectDeviceInfo();
      this._collectErrors();
      this._collectCl_Tu();
    }
  }

  /**
  * 重写windows事件
  * */
  _rwWindowEvents() {
    window.localStorage.setItem = rwlc('setItem', 'l_setItem');
    window.sessionStorage.setItem = rwsc('setItem', 's_setItem');
    window.console.error = rwConsole('error', '_consoleError');
    this._collectUserInfo();
  }

  /**
   * 注册事件
   * */
  _collectEvents() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.addListener('pageInfo', (data) => this._setPageInfo(data));
    const {eventEmitter, config: {isSingePage}, defaultData:{pageInfo}} = this;
    collectPage.init({eventEmitter, isSingePage, pageInfo});
  }

  /**
  * 设置页面信息
  * */
  _setPageInfo(data) {
    const {isSend, currentUrl, targetUrl} = data;
    delete data.isSend;
    this.data.pageInfo = {
        ...this.defaultData.pageInfo,
        ...data,
        currentUrl: currentUrl ? encodeURIComponent(currentUrl) : '',
        targetUrl: targetUrl ? encodeURIComponent(targetUrl) : '',
    };
    isSend && this.sendCollectData();
  }

  /**
  * 收集用户信息
  * */
  _collectUserInfo() {
    if (isMobile()) {
      this._collectMobileUserInfo();
    } else {
      this._collectPcUserInfo();
    }
  }

  /**
  * 收集移动端userInfo
  * */
  _collectMobileUserInfo() {
    this.setDefaultData({userInfo: window.localStorage.getItem('userInfo')});
    window.addEventListener('l_setItem', (e) => {
      if (e.key === 'userInfo') {
        const userInfo = window.localStorage.getItem('userInfo');
        this.setDefaultData({userInfo});
      }
    });
  }

  /**
  * 收集pc端userInfo
  * */
  _collectPcUserInfo() {
    this.setDefaultData({userInfo: window.sessionStorage.getItem('userInfo')});
    window.addEventListener('s_setItem', (e) => {
      if (e.key === 'userInfo') {
        const userInfo = window.sessionStorage.getItem('userInfo');
        this.setDefaultData({userInfo});
      }
    });
  }

  /**
  * 收集设备信息
  * */
 _collectDeviceInfo() {
   this.setDefaultData({device: window.navigator});
  }

  /**
  * 整理错误的数据并发送(实时)
  * */
  _sendCollectErrors(error) {
    this.sendCollectData({errors: error});
  }

  /**
  *收集错误信息(兼容)
  * 非同源的外部js会script error, 可以通过一些配置来处理
  **/
  _collectErrors() {
    // 自定义收集错误， 通过emit('collectError', data) 触发
    this.eventEmitter.addListener('collectError', (error) => {
      this._sendCollectErrors(error);
    });

    window.onerror = function(message, source, lineno, colno, error) {
      this._sendCollectErrors(error);
    };

    window.addEventListener('error', (error) => {
      this._sendCollectErrors(error);
    }, true);

    // promise
    window.addEventListener('unhandledrejection', function (error) {
      this._sendCollectErrors(error);
    });

    // console.error
    window.addEventListener('_consoleError', function (error) {
      this._sendCollectErrors(error);
    });
  }

  /**
  * 收集点击事件
  * */
  _collectCl_Tu() {
    if(isMobile()) {
      this._collectTouch();
    } else {
      this._collectClick();
    }
  }

  /**
  *将事件信息存入data 具体判断todo
  **/
  _setEventsData(e) {
    const {clickCallback} = this.config;
    if (clickCallback) {
      clickCallback(e).then((data) => {
      this.sendCollectData({clickEvents: data});
      });
    } else {
      // todo(默认条件待定)
      this.sendCollectData({clickEvents: e});
    }
  }

  /**
  * pc端点击事件
  * */
  _collectClick() {
    window.addEventListener('click', debounce((e) => this._setEventsData(e), 300));
  }

  /**
  * 移动端点击事件
  * */
  _collectTouch() {
    window.addEventListener('touchstart', debounce((e) => this._setEventsData(e), 300));
  }

 /**
 * 单例模式
 * */
 static getInstance(option) {
   if (!this.instance) {
     this.instance = new TogCollector(option);
   }
   return this.instance;
  }

}

export default TogCollector;
