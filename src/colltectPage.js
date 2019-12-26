import {rwhs, throttle, getScrollTop} from "./tool";

/**
* 收集页面信息
* 1.当前页面的url
* 2.页面停留的时间 (单页面可以利用onEnter,onLeave钩子)
* 3.页面视口
* */

export const collectPage = {
  /**
  * 初始化
  * */
  init(option) {
    const {eventEmitter, isSingePage, pageInfo} = option;
    this.handler = eventEmitter;
    this.isSingePage = isSingePage;
    this.enterPageTime = 0; // 打开页面时间
    this.pageInfo = pageInfo;
    this._initListener();
    this._rwPageJump();
    this._registerEnterPage();
    this._registerLeavePage();
  },

  /**
  * 重写页面跳转
  * */
  _rwPageJump() {
    window.history.pushState = rwhs('pushState');
    window.history.replaceState = rwhs('replaceState');
  },

  /**
   * 注册自定义进入页面
   * */
  _registerEnterPage() {
      this.handler.addListener('pageStartCollect', () => {
        this.enterPageTime = Date.now();
        this._setPageInfo({
          currentUrl: window.location.href,
          stayPageTime: 0,
          targetUrl: '',
          scrollTop: getScrollTop(),
          performance: window.performance,
        });
      })
  },

  /**
   * 注册自定义退出页面
   * */
  _registerLeavePage() {
    // 离开的时候已经路由已经切换了
    this.handler.addListener('pageEndCollect', () => {
      this._setPageInfo({
        currentUrl: this.pageInfo.currentUrl,
        stayPageTime: Date.now() - this.enterPageTime,
        scrollTop: getScrollTop(),
        isSend: true,
      });
    })
  },

  /**
  * 处理多页应用的页面信息
  * */
  _handleMultPageCollect(e) {
    // 收集页面数据
    this._setPageInfo({
      stayPageTime: Date.now() - this.enterPageTime,
      targetUrl: window.location.href,
      scrollTop: getScrollTop(),
      performance: window.performance,
      isSend: true,
    });

    //新页面需要 重置数据 有误差 界限难以确定
    this._setPageInfo({
      currentUrl: window.location.href,
      stayPageTime: 0,
      targetUrl: '',
      scrollTop: 0,
      performance: window.performance,
    });

    this.enterPageTime = Date.now();
  },

  /**
  * 重置页面数据
  * */
  _setPageInfo(fields) {
    this.pageInfo = {
      ...this.pageInfo,
      isSend: false,
      ...fields,
    };

    this.handler.emit(
      'pageInfo',
      this.pageInfo,
    );
  },

  /**
  * 初始化监听
  * */
  _initListener() {
    // 加载
    window.addEventListener('load', () => {
      this._setPageInfo({
        currentUrl: window.location.href,
        performance: window.performance,
      });
      this.enterPageTime = Date.now();
    });

    // tab切换
    window.addEventListener('visibilitychange', () => {
      // 页面挂起
      if(document.hidden) {
        this._setPageInfo({
          stayPageTime: Date.now() - this.enterPageTime,
          isSend: true,
        })
      } else {
        this.enterPageTime = Date.now();
      }
    });

    // 跳转 (有误差)
    window.addEventListener('pushstate', (e) => {
      if (!this.isSingePage) {
        this._handleMultPageCollect(e);
      } else {  // 收集跳转的目的地址
        this._setPageInfo({targetUrl: window.location.href})
      }
    });

    window.addEventListener('replacestate',  (e) => {
      if (!this.isSingePage) {
        this._handleMultPageCollect(e);
      } else {
        this._setPageInfo({targetUrl: window.location.href})
      }
    });

    window.addEventListener('popstate', (e) => {
      if (!this.isSingePage) {
        this._handleMultPageCollect(e);
      } else {
        this._setPageInfo({targetUrl: window.location.href})
      }
    });

    // 卸载
    window.addEventListener('beforeunload', (e) => {
      this._setPageInfo({
        stayPageTime: Date.now() - this.enterPageTime,
        isSend: true,
      })
    });

    this.getViewportPos();
  },
  /**
  * 获取页面视口位置
  * */
  getViewportPos() {
    window.addEventListener(
        'scroll',
        throttle(
            () => this._setPageInfo({scrollTop: getScrollTop()}),
            300
        )
    );
  },

};
