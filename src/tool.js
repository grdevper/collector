/**
* 计算字符串多少字节
* @params: charset: 编码格式utf-8 utf-16， str: 字符串
* 高版本浏览器textEncoder(str, charset)替代
* */
export const sizeOfStr = function(str, charset){
  let total = 0,
      charCode,
      i,
      len;
  charset = charset ? charset.toLowerCase() : '';
  if(charset === 'utf-16' || charset === 'utf16') {
    for (i = 0, len = str.length; i < len; i++) {
      charCode = str.charCodeAt(i);
      if (charCode <= 0xffff) {
        total += 2;
      } else {
        total += 4;
      }
    }
  } else {
    for (i = 0, len = str.length; i < len; i++) {
      charCode = str.charCodeAt(i);
      if(charCode <= 0x007f) {
        total += 1;
      } else if (charCode <= 0x07ff) {
        total += 2;
      } else if (charCode <= 0xffff){
        total += 3;
      } else {
        total += 4;
      }
    }
  }
  return total;
};

/**
* 判断是否是ie浏览器
* */
export const isIE = function () {
  if (!!window.ActiveXObject || "ActiveXObject" in window) {
    return true;
  } else {
    return false;
  }
};

/**
* 判断是否是移动设备
* */
export const isMobile = function () {
  return /Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent);
};


/**
* 重写localstorage的方法
* 便于监听
* @params name:方法名字， alias：别名
* */
export const rwlc = function (name, alias) {
  const orig = window.localStorage[name];
  return function (key, value) {
    const rv = orig.apply(this, arguments);
    const e = new Event(alias);
    e.key = key;
    window.dispatchEvent(e);
    return rv;
  };
};

/**
* 重写sessionstorage的方法
* @params name:方法名字， alias：别名
* */
export const rwsc = function (name, alias) {
  const orig = window.sessionStorage[name];
  return function (key, value) {
    const rv = orig.apply(this, arguments);
    const e = new Event(alias);
    e.key = key;
    window.dispatchEvent(e);
    return rv;
  };
};

/**
* 重写history的方法
* @params name: 方法名
* */
export const rwhs = function (name) {
  const orig = window.history[name];
  return function () {
    const rv = orig.apply(this, arguments);
    const e = new Event(name.toLowerCase());
    e.arguments = arguments;
    window.dispatchEvent(e);
    return rv
  };
};

/**
* 重写console方法
* @params: name: 重写的方法名， alias: 别名
* */
export const rwConsole = function (name, alias) {
  const orig = window.console[name];
  return function () {
    const rv = orig.apply(this, arguments);
    const e = new Event(alias);
    e.arguments = arguments;
    window.dispatchEvent(e);
    return rv
  }
};


/**
* 防抖 延迟执行
* @params func: 待执行方法，wait: 等待时间
* */
export const debounce = function (func, wait) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  }
};

/**
*截流
* */
export const throttle = function (fn, delay) {
  let prevTime = Date.now();
  return function () {
    const curTime = Date.now();
    if (curTime - prevTime > delay) {
        fn.apply(this, arguments);
        prevTime = curTime;
    }
  }
};

/**
* 获取滚动高度
* */
export const getScrollTop = function () {
   if (!window || !document.documentElement || !document.body) {
     return 0;
   }
   return window.pageYOffset ||
       document.documentElement.scrollTop ||
       document.body.scrollTop || 0;
};




