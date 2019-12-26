#信息采集

#### 通用信息
* 用户数据
* 设备信息
* 系统版本号

#### 页面信息
* 当前地址
* 页面停留的时间
* 视口的位置
* 页面性能
* 页面错误信息
* 跳转的目标URL
* 页面点击收集的目标数据

#### 自定义收集
* 加入购物车等

---
### api

#### 初始化参数

1. url

 + type：String
 + default: null
 + desc: 请求的接口地址

2. timeInterval

 + type: integer
 + default: 60000
 + desc: 接口轮循时间 单位（ms）

3. transformRequest

 + type: func[object]
 + default: null
 + desc: 自定义处理请求接口的参数方法 返回类型object

4. clickCallback

 + type: promise
 + default: null
 + desc: 点击后的处理 返回处理后的数据

5. isSingePage

 + type: boolean
 + default: true
 + desc: 是否是单页应用

6. dataSize

 + type: integer
 + default: 4076
 + desc:收集数据的最大值，由于ie浏览器的限制get请求不能超过4076b,单位b

---

#### 方法

1. setConfig[void]
>desc: 设置配置,传入一个对象

2. getConfig[object]
>desc: 获取配置

3. setData[void]
>desc: 往实例中设置数据，会轮循传入后端

4. setDefaultData[void]
>desc:  非实时数据，当超过最大阀值，保留这部分数据传入后端

5. getData[object]
>desc: 获取当前的基本数据

6. sendCollectData[void]
>desc: 发送数据，会把传入的数据和已收集的数据组合发到后端

7. eventEmitter.emit('collectError', data)
> desc: 收集错误信息勾子，需手动调用

8. eventEmitter.emit('pageStartCollect')
>desc:进入页面钩子，开始收集页面信息，需要手动调用(单页)

9. eventEmitter.emit('pageEndCollect')
>desc: 离开页面钩子，重置数据等，需要手动调用
