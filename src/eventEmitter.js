/**
* 事件处理器
* */
class EventEmitter {
  constructor() {
    this._events = Object.create(null);
  }

  // 添加事件监听
  addListener(type, listener, prepend){
    if (!this._events) {
      this._events = Object.create(null);
    }

    if (this._events[type]) {
        // 添加到数组最前面
      if (prepend) {
        this._events[type].unshift(listener);
      } else {
        this._events[type].push(listener);
      }
    } else {
      this._events[type] = [listener];
    }
  }

  // 移除事件监听
  removeListener(type, listener){
    if (Array.isArray(this._events[type])) {
      if (!listener) {
        delete this._events[type]
      } else {
        this._events[type] = this._events[type].filter(e => e !== listener && e.origin !== listener);
      }
    }
  }

  // 执行一次的事件
  once(type, listener){
    const only = (...args) => {
      listener.apply(this, args);
      this.removeListener(type, listener);
    };
    only.origin = listener;
    this.addListener(type, only);
  }

  // 执行事件
  emit(type, ...args){
    if (Array.isArray(this._events[type])) {
      this._events[type].forEach(fn => {
        fn.apply(this, args);
      })
    }
  }
}

export default EventEmitter;
