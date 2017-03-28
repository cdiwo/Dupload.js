# HTML5 Based File Uploader
# Dupload.js

## 使用方法

##### 引入Dupload文件

CommonJS 方式引用
```js
var Dupload = require('dupload');
```

AMD 方式引用
```js
define(['dupload'], function(Dupload) {
    // ...
});
```

全局方式，在HTML页面中引入:
```html
<script src="dupload.min.js"></script>
```


### HTML代码
__提示:__

1. 上传多个文件时，file input要添加multiple属性。
2. android系统选择文件，file input要添加capture="camera"属性，才能打开相机。
3. 未添加file控件html代码，且未指定fileInput参数，插件会自动生成一个图片选择控件。

__注意:__

1. 添加了file控件html代码，必须指定fileInput参数，否则会触发两次 `click` 事件，出现2次文件选择器。
2. 若使用了 `FastClick` 插件，__必须__在file控件父元素添加class `needsclick` ，否则container内部分甚至全部区域点击无效。
3. 最新 `Chrome` 版本 `52.0.2743.116 (64-bit)`, file的accept不兼容 `image/*`, 点击后弹出会有10s左右延迟。

```html
<div class="container" style="width: 200px; height:200px; border: 1px solid black;">
    <input class="du-fileinput" type="file" accept="image/jpeg,image/jpg,image/png" capture="camera" style="display:none;" />
</div>
```

__建议:__</br>
HTML中不添加file控制代码，由插件自动生成


### Javascript代码


Example：
```js
var options = {
    url: "http://localhost/upload",
    fileInput: '.du-fileinput',// 可不写，自动生成并绑定事件
    maxFilesize: 500,
    onProgress: function(du, file) {
      console.log(file.percent)
    },
    onUploaded: function(du, file, response) {
        // your code to parse response
        // ...
        return false;// 不做处理
        return true;// 触发onSuccess()
        return "error";// 触发onError()
    },
    onSuccess: function(du, file, response) {
        console.log(file);
    },
    onError: function(du, file, message) {
        alert(message);
    }
}
// 方法一:
var du = new Dupload(".container", options);// 返回实例对象，可做更多操作
// 方法二:
Dupload.create('.container', options);
// 兼容方式
options.container = '.container'
Dupload.create(options);// 静态方法
```

### 服务器端
数据返回格式没有要求，不过通常我们为了方便前端处理，都返回JSON格式。


## 参数
### 
<table>
<thead>

<tr>
  <th>参数</th>
  <th>类型</th>
  <th>默认值</th>
  <th>说明</th>
</tr>
</thead>
<tbody>
<tr><th colspan="4">构造参数</th></tr>
<tr>
  <td>container</td>
  <td>string or HTMLElement</td>
  <td></td>
  <td>拖拽敏感区域</td>
</tr>
<tr>
  <td>params</td>
  <td>object</td>
  <td>{}</td>
  <td>可选参数</td>
</tr>
<tr>
  <th colspan="4">params参数</th>
</tr>
<tr>
  <td>url</td>
  <td>string</td>
  <td>null</td>
  <td>ajax上传地址</td>
</tr>
<tr>
  <td>method</td>
  <td>string</td>
  <td>POST</td>
  <td>提交方式</td>
</tr>
<tr>
  <td>withCredentials</td>
  <td>boolean</td>
  <td>false</td>
  <td>支持跨域发送cookies</td>
</tr>
<tr>
  <td>header</td>
  <td>object</td>
  <td>{}</td>
  <td>请求头部信息</td>
</tr>
<tr>
  <td>formData</td>
  <td>object</td>
  <td>{}</td>
  <td>参数表，和上传请求同时发送</td>
</tr>
<tr>
  <td>dataType</td>
  <td>string</td>
  <td>json</td>
  <td>返回数据类型: text, json</td>
</tr>
<tr>
  <td>fileVal</td>
  <td>string</td>
  <td>file</td>
  <td>文件上传域的name</td>
</tr>
<tr>
  <td>fileInput</td>
  <td>string or HTMLElement</td>
  <td>null</td>
  <td>file控件css选择器, 若container里存在file控件，则必填。反之可不填，会自动生成一个图片控件</td>
</tr>
<tr>
  <td>allowExts</td>
  <td>string</td>
  <td>null</td>
  <td>允许的文件类型, 格式: 扩展名[,扩展名], 如: <code>jpeg,jpg,png,gif</code>,多个类型使用逗号<code>,</code>隔开</td>
</tr>
<tr>
  <td>allowMimeTypes</td>
  <td>string</td>
  <td>null</td>
  <td>允许的Mime类型, 格式: mime[,mime], 如: <code>image/*</code>,多个类型使用逗号<code>,</code>隔开</td>
</tr>
<tr>
  <td>maxFilesize</td>
  <td>int</td>
  <td>8192</td>
  <td>单个文件限制，单位: KB，默认：8M</td>
</tr>
<tr>
  <td>maxFiles</td>
  <td>int</td>
  <td>null</td>
  <td>最大上传数</td>
</tr>
<tr>
  <td>parallelUploads</td>
  <td>int</td>
  <td>2</td>
  <td>并行上传量，在进行多文件同时上传时的并发量</td>
</tr>
<tr>
  <td>auto</td>
  <td>boolean</td>
  <td>true</td>
  <td>自动上传，选择文件后自动执行上次文件动作</td>
</tr>
<tr>
  <td>multi</td>
  <td>boolean</td>
  <td>true</td>
  <td>允许多文件上传，头像修改建议设为false，或者将file input的multiple去掉</td>
</tr>
<tr>
  <td>init</td>
  <td>boolean</td>
  <td>true</td>
  <td>默认初始化</td>
</tr>
<tr>
  <td>clickable</td>
  <td>boolean</td>
  <td>true</td>
  <td>拖拽敏感区域是否可点击</td>
</tr>
<tr>
  <td>compress</td>
  <td>object</td>
  <td>false</td>
  <td>是否启用压缩功能</td>
</tr>
<tr>
  <th colspan="4">compress 参数</th>
</tr>
<tr>
  <td>width</td>
  <td>int</td>
  <td>1280</td>
  <td>最大宽度</td>
</tr>
<tr>
  <td>height</td>
  <td>int</td>
  <td>960</td>
  <td>最大高度</td>
</tr>
<tr>
  <td>quality</td>
  <td>int</td>
  <td>90</td>
  <td>图片质量，只有type为`image/jpeg`的时候才有效</td>
</tr>
<tr>
  <td>preserveHeaders</td>
  <td>boolean</td>
  <td>true</td>
  <td>是否保留头部meta信息</td>
</tr>
<tr>
  <th colspan="4">提示文字(Tips Text)</th>
</tr>
<tr>
  <td>txtFileTooBig</td>
  <td>string</td>
  <td>文件上传限制最大为{{maxFilesize}}.</td>
  <td>文件大小超过限制</td>
</tr>
<tr>
  <td>txtInvalidFileType</td>
  <td>string</td>
  <td>不允许的文件类型</td>
  <td>文件类型不允许</td>
</tr>
<tr>
  <td>txtMaxFilesExceeded</td>
  <td>string</td>
  <td>最多能上传{{maxFiles}}个文件</td>
  <td></td>
</tr>
<tr>
  <td>txtCancelUploadTips</td>
  <td>string</td>
  <td>“您确定要取消上传吗？</td>
  <td></td>
</tr>
<tr>
  <th colspan="4">回调函数（Callback)</th>
</tr>
<tr>
  <td>onDragHover</td>
  <td>function()</td>
  <td></td>
  <td>文件拖放。<br/>【注意】dragover事件一定要清除默认事件，不然会无法触发后面的drop事件</td>
</tr>
<tr>
  <td>onDragOver</td>
  <td>function()</td>
  <td></td>
  <td>拖拽到敏感区域</td>
</tr>
<tr>
  <td>onDragLeave</td>
  <td>function()</td>
  <td></td>
  <td>离开敏感区域</td>
</tr>
<tr>
  <td>onDrop</td>
  <td>function(du, file)</td>
  <td></td>
  <td>文件选择后</td>
</tr>
<tr>
  <td>onBefore</td>
  <td>function(du, file)</td>
  <td></td>
  <td>上传之前</td>
</tr>
<tr>
  <td>onProgress</td>
  <td>function(du, file)</td>
  <td></td>
  <td>上传进度</td>
</tr>
<tr>
  <td>onUploaded</td>
  <td>function(du, file, response)</td>
  <td></td>
  <td>上传完毕。<br/>【注意】不同返回值会回调不同函数:<br/>
    <code>return false;// 不处理</code><br/>
    <code>return true;// 会调用onSuccess()</code><br/>
    <code>return "error";// 会调用onError()</code>
  </td>
</tr>
<tr>
  <td>onSuccess</td>
  <td>function(du, file, response)</td>
  <td></td>
  <td>上传成功</td>
</tr>
<tr>
  <td>onError</td>
  <td>function(du, file, response)</td>
  <td></td>
  <td>上传失败</td>
</tr>
<tr>
  <td>onCancel</td>
  <td>function(du, file)</td>
  <td></td>
  <td>上传取消</td>
</tr>
<tr>
  <td>onDelete</td>
  <td>function(du, file)</td>
  <td></td>
  <td>文件删除</td>
</tr>
<tr>
  <td>onComplete</td>
  <td>function(du)</td>
  <td></td>
  <td>文件全部上传完毕</td>
</tr>
<tr>
  <th colspan="4">file对象数据结构</th>
</tr>
<tr>
  <td>file</td>
  <td>object</td>
  <td></td>
  <td>文件对象数据结构，例如: <code>{id: "kQtmYe2Mi07w0Z-T67cTzMmHixHB3Chx", name: "example.jpg", percent: "100.00", size: 8172, src: "", status: "success", type: "image/jpeg"}</code></td>
</tr>
<tr>
  <th colspan="4">外部方法</th>
</tr>
<tr>
  <td>select</td>
  <td>function()</td>
  <td></td>
  <td>文件选择，如果容器<code>clickable=false</code>，可手动调用此方法，触发fileinput的click事件</td>
</tr>
<tr>
  <td>start</td>
  <td>function()</td>
  <td></td>
  <td>上传开始，如果参数<code>auto</code>为<code>false</code>时，需要手动调用此方法</td>
</tr>
<tr>
  <td>delete</td>
  <td>function(id)</td>
  <td></td>
  <td>删除文件，参数<code>id</code>是<code>file.id</code></td>
</tr>
<tr>
  <td>setOption</td>
  <td>function(option, value)</td>
  <td></td>
  <td>参数设置，支持3种形式：<br/>
    <code>setOption('name', 'value')</code><br/>
    <code>setOption('name', {key: value})</code><br/>
    <code>setOption({key: value, key2: {}})</code>
  </td>
</tr>
</tbody></table>

### 更新日志

### 2.1.1 - 2017/03/28
1. 修复360浏览器无法获取MIME类型时，会压缩非图片文件的BUG

### 2.1.0 - 2017/03/20
1. 新增 `compress` 参数，使用HTML5进行JPEG图片压缩
2. 修改 `maxFilesize` 参数，默认值为8M
3. 移除移动端浏览器检测函数

### 2.0.1 - 2016/12/21
1. 调整部分代码
2. 修复上传数量限制计算不准确的Bug

### 2.0.0 - 2016/12/20
1. 新名字 `Dupload.js`
2. 新增 `Dupload.create(container, params)` 静态方法
3. 替换参数 `requestHeaders` => `headers`, `formParams` => 'formData',  `fileDataName` => `fileVal`
4. 整理所有外部方法到新增的Util类中
5. 修复部分Bug

### 1.5.4 - 2016/08/29
1. 新增 `dataType` 可选参数。
2. 新增 `select()` 外部方法，用于触发 `fileinput` 的click事件。

### 1.5.3 - 2016/08/19
1. 修复 `Chrome` 版本 `52.0.2743.116 (64-bit)`, `fileinput` 点击触发后弹出有10s左右延迟的问题。

### 1.5.2 - 2016/07/15
1. 修复 `delete()` 方法，在 `files` 中找不到等于id的文件，会删除最后一个文件的BUG。
2. 修改 `uploadFile(), setOption(), formatSize(), getSuffix(), guid()` 5个方法。
3. 修改 `init()` 方法，自动生成的文件选择器会依赖 `multi`, `allowMimeTypes` 参数。
4. 替换 `multipart_params` 参数为 `formParams`。
5. 新增 `requestHeaders`, `allowMimeTypes` 2个可选参数。

### 1.5.1 - 2016/05/29
1. 移除兼容旧版FastClick单击无效果的代码。

### 1.5.0 - 2016/05/25
1. 插件不再处理上传结果，直接调用onUploaded()由用户处理。

### 1.4.0 - 2016/04/08
1. 调整大量代码结构。
2. 上传完成后，如果是JSON会自动处理结果，否则直接调用onSuccess()函数由用户处理。
3. 新增onBefore()回调函数，便于上传之前修改参数。
4. 新增setOption()方法。

