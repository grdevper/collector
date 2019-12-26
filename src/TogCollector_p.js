import qs from "qs";
import {isIE, sizeOfStr, getScrollTop} from "./tool";

/**
* 默认收集的东西 clickEvents errors;
* */
class TogCollector_p {
  constructor(option){
    const {data, config} = option;
    // 默认配置
    const defaultConfig = {
      url: 'http://127.0.0.1:8888', // todo
      timeInterval: 60000, // ms
      dataSize: 104076,  // 尽量不要大(b) ie8 浏览器get限制
      transformRequest: null, // function
      clickCallback: null, // fn 收集的点击事件的回调逻辑 promise
      isSingePage: true, // 是否是单页应用 自己设置收集页面信息的临界点 emit('pageStartCollect') emit('pageEndCollect')
    };
    this.defaultData = {
      userInfo: null, // 用户信息
      device: null, // 设备信息
      pageInfo: {
        performance: null, // 性能指标
        currentUrl: '', // 当前页面地址
        stayPageTime: '', // 页面停留时间 ms
        targetUrl: '', // 跳转目标页
        scrollTop: getScrollTop(), //滚动位置
      }
    }; //非实时收集数据 非实时数据
    this.data = {constant: this.defaultData, ...data};
    this.config = {...defaultConfig, ...config};
    this._timeInterval();
  }

  /**
   * 设置配置
   * */
  setConfig(config) {
    this.config = {...this.config, ...config};
  }

  /**
   * 查看配置
   * */
  getConfig() {
    return this.config;
  }

  /**
   * 设置统计结果 实时数据
   * */
  setData(data) {
    this.data = {...this.data, ...data};
  }

  /**
   * 设置统计数据，非实时数据
   * */
  setDefaultData(data) {
    this.data.constant = {...this.data.constant, ...data};
  }

  /**
   * 获取统计结果
   * */
  getData() {
    return this.data;
  }

  /**
   * 数据量是否超出限制
   * */
  _isExcMaxSize(data) {
    const {dataSize} = this.config;
    let _dataSize = parseInt(dataSize);
    const _data = JSON.stringify(data);
    return sizeOfStr(_data) > _dataSize;
  }

  /**
   * 发送数据通过图片（频繁修改src可能拥挤）待测
   * */
  _sendDataByImg(url, data) {
    if (!this.xhrImg) {
        this.xhrImg = new Image();
    }
    this.xhrImg.src = `${url}?${data}&time=${new Date().getTime()}`;
  }

  /**
   * 发送收集结果
   * */
  sendCollectData(params) {
    const {config, data} = this;
    const {url, transformRequest} = config;
    let _data = {...data.constant, ...data, ...params};
    if (!this._isExcMaxSize(_data)) {
        delete _data.constant;
        console.log(_data);
        _data = transformRequest ? qs.stringify(transformRequest(_data)) : qs.stringify(_data);
        if(isIE()) {
            this._sendDataByImg(url, _data); //get
        } else {
            navigator.sendBeacon(url, _data); //post 返会的是bool，true发送成功
        }
    } else {
        this.data = {constant: this.data.constant}; //初始化成默认数据
    }
  }

  /**
   * 轮循发送
   * */
  _timeInterval () {
    const {timeInterval} = this.config;
    setInterval(() => {
        this.sendCollectData();
    }, timeInterval);
  }
}

export default TogCollector_p;
